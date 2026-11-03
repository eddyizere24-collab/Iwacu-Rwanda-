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
  change_reason: z.string().trim().min(4).max(2000),
});

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const search = request.nextUrl.searchParams.get("q")?.trim();
  let query = auth.context.supabase
    .from("leader_people")
    .select("id, first_name, last_name, version, created_at, updated_at, archived_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (search) {
    // Keep the PostgREST OR expression limited to plain name characters.
    const safe = search.replace(/[^\\p{L}\\p{M}\\p{N}' -]/gu, " ").trim().slice(0, 80);
    if (safe) query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
  }
  const { data: peopleRows, error } = await query;
  if (error) return registryDbError(error, "Ntibyashobotse kubona urutonde rw'abantu banditswe.");

  const people = peopleRows ?? [];
  const personIds = people.map((person) => person.id);
  if (!personIds.length) return registryJson({ status: "success", people: [] });

  // Show only appointment details the current administrator is already
  // permitted to read by appointment RLS; these help distinguish people
  // who share similar names without exposing other territories' records.
  const { data: appointments, error: appointmentError } = await auth.context.supabase
    .from("leader_appointments")
    .select("person_id, position_id, administrative_unit_id, appointment_status, effective_from, effective_to")
    .in("person_id", personIds)
    .order("effective_from", { ascending: false })
    .limit(300);
  if (appointmentError) return registryDbError(appointmentError, "Amakuru y'imyanya y'aba bantu ntiyabonetse.");

  const positionIds = [...new Set((appointments ?? []).map((item) => item.position_id))];
  const unitIds = [...new Set((appointments ?? []).map((item) => item.administrative_unit_id))];
  const [positionsResult, unitsResult] = await Promise.all([
    positionIds.length
      ? auth.context.supabase.from("leader_positions").select("id, title_kiny").in("id", positionIds)
      : Promise.resolve({ data: [], error: null }),
    unitIds.length
      ? auth.context.supabase.from("boundaries").select("id, scope_code, name_kiny").in("id", unitIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const detailError = positionsResult.error || unitsResult.error;
  if (detailError) return registryDbError(detailError, "Amakuru atandukanya abayobozi bafite amazina amwe ntiyabonetse.");

  const positionNames = new Map((positionsResult.data ?? []).map((item) => [item.id, item.title_kiny]));
  const units = new Map((unitsResult.data ?? []).map((item) => [item.id, item]));
  const byPerson = new Map<string, Array<Record<string, unknown>>>();
  for (const appointment of appointments ?? []) {
    const entry = {
      appointment_status: appointment.appointment_status,
      effective_from: appointment.effective_from,
      effective_to: appointment.effective_to,
      position_title_kiny: positionNames.get(appointment.position_id) ?? "Umwanya",
      administrative_unit_name_kiny: units.get(appointment.administrative_unit_id)?.name_kiny ?? "Agace",
      scope_code: units.get(appointment.administrative_unit_id)?.scope_code ?? null,
    };
    const existing = byPerson.get(appointment.person_id) ?? [];
    existing.push(entry);
    byPerson.set(appointment.person_id, existing);
  }

  return registryJson({
    status: "success",
    people: people.map((person) => ({
      ...person,
      appointments: byPerson.get(person.id) ?? [],
    })),
  });
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
  const { id, version, first_name, last_name, change_reason } = parsed.data;
  const { data, error } = await auth.context.supabase.rpc("update_leader_person_identity_v2", {
    p_person_id: id,
    p_expected_version: version,
    p_first_name: first_name,
    p_last_name: last_name,
    p_change_reason: change_reason,
  });
  if (error?.code === "40001") {
    return registryJson({
      status: "error",
      code: "VERSION_CONFLICT",
      message_kiny: "Uyu mwirondoro wahinduwe n'undi muyobozi. Ongera ufungure amakuru mashya mbere yo gukomeza.",
    }, 409);
  }
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
