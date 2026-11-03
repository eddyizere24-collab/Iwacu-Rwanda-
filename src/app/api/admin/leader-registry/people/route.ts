import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PersonSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(100),
});
const PersonUpdateSchema = PersonSchema.extend({
  id: z.string().uuid(),
  version: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const search = request.nextUrl.searchParams.get("q")?.trim();
  let query = auth.context.supabase
    .from("leader_people")
    .select("id, first_name, last_name, version, created_at, updated_at, archived_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (search) {
    const safe = search.replace(/[,%()]/g, " ").trim().slice(0, 80);
    if (safe) query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) return registryDbError(error, "Ntibyashobotse kubona urutonde rw'abantu banditswe.");
  return registryJson({ status: "success", people: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = PersonSchema.safeParse(body.value);
  if (!parsed.success) {
    return registryJson({ status: "error", code: "VALIDATION_ERROR", message_kiny: "Amazina ntiyuzuye neza." }, 422);
  }
  const { data, error } = await auth.context.supabase
    .from("leader_people")
    .insert({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    })
    .select("id, first_name, last_name, version, created_at")
    .single();
  if (error) return registryDbError(error, "Umwirondoro w'umuntu ntubitswe.");
  return registryJson({ status: "success", person: data }, 201);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = PersonUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return registryJson({ status: "error", code: "VALIDATION_ERROR", message_kiny: "Amakuru yo guhindura ntiyuzuye neza." }, 422);
  }
  const { id, version, first_name, last_name } = parsed.data;
  const { data, error } = await auth.context.supabase
    .from("leader_people")
    .update({ first_name, last_name })
    .eq("id", id)
    .eq("version", version)
    .select("id, first_name, last_name, version, updated_at")
    .maybeSingle();
  if (error?.code === "P0001") {
    return registryJson({
      status: "error",
      code: "CROSS_SCOPE_IDENTITY",
      message_kiny: "Uyu muntu ahujwe n'imyanya yo mu turere dutandukanye. Guhindura amazina ye bisaba ubuyobozi bw'Igihugu kugira ngo hatagira akarere gahindurirwa amakuru katabifitiye ububasha.",
    }, 422);
  }
  if (error) return registryDbError(error, "Guhindura umwirondoro byanze.");
  if (!data) return registryJson({ status: "error", code: "NOT_FOUND_OR_CONFLICT", message_kiny: "Umwirondoro ntiwabonetse cyangwa wahinduwe n'undi muntu." }, 409);
  return registryJson({ status: "success", person: data });
}
