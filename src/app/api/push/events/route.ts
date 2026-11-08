import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createIpRateLimiter({ limit: 60, windowMs: 60_000 });
const VisitorIdSchema = z.string().uuid();
const VISITOR_COOKIE = "iwacu_visitor_id";
const CursorSchema = z.string().min(1).max(100);
const PAGE_SIZE = 50;

function parseArchiveCursor(value: string | null): { createdAt: string; eventId: string } | null | false {
  if (!value) return null;
  if (!CursorSchema.safeParse(value).success) return false;
  const separator = value.lastIndexOf("|");
  if (separator <= 0) return false;
  const createdAt = value.slice(0, separator);
  const eventId = value.slice(separator + 1);
  const date = new Date(createdAt);
  const strictTimestamp =
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,6})?(?:Z|[+-]\\d{2}:\\d{2})$/;
  if (
    !strictTimestamp.test(createdAt) ||
    !Number.isFinite(date.getTime()) ||
    !z.string().uuid().safeParse(eventId).success
  ) {
    return false;
  }
  return { createdAt, eventId };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!limiter.consume(getClientIpFromHeaders(request.headers))) {
    return NextResponse.json(
      { status: "error", code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const visitorId = VisitorIdSchema.safeParse(
    request.cookies.get(VISITOR_COOKIE)?.value
  );
  if (!visitorId.success) {
    return NextResponse.json(
      { status: "error", code: "VISITOR_COOKIE_REQUIRED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const params = request.nextUrl.searchParams;
  const cursor = parseArchiveCursor(params.get("before"));
  if (cursor === false) {
    return NextResponse.json(
      { status: "error", code: "INVALID_CURSOR" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { status: "unavailable", code: "ARCHIVE_STORAGE_NOT_CONFIGURED", items: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const supabase = createSupabaseServiceClient();
    let query = supabase
      .from("location_push_events")
      .select("event_id,title,body,notification_tag,created_at,status")
      .eq("visitor_id", visitorId.data)
      .order("created_at", { ascending: false })
      .order("event_id", { ascending: false })
      .limit(PAGE_SIZE);

    // Use a stable compound cursor so multiple events sharing one timestamp
    // cannot disappear between archive pages.
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},event_id.lt.${cursor.eventId})`
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { status: "error", code: "ARCHIVE_READ_FAILED", items: [] },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rows = (data ?? []).map((row) => ({
      id: row.event_id,
      title: row.title,
      body: row.body,
      tag: row.notification_tag,
      createdAt: row.created_at,
      deliveryStatus: row.status,
    }));

    return NextResponse.json(
      {
        status: "ok",
        items: rows,
        nextBefore: rows.length === PAGE_SIZE
          ? `${rows[rows.length - 1]?.createdAt ?? ""}|${rows[rows.length - 1]?.id ?? ""}`
          : null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", code: "ARCHIVE_READ_FAILED", items: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
