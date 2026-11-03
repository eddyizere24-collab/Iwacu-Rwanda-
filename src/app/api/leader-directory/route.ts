import { NextRequest } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { registryDbError, registryJson } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ScopeSchema = z.string().regex(/^RW(?:-[A-Z0-9]{1,12}){0,5}$/).max(80);

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope_code");
  if (scope && !ScopeSchema.safeParse(scope).success) {
    return registryJson({ status: "error", message_kiny: "Agace wasabye ntikemewe.", leaders: [] }, 400);
  }
  if (!isSupabasePublicConfigured()) {
    return registryJson({ status: "success", leaders: [], unavailable: true }, 200);
  }

  const supabase = createSupabasePublicClient();
  let query = supabase
    .from("leader_directory_public")
    .select(
      "appointment_id, person_id, display_name, position_code, title_kiny, title_eng, title_fra, administrative_unit_id, scope_code, administrative_unit_name_kiny, administrative_unit_name_eng, administrative_unit_level, effective_from, effective_to, biography, office_hours, service_priorities, public_photo_object_key, public_contacts"
    )
    .order("administrative_unit_level", { ascending: false })
    .order("display_name", { ascending: true })
    .limit(60);

  // Match the selected administrative unit and its descendants only.
  // The delimiter prevents a neighbouring prefix (for example RW-01 vs RW-010).
  if (scope && scope !== "RW") {
    query = query.or(`scope_code.eq.${scope},scope_code.like.${scope}-%`);
  }

  const { data, error } = await query;
  if (error) {
    // Before the V2 migration is released, the view does not exist yet.
    if (error.code === "42P01" || error.code === "PGRST205") {
      return registryJson({ status: "success", leaders: [], unavailable: true }, 200);
    }
    return registryDbError(error, "Amakuru y'abayobozi ntashoboye kuboneka ubu.");
  }
  return registryJson({ status: "success", leaders: data ?? [] });
}
