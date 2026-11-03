import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EvidenceSchema = z.object({
  appointment_id: z.string().uuid(),
  verification_case_id: z.string().uuid(),
  evidence_type: z.string().trim().min(2).max(80),
  reference_number: z.string().trim().min(1).max(160),
  issuer: z.string().trim().min(2).max(200),
  issued_on: z.string().date().nullable().optional(),
  valid_until: z.string().date().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const caseId = request.nextUrl.searchParams.get("verification_case_id");
  if (!caseId || !z.string().uuid().safeParse(caseId).success) {
    return registryJson({ status: "error", message_kiny: "Verification case ID irakenewe." }, 400);
  }
  const { data, error } = await auth.context.supabase
    .from("leader_appointment_evidence")
    .select("id, appointment_id, verification_case_id, evidence_type, reference_number, issuer, issued_on, valid_until, mime_type, byte_size, sha256, uploaded_by, created_at")
    .eq("verification_case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) return registryDbError(error, "Ibyangombwa by'iyi dosiye ntibibonetse.");
  return registryJson({ status: "success", evidence: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = EvidenceSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Ibisobanuro by'icyemezo ntibyujuje ibisabwa." }, 422);

  const { error } = await auth.context.supabase
    .from("leader_appointment_evidence")
    .insert(parsed.data);
  if (error) return registryDbError(error, "Ibisobanuro by'icyemezo ntibyabitswe.");

  // Document upload/storage is deliberately not implied here. This endpoint
  // records evidence metadata only; private file storage remains a release gate.
  return registryJson({
    status: "success",
    evidence_metadata_saved: true,
    file_uploaded: false,
    message_kiny: "Ibisobanuro by'icyemezo byabitswe. Nta nyandiko ya file yoherejwe muri iyi ntambwe.",
  }, 201);
}
