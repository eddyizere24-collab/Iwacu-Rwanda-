import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

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
