import { createHmac } from "node:crypto";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface AssistantUsageLimitConfig {
  dailyGlobalLimit: number;
  dailyClientLimit: number;
  hmacKey: string;
}

export type AssistantUsageDenialReason =
  | "not_configured"
  | "backend_unavailable"
  | "invalid_response"
  | "daily_global_limit"
  | "daily_client_limit"
  | "invalid_configuration";

export type AssistantUsageReservation =
  | { allowed: true; reason: "reserved"; globalUsed: number; clientUsed: number }
  | { allowed: false; reason: AssistantUsageDenialReason; globalUsed?: number; clientUsed?: number };

type UsageRpcResult = { data: unknown; error: unknown | null };
type UsageRpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<UsageRpcResult>;
};
type UsageClientFactory = () => UsageRpcClient;

function boundedLimit(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number | null {
  if (value == null || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

export function getAssistantUsageLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): AssistantUsageLimitConfig | null {
  const hmacKey = env.IWACU_AI_USAGE_HMAC_KEY?.trim();
  if (!hmacKey || Buffer.byteLength(hmacKey, "utf8") < 32) return null;
  if (!isSupabaseConfigured(env)) return null;

  // Model-usage metering is bound to IWACU's approved Production Supabase project.
  // Previews without this exact project fail closed rather than touching another database.
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i)?.[1];
  if (projectRef !== "buexgewxypvkqmphvfec") return null;

  // The fixed ceilings are intentionally conservative for a Hobby deployment.
  // Environment variables may lower or tune these limits, never raise the hard ceiling.
  const dailyGlobalLimit = boundedLimit(env.IWACU_AI_DAILY_CALL_LIMIT, 60, 100);
  const dailyClientLimit = boundedLimit(env.IWACU_AI_CLIENT_DAILY_CALL_LIMIT, 10, 20);
  if (dailyGlobalLimit == null || dailyClientLimit == null) return null;

  return { dailyGlobalLimit, dailyClientLimit, hmacKey };
}

export function isAssistantUsageLimitConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return getAssistantUsageLimitConfig(env) !== null;
}

/**
 * Creates a different pseudonymous identifier for each UTC day.
 * The raw IP is never written to Supabase and cannot be correlated across days.
 */
export function hashAssistantClientForDay(
  clientIp: string,
  hmacKey: string,
  now = new Date(),
): string {
  const day = now.toISOString().slice(0, 10);
  const normalizedIp = clientIp.trim().slice(0, 80) || "unknown";
  return createHmac("sha256", hmacKey)
    .update(day + ":" + normalizedIp, "utf8")
    .digest("hex");
}

/**
 * Reserves a global and per-client daily slot atomically through a service-role RPC.
 * Any configuration, database or response error fails closed: no model API is called.
 */
export async function reserveAssistantModelUsage(
  clientIp: string,
  env: NodeJS.ProcessEnv = process.env,
  clientFactory: UsageClientFactory = createSupabaseServiceClient,
  now = new Date(),
): Promise<AssistantUsageReservation> {
  const config = getAssistantUsageLimitConfig(env);
  if (!config) return { allowed: false, reason: "not_configured" };

  try {
    const clientHash = hashAssistantClientForDay(clientIp, config.hmacKey, now);
    const supabase = clientFactory();
    const { data, error } = await supabase.rpc("reserve_assistant_model_usage_v1", {
      p_client_hash: clientHash,
      p_daily_global_limit: config.dailyGlobalLimit,
      p_daily_client_limit: config.dailyClientLimit,
    });
    if (error || !data || typeof data !== "object") {
      return { allowed: false, reason: "backend_unavailable" };
    }

    const result = data as Record<string, unknown>;
    const globalUsed = Number.isSafeInteger(result.global_used) ? Number(result.global_used) : undefined;
    const clientUsed = Number.isSafeInteger(result.client_used) ? Number(result.client_used) : undefined;
    const reason = typeof result.reason === "string" ? result.reason : "";

    if (result.allowed === true && reason === "reserved" && globalUsed !== undefined && clientUsed !== undefined) {
      return { allowed: true, reason: "reserved", globalUsed, clientUsed };
    }
    if (reason === "daily_global_limit" || reason === "daily_client_limit" || reason === "invalid_configuration") {
      return {
        allowed: false,
        reason,
        ...(globalUsed !== undefined ? { globalUsed } : {}),
        ...(clientUsed !== undefined ? { clientUsed } : {}),
      };
    }
    return { allowed: false, reason: "invalid_response" };
  } catch {
    // Never call a paid/free-tier model when the shared budget cannot be reserved.
    return { allowed: false, reason: "backend_unavailable" };
  }
}
