import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAssistantUsageLimitConfig,
  hashAssistantClientForDay,
  isAssistantUsageLimitConfigured,
  reserveAssistantModelUsage,
} from "./usage-limits";

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const payload = Buffer.from(JSON.stringify({
    ref: "buexgewxypvkqmphvfec",
    role: "service_role",
  })).toString("base64url");
  return Object.assign(Object.create(null), {
    NODE_ENV: "test",
    NEXT_PUBLIC_SUPABASE_URL: "https://buexgewxypvkqmphvfec.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "header." + payload + ".signature",
    IWACU_AI_USAGE_HMAC_KEY: "test-only-secret-key-32-bytes-minimum",
  }, overrides) as NodeJS.ProcessEnv;
}

describe("shared Iwacu AI usage-budget guard", () => {
  it("requires a long private HMAC key and the matching service-role Supabase project", () => {
    assert.equal(isAssistantUsageLimitConfigured(env({ IWACU_AI_USAGE_HMAC_KEY: "too-short" })), false);
    assert.equal(isAssistantUsageLimitConfigured(env({
      NEXT_PUBLIC_SUPABASE_URL: "https://agwfnpwootwsgsdeohcd.supabase.co",
    })), false);
    assert.equal(isAssistantUsageLimitConfigured(env({
      SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-role-key",
    })), false);
  });

  it("uses conservative defaults and never permits limits above the hard ceiling", () => {
    assert.deepEqual(
      getAssistantUsageLimitConfig(env()),
      {
        dailyGlobalLimit: 60,
        dailyClientLimit: 10,
        hmacKey: "test-only-secret-key-32-bytes-minimum",
      },
    );
    assert.equal(getAssistantUsageLimitConfig(env({ IWACU_AI_DAILY_CALL_LIMIT: "101" })), null);
    assert.equal(getAssistantUsageLimitConfig(env({ IWACU_AI_CLIENT_DAILY_CALL_LIMIT: "21" })), null);
    assert.equal(getAssistantUsageLimitConfig(env({ IWACU_AI_DAILY_CALL_LIMIT: "many" })), null);
  });

  it("uses stable daily HMAC buckets but does not link the same IP across days", () => {
    const firstDay = new Date("2026-11-11T00:00:00.000Z");
    const nextDay = new Date("2026-11-12T00:00:00.000Z");
    const first = hashAssistantClientForDay("203.0.113.8", "test-only-secret-key-32-bytes-minimum", firstDay);
    assert.equal(first, hashAssistantClientForDay("203.0.113.8", "test-only-secret-key-32-bytes-minimum", firstDay));
    assert.notEqual(first, hashAssistantClientForDay("203.0.113.8", "test-only-secret-key-32-bytes-minimum", nextDay));
    assert.match(first, /^[0-9a-f]{64}$/);
  });

  it("reserves a shared database budget before a general-answer request", async () => {
    let called = false;
    const result = await reserveAssistantModelUsage(
      "203.0.113.8",
      env(),
      () => ({
        rpc: async (name, args) => {
          called = true;
          assert.equal(name, "reserve_assistant_model_usage_v1");
          assert.equal(args.p_daily_global_limit, 60);
          assert.equal(args.p_daily_client_limit, 10);
          assert.match(String(args.p_client_hash), /^[0-9a-f]{64}$/);
          return { data: { allowed: true, reason: "reserved", global_used: 1, client_used: 1 }, error: null };
        },
      }),
      new Date("2026-11-11T10:00:00.000Z"),
    );
    assert.equal(called, true);
    assert.deepEqual(result, { allowed: true, reason: "reserved", globalUsed: 1, clientUsed: 1 });
  });

  it("returns a clear limit result without consuming a denied slot", async () => {
    const result = await reserveAssistantModelUsage(
      "203.0.113.8",
      env(),
      () => ({
        rpc: async () => ({
          data: { allowed: false, reason: "daily_client_limit", global_used: 8, client_used: 10 },
          error: null,
        }),
      }),
    );
    assert.deepEqual(result, {
      allowed: false,
      reason: "daily_client_limit",
      globalUsed: 8,
      clientUsed: 10,
    });
  });

  it("fails closed if Supabase cannot reserve the budget", async () => {
    const result = await reserveAssistantModelUsage(
      "203.0.113.8",
      env(),
      () => ({
        rpc: async () => ({ data: null, error: new Error("database offline") }),
      }),
    );
    assert.deepEqual(result, { allowed: false, reason: "backend_unavailable" });
  });

  it("never calls Supabase if the service-role environment is incomplete", async () => {
    let called = false;
    const result = await reserveAssistantModelUsage(
      "203.0.113.8",
      env({ SUPABASE_SERVICE_ROLE_KEY: undefined }),
      () => {
        called = true;
        return { rpc: async () => ({ data: null, error: null }) };
      },
    );
    assert.equal(called, false);
    assert.deepEqual(result, { allowed: false, reason: "not_configured" });
  });
});
