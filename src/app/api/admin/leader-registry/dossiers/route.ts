import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DossierSchema = z.object({
  person_id: z.string().uuid(),
  education_level: z.string().trim().max(240).nullable().optional(),
  field_of_study: z.string().trim().max(240).nullable().optional(),
  institution: z.string().trim().max(240).nullable().optional(),
  internal_notes: z.string().trim().max(12000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const personId = request.nextUrl.searchParams.get("person_id");
  if (!personId || !z.string().uuid().safeParse(personId).success) {
    return registryJson({ status: "error", message_kiny: "Person ID irakenewe." }, 400);
  }
  const { data, error } = await auth.context.supabase
    .from("leader_dossiers")
    .select("person_id, education_level, field_of_study, institution, internal_notes, created_by, updated_by, created_at, updated_at, version")
    .eq("person_id", personId)
    .maybeSingle();
  if (error) return registryDbError(error, "Dossier y'ibanga ntibonetse cyangwa nta burenganzira ufite.");
  return registryJson({ status: "success", dossier: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = DossierSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Amakuru ya dossier ntiyemewe." }, 422);

  const payload = { ...parsed.data, updated_by: auth.context.user.id };
  const { data, error } = await auth.context.supabase
    .from("leader_dossiers")
    .upsert(payload, { onConflict: "person_id" })
    .select("person_id, education_level, field_of_study, institution, internal_notes, created_by, updated_by, created_at, updated_at, version")
    .single();
  if (error) return registryDbError(error, "Dossier y'ibanga ntiyabitswe.");
  return registryJson({ status: "success", dossier: data });
}
