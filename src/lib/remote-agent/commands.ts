import type { Locale } from "@/lib/i18n";

export type RemoteAgentCommand =
  | { type: "location" }
  | { type: "read_page" }
  | { type: "stop_speaking" }
  | { type: "repeat" }
  | { type: "slower" }
  | { type: "resume" }
  | { type: "confirm_call" }
  | { type: "cancel_call" }
  | { type: "close" }
  | { type: "back" }
  | { type: "scroll_top" }
  | { type: "scroll_bottom" }
  | { type: "navigate"; path: string }
  | { type: "set_voice"; gender: "male" | "female" }
  | { type: "ask"; query: string };

type MarkerSet = { locale: Locale; markers: string[]; strong: string[] };

const LANGUAGE_MARKERS: MarkerSet[] = [
  {
    locale: "rw",
    markers: [
      "ndashaka", "nshaka", "ndifuza", "mbwira", "mumbwire", "muraho",
      "amakuru", "aho ndi", "umuyobozi", "abayobozi", "akarere", "uturere",
      "umurenge", "imirenge", "akagari", "umudugudu", "hamagara", "ubutabazi",
      "soma", "urupapuro", "komeza", "hagarika", "subiramo", "buhoro",
      "reka mbanze", "nimero", "meya",
    ],
    strong: ["muraho", "ndashaka", "nshaka", "ndifuza", "mbwira", "mumbwire", "aho ndi", "hamagara"],
  },
  {
    locale: "fr",
    markers: [
      "bonjour", "bonsoir", "je veux", "je voudrais", "s'il vous plaît",
      "où suis-je", "ma position", "maire", "responsable", "numéro",
      "urgence", "ambulance", "lisez", "ouvre", "ouvrez", "continue",
      "répète", "arrête", "attends", "parlez", "explique",
    ],
    strong: ["bonjour", "bonsoir", "je veux", "je voudrais", "où suis-je", "s'il vous plaît"],
  },
  {
    locale: "en",
    markers: [
      "hello", "good morning", "good afternoon", "i want", "i would like",
      "where am i", "my location", "mayor", "leader", "phone number",
      "emergency", "ambulance", "read this", "open", "continue", "repeat",
      "stop", "wait", "slow down", "tell me", "please", "explain",
    ],
    strong: ["hello", "good morning", "good afternoon", "i want", "i would like", "where am i"],
  },
];

export function normalizeSpokenText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detects a likely language from the recognized words. This deliberately returns
 * null when evidence is weak; it must not force a language switch on a guess.
 * Speech recognition itself still depends on the active browser/device provider.
 */
export function detectSpokenLocale(text: string): Locale | null {
  const normalized = normalizeSpokenText(text);
  if (!normalized) return null;

  const scores = new Map<Locale, number>();
  for (const group of LANGUAGE_MARKERS) {
    let score = 0;
    for (const marker of group.markers) {
      const clean = normalizeSpokenText(marker);
      if (!clean) continue;
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matched = clean.includes(" ")
        ? normalized.includes(clean)
        : new RegExp(`\\b${escaped}\\b`).test(normalized);
      if (matched) score += clean.includes(" ") ? 3 : 1;
    }
    for (const marker of group.strong) {
      if (normalized.includes(normalizeSpokenText(marker))) score += 2;
    }
    scores.set(group.locale, score);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const first = ranked[0];
  const second = ranked[1];
  if (!first || first[1] < 3 || (second && first[1] - second[1] < 2)) return null;
  return first[0];
}

/** Pick a recognition hint without asking the visitor to choose a language. */
export function getSpeechRecognitionHint(
  siteLocale: Locale,
  browserLanguages: readonly string[],
): string {
  for (const language of browserLanguages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith("rw")) return "rw-RW";
    if (normalized.startsWith("fr")) return "fr-FR";
    if (normalized.startsWith("en")) return "en-US";
  }
  return siteLocale === "fr" ? "fr-FR" : siteLocale === "en" ? "en-US" : "rw-RW";
}

