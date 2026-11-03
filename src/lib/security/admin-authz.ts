import type { AdminScopeLevel } from "@/lib/security/admin-auth";

const LEVEL_ORDER: Record<AdminScopeLevel, number> = {
  country: 0, province: 1, district: 2, sector: 3, cell: 4, village: 5,
};

export const ROLE_LEVEL = {
  "Village Leader": "village",
  "Cell Executive Secretary": "cell",
  "Sector Executive Secretary": "sector",
  Mayor: "district",
  "Vice Mayor": "district",
  "District Executive Secretary": "district",
} as const;

export type AssignableLeaderRole = keyof typeof ROLE_LEVEL;

export function isWithinAdminScope(adminScopeCode: string, targetScopeCode: string): boolean {
  return targetScopeCode === adminScopeCode || targetScopeCode.startsWith(adminScopeCode + "-");
}

export function canAssignLeaderScope(input: {
  isSuperAdmin: boolean;
  adminScopeCode: string;
  adminScopeLevel: AdminScopeLevel;
  targetScopeCode: string;
  targetLevel: AdminScopeLevel;
}): boolean {
  if (input.isSuperAdmin) return true;
  if (input.adminScopeLevel === "province" || input.adminScopeLevel === "village") return false;
  return isWithinAdminScope(input.adminScopeCode, input.targetScopeCode) &&
    LEVEL_ORDER[input.targetLevel] > LEVEL_ORDER[input.adminScopeLevel];
}
