import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNIT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ unitId: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { unitId } = await ctx.params;
  if (!UNIT.test(unitId)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("get_office_unit_leader_v1", { p_unit_id: unitId });
  if (error) return officeDbError(error, "Ikarita ntiyabonetse.");
  const card = Array.isArray(data) ? data[0] ?? null : null;
  if (!card) return registryJson({ status: "error", message_kiny: "Ahantu ntihabonetse." }, 404);
  return registryJson({ status: "success", card });
}

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const SaveSchema = z.object({
  display_name: z.string().trim().min(2).max(120),
  job_title: optionalText(120),
  phone: optionalText(20),
  public_email: optionalText(160),
  bio: optionalText(600),
  office_hours: optionalText(120),
  is_public: z.boolean().default(true),
  show_phone: z.boolean().default(true),
  photo_path: z.string().max(200).optional().nullable(),
  remove_photo: z.boolean().default(false),
});

/** Create or edit the leader card of one place. The database checks the caller's authority. */
export async function PUT(request: NextRequest, ctx: Ctx) {
  const { unitId } = await ctx.params;
  if (!UNIT.test(unitId)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = SaveSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Andika amazina nibura (inyuguti 2). Reba telefone na imeri." }, 422);
  const v = parsed.data;
  const { error } = await auth.context.supabase.rpc("save_office_unit_leader_v1", {
    p_unit_id: unitId,
    p_display_name: v.display_name,
    p_job_title: v.job_title,
    p_phone: v.phone,
    p_public_email: v.public_email,
    p_bio: v.bio,
    p_office_hours: v.office_hours,
    p_is_public: v.is_public,
    p_show_phone: v.show_phone,
    p_photo_path: v.photo_path ?? null,
    p_remove_photo: v.remove_photo,
  });
  if (error) return officeDbError(error, "Ikarita ntiyabitswe.");
  return registryJson({ status: "success" });
}

/** Removes a card that has no login behind it (accounts are not removed here). */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { unitId } = await ctx.params;
  if (!UNIT.test(unitId)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("remove_office_unit_leader_v1", { p_unit_id: unitId });
  if (error) return officeDbError(error, "Ikarita ntiyakuweho.");
  return registryJson({ status: "success", removed: data === true });
}
