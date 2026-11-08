import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isAllowedPushEndpoint, isSameOriginRequest } from "@/lib/push-security";
import { getWebPushPublicKey } from "@/lib/web-push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SubscriptionSchema = z.object({
  visitorId: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url().max(2048),
    expirationTime: z.number().positive().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(80).max(120),
      auth: z.string().min(16).max(64),
    }),
  }),
});

const RemoveSchema = z.object({
  visitorId: z.string().uuid(),
  endpoint: z.string().url().max(2048),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request.url, request.headers.get("origin"))) {
    return NextResponse.json({ status: "error", code: "ORIGIN_REJECTED" }, { status: 403 });
  }
  if (!getWebPushPublicKey()) {
    return NextResponse.json({ status: "unavailable", code: "PUSH_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "unavailable", code: "PUSH_STORAGE_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = SubscriptionSchema.safeParse(body);
  if (!parsed.success || !isAllowedPushEndpoint(parsed.success ? parsed.data.subscription.endpoint : "")) {
    return NextResponse.json({ status: "error", code: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }

  try {
    const input = parsed.data;
    const supabase = createSupabaseServiceClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("location_push_subscriptions")
      .upsert({
        visitor_id: input.visitorId,
        endpoint: input.subscription.endpoint,
        p256dh_key: input.subscription.keys.p256dh,
        auth_key: input.subscription.keys.auth,
        expiration_time: input.subscription.expirationTime
          ? new Date(input.subscription.expirationTime).toISOString()
          : null,
        updated_at: now,
        last_seen_at: now,
      }, { onConflict: "endpoint" });

    if (error) {
      console.error("[push-subscriptions] storage failed:", error.code ?? "unknown");
      return NextResponse.json({ status: "error", code: "SUBSCRIPTION_SAVE_FAILED" }, { status: 503 });
    }
    return NextResponse.json({ status: "ok" }, { status: 201 });
  } catch {
    return NextResponse.json({ status: "error", code: "SUBSCRIPTION_SAVE_FAILED" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request.url, request.headers.get("origin"))) {
    return NextResponse.json({ status: "error", code: "ORIGIN_REJECTED" }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "unavailable", code: "PUSH_STORAGE_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", code: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = RemoveSchema.safeParse(body);
  if (!parsed.success || !isAllowedPushEndpoint(parsed.success ? parsed.data.endpoint : "")) {
    return NextResponse.json({ status: "error", code: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("location_push_subscriptions")
      .delete()
      .eq("visitor_id", parsed.data.visitorId)
      .eq("endpoint", parsed.data.endpoint);
    if (error) return NextResponse.json({ status: "error", code: "UNSUBSCRIBE_FAILED" }, { status: 503 });
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error", code: "UNSUBSCRIBE_FAILED" }, { status: 503 });
  }
}
