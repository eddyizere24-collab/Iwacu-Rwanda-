import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AppointmentSchema = z.object({
  person_id: z.string().uuid(),
  position_id: z.string().uuid(),
  administrative_unit_id: z.string().uuid(),
  effective_from: z.string().date(),
  appointment_status: z.enum(["draft", "pending"]).default("draft"),
});

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;

  const unitId = request.nextUrl.searchParams.get("administrative_unit_id");
  if (unitId && !z.string().uuid().safeParse(unitId).success) {
    return registryJson({ status: "error", message_kiny: "Umwirondoro w'agace ntukwiye." }, 400);
  }

  let query = auth.context.supabase
    .from("leader_appointments")
    .select("id, person_id, position_id, administrative_unit_id, effective_from, effective_to, appointment_status, recorded_by, created_at, updated_at, version")
    .order("effective_from", { ascending: false })
    .limit(120);
  if (unitId) query = query.eq("administrative_unit_id", unitId);

  const { data: appointments, error } = await query;
  if (error) return registryDbError(error, "Amakuru y'imyanya y'abayobozi ntabonetse.");

  const peopleIds = [...new Set((appointments ?? []).map((a) => a.person_id))];
  const positionIds = [...new Set((appointments ?? []).map((a) => a.position_id))];
  const unitIds = [...new Set((appointments ?? []).map((a) => a.administrative_unit_id))];

  const [peopleResult, positionsResult, unitsResult] = await Promise.all([
    peopleIds.length ? auth.context.supabase.from("leader_people").select("id, first_name, last_name").in("id", peopleIds) : Promise.resolve({ data: [], error: null }),
    positionIds.length ? auth.context.supabase.from("leader_positions").select("id, code, title_kiny, title_eng, title_fra, required_boundary_level").in("id", positionIds) : Promise.resolve({ data: [], error: null }),
    unitIds.length ? auth.context.supabase.from("boundaries").select("id, scope_code, name_kiny, name_eng, level").in("id", unitIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const secondaryError = peopleResult.error || positionsResult.error || unitsResult.error;
  if (secondaryError) return registryDbError(secondaryError, "Amakuru ahuza umuyobozi n'umwanya n'agace ntiyabonetse.");

  const people = new Map((peopleResult.data ?? []).map((row) => [row.id, row]));
  const positions = new Map((positionsResult.data ?? []).map((row) => [row.id, row]));
  const units = new Map((unitsResult.data ?? []).map((row) => [row.id, row]));

  return registryJson({
    status: "success",
    appointments: (appointments ?? []).map((row) => ({
      ...row,
      person: people.get(row.person_id) ?? null,
      position: positions.get(row.position_id) ?? null,
      boundary: units.get(row.administrative_unit_id) ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = AppointmentSchema.safeParse(body.value);
  if (!parsed.success) {
    return registryJson({ status: "error", code: "VALIDATION_ERROR", message_kiny: "Amakuru y'ishyirwaho ry'umuyobozi ntiyuzuye neza." }, 422);
  }

  const { data, error } = await auth.context.supabase
    .from("leader_appointments")
    .insert(parsed.data)
    .select("id, person_id, position_id, administrative_unit_id, effective_from, effective_to, appointment_status, version, created_at")
    .single();
  if (error) return registryDbError(error, "Gushyiraho appointment byanze. Reba niba umwanya n'agace bihuye.");
  return registryJson({ status: "success", appointment: data }, 201);
}
