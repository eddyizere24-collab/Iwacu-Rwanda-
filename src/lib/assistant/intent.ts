import {
  AssistantContextSchema,
  type AssistantIntent,
  type AssistantLocationContext,
} from "./contracts";
import type { z } from "zod";
import type { AdministrativeLevel } from "@/lib/administrative-units";

type AssistantContext = z.infer<typeof AssistantContextSchema>;

export interface IntentResult {
  intent: AssistantIntent;
  /** First resolved place phrase, or null when the question refers to current location. */
  placeQuery: string | null;
  /** Second place phrase for distance questions. */
  secondaryPlaceQuery?: string | null;
  personQuery?: string | null;
  requestedLevel?: AdministrativeLevel;
  requestedParent?: boolean;
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

function cleanPlacePhrase(raw: string): string | null {
  let value = normalize(raw);
  value = value
    .replace(/^(?:akarere|umurenge|akagari|umudugudu|intara)\s+(?:ka|kwa|wa|ya)\s+/, "")
    .replace(/^(?:district|sector|cell|village|province|secteur|cellule)\s+(?:of|de|du|des)?\s*/, "")
    .replace(/\s+(?:district|sector|cell|village|province|secteur|cellule)\s*$/, "")
    .replace(/\s+(?:kari|ari|iri|ri)\s+(?:mu|muri)\s+(?:ntara|province)\b.*$/, "")
    .replace(/\s+(?:gafite|ifite|ufite|afite|has|have|contains|compte|comprend|est|is|ni)\b.*$/, "")
    .replace(/\s+(?:ni nde|ninde|who is it|qui est)\b.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return value.length >= 2 ? value : null;
}

function extractPersonQuery(raw: string): string | null {
  let value = normalize(raw);

  value = value
    .replace(/^(?:i think|i believe|i am looking for|looking for|find me|find|search for|ndashaka ko|ndakeka ko|ndakeka|ntekereza ko|ndashaka|nshaka|shaka)\s+/, "")
    .replace(/^(?:(?:the|a)\s+)?(?:umuyobozi|umuntu|leader|person)\s+(?:witwa|named|called)\s+/, "")
    .replace(/^(?:who is|who's|ninde witwa|ndinde witwa|qui est)\s+/, "")
    .replace(/\s+(?:ayobora|uyobora|yoboye|leads|is the leader|is a leader|works as|ni umuyobozi)\b.*$/, "")
    .replace(/\s+(?:mu|muri|in|at|dans)\s+(?:intara|akarere|province|district|sector|umurenge|western province|eastern province|southern province|northern province)\b.*$/, "")
    .replace(/\s+(?:i don't know which|simbizi|sinzi neza)\b.*$/, "")
    .trim();

  return value.length >= 2 ? value : null;
}

/** Extract the two explicitly named places from common Kinyarwanda, English and French forms. */
export function extractPlacePair(raw: string): { first: string; second: string } | null {
  const value = normalize(raw);
  const patterns = [
    /\b(?:intera|uburebure)\s+(?:iri\s+)?hagati\s+ya\s+(.+?)\s+(?:na|hamwe\s+na)\s+(.+?)(?:\s+(?:ni|ingana|metero|kilometero|km|m)\b.*|$)/,
    /\b(?:distance)\s+between\s+(.+?)\s+and\s+(.+?)(?:\s+(?:is|in|approximately|roughly)\b.*|$)/,
    /\bhow\s+far\s+is\s+(.+?)\s+from\s+(.+?)(?:$)/,
    /\bdistance\s+entre\s+(.+?)\s+et\s+(.+?)(?:\s+(?:est|environ|de)\b.*|$)/,
    /\bquelle\s+est\s+la\s+distance\s+entre\s+(.+?)\s+et\s+(.+?)(?:$)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (!match) continue;
    const first = cleanPlacePhrase(match[1]);
    const second = cleanPlacePhrase(match[2]);
    if (first && second && first !== second) return { first, second };
  }
  return null;
}

function extractPlaceQuery(raw: string): string | null {
  const pair = extractPlacePair(raw);
  if (pair) return pair.first;

  let value = normalize(raw);
  const leadingPatterns = [
    /^(?:naho|na ho|none se|nawe se|kandi|also|and what about|what about|et aussi)\s+/,
    /^(?:meya\s+(?:w['']?akarere\s+ka|wa|w['']?akarere\s+wa)\s*)/,
    /^(?:umuyobozi\s+(?:w['']?akarere|w['']?umurenge|w['']?akagari|w['']?umudugudu|wa|w['']?intara)\s*(?:ka|kwa|wa|ya)?\s*)/,
    /^(?:umukuru\s+w['']?umudugudu\s*(?:wa|w['']?)?\s*)/,
    /^(?:ninde\s+uyobora\s+)/,
    /^(?:ndinde\s+uyobora\s+)/,
    /^(?:uyobora\s+)/,
    /^(?:who\s+(?:is\s+)?(?:the\s+)?(?:mayor|leader)\s+of\s+)/,
    /^who\s+is\s+in\s+charge\s+of\s+/,
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
    /^(?:imbibi|umurongo\s+w'imbibi)\s+(?:za|z'|de|du)?\s*/,
    /^(?:show\s+(?:me\s+)?(?:the\s+)?(?:boundaries|boundary|border|limits?)\s+of\s+)/,
    /^(?:boundaries|boundary|border|limits?)\s+of\s+/,
    /^(?:show\s+(?:me\s+)?(?:the\s+)?(?:area|size)\s+of\s+)/,
    /^(?:what\s+is\s+the\s+)?(?:area|size)\s+of\s+/,
    /^(?:which|what)\s+province\s+is\s+/,
    /^(?:dans\s+quelle\s+province\s+(?:se\s+trouve|est)\s+)/,
    /^(?:superficie\s+(?:du|de la|de l')\s+)/,
    /^(?:limites?\s+(?:du|de la|de l')\s*(?:district|secteur|cellule|village)?\s*(?:de\s+)?)/,
    /^(?:how\s+many\s+.+?\s+(?:are\s+)?in\s+)/,
    /^(?:combien\s+de\s+.+?\s+compte\s+(?:le|la)\s+(?:district|secteur|cellule|village)\s+(?:de\s+)?)/,
    /^(?:combien\s+de\s+.+?\s+dans\s+(?:le|la)\s+(?:district|secteur|cellule|village)\s+(?:de\s+)?)/,
  ];
  for (const pattern of leadingPatterns) value = value.replace(pattern, "");

  value = value
    .replace(/\b(?:akarere|umurenge|akagari|umudugudu|intara)\s+(?:ka|kwa|wa|ya)\s+/g, "")
    .replace(/\b(?:district|sector|cell|village|province|secteur|cellule)\s+(?:of|de|du|des)?\s*/g, "")
    .replace(/\b(?:ni\s+nde|na\s+nde|ninde|nde|who\s+is\s+it|who\s+is|qui\s+est|qui\s+dirige)\b.*$/g, "")
    .replace(/\b(?:ziri\s+he|iri\s+he|uri\s+he|ri\s+he|he|where\s+is\s+it|ou\s+se\s+trouve|ou\s+est)\b.*$/g, "")
    .replace(/\b(?:ni\s+uwuhe|ni\s+iki|gafite|ifite|ufite|afite|has|have|contains|compte|comprend)\b.*$/g, "")
    .replace(/\s+\b(?:kari|ari|iri|ri)\s+(?:mu|muri)\s+(?:ntara|province)\b.*$/, "")
    .replace(/\s+(?:in|dans)\s*$/, "")
    .trim();

  return cleanPlacePhrase(value);
}

function extractExternalResearchQuery(raw: string): string | null {
  let value = normalize(raw);
  const prefixes = [
    /^(?:shakisha|shaka)\s+(?:amakuru\s+)?(?:kuri\s+internet|kuri\s+web|ku\s+rubuga\s+rwa\s+internet)\s*(?:amakuru\s+)?/,
    /^(?:shakisha|shaka)\s+amakuru\s+(?:ajyanye\s+na|yerekeye|kuri)\s+/,
    /^(?:search\s+the\s+web\s+for|search\s+online\s+for|search\s+the\s+internet\s+for|look\s+up\s+online|research\s+online|find\s+sources\s+about|web\s+search\s+for)\s+/,
    /^(?:recherche\s+sur\s+internet|recherche\s+en\s+ligne|cherche\s+sur\s+le\s+web|cherche\s+en\s+ligne)\s*(?:sur|pour)?\s*/,
  ];
  for (const pattern of prefixes) value = value.replace(pattern, "");
  value = value
    .replace(/^(?:amakuru\s+(?:ajyanye\s+na|yerekeye)|ajyanye\s+na|yerekeye|information\s+about|informations?\s+sur)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return value.length >= 2 ? value : null;
}

export function classifyAssistantIntent(
  query: string,
  context: AssistantContext | null | undefined,
  location: AssistantLocationContext | null | undefined,
): IntentResult {
  const text = normalize(query);

  const followUpContact = /^(?:(?:na|none se|and|also|kandi|ikindi)\s+)?(?:nimero ye|numero ye|telefoni ye|nimero yabo|nimero yawo|n'iyo nimero|phone number|his phone|her phone|his phone number|her phone number|their number|their phone number|and his phone|and her phone|what about (?:his|her|their) phone|contact details?|son numero|son telephone|son contact)$/.test(text);
  if (followUpContact && context?.scope_code) {
    return { intent: "leader_contact_followup", placeQuery: null };
  }

  if (/\b(ubutabazi|emergency|urgence|ambulance|ambulansi|polisi|police|inkongi|nkongi|umuriro|fire|pompier|impanuka|accident|ihohoterwa|isange|umurongo w'abana|child helpline)\b/.test(text)) {
    return { intent: "emergency", placeQuery: null };
  }

  const asksIdentity = /^(?:urinde|uri nde|wowe uri nde|wowe uri muntu ki|who are you|who r u|what is your name|who am i talking to|qui es tu|qui es-tu|qui etes vous|qui etes-vous|vous etes qui|tu es qui|tu es-tu|comment vous appelez vous|comment vous appelez-vous)$/.test(text);
  if (asksIdentity) return { intent: "identity", placeQuery: null };

  // Named-place parent questions are place facts even without prior place context.
  // Example: “Akarere ka Gasabo kari mu Ntara iyihe?”
  const asksAdministrativeParent = /\b(?:mu ntara iyihe|muri iyihe ntara|which province|what province|dans quelle province|quelle province)\b/.test(text);
  if (asksAdministrativeParent) {
    const namedPlace = extractPlaceQuery(query);
    const parentPlaceLevel: AdministrativeLevel | undefined =
      /\b(?:akarere|district)\b/.test(text) ? "district" :
      /\b(?:umurenge|sector|secteur)\b/.test(text) ? "sector" :
      /\b(?:akagari|cell|cellule)\b/.test(text) ? "cell" :
      /\b(?:umudugudu|village)\b/.test(text) ? "village" : undefined;
    if (namedPlace) return { intent: "place_facts", placeQuery: namedPlace, requestedLevel: parentPlaceLevel, requestedParent: true };
  }

  const contextualNewPlace = context?.scope_code
    ? text.match(/^(?:naho|na ho|none se|nawe se|kandi|also|and what about|what about|et aussi)\s+(.+?)$/)
    : null;
  if (contextualNewPlace?.[1]) {
    const placeQuery = cleanPlacePhrase(contextualNewPlace[1]);
    if (placeQuery) {
      const asksPlaceFact =
        /\b(?:angahe|ingahe|tungahe|umubare|ubuso|ingano|population|how many|how large|area|size|compare|igereranya|combien|superficie|nombre)\b/.test(text);
      return {
        intent: asksPlaceFact ? "place_facts" : "place_lookup",
        placeQuery,
      };
    }
  }

  const countryScope = /\b(?:mu rwanda|muri rwanda|u rwanda|rwanda|mu gihugu|muri iki gihugu|in rwanda|the country|au rwanda|en rwanda)\b/.test(text);
  const asksForCount = /\b(?:angahe|ingahe|tungahe|bangahe|zingahe|ringahe|how many|how much|number of|combien|nombre de)\b/.test(text);
  const requestedLevel: AdministrativeLevel | null =
    /\b(?:uturere|akarere|districts?|district)\b/.test(text) ? "district" :
    /\b(?:intara|provinces?|province)\b/.test(text) ? "province" :
    /\b(?:imirenge|umurenge|sectors?|secteurs?)\b/.test(text) ? "sector" :
    /\b(?:utugari|akagari|cells?|cellules?)\b/.test(text) ? "cell" :
    /\b(?:imidugudu|umudugudu|villages?)\b/.test(text) ? "village" : null;
  if (countryScope && asksForCount && requestedLevel) {
    return { intent: "national_facts", placeQuery: null, requestedLevel };
  }

  const explicitExternalSearch =
    /^(?:shakisha|shaka)\b.*\b(?:internet|web|online)\b/.test(text) ||
    /\b(?:search the web|search online|search the internet|look up online|research online|find sources about|web search)\b/.test(text) ||
    /\b(?:recherche sur internet|recherche en ligne|cherche sur le web|cherche en ligne)\b/.test(text);
  if (explicitExternalSearch) {
    return { intent: "external_research", placeQuery: extractExternalResearchQuery(query) };
  }

  if (/\b(ushobora gukora iki|wakora iki|wafasha iki|wamfasha iki|ubufasha|inama|ungire inama|what can you do|how can you help|advice|advise|conseil|comment aider|que peux tu faire)\b/.test(text)) {
    return { intent: "help", placeQuery: null };
  }

  const asksAboutLeader = /\b(umuyobozi|abayobozi|umukuru|uyobora|meya|leader|mayor|dirige|maire|responsable|who leads|who is in charge|in charge|who manages)\b/.test(text);
  const asksAboutMyPlace = /\b(wanjye|aho ndi|aho uri|aho turi|ahantu ndi|hafi yanjye|iwacu|my village|my location|where i am|near me|chez moi|ma position)\b/.test(text);

  const refersToContextPlace = Boolean(context?.scope_code) &&
    /\b(?:aha|aho hantu|aka karere|uyu murenge|aka kagari|uyu mudugudu|iyo ntara|aka gace|that place|this place|there|its|their|it)\b/.test(text);
  if (asksAboutLeader && (asksAboutMyPlace || refersToContextPlace)) {
    return {
      intent: asksAboutMyPlace ? "leader_by_location" : "leader_by_place",
      placeQuery: null,
    };
  }

  // A direct "where am I?" request differs from asking for the local leader.
  const asksWhereAmI = /\b(aho ndi|ndi he|menya aho ndi|ahantu ndi|where am i|where i am|my current location|my location|ou suis-je|ou je suis)\b/.test(text);
  if (asksWhereAmI) {
    return { intent: "my_location", placeQuery: null };
  }

  const asksPersonByName =
    /\b(umuyobozi witwa|umuntu witwa|leader named|person named|leader called|search for leader|find leader|shaka umuyobozi|ndashaka umuyobozi|nshaka umuyobozi|ninde witwa|ndinde witwa)\b/.test(text) ||
    /^(?:i think|i believe)\s+[a-z]+\s+[a-z]+\s+(?:leads|is the leader)\b/.test(text) ||
    /^(?:who is|who's|qui est)\s+(?!the\s+(?:mayor|leader)|le\s+maire|la\s+maire|in\s+charge)[a-z]+\s+[a-z]+/.test(text);

  if (asksPersonByName) {
    return { intent: "person_search", placeQuery: null, personQuery: extractPersonQuery(query) };
  }

  if (/\b(imbibi|boundary|boundaries|border|limites|frontiere|umurongo w'imbibi)\b/.test(text)) {
    return { intent: "boundaries", placeQuery: extractPlaceQuery(query) };
  }

  if (/\b(ibyapa|icyapa|ikimenyetso cyo mu muhanda|signs|road signs|signage|panneaux|panneau)\b/.test(text)) {
    return { intent: "signs", placeQuery: extractPlaceQuery(query) };
  }

  const asksDistance = /\b(metero|meters?|kilometers?|kilometres?|intera|distance|how far|uburebure bw'intera|metres?|loin)\b/.test(text);
  if (asksDistance) {
    const pair = extractPlacePair(query);
    return {
      intent: "distance",
      placeQuery: pair?.first ?? extractPlaceQuery(query),
      secondaryPlaceQuery: pair?.second ?? null,
    };
  }

  const contextualPlaceFollowUp = Boolean(context?.scope_code) &&
    /^(?:(?:na|none se|and|also)\s+)?(?:mbwira byinshi|bwira byinshi|byinshi kuri yo|sobanura|nsobanurira|ibindi kuri yo|what about (?:its|their|that)|tell me more|more about (?:it|that|this)|which ones|list them|et apres|plus d'informations|plus de details|explique davantage)/.test(text);

  const contextualLeaderFollowUp = Boolean(context?.scope_code) &&
    /^(?:(?:none se|nawe se|and|also)\s+)?(?:ninde|ni nde|urinde|who is it|who leads there|who is in charge|et qui|qui le dirige)$/.test(text);
  if (contextualLeaderFollowUp) {
    return { intent: "leader_by_place", placeQuery: null };
  }

  const contextualPlaceLocationFollowUp = Boolean(context?.scope_code) &&
    /^(?:aho riherereye|ri he|iri he|aho iri|iri mu karere akahe|muri akahe karere|muri iyihe ntara|what district is it in|which district is it in|which province|where is it|where is that|where does it belong|where is it located|dans quelle province|ou est il|ou se trouve t il)$/.test(text);
  if (contextualPlaceLocationFollowUp) {
    return { intent: "place_facts", placeQuery: null };
  }

  const contextualChildrenFollowUp = Boolean(context?.scope_code) &&
    /^(?:ni izihe|ni iyihe|amazina yazo|amazina yayo|mbwira amazina|urutonde rwazo|urutonde rwabyo|what are they|which ones|list them|show me the list|quels sont ils|lesquels)$/.test(text);
  if (contextualChildrenFollowUp) {
    return { intent: "place_facts", placeQuery: null };
  }
  if (contextualPlaceFollowUp) {
    return { intent: "place_facts", placeQuery: null };
  }

  if (/\b(angahe|ingahe|tungahe|umubare|ubuso|ingano|population|how many|how large|area|size|compare|igereranya|combien|superficie|nombre)\b/.test(text)) {
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
