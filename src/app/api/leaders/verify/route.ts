import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminAccess, type AdminScopeLevel } from "@/lib/security/admin-auth";
import { canAssignLeaderScope } from "@/lib/security/admin-authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Schema = z.object({
  leader_id: z.string().uuid(),
  evidence_ref: z.string().trim().min(3).max(200),
});

export async function POST(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access.ok) return NextResponse.json({ status: "error", message_kiny: access.message_kiny }, { status: access.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ status: "error", message_kiny: "Database ntihujwe neza." }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ status: "error", message_kiny: "Amakuru yoherejwe ntabwo ari JSON yemewe." }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: "error", message_kiny: "Andika reference y'inyandiko yemewe.", errors: parsed.error.flatten() }, { status: 422 });

  const supabase = createSupabaseServiceClient();
  const { data: leader, error } = await supabase.from("leaders")
    .select("id, scope_code, role, verification_status, version")
    .eq("id", parsed.data.leader_id).is("valid_to", null).maybeSingle();
  if (error || !leader) return NextResponse.json({ status: "error", message_kiny: "Umuyobozi ntabwo abonetse." }, { status: 404 });
  const { data: boundary } = await supabase.from("boundaries")
    .select("level").eq("scope_code", leader.scope_code).is("valid_to", null).maybeSingle();
  if (!boundary) return NextResponse.json({ status: "error", message_kiny: "Aho umuyobozi ashinzwe ntihabonetse." }, { status: 422 });

  const allowed = canAssignLeaderScope({
    isSuperAdmin: access.profile.is_super_admin === true,
    adminScopeCode: access.profile.scope_code,
    adminScopeLevel: access.scope_level,
    targetScopeCode: leader.scope_code,
    targetLevel: boundary.level as AdminScopeLevel,
  });
  if (!allowed) return NextResponse.json({ status: "error", message_kiny: "Iyi konti ntifite uburenganzira bwo kwemeza uyu muyobozi." }, { status: 403 });
  if (leader.verification_status === "approved") return NextResponse.json({ status: "success", message_kiny: "Uyu muyobozi yari yamaze kwemezwa." });

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase.from("leaders").update({
    verification_status: "approved",
    verification_evidence_ref: parsed.data.evidence_ref,
    verified_by: access.user.id,
    verified_at: now,
    updated_by: access.user.id,
    updated_at: now,
    version: leader.version + 1,
  }).eq("id", leader.id).eq("version", leader.version)
    .select("id, verification_status, verified_at, version").single();
  if (updateError || !updated) {
    console.error("[leaders verify] update failed:", updateError?.message);
    return NextResponse.json({ status: "error", message_kiny: "Kwemeza umuyobozi byanze. Ongera ugerageze." }, { status: 409 });
  }
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: access.user.id, action: "UPDATE", table_name: "leaders", record_id: leader.id,
    old_data: { verification_status: leader.verification_status },
    new_data: { verification_status: "approved", verification_evidence_ref: parsed.data.evidence_ref },
  });
  if (auditError) console.error("[leaders verify] audit log failed:", auditError.message);
  return NextResponse.json({ status: "success", message_kiny: "Umuyobozi yemejwe hashingiwe kuri reference y'inyandiko watanze.", leader: updated });
}
