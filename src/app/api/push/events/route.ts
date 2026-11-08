import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createIpRateLimiter({ limit: 60, windowMs: 60_000 });
const VisitorIdSchema = z.string().uuid();
const PAGE_SIZE = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!limiter.consume(getClientIpFromHeaders(request.headers))) {
    return NextResponse.json(
      { status: "error", code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const params = request.nextUrl.searchParams;
  const visitorId = VisitorIdSchema.safeParse(params.get("visitorId"));
  if (!visitorId.success) {
    return NextResponse.json(
      { status: "error", code: "INVALID_VISITOR_ID" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const beforeRaw = params.get("before");
  const before = beforeRaw ? new Date(beforeRaw) : null;
  if (beforeRaw && (!before || !Number.isFinite(before.getTime()))) {
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
      .limit(PAGE_SIZE);

    if (before) query = query.lt("created_at", before.toISOString());

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
        nextBefore: rows.length === PAGE_SIZE ? rows[rows.length - 1]?.createdAt ?? null : null,
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
