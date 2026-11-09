import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAssistantProviderReadiness } from "./model-provider";

describe("optional language model provider safety gates", () => {
  it("is disabled when no provider is configured", () => {
    const result = getAssistantProviderReadiness({});
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "benchmark_required");
  });
  it("requires a completed Kinyarwanda benchmark", () => {
    const result = getAssistantProviderReadiness({
      IWACU_AI_PROVIDER: "gemini", IWACU_AI_MODEL: "test-model", GEMINI_API_KEY: "test-only",
      IWACU_AI_ROUTING_ENABLED: "true",
    });
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "benchmark_required");
  });
  it("requires the explicit routing feature switch", () => {
    const result = getAssistantProviderReadiness({
      IWACU_AI_PROVIDER: "groq", IWACU_AI_MODEL: "test-model", GROQ_API_KEY: "test-only",
      IWACU_AI_BENCHMARK_PASSED: "true",
    });
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "routing_disabled");
  });
  it("requires a model selection", () => {
    const result = getAssistantProviderReadiness({
      IWACU_AI_PROVIDER: "gemini", GEMINI_API_KEY: "test-only",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    });
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "model_not_selected");
  });
  it("requires the selected provider's server-side API key", () => {
    const result = getAssistantProviderReadiness({
      IWACU_AI_PROVIDER: "groq", IWACU_AI_MODEL: "test-model",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    });
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "server_key_missing");
  });
  it("rejects unsupported providers", () => {
    const result = getAssistantProviderReadiness({
      IWACU_AI_PROVIDER: "unknown", IWACU_AI_MODEL: "test-model",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    });
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, "unsupported_provider");
  });
  it("accepts a fully configured Groq planner without making a network call", () => {
    const result = getAssistantProviderReadiness({
      IWACU_AI_PROVIDER: "groq", IWACU_AI_MODEL: "test-model", GROQ_API_KEY: "test-only",
      IWACU_AI_BENCHMARK_PASSED: "true", IWACU_AI_ROUTING_ENABLED: "true",
    });
    assert.deepEqual(result, { ready: true, provider: "groq", model: "test-model" });
  });
});
