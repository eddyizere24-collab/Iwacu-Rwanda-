/**
 * Post-login redirect target. Only same-site admin pages are allowed, so a crafted
 * link such as /auth/callback?next=https://evil.example cannot send an admin elsewhere.
 */
const DEFAULT_NEXT = "/admin/dashboard";

export function safeAdminNext(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT;
  if (!/^\/admin\/[A-Za-z0-9/_-]*$/.test(next)) return DEFAULT_NEXT;
  if (next.includes("//")) return DEFAULT_NEXT;
  return next;
}
