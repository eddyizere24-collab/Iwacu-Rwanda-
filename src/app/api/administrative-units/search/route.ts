import { NextRequest, NextResponse } from "next/server";
import offlineLocationIndex from "../../../../../public/offline/location-index.json";
import { searchAdministrativeUnits } from "@/lib/administrative-search";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createIpRateLimiter({ limit: 120, windowMs: 60_000 });

/**
 * One search over villages, cells, sectors, districts and provinces. Reads only the bundled public NISR index
 * (no database, no secrets, no personal data). The person's position never comes here: the phone orders the answers by distance.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!limiter.consume(getClientIpFromHeaders(req.headers))) {
    return NextResponse.json({ status: "error", total: 0, units: [] }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  // Only letters, digits, spaces and the few marks used in names; anything else is dropped before use.
  const q = (req.nextUrl.searchParams.get("q") ?? "")
    .normalize("NFC").replace(/[^\p{L}\p{N}\s'’\-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ status: "success", total: 0, units: [] });

  const { total, units } = searchAdministrativeUnits(offlineLocationIndex, q);
  return NextResponse.json({ status: "success", total, units }, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