const ROUTES: Array<{ path: string; phrases: string[] }> = [
  { path: "/", phrases: ["home page", "home", "ahabanza", "intangiriro", "accueil", "page d accueil"] },
  { path: "/#iwacu-local-leaders", phrases: ["abayobozi", "leaders", "local leaders", "responsables", "les responsables"] },
  { path: "/amenyesha", phrases: ["amamenyesha", "notifications", "mes notifications"] },
  { path: "/about", phrases: ["about iwacu", "about us", "ibyerekeye iwacu", "a propos"] },
  { path: "/how-it-works", phrases: ["how it works", "uko bikora", "comment ca marche"] },
  { path: "/rwanda-administration", phrases: ["rwanda administration", "ubuyobozi bw u rwanda", "administration du rwanda"] },
  { path: "/data-sources", phrases: ["data sources", "amasoko y amakuru", "sources des donnees"] },
  { path: "/contact", phrases: ["contact", "twandikire", "nous contacter"] },
  { path: "/privacy", phrases: ["privacy", "ibanga", "confidentialite"] },
  { path: "/terms", phrases: ["terms", "amategeko agenga urubuga", "conditions"] },
  { path: "/ubufasha-buri-wese", phrases: ["accessibility", "ubufasha ku bantu bose", "accessibilite"] },
];

export function classifyRemoteCommand(raw: string): RemoteAgentCommand {
  const text = normalizeSpokenText(raw);

  if (/\b(ijwi ryumugore|ijwi ry umugore|voice of a woman|female voice|change to female|change voice to female|voix feminine|voix de femme)\b/.test(text)) {
    return { type: "set_voice", gender: "female" };
  }
  if (/\b(ijwi ryumugabo|ijwi ry umugabo|voice of a man|male voice|change to male|change voice to male|voix masculine|voix d homme)\b/.test(text)) {
    return { type: "set_voice", gender: "male" };
  }
  if (/^(hagarika|hagarika ijwi|stop speaking|stop talking|tais toi|arrete de parler|arrete)$/.test(text)) {
    return { type: "stop_speaking" };
  }
  if (/^(subiramo|ongera usome|repeat|repeat that|repete|repetez)$/.test(text)) {
    return { type: "repeat" };
  }
  if (/^(buhoro|vuga buhoro|slow down|speak slowly|parle lentement|plus lentement)$/.test(text)) {
    return { type: "slower" };
  }
  if (/^(komeza|komeza kuvuga|continue|resume|reprends|continuez)$/.test(text)) {
    return { type: "resume" };
  }
  if (/^(yego(?: ndabyemeye)?|ndabyemeye|hamagara|yes(?: confirm)?|confirm|call now|oui(?: je confirme)?|je confirme|appelez)$/.test(text)) {
    return { type: "confirm_call" };
  }
  if (/^(oya(?: reka)?|reka|cancel|no(?: cancel)?|annule|non(?: annule)?)$/.test(text)) {
    return { type: "cancel_call" };
  }
  if (/^(funga|sohoka|funga ikiganiro|close|close assistant|quit|ferme|fermer)$/.test(text)) {
    return { type: "close" };
  }
  if (/^(subira inyuma|garuka inyuma|back|go back|retour|reviens en arriere)$/.test(text)) {
    return { type: "back" };
  }
  if (/^(jya hejuru|subira hejuru|top of page|scroll to top|en haut de page)$/.test(text)) {
    return { type: "scroll_top" };
  }
  if (/^(jya hasi|manuka hasi|bottom of page|scroll to bottom|en bas de page)$/.test(text)) {
    return { type: "scroll_bottom" };
  }
  if (/\b(aho ndi|menya aho ndi|ndi he|where am i|my location|ou suis je|ma position)\b/.test(text)) {
    return { type: "location" };
  }
  if (/\b(soma uru rupapuro|nsomera uru rupapuro|soma ibiri hano|read this page|read the page|lis cette page|lisez cette page)\b/.test(text)) {
    return { type: "read_page" };
  }

  for (const route of ROUTES) {
    if (route.phrases.some((phrase) => text.includes(normalizeSpokenText(phrase)))) {
      return { type: "navigate", path: route.path };
    }
  }

  return { type: "ask", query: raw.trim() };
}

export const REMOTE_AGENT_ALLOWED_ROUTES = ROUTES.map((route) => route.path);
