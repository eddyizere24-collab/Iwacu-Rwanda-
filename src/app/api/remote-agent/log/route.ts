import { NextRequest, NextResponse } from "next/server";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnostics for Iwacu Agent: event names and short codes only. Never speech text or audio.
const limiter = createIpRateLimiter({ limit: 60, windowMs: 60_000 });
const SAFE = /^[a-z0-9_:.\- ]{1,80}$/i;

export async function POST(request: NextRequest) {
  if (!limiter.consume(getClientIpFromHeaders(request.headers))) {
    return new NextResponse(null, { status: 204 });
  }
  try {
    const body = await request.json() as { event?: unknown; detail?: unknown };
    const event = typeof body.event === "string" && SAFE.test(body.event) ? body.event : null;
    const detail = typeof body.detail === "string" && SAFE.test(body.detail) ? body.detail : "";
    if (event) console.log("[agent]", event, detail);
  } catch { /* ignore malformed diagnostics */ }
  return new NextResponse(null, { status: 204 });
}
