import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, UUID_RE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Archives a record (it stays in the database; it just leaves the list). */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ recordId: string }> }) {
  const { recordId } = await ctx.params;
  if (!UUID_RE.test(recordId)) return registryJson({ status: "error", message_kiny: "Inyandiko ntiyemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { error } = await auth.context.supabase.rpc("archive_office_record_v1", { p_id: recordId });
  if (error) return officeDbError(error, "Ntibyashobotse kubika.");
  return registryJson({ status: "success" });
}
