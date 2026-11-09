import { NextRequest, NextResponse } from "next/server";
import { AssistantRequestSchema } from "@/lib/assistant/contracts";
import { executeAssistantRequest } from "@/lib/assistant/engine";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const ipRateLimiter = createIpRateLimiter({ limit: 30, windowMs: 60_000 });

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

  try {
    const reply = await Promise.race([
      executeAssistantRequest(parsed.data),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("ASSISTANT_TIMEOUT")), 7_000);
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
      capability: null,
    }, timedOut ? 504 : 503);
  }
}
