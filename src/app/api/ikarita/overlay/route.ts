import { NextRequest, NextResponse } from "next/server";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";
import { OVERLAY_SIZES_MILLI, tileBounds, type OverlayLevel } from "@/lib/map/tiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createIpRateLimiter({ limit: 300, windowMs: 60_000 });
const LEVELS: OverlayLevel[] = ["village", "cell", "sector", "district"];
const TOLERANCE: Record<string, number> = {
  "village:20": 0.00003, "village:50": 0.00006, "village:100": 0.0001, "village:250": 0.0002,
  "cell:20": 0.0001, "cell:50": 0.0001, "cell:100": 0.00015, "cell:250": 0.0003,
  "sector:20": 0.0002, "sector:50": 0.0002, "sector:100": 0.0003, "sector:250": 0.0003,
  "district:20": 0.0008, "district:50": 0.0008, "district:100": 0.0008, "district:250": 0.0008,
};
const memory = new Map<string, { at: number; body: unknown }>();
const MEMORY_MS = 30 * 60_000;

/**
 * One fixed map tile of administrative outlines: /api/ikarita/overlay?level=village&size=20&ix=1503&iy=-98
 * Fixed tile addresses mean the CDN and the phone's own cache answer repeat visits without touching the database.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  const level = params.get("level") as OverlayLevel;
  const size = Number(params.get("size"));
  const ix = Number(params.get("ix"));
  const iy = Number(params.get("iy"));
  if (!LEVELS.includes(level) || !(OVERLAY_SIZES_MILLI as readonly number[]).includes(size) || !Number.isInteger(ix) || !Number.isInteger(iy)) {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }
  const bounds = tileBounds({ ix, iy }, size);
  if (bounds.west >= bounds.east || bounds.south >= bounds.north || bounds.east <= 28.7 || bounds.west >= 31.1 || bounds.north <= -3.0 || bounds.south >= -0.8) {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  const cacheKey = `${level}:${size}:${ix},${iy}`;
  const hit = memory.get(cacheKey);
  const headers = { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" };
  if (hit && Date.now() - hit.at < MEMORY_MS) return NextResponse.json(hit.body, { headers });

  if (!limiter.consume(getClientIpFromHeaders(req.headers))) {
    return NextResponse.json({ status: "error", features: [] }, { status: 429 });
  }
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ status: "unavailable", features: [] }, { status: 503 });
  }

  const call = () => createSupabasePublicClient().rpc("get_ikarita_overlay_v1", {
    p_west: bounds.west, p_south: bounds.south, p_east: bounds.east, p_north: bounds.north,
    p_level: level, p_tolerance: TOLERANCE[`${level}:${size}`] ?? 0.0001, p_limit: 800,
  });
  let { data, error } = await call();
  if (error) ({ data, error } = await call()); // a cold database can fail the very first call
  if (error || !data || typeof data !== "object" || (data as { type?: string }).type !== "FeatureCollection") {
    return NextResponse.json({ status: "unavailable", features: [] }, { status: 503 });
  }
  if (memory.size > 400) memory.clear();
  memory.set(cacheKey, { at: Date.now(), body: data });
  return NextResponse.json(data, { headers });
}
