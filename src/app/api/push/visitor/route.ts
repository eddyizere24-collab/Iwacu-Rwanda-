import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "iwacu_visitor_id";
const VisitorIdSchema = z.string().uuid();

function withVisitorCookie(
  response: NextResponse,
  visitorId: string,
  request: NextRequest
): NextResponse {
  response.cookies.set({
    name: VISITOR_COOKIE,
    value: visitorId,
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

/**
 * Returns the stable anonymous visitor ID used to scope notification history.
 * The identifier is HttpOnly-cookie backed; it is never placed in a URL.
 */
export function GET(request: NextRequest): NextResponse {
  const existing = VisitorIdSchema.safeParse(
    request.cookies.get(VISITOR_COOKIE)?.value
  );

  if (existing.success) {
    return NextResponse.json(
      { status: "ok", visitorId: existing.data },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const visitorId = crypto.randomUUID();
  return withVisitorCookie(
    NextResponse.json(
      { status: "ok", visitorId },
      { headers: { "Cache-Control": "no-store" } }
    ),
    visitorId,
    request
  );
}
