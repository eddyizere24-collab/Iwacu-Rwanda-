import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AppointmentSchema = z.object({
  person_id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1).max(80).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  position_id: z.string().uuid(),
  administrative_unit_id: z.string().uuid(),
  effective_from: z.string().date(),
  evidence_type: z.string().trim().min(2).max(80),
  reference_number: z.string().trim().min(1).max(160),
  issuer: z.string().trim().min(2).max(200),
  issued_on: z.string().date().nullable().optional(),
  valid_until: z.string().date().nullable().optional(),
}).superRefine((value, ctx) => {
  if (!value.person_id && (!value.first_name || !value.last_name)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["first_name"],
      message: "A new person requires first and last name.",
    });
  }
  if (value.person_id && (value.first_name || value.last_name)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["person_id"],
      message: "Existing-person appointments must use the saved identity without replacing its names.",
    });
  }
  if (value.issued_on && value.valid_until && value.valid_until < value.issued_on) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valid_until"], message: "Invalid evidence validity range." });
  }
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
    peopleIds.length ? auth.context.supabase.from("leader_people").select("id, first_name, last_name, version").in("id", peopleIds) : Promise.resolve({ data: [], error: null }),
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

  const input = parsed.data;
  if (input.person_id) {
    const { data, error } = await auth.context.supabase.rpc("create_leader_appointment_for_person_v2", {
      p_person_id: input.person_id,
      p_position_id: input.position_id,
      p_administrative_unit_id: input.administrative_unit_id,
      p_effective_from: input.effective_from,
      p_evidence_type: input.evidence_type,
      p_reference_number: input.reference_number,
      p_issuer: input.issuer,
      p_issued_on: input.issued_on ?? null,
      p_valid_until: input.valid_until ?? null,
      p_private_storage_key: null,
    });
    if (error) return registryDbError(error, "Ongerera uyu muntu appointment nshya byanze.");
    if (!data) return registryJson({ status: "error", message_kiny: "Appointment ntiyabitswe." }, 500);
    return registryJson({
      status: "success",
      appointment_id: data,
      reused_person_identity: true,
      message_kiny: "Appointment nshya yongewe ku mwirondoro wari usanzwe. Nta muntu mushya wiganywe.",
    }, 201);
  }

  const { data, error } = await auth.context.supabase.rpc("create_leader_appointment_v2", {
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_position_id: input.position_id,
    p_administrative_unit_id: input.administrative_unit_id,
    p_effective_from: input.effective_from,
    p_evidence_type: input.evidence_type,
    p_reference_number: input.reference_number,
    p_issuer: input.issuer,
    p_issued_on: input.issued_on ?? null,
    p_valid_until: input.valid_until ?? null,
    p_private_storage_key: null,
  });
  if (error) return registryDbError(error, "Kohereza umwirondoro, appointment n'icyemezo ngo bisuzumwe byanze.");
  if (!data) return registryJson({ status: "error", message_kiny: "Appointment ntiyabitswe." }, 500);

  return registryJson({
    status: "success",
    appointment_id: data,
    reused_person_identity: false,
    message_kiny: "Umwirondoro n'icyemezo byoherejwe hamwe kugira ngo bisuzumwe.",
  }, 201);
}
