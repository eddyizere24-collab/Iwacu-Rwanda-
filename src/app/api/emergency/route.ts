/**
 * GET /api/emergency
 * Public. Returns the NATIONAL emergency numbers (verified only). Local numbers for a place are returned by /api/locate.
 * The same list is shipped as /emergency-national.json so the page can still show it without a connection.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { EMERGENCY_SELECT, toEmergencyList, type EmergencyRow } from "@/lib/emergency/public";
import { createLocateError } from "@/lib/utils/errors";
import { isRateLimited, clientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (await isRateLimited(`emergency:ip:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json(createLocateError("RATE_LIMIT"), { status: 429, headers: { "Retry-After": "60" } });
    }
    const db = createSupabaseServiceClient();
    const { data, error } = await db.from("emergency_contacts").select(EMERGENCY_SELECT).is("scope_code", null).eq("status", "verified");
    if (error) {
      console.error("[emergency] GET error code:", error.code);
      return NextResponse.json(createLocateError("DATABASE_ERROR"), { status: 502 });
    }
    return NextResponse.json(
      { status: "success", items: toEmergencyList((data ?? []) as unknown as EmergencyRow[]) },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json(createLocateError("DATABASE_ERROR"), { status: 502 });
  }
}
