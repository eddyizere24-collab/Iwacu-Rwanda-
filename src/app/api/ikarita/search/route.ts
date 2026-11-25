import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/assistant/tools";
import { rankForMap } from "@/lib/map/search-rank";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createIpRateLimiter({ limit: 90, windowMs: 60_000 });

/** Place-name search for the map page (villages, cells, sectors, districts, provinces). */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!limiter.consume(getClientIpFromHeaders(req.headers))) {
    return NextResponse.json({ status: "error", places: [] }, { status: 429 });
  }
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (query.length < 2) return NextResponse.json({ status: "success", places: [] });

  // The first request after a quiet period can hit a cold database; one retry removes that failure.
  let result = await searchPlaces(query, 30);
  if (result.status === "unavailable") result = await searchPlaces(query, 30);
  if (result.status === "unavailable") {
    return NextResponse.json({ status: "unavailable", places: [] }, { status: 503 });
  }
  const places = rankForMap(result.data ?? [], query).slice(0, 8).map((place) => ({
    scope_code: place.scope_code,
    name_kiny: place.name_kiny,
    name_eng: place.name_eng,
    level: place.level,
    full_path: place.full_path,
  }));
  return NextResponse.json({ status: "success", places }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
