import { NextRequest, NextResponse } from "next/server";
import { createIpRateLimiter, getClientIpFromHeaders } from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

// This route is deliberately disabled until the owner approves Pindo's
// processing of generated answer text. No microphone audio is sent here.
const ipLimiter = createIpRateLimiter({ limit: 8, windowMs: 60_000 });

export async function POST(request: NextRequest) {
  if (!ipLimiter.consume(getClientIpFromHeaders(request.headers))) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  if (process.env.IWACU_REMOTE_AGENT_PINDO_TTS_ENABLED !== "true") {
    return NextResponse.json({ error: "VOICE_PROVIDER_NOT_ENABLED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("text" in body)) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const text = (body as { text?: unknown }).text;
  if (typeof text !== "string" || !text.trim() || text.length > 900) {
    return NextResponse.json({ error: "INVALID_TEXT" }, { status: 400 });
  }

  try {
    const providerResponse = await fetch("https://api.pindo.io/ai/tts/rw/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        text: text.trim(),
        lang: "rw",
        speech_rate: 0.96,
      }),
    });

    if (!providerResponse.ok) {
      // Visible in Vercel runtime logs so the real reason (for example Pindo's daily limit) is known.
      let detail = "";
      try { detail = (await providerResponse.text()).slice(0, 200); } catch { /* ignore */ }
      console.error("[remote-agent/tts] provider_error", providerResponse.status, detail);
      return NextResponse.json(
        { error: "VOICE_PROVIDER_UNAVAILABLE", providerStatus: providerResponse.status },
        { status: providerResponse.status === 429 ? 429 : 502 },
      );
    }

    const payload = await providerResponse.json() as {
      status?: string;
      data?: { generated_audio_url?: string };
    };
    const rawUrl = payload.data?.generated_audio_url;
    if (payload.status !== "success" || typeof rawUrl !== "string" || !rawUrl.trim()) {
      console.error("[remote-agent/tts] invalid_payload", JSON.stringify(payload).slice(0, 200));
      return NextResponse.json({ error: "VOICE_RESPONSE_INVALID" }, { status: 502 });
    }

    const audioUrl = new URL(rawUrl, "https://api.pindo.io/");
    if (
      audioUrl.protocol !== "https:" ||
      !(audioUrl.hostname === "api.pindo.io" || audioUrl.hostname.endsWith(".pindo.io"))
    ) {
      return NextResponse.json({ error: "VOICE_URL_REJECTED" }, { status: 502 });
    }

    return NextResponse.json(
      { audioUrl: audioUrl.toString(), provider: "pindo", language: "rw" },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    console.error("[remote-agent/tts] exception", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "VOICE_PROVIDER_TIMEOUT" }, { status: 504 });
  }
}
