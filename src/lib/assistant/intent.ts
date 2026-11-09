import {
  AssistantContextSchema,
  type AssistantIntent,
  type AssistantLocationContext,
} from "./contracts";
import type { z } from "zod";

type AssistantContext = z.infer<typeof AssistantContextSchema>;

export interface IntentResult {
  intent: AssistantIntent;
  placeQuery: string | null;
  personQuery?: string | null;
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

function extractPersonQuery(raw: string): string | null {
  let value = normalize(raw);

  value = value
    .replace(/^(?:i think|i believe|i am looking for|looking for|find me|find|search for|ndashaka ko|ndakeka ko|ndakeka|ntekereza ko|ndashaka|nshaka|shaka)\s+/, "")
    .replace(/^(?:(?:the|a)\s+)?(?:umuyobozi|umuntu|leader|person)\s+(?:witwa|named|called)\s+/, "")
    .replace(/^(?:who is|who's|ninde witwa|ndinde witwa)\s+/, "")
    .replace(/\s+(?:ayobora|uyobora|yoboye|leads|is the leader|is a leader|works as|ni umuyobozi)\b.*$/, "")
    .replace(/\s+(?:mu|muri|in|at|dans)\s+(?:intara|akarere|province|district|sector|umurenge|western province|eastern province|southern province|northern province)\b.*$/, "")
    .replace(/\s+(?:i don't know which|simbizi|sinzi neza)\b.*$/, "")
    .trim();

  return value.length >= 2 ? value : null;
}

function extractPlaceQuery(raw: string): string | null {
  let value = normalize(raw);
  const leadingPatterns = [
    /^(?:meya\s+(?:w['']?akarere\s+ka|wa|w['']?akarere\s+wa)\s*)/,
    /^(?:umuyobozi\s+(?:w['']?akarere|w['']?umurenge|w['']?akagari|w['']?umudugudu|wa|w['']?intara)\s*(?:ka|kwa|wa|ya)?\s*)/,
    /^(?:umukuru\s+w['']?umudugudu\s*(?:wa|w['']?)?\s*)/,
    /^(?:ninde\s+uyobora\s+)/,
    /^(?:ndinde\s+uyobora\s+)/,
    /^(?:uyobora\s+)/,
    /^(?:who\s+(?:is\s+)?(?:the\s+)?(?:mayor|leader)\s+of\s+)/,
    /^(?:who\s+leads\s+)/,
    /^(?:leader\s+of\s+)/,
    /^(?:mayor\s+of\s+)/,
    /^(?:qui\s+est\s+le\s+maire\s+de\s+)/,
    /^(?:qui\s+dirige\s+(?:le\s+)?(?:district|secteur|cellule|village)\s+(?:de\s+)?)/,
    /^(?:maire\s+de\s+)/,
    /^(?:responsable\s+de\s+)/,
    /^(?:ou\s+se\s+trouve\s+)/,
    /^(?:ou\s+est\s+)/,
    /^(?:where\s+is\s+)/,
    /^(?:find\s+)/,
    /^(?:ahari\s+)/,
  ];
  for (const pattern of leadingPatterns) value = value.replace(pattern, "");

  value = value
    .replace(/\b(?:akarere|umurenge|akagari|umudugudu|intara)\s+(?:ka|kwa|wa|ya)\s+/g, "")
    .replace(/\b(?:district|sector|cell|village|province|secteur|cellule)\s+(?:de\s+)?/g, "")
    .replace(/\b(?:ni\s+nde|na\s+nde|ninde|nde|who\s+is\s+it|who\s+is|qui\s+est|qui\s+dirige)\b.*$/g, "")
    .replace(/\b(?:iri\s+he|uri\s+he|ri\s+he|he|where\s+is\s+it|ou\s+se\s+trouve|ou\s+est)\b.*$/g, "")
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

  const followUpContact = /^(?:nawe|none se|nimero ye|numero ye|telefoni ye|nimero yabo|phone number|his phone|her phone|his phone number|her phone number|their number|their phone number|contact details?|son numero|son telephone|son contact)$/.test(text);
  if (followUpContact && context?.scope_code) {
    return { intent: "leader_contact_followup", placeQuery: null };
  }

  if (/\b(ubutabazi|emergency|urgence|ambulance|ambulansi|polisi|police|inkongi|fire|pompier|impanuka|accident|ihohoterwa|isange|umurongo w'abana|child helpline)\b/.test(text)) {
    return { intent: "emergency", placeQuery: null };
  }

  if (/\b(ushobora gukora iki|wakora iki|wafasha iki|wamfasha iki|ubufasha|inama|ungire inama|what can you do|how can you help|advice|advise|conseil|comment aider|que peux tu faire)\b/.test(text)) {
    return { intent: "help", placeQuery: null };
  }

  const asksPersonByName =
    /\b(umuyobozi witwa|umuntu witwa|leader named|person named|leader called|search for leader|find leader|shaka umuyobozi|ndashaka umuyobozi|nshaka umuyobozi|ninde witwa|ndinde witwa)\b/.test(text) ||
    /^(?:i think|i believe)\s+[a-z]+\s+[a-z]+\s+(?:leads|is the leader)\b/.test(text) ||
    /^(?:who is|who's|qui est)\s+(?!the\s+(?:mayor|leader)|le\s+maire|la\s+maire)[a-z]+\s+[a-z]+/.test(text);

  if (asksPersonByName) {
    return { intent: "person_search", placeQuery: null, personQuery: extractPersonQuery(query) };
  }

  const asksAboutLeader = /\b(umuyobozi|abayobozi|umukuru|uyobora|meya|leader|mayor|dirige|maire|responsable|who leads|who is in charge|who manages)\b/.test(text);
  const asksAboutMyPlace = /\b(wanjye|aho ndi|hafi yanjye|iwacu|my village|my location|where i am|near me|chez moi|ma position)\b/.test(text);

  if (asksAboutLeader && asksAboutMyPlace) {
    return { intent: "leader_by_location", placeQuery: null };
  }

  if (/\b(imbibi|boundary|boundaries|border|limites|frontiere|umurongo w'imbibi)\b/.test(text)) {
    return { intent: "boundaries", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(ibyapa|icyapa|ikimenyetso cyo mu muhanda|signs|road signs|signage|panneaux|panneau)\b/.test(text)) {
    return { intent: "signs", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(metero|meters?|kilometers?|kilometres?|intera|distance|how far|uburebure bw'intera|metres?|loin)\b/.test(text)) {
    return { intent: "distance", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(angahe|tungahe|umubare|ubuso|ingano|population|how many|how large|area|size|compare|igereranya|combien|superficie|nombre)\b/.test(text)) {
    return { intent: "place_facts", placeQuery: extractPlaceQuery(query) };
  }

  if (asksAboutLeader) {
    return { intent: "leader_by_place", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(iri he|uri he|ahari|where is|find|shaka ahantu|aho riherereye|aho giherereye|ou se trouve|ou est|localiser)\b/.test(text)) {
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
