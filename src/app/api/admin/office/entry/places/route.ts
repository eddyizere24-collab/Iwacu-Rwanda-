import { NextRequest } from "next/server";
import { registryJson } from "@/lib/leaders/registry-api";
import { SCOPE_CODE } from "@/lib/office/office-api";
import { createSupabaseServerClient, isSupabasePublicConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEVELS = new Set(["district", "sector", "cell"]);

/** Public list of places to pick from when entering an office. Names only; nothing about accounts. */
export async function GET(request: NextRequest) {
  if (!isSupabasePublicConfigured()) return registryJson({ status: "error", message_kiny: "Serivisi ntiboneka." }, 503);
  const sp = request.nextUrl.searchParams;
  const level = sp.get("level") ?? "";
  const parent = sp.get("parent");
  const q = (sp.get("q") ?? "").slice(0, 40);
  if (!LEVELS.has(level)) return registryJson({ status: "error", message_kiny: "Hitamo urwego." }, 422);
  if (parent && !SCOPE_CODE.test(parent)) return registryJson({ status: "error", message_kiny: "Aho uhereye si ho." }, 422);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_entry_places_v1", {
    p_level: level, p_parent_scope: parent, p_q: q || null, p_limit: 60,
  });
  if (error) return registryJson({ status: "error", message_kiny: "Ahantu ntiharabonetse. Ongera ugerageze." }, error.code === "22023" ? 422 : 500);
  return registryJson({ status: "success", places: data ?? [] });
}
