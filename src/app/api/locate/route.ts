/**
 * POST /api/locate
 * Authoritative location lookup. Rate limited: 20 / min / IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { LocateError, LocateResponse } from "@/types/location";

export const dynamic = "force-dynamic";

function err(
  code: LocateError["code"],
  message_kiny: string,
  message_eng: string,
  status: number
) {
  const body: LocateError = {
    status: "error",
    code,
    message_kiny,
    message_eng,
  };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await checkRateLimit(`locate:${ip}`, 20, 60)) {
    return err("RATE_LIMIT", "Wageze ku gipimo. Tegereza gato.", "Rate limit exceeded.", 429);
  }

  let body: { lat?: number; lng?: number; latitude?: number; longitude?: number; accuracy?: number };
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION_ERROR", "Body must be JSON", "Body must be JSON", 400);
  }

  const lat = body.lat ?? body.latitude;
  const lng = body.lng ?? body.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return err("INVALID_COORDINATES", "lat na lng birakenewe", "lat and lng are required numbers", 400);
  }

  if (lat < -2.9 || lat > -1.0 || lng < 28.8 || lng > 30.9) {
    return err("OUTSIDE_RWANDA", "Uri hanze y'u Rwanda", "Outside Rwanda", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: sectorRow, error: sectorErr } = await supabase.rpc("locate_sector", {
      p_lat: lat,
      p_lng: lng,
    });

    if (sectorErr) {
      console.error("locate_sector error", sectorErr);
      return err(
        "DATABASE_ERROR",
        "Serivisi y'ububiko ntiyashyizweho neza",
        "Database not configured or RPC missing",
        503
      );
    }

    if (!sectorRow || (Array.isArray(sectorRow) && sectorRow.length === 0)) {
      return err("NOT_FOUND", "Nta gace cyabonetse", "No sector found for this point", 404);
    }

    const sector = Array.isArray(sectorRow) ? sectorRow[0] : sectorRow;

    const { data: leadersRaw, error: leadersErr } = await supabase
      .from("leaders_public_view")
      .select("*")
      .eq("scope_code", sector.code)
      .eq("status", "verified");

    if (leadersErr) {
      console.error("leaders fetch error", leadersErr);
    }

    const leaders = leadersRaw || [];

    const response: LocateResponse = {
      status: "success",
      matches: [],
      hierarchy: {
        sector: {
          code: sector.code,
          name_kiny: sector.name_kiny,
          name_eng: sector.name_eng ?? null,
          level: sector.level ?? "sector",
          confidence: 1,
        } as never,
      },
      leaders: leaders as never,
      source: "gps",
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("locate unexpected", e);
    return err("DATABASE_ERROR", "Habaye ikibazo. Ongera ugerageze.", "Unexpected server error", 500);
  }
}
