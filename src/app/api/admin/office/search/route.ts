import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { intParam, officeDbError, SCOPE_CODE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEVELS = ["province", "district", "sector", "cell", "village"];

/** Any place inside the caller's scope: by name, by level (e.g. all sectors), or only places without a leader. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const level = sp.get("level");
  if (level && !LEVELS.includes(level)) return registryJson({ status: "error", message_kiny: "Urwego ntirwemewe." }, 422);
  const under = sp.get("under");
  if (under && !SCOPE_CODE.test(under)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const vacantRaw = sp.get("vacant");
  const { data, error } = await auth.context.supabase.rpc("search_office_units_v1", {
    p_q: (sp.get("q") ?? "").trim().slice(0, 60) || null,
    p_level: level || null,
    p_vacant: vacantRaw === "1" ? true : vacantRaw === "0" ? false : null,
    p_limit: intParam(sp.get("limit"), 50, 1, 100),
    p_offset: intParam(sp.get("offset"), 0, 0, 100000),
    p_under: under || null,
  });
  if (error) return officeDbError(error, "Gushakisha ntibyashobotse.");
  const rows = (data ?? []) as { total: number | string }[];
  return registryJson({ status: "success", units: rows, total: rows.length ? Number(rows[0].total) : 0 });
}
