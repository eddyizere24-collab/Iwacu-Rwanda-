import { NextRequest, NextResponse } from "next/server";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validScope = /^RW(?:-[A-Z0-9]{1,12}){0,6}$/;

export async function GET(request: NextRequest) {
  const scopeCode = request.nextUrl.searchParams.get("scope_code")?.trim();

  if (scopeCode && !validScope.test(scopeCode)) {
    return NextResponse.json(
      { status: "error", message_kiny: "Agace wasabye ntikemewe.", leaders: [] },
      { status: 400 }
    );
  }

  if (!isSupabasePublicConfigured()) {
    return NextResponse.json(
      { status: "unavailable", message_kiny: "Serivisi y'urutonde rw'abayobozi ntiraboneka.", leaders: [] },
      { status: 503 }
    );
  }

  try {
    const supabase = createSupabasePublicClient();
    let query = supabase
      .from("leader_directory_public")
      .select(
        "appointment_id,person_id,display_name,position_code,title_kiny,title_eng,title_fra,administrative_unit_id,scope_code,administrative_unit_name_kiny,administrative_unit_name_eng,administrative_unit_level,effective_from,effective_to,biography,office_hours,service_priorities,public_photo_object_key,public_contacts"
      )
      .order("administrative_unit_name_kiny", { ascending: true })
      .limit(500);

    if (scopeCode && scopeCode !== "RW") {
      query = query.or(`scope_code.eq.${scopeCode},scope_code.like.${scopeCode}-%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[leaders-v2 directory] query failed:", error.code, error.message);
      return NextResponse.json(
        { status: "unavailable", message_kiny: "Ntibyashobotse kubona urutonde rw'abayobozi.", leaders: [] },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "success", leaders: data ?? [] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("[leaders-v2 directory] unexpected error:", error);
    return NextResponse.json(
      { status: "unavailable", message_kiny: "Serivisi ntiri kuboneka ubu.", leaders: [] },
      { status: 503 }
    );
  }
}
