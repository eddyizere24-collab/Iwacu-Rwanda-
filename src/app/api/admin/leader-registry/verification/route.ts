import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SubmitSchema = z.object({ appointment_id: z.string().uuid() });
const DecisionSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  verification_status: z.enum(["under_review", "approved", "rejected", "suspended", "disputed"]),
  decision_reason: z.string().trim().min(4).max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const appointmentId = request.nextUrl.searchParams.get("appointment_id");
  if (appointmentId && !z.string().uuid().safeParse(appointmentId).success) {
    return registryJson({ status: "error", message_kiny: "Appointment ID ntiyemewe." }, 400);
  }
  let query = auth.context.supabase
    .from("leader_verification_cases")
    .select("id, appointment_id, verification_status, submitted_by, assigned_reviewer, decision_by, decision_at, decision_reason, created_at, updated_at, version")
    .order("created_at", { ascending: false })
    .limit(100);
  if (appointmentId) query = query.eq("appointment_id", appointmentId);
  const { data, error } = await query;
  if (error) return registryDbError(error, "Imanza zo kugenzura abayobozi ntizabonetse.");
  return registryJson({ status: "success", cases: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = SubmitSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Hitamo appointment iriho." }, 422);

  const { data, error } = await auth.context.supabase
    .from("leader_verification_cases")
    .insert({ appointment_id: parsed.data.appointment_id, verification_status: "pending" })
    .select("id, appointment_id, verification_status, submitted_by, created_at, version")
    .single();
  if (error) return registryDbError(error, "Kohereza appointment ngo igenzurwe byanze.");
  return registryJson({ status: "success", verification_case: data }, 201);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = DecisionSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Icyemezo n'impamvu bigomba gusobanuka neza." }, 422);
  if (["approved", "rejected", "suspended", "disputed"].includes(parsed.data.verification_status) && !parsed.data.decision_reason) {
    return registryJson({ status: "error", message_kiny: "Andika impamvu y'icyemezo mbere yo gukomeza." }, 422);
  }

  const { data, error } = await auth.context.supabase.rpc("decide_leader_verification_v2", {
    p_verification_case_id: parsed.data.id,
    p_decision: parsed.data.verification_status,
    p_reason: parsed.data.decision_reason ?? null,
    p_expected_version: parsed.data.version,
  });
  if (error?.code === "40001") {
    return registryJson({ status: "error", code: "VERSION_CONFLICT", message_kiny: "Iyi dosiye yahinduwe n'undi muntu. Ongera uyifungure ubone amakuru mashya." }, 409);
  }
  if (error) return registryDbError(error, "Icyemezo cyo kugenzura umuyobozi nticyabitswe.");
  return registryJson({ status: "success", decision: data });
}
