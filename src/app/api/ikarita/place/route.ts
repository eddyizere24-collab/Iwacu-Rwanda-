import { NextRequest, NextResponse } from "next/server";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE_CODE = /^RW(?:-[A-Z0-9]{1,12}){0,5}$/;

/** One administrative place (any level) with its outline, parents and children, for the map page. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const scopeCode = req.nextUrl.searchParams.get("scope_code")?.trim() ?? "";
  if (!SCOPE_CODE.test(scopeCode) || scopeCode.length > 80) {
    return NextResponse.json({ status: "error", found: false }, { status: 400 });
  }
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ status: "unavailable", found: false }, { status: 503 });
  }
  const { data, error } = await createSupabasePublicClient().rpc("get_ikarita_place_v1", { p_scope_code: scopeCode });
  if (error || !data || typeof data !== "object") {
    return NextResponse.json({ status: "unavailable", found: false }, { status: 503 });
  }
  const place = data as Record<string, unknown>;
  if (place.found !== true) return NextResponse.json({ status: "missing", found: false }, { status: 404 });
  return NextResponse.json({ status: "success", ...place }, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
