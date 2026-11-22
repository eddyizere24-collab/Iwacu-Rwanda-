import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * IWACU's own answer store. Every general (non-personal) answer produced by an
 * outside AI is kept here, so the same or a similar question can be answered from
 * our own data, even when the outside AI is busy or the daily limits are reached.
 * Only public, self-contained questions are stored: never emails, phone numbers,
 * coordinates or other numbers, and never short follow-ups that need the chat history.
 */

export type StoredAnswerLanguage = "rw" | "en" | "fr";
export type StoredAnswerSource = "ai" | "web" | "curated";

type RpcResult = { data: unknown; error: unknown | null };
export type AnswerStoreClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult> };
export type AnswerStoreClientFactory = () => AnswerStoreClient;

/** Similarity needed for a normal lookup, and the lower bar used when no outside AI is available. */
export const STORE_MATCH_SIMILARITY = 0.7;
export const STORE_FALLBACK_SIMILARITY = 0.45;

export function normalizeQuestion(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A question may be stored or matched only when it stands alone and carries no personal data. */
export function isStorableQuestion(query: string, hasHistory: boolean): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 8 || trimmed.length > 300) return false;
  if (/@/.test(trimmed)) return false;
  if (/\d{3,}/.test(trimmed)) return false;
  if (/https?:\/\//i.test(trimmed)) return false;
  const norm = normalizeQuestion(trimmed);
  const words = norm.split(" ").filter(Boolean);
  if (words.length < 3) return false;
  // A short question inside a conversation is usually a follow-up ("na we?", "kandi se?").
  if (hasHistory && words.length < 5) return false;
  return norm.length >= 6 && norm.length <= 400;
}

function defaultClient(): AnswerStoreClient {
  return createSupabaseServiceClient() as unknown as AnswerStoreClient;
}

export async function lookupStoredAnswer(
  query: string,
  language: StoredAnswerLanguage,
  minSimilarity: number,
  clientFactory: AnswerStoreClientFactory = defaultClient,
): Promise<string | null> {
  try {
    const { data, error } = await clientFactory().rpc("lookup_assistant_answer_v1", {
      p_lang: language,
      p_norm: normalizeQuestion(query),
      p_min_similarity: Math.max(0.3, Math.min(1, minSimilarity)),
    });
    if (error || !data || typeof data !== "object") return null;
    const row = data as Record<string, unknown>;
    if (row.found !== true || typeof row.answer !== "string") return null;
    const answer = row.answer.trim();
    return answer.length > 0 && answer.length <= 4000 ? answer : null;
  } catch {
    return null;
  }
}

export async function storeAnswer(
  query: string,
  answer: string,
  language: StoredAnswerLanguage,
  source: StoredAnswerSource = "ai",
  clientFactory: AnswerStoreClientFactory = defaultClient,
): Promise<boolean> {
  try {
    const clean = answer.trim();
    if (!clean || clean.length > 4000) return false;
    const { data, error } = await clientFactory().rpc("store_assistant_answer_v1", {
      p_lang: language,
      p_norm: normalizeQuestion(query),
      p_question: query.trim().slice(0, 500),
      p_answer: clean,
      p_source: source,
    });
    return !error && !!data && (data as Record<string, unknown>).stored === true;
  } catch {
    return false;
  }
}
