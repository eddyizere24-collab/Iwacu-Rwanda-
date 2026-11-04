import { NextRequest } from "next/server";
import { z } from "zod";
import { registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const targetId = request.nextUrl.searchParams.get("target_id");
  if (targetId && !z.string().uuid().safeParse(targetId).success) {
    return registryJson({ status: "error", message_kiny: "Target ID ntiyemewe." }, 400);
  }
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isInteger(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 50;
  let query = auth.context.supabase
    .from("leader_audit_events")
    .select("id, actor_id, actor_role, action, target_table, target_id, administrative_unit_id, changed_fields, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (targetId) query = query.eq("target_id", targetId);
  const { data, error } = await query;
  if (error) return registryDbError(error, "Amateka y'ibikorwa ntabonetse.");
  return registryJson({ status: "success", events: data ?? [] });
}
