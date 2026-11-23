import { NextRequest, NextResponse } from "next/server";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";
import { loadRoadGraph } from "@/lib/routing/load-graph";
import { TRAVEL_MODES, type TravelMode } from "@/lib/routing/profiles";
import { findRoute, isFailure, thinPath } from "@/lib/routing/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const limiter = createIpRateLimiter({ limit: 40, windowMs: 60_000 });

function parsePoint(text: string | null): { lat: number; lng: number } | null {
  const parts = (text ?? "").split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lat, lng] = parts;
  if (lat < -3.0 || lat > -0.8 || lng < 28.7 || lng > 31.1) return null;
  return { lat, lng };
}

/**
 * Our own Rwanda-only routing: /api/ikarita/route?from=lat,lng&to=lat,lng[&modes=car,moto,bike,foot]
 * Uses IWACU's road graph (OpenStreetMap roads hosted by us), never an outside routing service.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!limiter.consume(getClientIpFromHeaders(req.headers))) {
    return NextResponse.json({ status: "error", error: "rate_limited" }, { status: 429 });
  }
  const from = parsePoint(req.nextUrl.searchParams.get("from"));
  const to = parsePoint(req.nextUrl.searchParams.get("to"));
  if (!from || !to) return NextResponse.json({ status: "error", error: "bad_points" }, { status: 400 });
  const requested = (req.nextUrl.searchParams.get("modes") ?? TRAVEL_MODES.join(","))
    .split(",").map((m) => m.trim()).filter((m): m is TravelMode => (TRAVEL_MODES as readonly string[]).includes(m));
  const modes = requested.length ? Array.from(new Set(requested)) : [...TRAVEL_MODES];

  let graph;
  try {
    graph = await loadRoadGraph(req.nextUrl.origin);
  } catch {
    return NextResponse.json({ status: "unavailable", error: "graph_unavailable" }, { status: 503 });
  }

  const routes: Record<string, unknown> = {};
  for (const mode of modes) {
    const result = findRoute(graph, mode, from, to);
    if (isFailure(result)) { routes[mode] = { error: result.error }; continue; }
    routes[mode] = {
      distance_m: result.distance_m,
      duration_s: result.duration_s,
      geometry: thinPath(result.geometry, result.distance_m > 30000 ? 40 : 12).map(([la, ln]) => [Number(la.toFixed(5)), Number(ln.toFixed(5))]),
      steps: result.legs
        .filter((leg) => leg.distance_m >= 30)
        .map((leg) => ({ name: leg.name, cls: leg.cls, distance_m: leg.distance_m, duration_s: leg.duration_s })),
    };
  }
  return NextResponse.json({ status: "success", from, to, routes, attribution: "OpenStreetMap contributors (ODbL)" }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
