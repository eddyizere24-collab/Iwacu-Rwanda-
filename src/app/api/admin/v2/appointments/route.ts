import { NextRequest, NextResponse } from "next/server";
import { createAppointmentSchema } from "@/lib/leaders-v2/schemas";
import { getRegistrySession, registryErrorMessage } from "@/lib/leaders-v2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user, error: sessionError } = await getRegistrySession();
  if (!user || sessionError) {
    return NextResponse.json({ status: "error", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leader_appointments")
    .select(`
      id, person_id, position_id, administrative_unit_id,
      effective_from, effective_to, appointment_status, version, created_at,
      person:leader_people!inner(id, first_name, last_name),
      position:leader_positions!inner(id, code, title_kiny, title_eng, title_fra, required_boundary_level),
      unit:boundaries!leader_appointments_administrative_unit_id_fkey(id, scope_code, level, name_kiny, name_eng),
      verification:leader_verification_cases(id, verification_status, decision_reason, submitted_by, decision_at),
      public_profile:leader_public_profiles(publication_status, display_name)
    `)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("[leaders-v2 appointments GET] query failed:", error.code, error.message);
    return NextResponse.json(
      { status: "error", message_kiny: registryErrorMessage(error), appointments: [] },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: "success", appointments: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, user, error: sessionError } = await getRegistrySession();
  if (!user || sessionError) {
    return NextResponse.json({ status: "error", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", message_kiny: "Amakuru yoherejwe ntabwo asomeka." }, { status: 400 });
  }

  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "error", message_kiny: "Reba neza amakuru yose mbere yo kohereza.", errors: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const input = parsed.data;
  const { data, error } = await supabase.rpc("create_leader_appointment_v2", {
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_position_id: input.position_id,
    p_administrative_unit_id: input.administrative_unit_id,
    p_effective_from: input.effective_from,
    p_evidence_type: input.evidence.evidence_type,
    p_reference_number: input.evidence.reference_number,
    p_issuer: input.evidence.issuer,
    p_issued_on: input.evidence.issued_on ?? null,
    p_valid_until: input.evidence.valid_until ?? null,
    p_private_storage_key: null,
  });

  if (error || !data) {
    console.error("[leaders-v2 appointments POST] RPC failed:", error?.code, error?.message);
    return NextResponse.json(
      { status: "error", message_kiny: registryErrorMessage(error) },
      { status: error?.code === "42501" || error?.code === "P0001" ? 403 : 422 }
    );
  }

  return NextResponse.json(
    { status: "success", appointment_id: data, message_kiny: "Amakuru yoherejwe kugira ngo asuzumwe." },
    { status: 201 }
  );
}
