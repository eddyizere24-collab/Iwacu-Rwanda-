import { NextRequest, NextResponse } from "next/server";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Feature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry?: unknown;
};
type Collection = {
  type: "FeatureCollection";
  features: Feature[];
  [key: string]: unknown;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  const west = Number(params.get("west"));
  const south = Number(params.get("south"));
  const east = Number(params.get("east"));
  const north = Number(params.get("north"));

  // Tight bbox and a bounded feature batch protect low-memory phones while
  // allowing dense neighbourhoods to show substantially more village polygons.
  if (
    ![west, south, east, north].every(Number.isFinite) ||
    west >= east || south >= north ||
    west < 28.7 || east > 31.1 ||
    south < -3.0 || north > -0.8 ||
    east - west > 0.5 || north - south > 0.5
  ) {
    return NextResponse.json(
      { status: "error", message: "A small Rwanda map bounding box is required." },
      { status: 400 }
    );
  }

  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ status: "unavailable", features: [] }, { status: 503 });
  }

  const { data, error } = await createSupabasePublicClient().rpc("get_location_map_overlay_v2", {
    p_west: west,
    p_south: south,
    p_east: east,
    p_north: north,
    p_limit: 300,
  });

  if (error || !data || typeof data !== "object") {
    return NextResponse.json({ status: "unavailable", features: [] }, { status: 503 });
  }

  const collection = data as Collection;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return NextResponse.json({ status: "unavailable", features: [] }, { status: 503 });
  }

  // Keep the canonical boundary scope_code identical to /api/locate's
  // village ID so map taps/results can be compared without name matching.
  const features = collection.features.map((feature) => {
    const properties = feature.properties ?? {};
    const scopeCode = String(
      properties.scope_code ??
      properties.village_scope_code ??
      properties.village_id ??
      ""
    );
    return {
      ...feature,
      id: scopeCode || feature.id,
      properties: {
        ...properties,
        ...(scopeCode ? { scope_code: scopeCode, village_id: scopeCode } : {}),
      },
    };
  });

  return NextResponse.json({ ...collection, features }, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
