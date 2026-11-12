import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAssistantProviderReadiness, isGeneralAnswerEnabled } from "./model-provider";

function testEnvironment(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const servicePayload = Buffer.from(JSON.stringify({
    ref: "buexgewxypvkqmphvfec",
    role: "service_role",
  })).toString("base64url");
  const defaults = {
    NODE_ENV: "test",
    NEXT_PUBLIC_SUPABASE_URL: "https://buexgewxypvkqmphvfec.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "header." + servicePayload + ".signature",
    IWACU_AI_USAGE_HMAC_KEY: "test-only-secret-key-32-bytes-minimum",
    IWACU_AI_USAGE_LIMITS_VERIFIED: "true",
  };
  return Object.assign(Object.create(null), defaults, overrides) as NodeJS.ProcessEnv;
}

describe("optional language model provider safety gates", () => {
  it("is disabled when no provider is configured", () => {
    const result = getAssistantProviderReadiness(testEnvironment({}));
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "benchmark_required");
  });
  it("requires a completed Kinyarwanda benchmark", () => {
    const result = getAssistantProviderReadiness(testEnvironment({
      IWACU_AI_PROVIDER: "gemini", IWACU_AI_MODEL: "test-model", GEMINI_API_KEY: "test-only",
      IWACU_AI_ROUTING_ENABLED: "true",
    }));
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "benchmark_required");
  });
  it("requires the explicit routing feature switch", () => {
    const result = getAssistantProviderReadiness(testEnvironment({
      IWACU_AI_PROVIDER: "groq", IWACU_AI_MODEL: "test-model", GROQ_API_KEY: "test-only",
      IWACU_AI_BENCHMARK_PASSED: "true",
    }));
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "routing_disabled");
  });
  it("requires a model selection", () => {
    const result = getAssistantProviderReadiness(testEnvironment({
      IWACU_AI_PROVIDER: "gemini", GEMINI_API_KEY: "test-only",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    }));
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "model_not_selected");
  });
  it("requires the selected provider's server-side API key", () => {
    const result = getAssistantProviderReadiness(testEnvironment({
      IWACU_AI_PROVIDER: "groq", IWACU_AI_MODEL: "test-model",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    }));
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "server_key_missing");
  });
  it("rejects unsupported providers", () => {
    const result = getAssistantProviderReadiness(testEnvironment({
      IWACU_AI_PROVIDER: "unknown", IWACU_AI_MODEL: "test-model",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    }));
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "unsupported_provider");
  });
  it("requires the shared daily usage budget configuration for every model call", () => {
    const result = getAssistantProviderReadiness(testEnvironment({
      IWACU_AI_PROVIDER: "groq",
      IWACU_AI_MODEL: "test-model",
      GROQ_API_KEY: "test-only",
      IWACU_AI_BENCHMARK_PASSED: "true",
      IWACU_AI_ROUTING_ENABLED: "true",
      IWACU_AI_USAGE_HMAC_KEY: undefined,
    }));
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "routing_disabled");
  });

  it("accepts a fully configured Groq planner without making a network call", () => {
    const result = getAssistantProviderReadiness(testEnvironment({
      IWACU_AI_PROVIDER: "groq", IWACU_AI_MODEL: "test-model", GROQ_API_KEY: "test-only",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    }));
    assert.deepEqual(result, { ready: true, provider: "groq", model: "test-model" });
  });
});


describe("general-knowledge answer safety gate", () => {
  const readyConfiguration = {
    IWACU_AI_PROVIDER: "groq",
    IWACU_AI_MODEL: "test-model",
    GROQ_API_KEY: "test-only",
    IWACU_AI_BENCHMARK_PASSED: "true",
    IWACU_AI_ROUTING_ENABLED: "true",
  };

  it("keeps general answer generation disabled by default", () => {
    assert.equal(isGeneralAnswerEnabled(testEnvironment(readyConfiguration)), false);
  });

  it("requires the separate answer switch and every normal provider gate", () => {
    assert.equal(isGeneralAnswerEnabled(testEnvironment({
      ...readyConfiguration,
      IWACU_AI_ANSWER_ENABLED: "true",
      IWACU_AI_USAGE_LIMITS_VERIFIED: undefined,
    })), false, "answering also requires the explicit deployment verification gate");
    assert.equal(isGeneralAnswerEnabled(testEnvironment({
      ...readyConfiguration,
      IWACU_AI_ANSWER_ENABLED: "true",
      IWACU_AI_USAGE_LIMITS_VERIFIED: "true",
    })), true);
    assert.equal(isGeneralAnswerEnabled(testEnvironment({
      IWACU_AI_ANSWER_ENABLED: "true",
    })), false);
  });
});
