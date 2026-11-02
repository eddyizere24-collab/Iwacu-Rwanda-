/** GET /api/health — liveness + minimal readiness. Returns 200 when ok, 503 when degraded. No secrets, no hostnames. */
import { NextResponse } from "next/server";
import { checkEnv, summarize, type CheckStatus } from "@/lib/health";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, CheckStatus> = checkEnv(process.env);
  const envOk = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].every((k) => checks[`env:${k}`] === "ok");
  if (envOk) {
    try {
      const { error } = await createSupabaseServiceClient().from("boundaries").select("scope_code", { head: true, count: "exact" }).limit(1);
      checks.database = error ? "error" : "ok";
    } catch { checks.database = "error"; }
  } else checks.database = "missing";
  const report = summarize(checks);
  return NextResponse.json(report, { status: report.status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
