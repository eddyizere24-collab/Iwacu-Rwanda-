import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, SCOPE_CODE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirmation state of one place's leader card (for its dossier). */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const scope = request.nextUrl.searchParams.get("scope");
  if (!scope || !SCOPE_CODE.test(scope)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const { data, error } = await auth.context.supabase.rpc("get_office_unit_verification_v1", { p_scope: scope });
  if (error) return officeDbError(error, "Ntibyabonetse.");
  return registryJson({ status: "success", verification: data });
}
