import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { intParam, officeDbError, SCOPE_CODE, UUID_RE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Citizen cases (reports about wrong leaders / phones / places) inside the caller's scope. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  if (status && !["new", "reviewing", "resolved", "rejected", "open"].includes(status)) return registryJson({ status: "error", message_kiny: "Imiterere ntiyemewe." }, 422);
  const scope = sp.get("scope");
  if (scope && !SCOPE_CODE.test(scope)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const { data, error } = await auth.context.supabase.rpc("list_office_cases_v1", {
    p_status: status || null, p_scope: scope || null,
    p_limit: intParam(sp.get("limit"), 30, 1, 100), p_offset: intParam(sp.get("offset"), 0, 0, 100000),
  });
  if (error) return officeDbError(error, "Ibibazo ntibyabonetse.");
  const rows = (data ?? []) as { total: number | string }[];
  return registryJson({ status: "success", cases: rows, total: rows.length ? Number(rows[0].total) : 0 });
}

const Patch = z.object({ id: z.string().regex(UUID_RE), status: z.enum(["new", "reviewing", "resolved", "rejected"]) });

export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Patch.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Amakuru ntiyemewe." }, 422);
  const { error } = await auth.context.supabase.rpc("set_office_case_status_v1", { p_id: parsed.data.id, p_status: parsed.data.status });
  if (error) return officeDbError(error, "Ikibazo ntikibitswe.");
  return registryJson({ status: "success" });
}
