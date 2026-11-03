import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminScopeLevel = "country" | "province" | "district" | "sector" | "cell" | "village";
export type AdminTier = "national" | "province" | "district" | "sector" | "cell";

export interface AdminProfile {
  user_id: string;
  full_name: string;
  scope_code: string;
  is_super_admin: boolean;
}
export interface AdminAccess {
  ok: true;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User;
  profile: AdminProfile;
  scope_name: string;
  scope_level: AdminScopeLevel;
  tier: AdminTier;
}
export interface AdminAccessError {
  ok: false;
  status: 401 | 403 | 503;
  message_kiny: string;
}
const ORDER: Record<AdminScopeLevel, number> = {
  country: 0, province: 1, district: 2, sector: 3, cell: 4, village: 5,
};
export const ROLE_LEVEL = {
  "Village Leader": "village",
  "Cell Executive Secretary": "cell",
  "Sector Executive Secretary": "sector",
  "Mayor": "district",
  "Vice Mayor": "district",
  "District Executive Secretary": "district",
} as const;
export type AssignableLeaderRole = keyof typeof ROLE_LEVEL;

export function isWithinAdminScope(adminScopeCode: string, targetScopeCode: string): boolean {
  return targetScopeCode === adminScopeCode || targetScopeCode.startsWith(adminScopeCode + "-");
}
export function canAssignLeaderScope(input: {
  isSuperAdmin: boolean; adminScopeCode: string; adminScopeLevel: AdminScopeLevel;
  targetScopeCode: string; targetLevel: AdminScopeLevel;
}): boolean {
  if (input.isSuperAdmin) return true;
  if (input.adminScopeLevel === "province" || input.adminScopeLevel === "village") return false;
  return isWithinAdminScope(input.adminScopeCode, input.targetScopeCode) &&
    ORDER[input.targetLevel] > ORDER[input.adminScopeLevel];
}

export async function getAdminAccess(): Promise<AdminAccess | AdminAccessError> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, status: 401, message_kiny: "Banza winjire ukoresheje konti y'umuyobozi yemewe." };
  }
  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("user_id, full_name, scope_code, is_super_admin")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[admin auth] profile lookup failed:", profileError.message);
    return { ok: false, status: 503, message_kiny: "Ntibyashobotse kugenzura uburenganzira bwa konti." };
  }
  if (!profile || !profile.scope_code) {
    return { ok: false, status: 403, message_kiny: "Iyi konti ntirashyirwa ku rutonde rw'abayobozi bemerewe." };
  }
  const { data: scope, error: scopeError } = await supabase
    .from("boundaries")
    .select("scope_code, name_kiny, level")
    .eq("scope_code", profile.scope_code)
    .is("valid_to", null)
    .maybeSingle();
  if (scopeError || (!scope && profile.scope_code !== "RW")) {
    return { ok: false, status: 503, message_kiny: "Agace konti ishinzwe ntikabonetse muri database." };
  }
  const isSuperAdmin = profile.is_super_admin === true;
  if (profile.scope_code === "RW" && !isSuperAdmin) {
    return { ok: false, status: 403, message_kiny: "Uburenganzira bwo ku rwego rw'igihugu ntibwemejwe." };
  }
  const scopeLevel = (scope?.level ?? "country") as AdminScopeLevel;
  const tier: AdminTier = isSuperAdmin ? "national" :
    scopeLevel === "district" || scopeLevel === "sector" || scopeLevel === "cell" ? scopeLevel : "province";
  return {
    ok: true, supabase, user: authData.user, profile: profile as AdminProfile,
    scope_name: scope?.name_kiny ?? "U Rwanda Rwose", scope_level: scopeLevel, tier,
  };
}
