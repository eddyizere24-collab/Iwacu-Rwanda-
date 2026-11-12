import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { intParam, officeDbError, SCOPE_CODE, UUID_RE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Queue of leader cards below the caller that wait for (or already have) confirmation. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const state = sp.get("state") ?? "pending";
  if (!["pending", "verified", "all"].includes(state)) return registryJson({ status: "error", message_kiny: "Imiterere ntiyemewe." }, 422);
  const level = sp.get("level");
  if (level && !["district", "sector", "cell", "village"].includes(level)) return registryJson({ status: "error", message_kiny: "Urwego ntirwemewe." }, 422);
  const under = sp.get("under");
  if (under && !SCOPE_CODE.test(under)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const { data, error } = await auth.context.supabase.rpc("list_office_verification_v1", {
    p_state: state, p_under: under || null, p_level: level || null,
    p_limit: intParam(sp.get("limit"), 30, 1, 100), p_offset: intParam(sp.get("offset"), 0, 0, 100000),
  });
  if (error) return officeDbError(error, "Urutonde ntirwabonetse.");
  const rows = (data ?? []) as { total: number | string }[];
  return registryJson({ status: "success", items: rows, total: rows.length ? Number(rows[0].total) : 0 });
}

const Body = z.object({ unit_id: z.string().regex(UUID_RE), verified: z.boolean() });

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Body.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Amakuru ntiyemewe." }, 422);
  const { error } = await auth.context.supabase.rpc("verify_office_unit_leader_v1", { p_unit_id: parsed.data.unit_id, p_verified: parsed.data.verified });
  if (error) return officeDbError(error, "Ntibyashobotse kubika.");
  return registryJson({ status: "success" });
}
