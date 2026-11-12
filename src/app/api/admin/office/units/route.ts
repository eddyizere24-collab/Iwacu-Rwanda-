import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Direct children of one place (default: the caller's own place), each with its leader card. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const parent = request.nextUrl.searchParams.get("parent");
  if (parent !== null && !/^RW(-[A-Za-z0-9]+){0,5}$/.test(parent)) {
    return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  }
  const { data, error } = await auth.context.supabase.rpc("list_office_units_v1", { p_parent_scope: parent });
  if (error) return officeDbError(error, "Inzego ntizabonetse.");
  return registryJson({ status: "success", units: data ?? [] });
}
