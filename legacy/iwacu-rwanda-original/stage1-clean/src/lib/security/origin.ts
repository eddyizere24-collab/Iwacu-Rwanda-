/**
 * CSRF defence for cookie-authenticated, state-changing or sensitive POST routes.
 * Browsers always send Origin on cross-site POSTs; we require it to match our own host.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false; // sensitive routes: no Origin => refuse
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
