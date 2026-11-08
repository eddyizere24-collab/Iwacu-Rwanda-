import type {
  AssistantContextSchema,
  AssistantIntent,
  AssistantLocationContext,
} from "./contracts";
import type { z } from "zod";

type AssistantContext = z.infer<typeof AssistantContextSchema>;

export interface IntentResult {
  intent: AssistantIntent;
  placeQuery: string | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[!?.,;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPlaceQuery(raw: string): string | null {
  let value = normalize(raw);

  const leadingPatterns = [
    /^(?:meya\s+(?:w['']?akarere\s+ka|wa|w['']?akarere\s+wa)\s*)/,
    /^(?:ninde\s+uyobora\s+)/,
    /^(?:ndinde\s+uyobora\s+)/,
    /^(?:umuyobozi\s+(?:w['']?akarere|w['']?umurenge|w['']?akagari|w['']?umudugudu|wa|w['']?intara)\s*(?:ka|kwa|wa|ya)?\s*)/,
    /^(?:uyobora\s+)/,
    /^(?:who\s+(?:is\s+)?(?:the\s+)?(?:mayor|leader)\s+of\s+)/,
    /^(?:who\s+leads\s+)/,
    /^(?:leader\s+of\s+)/,
    /^(?:mayor\s+of\s+)/,
    /^(?:where\s+is\s+)/,
    /^(?:ahari\s+)/,
  ];

  for (const pattern of leadingPatterns) value = value.replace(pattern, "");

  value = value
    .replace(/\b(?:akarere|umurenge|akagari|umudugudu|intara)\s+(?:ka|kwa|wa|ya)\s+/g, "")
    .replace(/\b(?:district|sector|cell|village|province)\s+/g, "")
    .replace(/\b(?:ni\s+nde|na\s+nde|ninde|nde|who\s+is\s+it|who\s+is)\b.*$/g, "")
    .replace(/\b(?:iri\s+he|uri\s+he|ri\s+he|he|where\s+is\s+it)\b.*$/g, "")
    .replace(/\b(?:ni\s+uwuhe|ni\s+iki)\b.*$/g, "")
    .trim();

  return value.length >= 2 ? value : null;
}

export function classifyAssistantIntent(
  query: string,
  context: AssistantContext | null | undefined,
  location: AssistantLocationContext | null | undefined,
): IntentResult {
  const text = normalize(query);

  const followUpContact = /^(?:nawe|none se|nimero ye|numero ye|telefoni ye|nimero yabo|phone number|his phone|her phone|their number|contact details?)$/.test(text);
  if (followUpContact && context?.scope_code) {
    return { intent: "leader_contact_followup", placeQuery: null };
  }

  // Emergency questions always take priority over ordinary intent matching.
  if (/\b(ubutabazi|emergency|ambulance|ambulansi|polisi|police|inkongi|fire|impanuka|accident|ihohoterwa|isange|umurongo w'abana|child helpline)\b/.test(text)) {
    return { intent: "emergency", placeQuery: null };
  }

  if (/\b(ushobora gukora iki|wakora iki|wafasha iki|ubufasha|what can you do|how can you help|que peux tu faire|comment aider)\b/.test(text)) {
    return { intent: "help", placeQuery: null };
  }

  const asksAboutLeader = /\b(umuyobozi|uyobora|meya|leader|mayor|who leads|who is in charge|who manages)\b/.test(text);
  const asksAboutMyPlace = /\b(wanjye|aho ndi|hafi yanjye|iwacu|my village|my location|where i am|near me)\b/.test(text);

  if (asksAboutLeader && asksAboutMyPlace) {
    return { intent: location ? "leader_by_location" : "leader_by_location", placeQuery: null };
  }

  if (/\b(imbibi|boundary|boundaries|border|umurongo w'imbibi)\b/.test(text)) {
    return { intent: "boundaries", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(ibyapa|icyapa|ikimenyetso cyo mu muhanda|signs|road signs|signage)\b/.test(text)) {
    return { intent: "signs", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(metero|meters?|kilometers?|kilometres?|intera|distance|how far|uburebure bw'intera)\b/.test(text)) {
    return { intent: "distance", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(angahe|umubare|ubuso|ingano|population|how many|how large|area|size|compare|igereranya)\b/.test(text)) {
    return { intent: "place_facts", placeQuery: extractPlaceQuery(query) };
  }

  if (asksAboutLeader) {
    return { intent: "leader_by_place", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(iri he|uri he|ahari|where is|find|shaka ahantu|aho riherereye|aho giherereye)\b/.test(text)) {
    return { intent: "place_lookup", placeQuery: extractPlaceQuery(query) };
  }

  if (/^(muraho|mwaramutse|mwiriwe|bite|hello|hi|bonjour|bonsoir|salut)(\s|$)/.test(text)) {
    return { intent: "greeting", placeQuery: null };
  }

  return { intent: "out_of_scope", placeQuery: null };
}

export function isKnownAssistantIntent(intent: AssistantIntent): boolean {
  return intent !== "out_of_scope";
}
