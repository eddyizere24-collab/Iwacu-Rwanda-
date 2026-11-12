import { NextRequest, NextResponse } from "next/server";
import { AssistantRequestSchema } from "@/lib/assistant/contracts";
import { classifyAssistantIntent } from "@/lib/assistant/intent";
import { executeAssistantRequest } from "@/lib/assistant/engine";
import { getAssistantProviderReadiness } from "@/lib/assistant/model-provider";
import { reserveAssistantModelUsage } from "@/lib/assistant/usage-limits";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

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

function generalAnswerBudgetResponse(
  intent: ReturnType<typeof classifyAssistantIntent>["intent"],
  reason: string,
) {
  const dailyLimitReached = reason === "daily_client_limit" || reason === "daily_global_limit";
  const answer = reason === "daily_client_limit"
    ? "Uyu munsi umaze kugera ku mubare ntarengwa w'ibibazo bisubizwa n'ubushobozi rusange bwa AI. Ushobora gukomeza kubaza amakuru y'ahantu n'ubuyobozi abitswe muri IWACU."
    : reason === "daily_global_limit"
      ? "Serivisi y'ubumenyi rusange ya Iwacu AI yageze ku rugero rw'imikoreshereze y'uyu munsi. Ibibazo by'amakuru y'ubuyobozi n'ahantu bivugwa mu bubiko bwemewe biracyakomeza."
      : "Serivisi y'ubumenyi rusange irategereje igenzura ry'ububiko bw'ikoreshwa. Nta gisubizo mpimbye; ushobora kubaza amakuru y'ahantu n'ubuyobozi abitswe muri IWACU.";
  return jsonResponse({
    status: "partial",
    intent,
    answer_kiny: answer,
    confidence: "low",
    confidence_label: dailyLimitReached
      ? "Urugero rw'imikoreshereze ya AI rwashyizweho kugira ngo serivisi ikomeze kurindwa."
      : "Nta gisubizo cy'ubumenyi rusange cyasabwe kuko igenzura ry'ikoreshwa ritabonetse.",
    data_date_label: "Iki gisubizo kigaragaza gusa uko serivisi y'AI ihagaze; nta makuru mashya y'ahantu cyongeraho.",
    sources: [],
    places: [],
    leaders: [],
    emergency_contacts: [],
    suggestions: [
      "Ninde uyobora aho ndi?",
      "Meya w'Akarere ka Gasabo ni nde?",
      "U Rwanda rugizwe n'uturere tungahe?",
    ],
    context: null,
    gap_recorded: false,
    gap_notified: false,
    capability: "model_usage_limit",
  }, dailyLimitReached ? 200 : 503);
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
  if (requiresOptionalModel && getAssistantProviderReadiness().ready) {
    const reservation = await reserveAssistantModelUsage(getClientIpFromHeaders(req.headers));
    if (!reservation.allowed) {
      return generalAnswerBudgetResponse(intent, reservation.reason);
    }
  }

  if (intent === "external_research" &&
      !externalResearchRateLimiter.consume(getClientIpFromHeaders(req.headers))) {
    return jsonResponse({
      status: "error",
      code: "RESEARCH_RATE_LIMIT",
      message_kiny: "Ishakiro ryo kuri internet rigeragezwa inshuro nke mu munota. Ongera ugerageze nyuma.",
    }, 429);
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const reply = await Promise.race([
      executeAssistantRequest(parsed.data),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("ASSISTANT_TIMEOUT")), 7_000);
      }),
    ]);
    return jsonResponse(reply);
  } catch (error) {
    // Do not log or retain the visitor's free-text question.
    const timedOut = error instanceof Error && error.message === "ASSISTANT_TIMEOUT";
    return jsonResponse({
      status: "error",
      intent: "out_of_scope",
      answer_kiny: timedOut
        ? "Gushakisha byatwaye igihe kirenze icyo twateganyije. Ongera ugerageze; ntabwo twahimbye igisubizo."
        : "Serivisi yo gushakisha ntibashije gukora ubu. Amakuru ntabwo yabonetse, kandi nta gisubizo twahimbye.",
      confidence: "low",
      confidence_label: "Nta gisubizo cyemejwe cyabonetse.",
      data_date_label: "Nta makuru yasubijwe.",
      sources: [],
      places: [],
      leaders: [],
      emergency_contacts: [],
      suggestions: ["Ongera ugerageze", "Reba nimero z'ubutabazi"],
      context: null,
      gap_recorded: false,
      gap_notified: false,
      capability: null,
    }, timedOut ? 504 : 503);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
