import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { intParam, officeDbError } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const { data, error } = await auth.context.supabase.rpc("list_office_audit_v1", {
    p_limit: intParam(sp.get("limit"), 50, 1, 100), p_offset: intParam(sp.get("offset"), 0, 0, 100000),
  });
  if (error) return officeDbError(error, "Amateka ntiyabonetse.");
  const rows = (data ?? []) as { total: number | string }[];
  return registryJson({ status: "success", events: rows, total: rows.length ? Number(rows[0].total) : 0 });
}
