import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getClientIpFromHeaders, createIpRateLimiter } from "@/lib/locate-protection";
import { isSameOriginRequest, normalizeNotificationTag } from "@/lib/push-security";
import { getWebPushConfig, sendWebPush } from "@/lib/web-push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createIpRateLimiter({ limit: 20, windowMs: 60_000 });
const SendSchema = z.object({
  visitorId: z.string().uuid(),
  eventId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(600),
  tag: z.string().trim().min(1).max(100),
});

const VISITOR_COOKIE = "iwacu_visitor_id";

function cookieMatchesVisitor(request: NextRequest, visitorId: string): boolean {
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  return !existing || existing === visitorId;
}

function attachVisitorCookie(
  response: NextResponse,
  visitorId: string,
  request: NextRequest
): NextResponse {
  response.cookies.set({
    name: VISITOR_COOKIE,
    value: visitorId,
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

interface StoredSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

function statusCodeFromError(error: unknown): number | null {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : NaN;
  return Number.isInteger(statusCode) ? statusCode : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request.url, request.headers.get("origin"))) {
    return NextResponse.json({ status: "error", code: "ORIGIN_REJECTED" }, { status: 403 });
  }
  if (!limiter.consume(getClientIpFromHeaders(request.headers))) {
    return NextResponse.json({ status: "error", code: "RATE_LIMITED" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", code: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: "error", code: "INVALID_NOTIFICATION" }, { status: 400 });
  }
  // The notification archive is useful even when push delivery is not yet
  // configured. Persist the event before checking VAPID or subscriptions.
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "unavailable", code: "PUSH_STORAGE_NOT_CONFIGURED" }, { status: 503 });
  }

  const input = parsed.data;
  if (!cookieMatchesVisitor(request, input.visitorId)) {
    return NextResponse.json({ status: "error", code: "VISITOR_MISMATCH" }, { status: 403 });
  }
  const tag = normalizeNotificationTag(input.tag);
  const supabase = createSupabaseServiceClient();

  try {
    const { error: outboxError } = await supabase
      .from("location_push_events")
      .insert({
        visitor_id: input.visitorId,
        event_id: input.eventId,
        title: input.title,
        body: input.body,
        notification_tag: tag,
        status: "pending",
      });

    if (outboxError?.code === "23505") {
      return attachVisitorCookie(NextResponse.json({
        status: "duplicate",
        accepted: true,
        archived: true,
        sent: 0,
      }, { status: 202 }), input.visitorId, request);
    }
    if (outboxError) {
      console.error("[push-send] outbox insert failed:", outboxError.code ?? "unknown");
      return NextResponse.json({ status: "error", code: "OUTBOX_WRITE_FAILED" }, { status: 503 });
    }

    if (!getWebPushConfig()) {
      await supabase.from("location_push_events").update({
        status: "no_subscription",
        attempts: 0,
        last_error_code: "PUSH_NOT_CONFIGURED",
      }).eq("visitor_id", input.visitorId).eq("event_id", input.eventId);
      return attachVisitorCookie(NextResponse.json({
        status: "archived",
        accepted: true,
        archived: true,
        sent: 0,
        delivery: "not_configured",
      }, { status: 202 }), input.visitorId, request);
    }

    const { data: rows, error: readError } = await supabase
      .from("location_push_subscriptions")
      .select("endpoint,p256dh_key,auth_key")
      .eq("visitor_id", input.visitorId)
      .limit(5);

    if (readError) {
      await supabase.from("location_push_events").update({
        status: "failed",
        attempts: 1,
        last_error_code: "SUBSCRIPTION_READ_FAILED",
        last_attempt_at: new Date().toISOString(),
      }).eq("visitor_id", input.visitorId).eq("event_id", input.eventId);
      return NextResponse.json({ status: "error", code: "SUBSCRIPTION_READ_FAILED" }, { status: 503 });
    }

    const subscriptions = (rows ?? []) as StoredSubscription[];
    if (subscriptions.length === 0) {
      await supabase.from("location_push_events").update({
        status: "no_subscription",
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
      }).eq("visitor_id", input.visitorId).eq("event_id", input.eventId);
      return attachVisitorCookie(
        NextResponse.json({ status: "ok", accepted: true, sent: 0 }, { status: 202 }),
        input.visitorId,
        request
      );
    }

    const results = await Promise.allSettled(subscriptions.map(async (stored) => {
      try {
        const result = await sendWebPush({
          endpoint: stored.endpoint,
          keys: { p256dh: stored.p256dh_key, auth: stored.auth_key },
        }, {
          title: input.title,
          body: input.body,
          tag,
          url: "/amenyesha",
        });
        return { kind: "sent" as const, endpoint: stored.endpoint, statusCode: result.statusCode };
      } catch (error) {
        return {
          kind: statusCodeFromError(error) === 404 || statusCodeFromError(error) === 410
            ? "expired" as const
            : "failed" as const,
          endpoint: stored.endpoint,
          statusCode: statusCodeFromError(error),
        };
      }
    }));

    let sent = 0;
    let expired = 0;
    let lastStatusCode: number | null = null;

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      if (result.value.kind === "sent") sent += 1;
      else if (result.value.kind === "expired") {
        expired += 1;
        await supabase.from("location_push_subscriptions")
          .delete()
          .eq("visitor_id", input.visitorId)
          .eq("endpoint", result.value.endpoint);
      } else if (result.value.statusCode !== null) {
        lastStatusCode = result.value.statusCode;
      }
    }

    await supabase.from("location_push_events").update({
      status: sent > 0 ? "sent" : "failed",
      attempts: 1,
      last_status_code: lastStatusCode,
      last_error_code: sent > 0 ? null : "PUSH_PROVIDER_REJECTED",
      last_attempt_at: new Date().toISOString(),
      sent_at: sent > 0 ? new Date().toISOString() : null,
    }).eq("visitor_id", input.visitorId).eq("event_id", input.eventId);

    return attachVisitorCookie(NextResponse.json({
      status: sent > 0 ? "sent" : "unavailable",
      accepted: true,
      sent,
      expiredSubscriptionsRemoved: expired,
    }, { status: sent > 0 ? 200 : 202 }), input.visitorId, request);
  } catch {
    try {
      await supabase.from("location_push_events").update({
        status: "failed",
        attempts: 1,
        last_error_code: "PUSH_SEND_FAILED",
        last_attempt_at: new Date().toISOString(),
      }).eq("visitor_id", input.visitorId).eq("event_id", input.eventId);
    } catch {
      // Do not leak provider or database internals to the browser response.
    }
    return NextResponse.json({ status: "error", code: "PUSH_SEND_FAILED" }, { status: 503 });
  }
}
