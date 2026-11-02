/**
 * GET /auth/callback — completes the admin magic-link login.
 *
 * Supabase (PKCE flow, used by @supabase/ssr) sends the admin back with ?code=...
 * The code must be exchanged for a session cookie BEFORE /admin/dashboard is opened,
 * otherwise src/middleware.ts sees no session and bounces the admin back to the login page.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeAdminNext } from "@/lib/security/redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const dest = req.nextUrl.clone();
  dest.search = "";

  if (!code) {
    dest.pathname = "/admin/login";
    dest.searchParams.set("error", "missing_code");
    return NextResponse.redirect(dest);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      dest.pathname = "/admin/login";
      dest.searchParams.set("error", "auth_failed");
      return NextResponse.redirect(dest);
    }
  } catch {
    dest.pathname = "/admin/login";
    dest.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(dest);
  }

  dest.pathname = safeAdminNext(req.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(dest);
}
