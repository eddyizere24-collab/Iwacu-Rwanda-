import { NextRequest, NextResponse } from "next/server";
import { AssistantRequestSchema } from "@/lib/assistant/contracts";
import { classifyAssistantIntent } from "@/lib/assistant/intent";
import { buildGuidanceReply, buildStoredAnswerReply, executeAssistantRequest } from "@/lib/assistant/engine";
import { isStorableQuestion, lookupStoredAnswer, STORE_FALLBACK_SIMILARITY, STORE_MATCH_SIMILARITY } from "@/lib/assistant/answer-store";
import { detectAnswerLanguage, getAssistantProviderReadiness } from "@/lib/assistant/model-provider";
import { reserveAssistantModelUsage } from "@/lib/assistant/usage-limits";
import { isExternalResearchEnabled } from "@/lib/assistant/external-research";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ipRateLimiter = createIpRateLimiter({ limit: 30, windowMs: 60_000 });
const externalResearchRateLimiter = createIpRateLimiter({ limit: 5, windowMs: 60_000 });

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * When the outside AI cannot be used (daily limits, busy, not configured) IWACU answers from its
 * own store of earlier answers, and otherwise guides the visitor warmly. It never refuses.
 */
async function ownStoreOrGuidanceResponse(query: string, hasHistory: boolean) {
  const language = detectAnswerLanguage(query);
  if (isStorableQuestion(query, hasHistory)) {
    const stored = await lookupStoredAnswer(query, language, STORE_FALLBACK_SIMILARITY);
    if (stored) return jsonResponse(buildStoredAnswerReply(stored));
  }
  return jsonResponse(buildGuidanceReply(language));
}

export async function POST(req: NextRequest) {
  if (!ipRateLimiter.consume(getClientIpFromHeaders(req.headers))) {
    return jsonResponse({
      status: "error",
      code: "RATE_LIMIT",
      message_kiny: "Mwihangane, mugerageje inshuro nyinshi. Ongera ugerageze nyuma y'umunota.",
    }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({
      status: "error",
      message_kiny: "Ubutumwa bwoherejwe ntabwo bwumvikanye neza. Ongera ugerageze.",
    }, 400);
  }

  const parsed = AssistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({
      status: "error",
      message_kiny: "Andika ikibazo kigufi kandi usubiremo. Ikibazo ntikirenga inyuguti 500.",
    }, 400);
  }

  const intentResult = classifyAssistantIntent(
    parsed.data.query,
    parsed.data.context ?? null,
    parsed.data.location ?? null,
  );
  const intent = intentResult.intent;

  // The optional model planner/general-answer path is the only paid or quota-bound
  // feature in this route. Reserve a shared Supabase slot before any provider call.
  // Deterministic, tool-backed Rwanda facts do not consume the model budget.
  const requiresOptionalModel =
    intent === "out_of_scope" ||
    ((intent === "leader_by_place" || intent === "place_lookup") && !intentResult.placeQuery) ||
    (intent === "person_search" && !intentResult.personQuery);
  const hasHistory = (parsed.data.history ?? []).length > 0;
  if (intent === "out_of_scope" && isStorableQuestion(parsed.data.query, hasHistory)) {
    // IWACU's own answer store comes first: the same or a very similar question that was
    // answered before is served from our own data, with no outside AI and no daily budget used.
    const stored = await lookupStoredAnswer(parsed.data.query, detectAnswerLanguage(parsed.data.query), STORE_MATCH_SIMILARITY);
    if (stored) return jsonResponse(buildStoredAnswerReply(stored));
  }
  if (requiresOptionalModel) {
    if (!getAssistantProviderReadiness().ready) {
      if (intent === "out_of_scope") return ownStoreOrGuidanceResponse(parsed.data.query, hasHistory);
    } else {
      const reservation = await reserveAssistantModelUsage(getClientIpFromHeaders(req.headers));
      if (!reservation.allowed) {
        return ownStoreOrGuidanceResponse(parsed.data.query, hasHistory);
      }
    }
  }

  const shouldSearchWeb = intent === "external_research" ||
    ((intent === "out_of_scope" || intent === "general_knowledge") && isExternalResearchEnabled());
  if (shouldSearchWeb &&
      !externalResearchRateLimiter.consume(getClientIpFromHeaders(req.headers))) {
    return jsonResponse({
      status: "error",
      code: "RESEARCH_RATE_LIMIT",
      message_kiny: "Gushakisha amakuru kuri internet bikorwa buhoro kugira ngo bibe byiza. Tegereza akanya gato, hanyuma wongere ubaze.",
    }, 429);
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const reply = await Promise.race([
      executeAssistantRequest(parsed.data),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("ASSISTANT_TIMEOUT")), 24_000);
      }),
    ]);
    return jsonResponse(reply);
  } catch {
    // Do not log or retain the visitor's free-text question. A slow or failed lookup still gets a
    // helpful reply (an earlier stored answer when one exists), never a bare error.
    return ownStoreOrGuidanceResponse(parsed.data.query, hasHistory);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
