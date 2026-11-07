import { requireLeaderAdmin, registryJson } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";
import { childLevelFor } from "@/lib/office/office-logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { supabase, user, assignments } = auth.context;

  const { data: profileRows, error: profileError } = await supabase.rpc("get_office_me_v1");
  if (profileError) return officeDbError(profileError, "Ntibyashobotse gusoma konti yawe.");
  const profile = Array.isArray(profileRows) ? profileRows[0] ?? null : null;

  const unitIds = [...new Set(assignments.map((a) => a.administrative_unit_id))];
  const { data: units } = await supabase
    .from("boundaries")
    .select("id, scope_code, name_kiny, name_eng, level")
    .in("id", unitIds)
    .is("valid_to", null);
  const unitMap = new Map((units ?? []).map((u) => [u.id, u]));

  const mine = assignments.map((a) => ({
    role_code: a.role_code,
    unit: unitMap.get(a.administrative_unit_id) ?? null,
    child_level: childLevelFor(a.role_code),
  }));

  return registryJson({
    status: "success",
    user: { id: user.id, email: user.email ?? null },
    profile: profile
      ? { display_name: profile.display_name, job_title: profile.job_title, login_name: profile.login_name, must_change_password: profile.must_change_password }
      : null,
    assignments: mine,
  });
}

/** Called after the person has set their own password (the password itself is changed by Supabase Auth). */
export async function POST() {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { error } = await auth.context.supabase.rpc("complete_office_password_change_v1");
  if (error) return officeDbError(error, "Ntibyashobotse kubika ko ijambo ry'ibanga ryahinduwe.");
  return registryJson({ status: "success" });
}
