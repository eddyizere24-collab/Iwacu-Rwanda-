import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/assistant/tools";
import { rankForMap, rankKey } from "@/lib/map/search-rank";
import { searchGazetteer, townCentre } from "@/lib/map/gazetteer";
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
  const named = searchGazetteer(query, 8);
  if (result.status === "unavailable" && named.length === 0) {
    return NextResponse.json({ status: "unavailable", places: [] }, { status: 503 });
  }
  // Administrative places and named places (cities, markets, bus stations...) share one ranked list.
  const admin = rankForMap(result.data ?? [], query).map((place, index) => {
    const centre = townCentre(place.name_kiny, place.level);
    return {
      key: rankKey(place.name_kiny, place.level, query), index,
      place: {
        scope_code: place.scope_code, name_kiny: place.name_kiny, name_eng: place.name_eng, level: place.level,
        full_path: place.full_path, ...(centre ?? {}),
      },
    };
  });
  const merged = [
    ...admin,
    ...named.map((hit, index) => ({ key: hit.key, index: 100 + index, place: { ...hit, key: undefined } })),
  ].sort((a, b) => a.key - b.key || a.index - b.index);
  const places = merged.slice(0, 8).map((item) => item.place);
  return NextResponse.json({ status: "success", places }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
