import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server-side gate for /admin/dashboard only.
 * Skips cleanly when Supabase env is not configured (avoids MIDDLEWARE_INVOCATION_FAILED).
 */
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without env, do not crash the whole site — just pass through.
  if (!url || !key) {
    return NextResponse.next({ request: req });
  }

  const res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: CookieOptions }[]) =>
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = req.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
