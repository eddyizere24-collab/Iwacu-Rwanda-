/**
 * Defense-in-depth scope check used by API routes in addition to RLS.
 */
export function isWithinScope(adminScope: string, targetScope: string): boolean {
  if (!adminScope || !targetScope) return false;
  if (adminScope === "RW") return true;
  return targetScope === adminScope || targetScope.startsWith(`${adminScope}-`);
}
