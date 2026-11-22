import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { HONESTY_CASES, PLAN_CASES, isHonestAnswer, isInLanguage } from "@/lib/assistant/benchmark-cases";
import { POST as assistantPost } from "@/app/api/ishakiro/route";
import { createAssistantLanguageModelProvider } from "@/lib/assistant/model-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Owner-only diagnostic: checks, from the server, whether the AI provider answers.
// Disabled (404) unless IWACU_SELFTEST_TOKEN is set. Returns status codes and short snippets only,
// never keys, and never calls the public assistant.
function authorized(request: NextRequest): boolean {
  const expected = process.env.IWACU_SELFTEST_TOKEN?.trim();
  const given = request.nextUrl.searchParams.get("token") ?? "";
  if (!expected || expected.length < 16) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await run(); } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!/503|429|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(message)) break;
      await new Promise((resolve) => setTimeout(resolve, 4_000 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });

  const model = process.env.IWACU_AI_MODEL?.trim() || "";
  const provider = process.env.IWACU_AI_PROVIDER?.trim() || "";
  const present = {
    AI_GATEWAY_API_KEY: Boolean(process.env.AI_GATEWAY_API_KEY?.trim()),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY?.trim()),
    GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY?.trim()),
    VERCEL_OIDC_TOKEN: Boolean(process.env.VERCEL_OIDC_TOKEN?.trim()),
  };

  if (request.nextUrl.searchParams.get("suite") === "chat") {
    // End-to-end: the real assistant route, exactly as the website calls it (counts toward the daily AI limit).
    const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 300);
    if (!query) return NextResponse.json({ error: "missing q" }, { status: 400 });
    const inner = new NextRequest(new URL("/api/ishakiro", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ query, location: null, context: null, history: [] }),
    });
    const response = await assistantPost(inner);
    const body = await response.json() as Record<string, unknown>;
    return NextResponse.json({
      status: response.status,
      intent: body.intent,
      capability: body.capability,
      answer: typeof body.answer_kiny === "string" ? body.answer_kiny.slice(0, 700) : body,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  if (request.nextUrl.searchParams.get("suite") === "bench") {
    // Run the real planner and general-answer code with the benchmark gate lifted for this test only.
    const provider = await createAssistantLanguageModelProvider({ ...process.env, IWACU_AI_BENCHMARK_PASSED: "true" });
    if (!provider) return NextResponse.json({ error: "provider_not_ready", present });
    const results: Array<{ id: string; ok: boolean; got?: string; error?: string }> = [];
    const from = Math.max(0, Number(request.nextUrl.searchParams.get("from") ?? 0) || 0);
    const to = Math.min(30, Number(request.nextUrl.searchParams.get("to") ?? 30) || 30);
    const tools = ["search_places", "find_leaders_at_place", "search_public_leaders", "get_verified_emergency_contacts"];
    const all = [
      ...PLAN_CASES.map((c) => ({ kind: "plan" as const, c })),
      ...HONESTY_CASES.map((c) => ({ kind: "honesty" as const, c })),
    ].slice(from, to);
    for (const entry of all) {
      try {
        if (entry.kind === "plan") {
          const plan = await withRetry(() => provider.plan({ messages: [{ role: "user", content: entry.c.text }], availableTools: tools }));
          results.push({ id: entry.c.id, ok: (entry.c as typeof PLAN_CASES[number]).intents.includes(plan.intent), got: plan.intent });
        } else {
          const answer = await withRetry(() => provider.answer({ messages: [{ role: "user", content: entry.c.text }] }));
          results.push({ id: entry.c.id, ok: isHonestAnswer(answer) && isInLanguage(answer, entry.c.language), got: answer.slice(0, 160) });
        }
      } catch (error) {
        results.push({ id: entry.c.id, ok: false, error: error instanceof Error ? error.message.slice(0, 120) : "error" });
      }
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
    const planPassed = results.filter((r) => !r.id.startsWith("h-") && r.ok).length;
    const honestyPassed = results.filter((r) => r.id.startsWith("h-") && r.ok).length;
    return NextResponse.json({
      summary: { plan: planPassed + "/" + results.filter((r) => !r.id.startsWith("h-")).length, honesty: honestyPassed + "/" + results.filter((r) => r.id.startsWith("h-")).length },
      results,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const out: Record<string, unknown> = { provider, model, present };
  const key = process.env.AI_GATEWAY_API_KEY?.trim();
  if (key && model) {
    try {
      const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 40,
          messages: [{ role: "user", content: "Subiza mu Kinyarwanda mu magambo make: Muraho." }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const text = await response.text();
      out.gateway = { status: response.status, snippet: text.slice(0, 400) };
    } catch (error) {
      out.gateway = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    const base = "https://generativelanguage.googleapis.com/v1beta";
    try {
      const list = await fetch(base + "/models?pageSize=200&key=" + encodeURIComponent(geminiKey), { signal: AbortSignal.timeout(15_000) });
      const body = await list.json() as { models?: Array<{ name?: string }>; error?: { message?: string } };
      out.geminiList = list.ok
        ? (body.models ?? []).map((m) => m.name ?? "").filter((n) => /flash|pro/.test(n)).slice(0, 40)
        : { status: list.status, message: body.error?.message?.slice(0, 200) };
    } catch (error) {
      out.geminiList = { error: error instanceof Error ? error.message : String(error) };
    }
    const requested = request.nextUrl.searchParams.get("model") ?? "";
    if (/^[a-z0-9.\-]{3,60}$/i.test(requested)) {
      try {
        const response = await fetch(base + "/models/" + requested + ":generateContent?key=" + encodeURIComponent(geminiKey), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Subiza mu Kinyarwanda mu magambo make: Muraho. Umujyi wa Kigali ugizwe n'uturere tungahe?" }] }], generationConfig: { maxOutputTokens: 80 } }),
          signal: AbortSignal.timeout(25_000),
        });
        const text = await response.text();
        out.geminiPing = { model: requested, status: response.status, snippet: text.slice(0, 500) };
      } catch (error) {
        out.geminiPing = { error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
