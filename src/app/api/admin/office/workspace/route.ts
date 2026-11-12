import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dashboard numbers for the caller's own scope. The database decides the scope. */
export async function GET() {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("get_office_workspace_v1");
  if (error) return officeDbError(error, "Imibare ntiyabonetse.");
  return registryJson({ status: "success", workspace: data });
}
