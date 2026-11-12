import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, UUID_RE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { taskId } = await ctx.params;
  if (!UUID_RE.test(taskId)) return registryJson({ status: "error", message_kiny: "Umurimo ntiwemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("get_office_task_v1", { p_task: taskId });
  if (error) return officeDbError(error, "Umurimo ntiwabonetse.");
  return registryJson({ status: "success", detail: data });
}

const Patch = z.object({
  unit_id: z.string().regex(UUID_RE),
  status: z.enum(["acknowledged", "in_progress", "submitted", "approved", "returned"]),
  note: z.string().trim().max(2000).optional().nullable(),
});

/** Receiving office: acknowledge / start / submit. Issuing office: approve / return a submitted target. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { taskId } = await ctx.params;
  if (!UUID_RE.test(taskId)) return registryJson({ status: "error", message_kiny: "Umurimo ntiwemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Patch.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Amakuru ntiyemewe." }, 422);
  const { error } = await auth.context.supabase.rpc("update_office_task_target_v1", {
    p_task: taskId, p_unit: parsed.data.unit_id, p_status: parsed.data.status, p_note: parsed.data.note ?? null,
  });
  if (error) return officeDbError(error, "Ntibyashobotse kubika.");
  return registryJson({ status: "success" });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { taskId } = await ctx.params;
  if (!UUID_RE.test(taskId)) return registryJson({ status: "error", message_kiny: "Umurimo ntiwemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { error } = await auth.context.supabase.rpc("cancel_office_task_v1", { p_task: taskId });
  if (error) return officeDbError(error, "Umurimo ntiwahagaritswe.");
  return registryJson({ status: "success" });
}
