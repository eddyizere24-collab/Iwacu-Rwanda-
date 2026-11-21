import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAssistantLanguageModelProvider, getAnswerLanguageInstruction, getAssistantProviderReadiness, isGeneralAnswerEnabled } from "./model-provider";

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


describe("Vercel AI Gateway provider", () => {
  function gatewayEnvironment(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
    return testEnvironment({
      IWACU_AI_PROVIDER: "gateway",
      IWACU_AI_MODEL: "test-gateway-model",
      IWACU_AI_BENCHMARK_PASSED: "true",
      IWACU_AI_ROUTING_ENABLED: "true",
      AI_GATEWAY_API_KEY: "gateway-test-token",
      ...overrides,
    });
  }

  it("accepts either an AI Gateway key or the Vercel OIDC token", () => {
    assert.deepEqual(getAssistantProviderReadiness(gatewayEnvironment()), {
      ready: true, provider: "gateway", model: "test-gateway-model",
    });
    assert.deepEqual(getAssistantProviderReadiness(gatewayEnvironment({
      AI_GATEWAY_API_KEY: undefined,
      VERCEL_OIDC_TOKEN: "oidc-test-token",
    })), { ready: true, provider: "gateway", model: "test-gateway-model" });

    const missing = getAssistantProviderReadiness(gatewayEnvironment({
      AI_GATEWAY_API_KEY: undefined, VERCEL_OIDC_TOKEN: undefined,
    }));
    assert.equal(missing.ready, false);
    if (!missing.ready) assert.equal(missing.reason, "server_key_missing");
  });

  it("sends OpenAI-compatible planner and answer requests and validates the planner schema", async () => {
    const previousFetch = globalThis.fetch;
    const requests: Array<{ url: string; authorization: string | null; body: Record<string, unknown> }> = [];
    globalThis.fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requests.push({ url: String(input), authorization: headers.get("authorization"), body });
      const isPlan = Boolean(body.response_format);
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: isPlan
              ? JSON.stringify({ intent: "general_knowledge", place_query: "", person_query: "", tool_names: [] })
              : "U Rwanda ni igihugu cyo muri Afurika.",
          },
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    try {
      const provider = await createAssistantLanguageModelProvider(gatewayEnvironment());
      assert.ok(provider);
      assert.equal(provider.name, "gateway");
      assert.deepEqual(await provider.plan({
        messages: [{ role: "user", content: "U Rwanda ni iki?" }],
        availableTools: ["search_places"],
      }), {
        intent: "general_knowledge", place_query: null, person_query: null, tool_names: [],
      });

      const conversation = Array.from({ length: 10 }, (_, index) => ({
        role: index % 2 === 0 ? "user" as const : "assistant" as const,
        content: "conversation-turn-" + (index + 1),
      }));
      conversation[9] = { role: "user", content: "U Rwanda ruherereye he?" };
      assert.equal(await provider.answer({ messages: conversation }), "U Rwanda ni igihugu cyo muri Afurika.");

      assert.equal(requests.length, 2);
      for (const request of requests) {
        assert.equal(request.url, "https://ai-gateway.vercel.sh/v1/chat/completions");
        assert.equal(request.authorization, "Bearer gateway-test-token");
        assert.equal(request.body.model, "test-gateway-model");
        assert.ok(Array.isArray(request.body.messages));
      }
      assert.deepEqual(requests[0].body.response_format, { type: "json_object" });
      const answerMessages = requests[1].body.messages as Array<{ role: string; content: string }>;
      assert.equal(answerMessages.length, 9, "one system message plus eight conversation turns");
      assert.equal(answerMessages.at(-1)?.content, "U Rwanda ruherereye he?");
      assert.match(answerMessages[0].content, /Kinyarwanda/);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("selects the right language instruction for Kinyarwanda, French and English", () => {
    assert.match(getAnswerLanguageInstruction([{ role: "user", content: "U Rwanda ruherereye he?" }]), /Kinyarwanda/);
    assert.match(getAnswerLanguageInstruction([{ role: "user", content: "Quelle est la capitale du Rwanda ?" }]), /French/);
    assert.match(getAnswerLanguageInstruction([{ role: "user", content: "Where is Rwanda located?" }]), /English/);
  });
});
