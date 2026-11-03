import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ContactSchema = z.object({
  appointment_id: z.string().uuid(),
  contact_type: z.enum(["office_phone", "mobile_phone", "email", "whatsapp", "website", "other"]),
  contact_value: z.string().trim().min(2).max(240),
  label: z.string().trim().max(100).nullable().optional(),
  visibility: z.enum(["private", "public"]).default("private"),
  sort_order: z.number().int().min(0).max(10000).default(100),
});
const ContactPatchSchema = z.object({
  id: z.string().uuid(),
  contact_value: z.string().trim().min(2).max(240).optional(),
  label: z.string().trim().max(100).nullable().optional(),
  visibility: z.enum(["private", "public"]).optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
}).refine((v) => Object.keys(v).length > 1, "At least one field is required");

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const appointmentId = request.nextUrl.searchParams.get("appointment_id");
  if (!appointmentId || !z.string().uuid().safeParse(appointmentId).success) {
    return registryJson({ status: "error", message_kiny: "Appointment ID irakenewe." }, 400);
  }
  const { data, error } = await auth.context.supabase
    .from("leader_contacts")
    .select("id, appointment_id, contact_type, contact_value, label, visibility, public_approved_at, sort_order, created_at, updated_at")
    .eq("appointment_id", appointmentId)
    .order("sort_order", { ascending: true });
  if (error) return registryDbError(error, "Imiyoboro yo kuvugana n'umuyobozi ntibonetse.");
  return registryJson({ status: "success", contacts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = ContactSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Imibare cyangwa amakuru yo kuvugana ntiyemewe." }, 422);
  const { error } = await auth.context.supabase.from("leader_contacts").insert(parsed.data);
  if (error) return registryDbError(error, "Uburyo bwo kuvugana ntibwabitswe.");
  return registryJson({
    status: "success",
    saved: true,
    message_kiny: "Amakuru yo kuvugana yabitswe. Yerekanywa ku baturage gusa ari uko yemejwe kandi appointment yasohowe.",
  }, 201);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = ContactPatchSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Amakuru yo kuvugana ntiyemewe." }, 422);
  const { id, ...changes } = parsed.data;
  const { data, error } = await auth.context.supabase
    .from("leader_contacts")
    .update(changes)
    .eq("id", id)
    .select("id, appointment_id, contact_type, contact_value, label, visibility, public_approved_at, sort_order, updated_at")
    .maybeSingle();
  if (error) return registryDbError(error, "Guhindura amakuru yo kuvugana byanze.");
  if (!data) return registryJson({ status: "error", code: "NOT_FOUND", message_kiny: "Aya makuru ntiyabonetse cyangwa nta burenganzira ufite." }, 404);
  return registryJson({ status: "success", contact: data });
}
