/**
 * GET /api/leaders?scope_code=RW-01-01-01-001
 * Public, read-only. Returns ONLY verified, current leaders with ALL their contact details (public by decision of the
 * owner), photo and role label. Writes live in /api/admin/leaders.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { LEADER_PUBLIC_SELECT, hasVerifiedBoundary, toPublicLeader, type LeaderRowWithBoundary } from "@/lib/leaders/public";
import { createLocateError } from "@/lib/utils/errors";
import { isRateLimited, clientIp } from "@/lib/security/rate-limit";
import type { LeaderPublic } from "@/types/leader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE_RE = /^RW(-[0-9A-Z]{2,})*$/;

export async function GET(req: NextRequest) {
  try {
    if (await isRateLimited(`leaders:ip:${clientIp(req)}`, 60, 60_000)) {
      return NextResponse.json(createLocateError("RATE_LIMIT"), { status: 429, headers: { "Retry-After": "60" } });
    }
    const scopeCode = req.nextUrl.searchParams.get("scope_code");
    if (!scopeCode || scopeCode.length > 64 || !SCOPE_RE.test(scopeCode)) {
      return NextResponse.json(createLocateError("NOT_FOUND"), { status: 400 });
    }

    const db = createSupabaseServiceClient();
    const { data, error } = await db
      .from("leaders")
      .select(LEADER_PUBLIC_SELECT)
      .eq("scope_code", scopeCode)
      .eq("status", "verified")
      .is("valid_to", null);
    if (error) {
      console.error("[leaders] GET error code:", error.code);
      return NextResponse.json(createLocateError("DATABASE_ERROR"), { status: 502 });
    }

    const verified = ((data ?? []) as unknown as LeaderRowWithBoundary[]).filter(hasVerifiedBoundary);
    if (verified.length === 0) return NextResponse.json(createLocateError("LEADER_MISSING"), { status: 404 });

    const leaders: LeaderPublic[] = verified.map(toPublicLeader);
    const body = leaders.every((l) => l.contacts.length === 0)
      ? { status: "success", leaders, warning: "MISSING_LEADER_CONTACT" }
      : { status: "success", leaders };
    return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json(createLocateError("DATABASE_ERROR"), { status: 502 });
  }
}
