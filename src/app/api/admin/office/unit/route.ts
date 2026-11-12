import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, SCOPE_CODE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dossier of one place (default: the caller's own top place): leader, coverage, children, cases, tasks, recent changes. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const scope = request.nextUrl.searchParams.get("scope");
  if (scope !== null && !SCOPE_CODE.test(scope)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const { data, error } = await auth.context.supabase.rpc("get_office_unit_v1", { p_scope: scope });
  if (error) return officeDbError(error, "Amakuru y'aha hantu ntiyabonetse.");
  return registryJson({ status: "success", dossier: data });
}
