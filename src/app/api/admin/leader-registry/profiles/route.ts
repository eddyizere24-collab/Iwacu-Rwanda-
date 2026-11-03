import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ProfileSchema = z.object({
  appointment_id: z.string().uuid(),
  display_name: z.string().trim().max(180).nullable().optional(),
  biography: z.string().trim().max(4000).nullable().optional(),
  office_hours: z.string().trim().max(1000).nullable().optional(),
  service_priorities: z.string().trim().max(2000).nullable().optional(),
  public_photo_object_key: z.string().trim().max(500).nullable().optional(),
});
const ProfilePatchSchema = ProfileSchema.omit({ appointment_id: true }).extend({
  appointment_id: z.string().uuid(),
  publication_status: z.enum(["draft", "published", "unpublished"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const appointmentId = request.nextUrl.searchParams.get("appointment_id");
  if (!appointmentId || !z.string().uuid().safeParse(appointmentId).success) {
    return registryJson({ status: "error", message_kiny: "Appointment ID irakenewe." }, 400);
  }
  const { data, error } = await auth.context.supabase
    .from("leader_public_profiles")
    .select("appointment_id, display_name, biography, office_hours, service_priorities, public_photo_object_key, publication_status, published_by, published_at, updated_by, updated_at")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (error) return registryDbError(error, "Umwirondoro ugenewe abaturage ntubonetse.");
  return registryJson({ status: "success", profile: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = ProfileSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Umwirondoro rusange ntiwujuje ibisabwa." }, 422);
  const { data, error } = await auth.context.supabase
    .from("leader_public_profiles")
    .insert({ ...parsed.data, publication_status: "draft" })
    .select("appointment_id, display_name, biography, office_hours, service_priorities, public_photo_object_key, publication_status, updated_at")
    .single();
  if (error) return registryDbError(error, "Umwirondoro rusange ntiwabitswe.");
  return registryJson({ status: "success", profile: data }, 201);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = ProfilePatchSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Amakuru yo guhindura umwirondoro ntiyemewe." }, 422);
  const { appointment_id, ...changes } = parsed.data;
  const { data, error } = await auth.context.supabase
    .from("leader_public_profiles")
    .update(changes)
    .eq("appointment_id", appointment_id)
    .select("appointment_id, display_name, biography, office_hours, service_priorities, public_photo_object_key, publication_status, published_by, published_at, updated_at")
    .maybeSingle();
  if (error) return registryDbError(error, "Guhindura cyangwa gusohora umwirondoro byanze.");
  if (!data) return registryJson({ status: "error", code: "NOT_FOUND", message_kiny: "Umwirondoro ntiwabonetse." }, 404);
  return registryJson({ status: "success", profile: data });
}
