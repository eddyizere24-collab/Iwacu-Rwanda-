/** Pure helpers for /api/health. No secrets or infrastructure details are ever returned. */
export type CheckStatus = "ok" | "missing" | "error";
export interface HealthReport {
  status: "ok" | "degraded";
  time: string;
  checks: Record<string, CheckStatus>;
}
const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const RECOMMENDED_ENV = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "GROQ_API_KEY"] as const;

/** Reports only presence (never values) of configuration. */
export function checkEnv(env: Record<string, string | undefined>): Record<string, CheckStatus> {
  const out: Record<string, CheckStatus> = {};
  for (const k of REQUIRED_ENV) out[`env:${k}`] = env[k] ? "ok" : "missing";
  for (const k of RECOMMENDED_ENV) out[`env:${k}`] = env[k] ? "ok" : "missing";
  return out;
}
/** Overall status is degraded if any REQUIRED check is not ok or the database check failed. */
export function summarize(checks: Record<string, CheckStatus>, now: Date = new Date()): HealthReport {
  const required = new Set<string>(REQUIRED_ENV.map((k) => `env:${k}`));
  const bad = Object.entries(checks).some(([k, v]) => v !== "ok" && (required.has(k) || k === "database"));
  return { status: bad ? "degraded" : "ok", time: now.toISOString(), checks };
}
