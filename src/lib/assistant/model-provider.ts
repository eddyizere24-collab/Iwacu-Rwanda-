/**
 * Replaceable language-model contract.
 *
 * Provider selection is intentionally deferred until the Kinyarwanda benchmark
 * described in docs/Ishakiro-PART-1.md has been run. No provider is silently
 * selected and no API key is read by the browser.
 */

export type AssistantProviderName = "gemini" | "groq";

export interface AssistantModelTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantModelPlan {
  intent:
    | "leader_by_location"
    | "leader_by_place"
    | "person_search"
    | "place_lookup"
    | "emergency"
    | "distance"
    | "boundaries"
    | "signs"
    | "place_facts"
    | "help"
    | "out_of_scope";
  place_query?: string;
  tool_names: string[];
}

export interface AssistantLanguageModelProvider {
  readonly name: AssistantProviderName;
  plan(input: {
    messages: AssistantModelTurn[];
    availableTools: string[];
  }): Promise<AssistantModelPlan>;
}

export type AssistantProviderReadiness =
  | { ready: true; provider: AssistantProviderName }
  | { ready: false; provider: null; reason: "benchmark_required" | "server_key_missing" | "unsupported_provider" };

export function getAssistantProviderReadiness(
  env: NodeJS.ProcessEnv = process.env,
): AssistantProviderReadiness {
  const selected = env.IWACU_AI_PROVIDER?.trim().toLowerCase();
  if (!selected) return { ready: false, provider: null, reason: "benchmark_required" };
  if (selected !== "gemini" && selected !== "groq") {
    return { ready: false, provider: null, reason: "unsupported_provider" };
  }

  const key = selected === "gemini" ? env.GEMINI_API_KEY : env.GROQ_API_KEY;
  if (!key?.trim()) return { ready: false, provider: null, reason: "server_key_missing" };
  return { ready: true, provider: selected };
}
