import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Flat, searchable table of leaders inside the caller's scope. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  const level = request.nextUrl.searchParams.get("level");
  if (level !== null && level !== "" && !["district", "sector", "cell", "village"].includes(level)) {
    return registryJson({ status: "error", message_kiny: "Urwego ntirwemewe." }, 422);
  }
  const { data, error } = await auth.context.supabase.rpc("list_office_leaders_v1", {
    p_search: q || null,
    p_level: level || null,
    p_limit: 200,
  });
  if (error) return officeDbError(error, "Abayobozi ntibabonetse.");
  return registryJson({ status: "success", leaders: data ?? [] });
}
