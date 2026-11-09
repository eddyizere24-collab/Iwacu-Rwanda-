import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, SCOPE_CODE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One row per direct child of a place (default: the caller's own place) with coverage numbers. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const scope = request.nextUrl.searchParams.get("scope");
  if (scope && !SCOPE_CODE.test(scope)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const { data, error } = await auth.context.supabase.rpc("list_office_report_v1", { p_scope: scope || null });
  if (error) return officeDbError(error, "Raporo ntiyabonetse.");
  return registryJson({ status: "success", rows: data ?? [], as_of: new Date().toISOString() });
}
