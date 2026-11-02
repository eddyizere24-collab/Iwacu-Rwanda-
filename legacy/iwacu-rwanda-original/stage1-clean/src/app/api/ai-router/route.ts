/**
 * POST /api/ai-router
 * The model ONLY classifies intent and extracts a place name / coordinates hint.
 * It never invents leaders, phone numbers, or administrative boundaries.
 * All authoritative data comes from PostGIS + leaders tables via /api/locate or /api/leaders.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED_INTENTS = [
  "locate_me",
  "find_leader",
  "emergency",
  "admin_help",
  "unknown",
] as const;

type Intent = (typeof ALLOWED_INTENTS)[number];

interface RouterResult {
  intent: Intent;
  confidence: number;
  place_hint: string | null;
  lat: number | null;
  lng: number | null;
  message_kiny: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = await checkRateLimit(`ai-router:${ip}`, 30, 60);
  if (limited) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Wageze ku gipimo." },
      { status: 429 }
    );
  }

  let body: { text?: string; lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const text = (body.text || "").trim().toLowerCase();
  if (!text && body.lat == null) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "text or lat required" }, { status: 400 });
  }

  // Deterministic lightweight classifier (no external model call in stage1)
  // This keeps the endpoint useful offline / without API keys while remaining honest.
  let intent: Intent = "unknown";
  let confidence = 0.4;
  let place_hint: string | null = null;
  let message_kiny = "Sinumvise neza. Ongera ubivuge mu kindi buryo.";

  if (body.lat != null && body.lng != null) {
    intent = "locate_me";
    confidence = 0.95;
    message_kiny = "Turimo gushakisha aho uri...";
  } else if (/gps|location|aho ndi|locate|find me|where am i|ahantu/.test(text)) {
    intent = "locate_me";
    confidence = 0.85;
    message_kiny = "Kanda buto ya GPS kugira ngo tubone aho uri.";
  } else if (/umuyobozi|leader|mayor|executive|cell|sector|umukuru|responsable/.test(text)) {
    intent = "find_leader";
    confidence = 0.8;
    message_kiny = "Shyiraho aho uri cyangwa izina ry'agace kugira ngo tubone abayobozi.";
    // crude place extraction
    const m = text.match(/(?:muri|mu|i)\s+([a-zA-Z\u00C0-\u017F\s]{3,40})/);
    if (m) place_hint = m[1].trim();
  } else if (/urgence|emergency|police|pompiers|sapeurs|112|113|ambulance|indwara|agahinda/.test(text)) {
    intent = "emergency";
    confidence = 0.9;
    message_kiny = "Hamagara 112 (police) cyangwa 113 (ubuzima). Reba kandi EmergencyBar hepfo.";
  } else if (/admin|login|dashboard|hindura|update my/.test(text)) {
    intent = "admin_help";
    confidence = 0.75;
    message_kiny = "Jya kuri /admin/login niba uri umuyobozi wemewe.";
  }

  const result: RouterResult = {
    intent,
    confidence,
    place_hint,
    lat: typeof body.lat === "number" ? body.lat : null,
    lng: typeof body.lng === "number" ? body.lng : null,
    message_kiny,
  };

  return NextResponse.json(result);
}
