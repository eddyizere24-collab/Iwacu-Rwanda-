import { NextRequest } from "next/server";
import { z } from "zod";
import { registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const personId = request.nextUrl.searchParams.get("person_id");
  if (!personId || !z.string().uuid().safeParse(personId).success) {
    return registryJson({ status: "error", message_kiny: "Person ID irakenewe." }, 400);
  }
  const { data, error } = await auth.context.supabase
    .from("leader_person_history")
    .select("id, person_id, version, first_name, last_name, changed_by, change_reason, archived_at")
    .eq("person_id", personId)
    .order("version", { ascending: false })
    .limit(50);
  if (error) return registryDbError(error, "Amateka y'umwirondoro ntiyabonetse.");
  return registryJson({ status: "success", history: data ?? [] });
}
