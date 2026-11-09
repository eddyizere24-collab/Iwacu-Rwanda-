import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { intParam, officeDbError, SCOPE_CODE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every account below the caller, with its state (invited / active / suspended). */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  if (status && !["invited", "active", "suspended"].includes(status)) return registryJson({ status: "error", message_kiny: "Imiterere ntiyemewe." }, 422);
  const under = sp.get("under");
  if (under && !SCOPE_CODE.test(under)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const { data, error } = await auth.context.supabase.rpc("list_office_accounts_v1", {
    p_search: (sp.get("q") ?? "").trim().slice(0, 60) || null,
    p_status: status || null,
    p_limit: intParam(sp.get("limit"), 50, 1, 100),
    p_offset: intParam(sp.get("offset"), 0, 0, 100000),
    p_under: under || null,
  });
  if (error) return officeDbError(error, "Konti ntizabonetse.");
  const rows = (data ?? []) as { total: number | string }[];
  return registryJson({ status: "success", accounts: rows, total: rows.length ? Number(rows[0].total) : 0 });
}
