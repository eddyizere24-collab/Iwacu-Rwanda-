import {
  AssistantContextSchema,
  type AssistantIntent,
  type AssistantLeaderCard,
  type AssistantLocationContext,
  type AssistantReply,
  type AssistantRequest,
} from "./contracts";
import type { z } from "zod";
import { classifyAssistantIntent } from "./intent";
import { createAssistantLanguageModelProvider, getAssistantProviderReadiness, isGeneralAnswerEnabled } from "./model-provider";
import {
  findLeadersAtPlace,
  getVerifiedEmergencyContacts,
  recordAssistantGapDetailed,
  getPublicLeaderPhotoUrl,
  searchPlaces,
  searchPublicLeaders,
  toAssistantPlaceCard,
  lookupPlaceHierarchyFacts,
  type PlaceSearchRecord,
} from "./tools";
import { getAdjacentScopes, getAreaM2, getDistanceM } from "./spatial-facts";
import { lookupNearbySigns } from "./signs";
import { runExternalResearch } from "./external-research";
import { getRwandaAdministrativeFact } from "./country-facts";
import type { PublicLeaderRecord, PublicSharedLeader } from "@/lib/leaders/public-directory";

type AssistantContext = z.infer<typeof AssistantContextSchema>;
type LeaderLookupIntent = Extract<AssistantIntent, "leader_by_location" | "leader_by_place" | "leader_contact_followup">;

const PLACE_SOURCE = {
  label: "Ububiko bw'ahantu bwa IWACU RWANDA (search_places)",
  data_date: null,
};
const LEADER_SOURCE = {
  label: "Urutonde rw'abayobozi rwa IWACU RWANDA (get_leader_candidates_v2)",
  data_date: null,
};
const EMERGENCY_SOURCE = {
  label: "Imibare y'ubutabazi — Urubuga rwa Leta y'u Rwanda",
  data_date: "2026-11-09",
  url: "https://www.gov.rw/emergency",
};
const FIRE_SAFETY_SOURCE = {
  label: "Amabwiriza y'umutekano mu gihe cy'inkongi — Government of Rwanda",
  data_date: "2026-11-09",
  url: "https://bpmis.gov.rw/asset_data/form_201251/files/element_116_fe763fa5af2508fc31e28797cea5cd8a-708-BUILDING%20SECURITY%20%26%20FIRE%20SAFETY.pdf",
};
const DATA_DATE_LABEL = "Itariki y'ivugurura ntigaragajwe muri database.";

function makeReply(
  intent: AssistantIntent,
  answer: string,
  options: Partial<AssistantReply> = {},
): AssistantReply {
  return {
    status: "success",
    intent,
    answer_kiny: answer,
    confidence: "not_applicable",
    confidence_label: "Nta gipimo cy'icyizere gikenewe kuri iki gisubizo.",
    data_date_label: DATA_DATE_LABEL,
    sources: [],
    places: [],
    leaders: [],
    emergency_contacts: [],
    suggestions: [],
    context: null,
    gap_recorded: false,
    gap_notified: false,
    capability: null,
    ...options,
  };
}

function levelName(level: string): string {
  const names: Record<string, string> = {
    province: "Intara",
    district: "Akarere",
    sector: "Umurenge",
    cell: "Akagari",
    village: "Umudugudu",
  };
  return names[level] ?? "Aho hantu";
}

function leaderCard(
  leader: PublicLeaderRecord,
  placeName: string,
  placeLevel: string,
): AssistantLeaderCard {
  return {
    appointment_id: leader.appointment_id,
    display_name: leader.display_name,
    role_kiny: leader.position.title_kiny || "Umwanya ntiwanditswe",
    role_eng: leader.position.title_eng || "",
    place_name: placeName,
    place_level: placeLevel,
    effective_from: leader.appointment.effective_from || null,
    contacts: leader.public_contacts.map((contact) => ({
      type: contact.type,
      label: contact.label,
      value: contact.value,
    })),
    photo_url: getPublicLeaderPhotoUrl(leader.profile.thumbnail_key || leader.profile.photo_key),
  };
}

function hasPublicPhone(leader: AssistantLeaderCard): boolean {
  return leader.contacts.some((contact) =>
    /phone|mobile|telephone|tel|whatsapp/i.test(contact.type),
  );
}

function orderedParentLeaders(rows: PublicSharedLeader[]): PublicSharedLeader[] {
  const rank: Record<string, number> = {
    village: 5,
    cell: 4,
    sector: 3,
    district: 2,
    province: 1,
    country: 0,
  };
  const unique = new Map<string, PublicSharedLeader>();
  for (const row of rows) {
    if (row.place && rank[row.place.level] !== undefined && !unique.has(row.appointment_id)) {
      unique.set(row.appointment_id, row);
    }
  }
  return [...unique.values()].sort(
    (left, right) => (rank[right.place.level] ?? -1) - (rank[left.place.level] ?? -1),
  );
}

function nearestParentLevelWithPhone(rows: PublicSharedLeader[]): PublicSharedLeader[] {
  const rank: Record<string, number> = {
    cell: 4,
    sector: 3,
    district: 2,
    province: 1,
    country: 0,
  };
  const levels = [...new Set(rows.map((row) => rank[row.place.level]).filter((value) => value !== undefined))]
    .sort((left, right) => right - left);
  for (const level of levels) {
    const atLevel = rows.filter((row) => rank[row.place.level] === level);
    const withPhone = atLevel.filter((row) =>
      row.public_contacts.some((contact) => /phone|mobile|telephone|tel|whatsapp/i.test(contact.type)),
    );
    if (withPhone.length) return withPhone;
  }
  return [];
}

function unavailableReply(intent: AssistantIntent): AssistantReply {
  return makeReply(
    intent,
    "Ububiko bw'amakuru ntibwashoboye kuboneka ubu. Nta makuru nshobora kwemeza. Ongera ugerageze nyuma.",
    {
      status: "partial",
      gap_recorded: false,
      suggestions: ["Ongera ugerageze", "Shaka umuyobozi w'aho ndi", "Reba nimero z'ubutabazi"],
    },
  );
}

async function buildLeaderReply(
  intent: LeaderLookupIntent,
  scopeCode: string,
  requestedPlaceName: string,
  requestedPlaceLevel: string,
  requestContact: boolean,
): Promise<AssistantReply> {
  const result = await findLeadersAtPlace(scopeCode);
  if (result.status === "unavailable" || !result.data) return unavailableReply(intent);
  const placeName = result.data.candidatePlace?.name_kiny || requestedPlaceName;
  const placeLevel = result.data.candidatePlace?.level || requestedPlaceLevel;
  const direct = result.data.directLeaders.map((leader) => leaderCard(leader, placeName, placeLevel));
  const directWithPhone = direct.filter(hasPublicPhone);
  const orderedParents = orderedParentLeaders(result.data.higherLevelLeaders);
  const parentCards = orderedParents.map((row) => leaderCard(row, row.place.name_kiny, row.place.level));
  const fallbackParents = nearestParentLevelWithPhone(orderedParents).map((row) =>
    leaderCard(row, row.place.name_kiny, row.place.level),
  );
  const safeContext = {
    intent,
    scope_code: scopeCode,
    place_name: placeName,
    level: placeLevel as AssistantContext["level"],
  };
  if (requestContact) {
    if (directWithPhone.length) {
      return makeReply(intent, "Dore nimero zemewe zatangajwe z'umuyobozi w'aho hantu. Nongeraho n'abayobozi bo ku nzego zo hejuru kugira ngo ubone inzira z'ubuyobozi:", {
        status: "success", confidence: "medium",
        confidence_label: "Icyizere kiri hagati: amakuru yavuye ku rutonde rw'abayobozi rwemejwe; itariki yo kuvugurura ntigaragajwe.",
        sources: [LEADER_SOURCE], leaders: [...direct, ...parentCards], context: safeContext,
        suggestions: ["Nimero ye", "Reba abayobozi bo ku rwego rwo hejuru"],
      });
    }
    if (fallbackParents.length) {
      const gapRecorded = await recordAssistantGapDetailed("contact_missing", scopeCode);
      return makeReply(intent, "Nta nimero rusange y'umuyobozi wo kuri " + levelName(placeLevel).toLowerCase() + " ya " + placeName + " iri mu bubiko. Dore umuyobozi wo ku rwego rukurikiyeho ufite nimero yatangajwe:", {
        status: "partial", confidence: "low",
        confidence_label: "Nimero yerekanwe ni iy'urwego rwo hejuru, si iy'urwego wabajije. Icyizere kiri hasi.",
        sources: [LEADER_SOURCE], leaders: [...direct, ...fallbackParents], gap_recorded: gapRecorded.recorded,
        gap_notified: gapRecorded.notifiedAuthorities > 0, context: safeContext,
        suggestions: ["Reba abayobozi bo ku nzego zo hejuru", "Baza ibiro by'ubuyobozi"],
      });
    }
    const gapRecorded = await recordAssistantGapDetailed("contact_missing", scopeCode);
    return makeReply(intent, "Nta nimero rusange y'umuyobozi wa " + placeName + " cyangwa iy'abayobozi bo ku nzego zo hejuru iri mu makuru yatangajwe. Ntabwo mfite nimero yemewe yo kuguha. Intambwe ikurikira ni ukubaza ibiro by'ubuyobozi bw'ako gace.", {
      status: "missing", confidence: "low", confidence_label: "Nta nimero rusange yemewe yabonetse mu makuru yagenzuwe.",
      sources: [LEADER_SOURCE], leaders: [...direct, ...parentCards], gap_recorded: gapRecorded.recorded,
        gap_notified: gapRecorded.notifiedAuthorities > 0, context: safeContext,
      suggestions: ["Shaka ibiro by'ubuyobozi bw'ako gace", "Reba amakuru y'akarere"],
    });
  }
  if (direct.length) {
    return makeReply(intent, "Abayobozi banditswe kandi bemejwe kuri " + levelName(placeLevel).toLowerCase() + " ya " + placeName + ":", {
      confidence: "medium", confidence_label: "Icyizere kiri hagati: amakuru yavuye ku rutonde rw'abayobozi rwemejwe, ariko itariki yo kuvugurura ntigaragajwe.",
      sources: [LEADER_SOURCE], leaders: [...direct, ...parentCards], context: safeContext,
      suggestions: ["Mpa nimero y'umuyobozi", "Reba abayobozi bo ku rwego rwo hejuru"],
    });
  }
  if (parentCards.length) {
    const gapRecorded = await recordAssistantGapDetailed("leader_missing", scopeCode);
    return makeReply(intent, "Nta muyobozi wanditswe kuri " + levelName(placeLevel).toLowerCase() + " ya " + placeName + ". Umuyobozi wo ku rwego rwegereye hejuru twabonye ni:", {
      status: "partial", confidence: "low",
      confidence_label: "Icyizere kiri hasi: igisubizo kivuye ku rwego rwo hejuru kuko urwego wabajije rutuzuye.",
      sources: [LEADER_SOURCE], leaders: parentCards, gap_recorded: gapRecorded.recorded,
        gap_notified: gapRecorded.notifiedAuthorities > 0, context: safeContext,
      suggestions: ["Nimero ye", "Reba aho aka gace gaherereye"],
    });
  }
  const gapRecorded = await recordAssistantGapDetailed("leader_missing", scopeCode);
  return makeReply(intent, "Nta muyobozi wemejwe wanditswe kuri " + levelName(placeLevel).toLowerCase() + " ya " + placeName + ", kandi nta muyobozi wo ku rwego rwo hejuru wabonetse muri database. Nta zina cyangwa nimero nshobora guhimba. Intambwe ikurikira ni ukumenyesha ibiro by'ubuyobozi bw'ako gace ko aya makuru abura.", {
    status: "missing", confidence: "low", confidence_label: "Nta muyobozi wabonetse mu makuru rusange.",
    sources: [LEADER_SOURCE], gap_recorded: gapRecorded.recorded,
        gap_notified: gapRecorded.notifiedAuthorities > 0, context: safeContext,
    suggestions: ["Shaka amakuru y'akarere", "Reba nimero z'ubutabazi"],
  });
}

function uniquePlaces(rows: PlaceSearchRecord[]): PlaceSearchRecord[] {
  const byScope = new Map<string, PlaceSearchRecord>();
  for (const row of rows) {
    if (!byScope.has(row.scope_code)) byScope.set(row.scope_code, row);
  }
  return [...byScope.values()];
}

type PlaceResolution =
  | { status: "ok"; place: PlaceSearchRecord }
  | { status: "ambiguous"; places: PlaceSearchRecord[] }
  | { status: "missing" }
  | { status: "unavailable" };

async function resolvePlaceName(name: string): Promise<PlaceResolution> {
  const result = await searchPlaces(name);
  if (result.status === "unavailable" || !result.data) return { status: "unavailable" };
  const matches = uniquePlaces(result.data);
  if (!matches.length) return { status: "missing" };
  if (matches.length > 1) return { status: "ambiguous", places: matches };
  return { status: "ok", place: matches[0] };
}

async function lookupPlaceOrLeader(
  intent: "place_lookup" | "leader_by_place",
  placeQuery: string | null,
  requestContact = false,
): Promise<AssistantReply> {
  if (!placeQuery || placeQuery.trim().length < 2) {
    return makeReply(intent, "Nkeneye izina ry'ahantu kugira ngo nshakishe neza. Urugero: Gasabo, Kacyiru cyangwa Kamatamu.", {
      status: "partial", suggestions: ["Ninde uyobora umurenge wa Kacyiru?", "Meya w'Akarere ka Gasabo ni nde?"],
    });
  }
  const result = await searchPlaces(placeQuery);
  if (result.status === "unavailable" || !result.data) return unavailableReply(intent);
  const matches = uniquePlaces(result.data);
  if (!matches.length) {
    const gapRecorded = await recordAssistantGapDetailed("place_not_found", null);
    return makeReply(intent, "Nta hantu bihuye n'ikibazo cyawe nabonye mu bubiko bw'ahantu bwa IWACU. Ntabwo nzagerageza guhimba aho ari ho. Gerageza andi magambo cyangwa wongereho Akarere/Umurenge niba uhabizi.", {
      status: "missing", confidence: "low", confidence_label: "Nta hantu bihuye n'izina habonetse.",
      sources: [PLACE_SOURCE], gap_recorded: gapRecorded.recorded,
        gap_notified: gapRecorded.notifiedAuthorities > 0, suggestions: ["Shakisha irindi zina", "Baza umuyobozi w'aho uri"],
    });
  }
  if (matches.length > 1) {
    return makeReply(intent, "Hari ahantu henshi bihuye n'izina washakishije. Hitamo ahantu hagaragajwe kugira ngo ntavange amazina:", {
      status: "partial", confidence: "low", confidence_label: "Izina rihuriye ahantu henshi; nta hantu nahisemo mu mwanya wawe.",
      sources: [PLACE_SOURCE], places: matches.map(toAssistantPlaceCard), suggestions: ["Hitamo ahantu hagaragara hano"],
    });
  }
  const place = matches[0];
  if (intent === "place_lookup") {
    return makeReply(intent, "Nabonye " + place.name_kiny + ". Dore aho iherereye mu nzego z'ubuyobozi: " + (place.full_path || place.name_kiny) + ".", {
      confidence: "medium", confidence_label: "Icyizere kiri hagati: izina ryabonetse mu bubiko bw'ahantu, ariko itariki y'amakuru ntigaragajwe.",
      sources: [PLACE_SOURCE], places: [toAssistantPlaceCard(place)],
      context: { intent: "place_lookup", scope_code: place.scope_code, place_name: place.name_kiny, level: place.level as AssistantContext["level"] },
      suggestions: ["Ninde uyobora aha?", "Mpa nimero y'umuyobozi w'aha"],
    });
  }
  return buildLeaderReply(intent, place.scope_code, place.name_kiny, place.level, requestContact);
}

async function searchPersonReply(personQuery: string | null | undefined): Promise<AssistantReply> {
  if (!personQuery || personQuery.trim().length < 2) {
    return makeReply("person_search", "Andika nibura igice cy'izina ry'umuntu ushaka. Nta muntu nzahitamo ntamubonye mu makuru yemewe.", {
      status: "partial", suggestions: ["Shaka umuyobozi witwa Muhire Boniface"],
    });
  }
  const result = await searchPublicLeaders(personQuery);
  if (result.status === "unavailable" || !result.data) return unavailableReply("person_search");
  if (!result.data.length) {
    const gapRecorded = await recordAssistantGapDetailed("leader_missing", null);
    return makeReply("person_search", "Nta muyobozi uhuye n'izina watanze nabonye mu rutonde rw'abayobozi rwemejwe kandi rugaragara ku mugaragaro. Ibyo ntibihamya ko uwo muntu atari umuyobozi; bivuga gusa ko atabonetse muri aya makuru.", {
      status: "missing", confidence: "low", confidence_label: "Nta muntu uhuye n'iri zina wabonetse mu rutonde rw'amakuru rusange.",
      sources: [LEADER_SOURCE], gap_recorded: gapRecorded.recorded,
        gap_notified: gapRecorded.notifiedAuthorities > 0, suggestions: ["Gerageza andi mazina", "Ongeraho Akarere cyangwa Umurenge"],
    });
  }
  const leaders = result.data.map((hit) => leaderCard(hit.leader, hit.place.name_kiny, hit.place.level));
  if (result.data.length > 1) {
    return makeReply("person_search", "Hari abayobozi benshi bafite amazina asa. Reba aho buri wese akorera kugira ngo utavanga abantu:", {
      status: "partial", confidence: "low", confidence_label: "Abantu barenze umwe bahuye n'izina; nta muntu nahisemo mu mwanya wawe.",
      sources: [LEADER_SOURCE], leaders, suggestions: ["Ongeraho Akarere, Umurenge cyangwa umwanya afite"],
    });
  }
  const hit = result.data[0];
  return makeReply("person_search", "Nabonye umuyobozi uhuye n'izina watanze mu makuru yemejwe kandi agaragara ku mugaragaro:", {
    confidence: "medium", confidence_label: "Izina n'aho akorera byavuye ku rutonde rw'abayobozi rwemejwe; itariki y'ivugurura ntiyatangajwe.",
    sources: [LEADER_SOURCE], leaders,
    context: {
      intent: "leader_by_place", scope_code: hit.place.scope_code, place_name: hit.place.name_kiny,
      level: hit.place.level as AssistantContext["level"], person_name: hit.leader.display_name,
      person_id: hit.leader.person_id, appointment_id: hit.leader.appointment_id,
    },
    suggestions: ["Nimero ye", "Reba amakuru y'aho akorera"],
  });
}

async function exactPersonFollowUp(context: AssistantContext): Promise<AssistantReply> {
  if (!context.appointment_id || !context.person_name) {
    return makeReply("leader_contact_followup", "Sinabonye umuyobozi twari tumaze kuvuga. Ongera ubaze izina rye kugira ngo nguhe amakuru yemejwe.", {
      status: "partial", suggestions: ["Shaka umuyobozi witwa Muhire Boniface"],
    });
  }
  const result = await searchPublicLeaders(context.person_name);
  if (result.status === "unavailable" || !result.data) return unavailableReply("leader_contact_followup");
  const hit = result.data.find((item) => item.leader.appointment_id === context.appointment_id);
  if (!hit) {
    return makeReply("leader_contact_followup", "Sinashoboye kongera kwemeza amakuru y'uwo muyobozi muri uru rutonde. Ntabwo ngiye gutanga nimero ntabonye.", {
      status: "missing", confidence: "low", suggestions: ["Ongera ushakishe umuyobozi"],
    });
  }
  const card = leaderCard(hit.leader, hit.place.name_kiny, hit.place.level);
  const hasPhone = hasPublicPhone(card);
  return makeReply("leader_contact_followup", hasPhone ? "Dore nimero rusange zatangajwe z'uwo muyobozi:" : "Nta nimero rusange y'uwo muyobozi iri mu makuru yatangajwe. Ntabwo mfite nimero yemewe yo kuguha.", {
    status: hasPhone ? "success" : "missing", confidence: hasPhone ? "medium" : "low",
    confidence_label: hasPhone ? "Nimero zakuwe ku makuru yemejwe kandi yatangajwe ku mugaragaro." : "Nta nimero rusange yabonetse.",
    sources: [LEADER_SOURCE], leaders: [card], context,
    suggestions: ["Reba urwego rw'ubuyobozi rumwegereye", "Shaka undi muyobozi"],
  });
}

function emergencyReply(query: string): AssistantReply {
  const queryText = query.toLowerCase();
  const allContacts = getVerifiedEmergencyContacts();
  const isFire = /inkongi|nkongi|umuriro|fire|pompier/.test(queryText);
  const isMedical = /ambulance|ambulansi|ubuvuzi|samu|medical|health/.test(queryText);
  const isTraffic = /impanuka|accident|traffic/.test(queryText);
  const isGenderBasedViolence = /ihohoterwa|gender based violence|gbv|isange/.test(queryText);
  const isChildSafety = /umwana|abana|child helpline|child help/.test(queryText);
  let contacts = allContacts;
  if (isFire) contacts = allContacts.filter((c) => c.category === "fire" || c.number === "112");
  else if (isMedical) contacts = allContacts.filter((c) => c.category === "medical");
  else if (isTraffic) contacts = allContacts.filter((c) => c.category === "traffic" || c.number === "112");
  else if (isGenderBasedViolence) contacts = allContacts.filter((c) => /isange|3512/i.test(c.number + c.name_kiny));
  else if (isChildSafety) contacts = allContacts.filter((c) => c.number === "116");
  if (!contacts.length) contacts = allContacts;
  return makeReply("emergency", isFire
    ? "Mu gihe cy'inkongi: hamagara nimero zemewe z'ubutabazi. Kurikiza amabwiriza y'umutekano. Ntabwo nshobora kugufasha mu buryo butari ubwo gutanga nimero zemewe."
    : "Dore nimero zemewe z'ubutabazi zo mu Rwanda. Koresha izihuye n'ikibazo cyawe:", {
    status: "success", confidence: "high", confidence_label: "Nimero zakuwe ku rutonde rwemejwe rw'ubutabazi.",
    data_date_label: "Itariki yo gusuzuma urutonde: 2026-11-09.",
    sources: isFire ? [EMERGENCY_SOURCE, FIRE_SAFETY_SOURCE] : [EMERGENCY_SOURCE],
    emergency_contacts: contacts, suggestions: ["Menya aho ndi", "Shaka umuyobozi w'aho uri"],
  });
}

function capabilityNotReady(intent: AssistantIntent, _location: AssistantLocationContext | null | undefined): AssistantReply {
  const labels: Partial<Record<AssistantIntent, string>> = {
    country_facts: "Amakuru y'ibanze ku nzego z'ubuyobozi bw'u Rwanda",
    distance: "Kubara intera nyayo muri metero",
    boundaries: "Kwerekana no gusobanura imbibi",
    signs: "Kumenya ibyapa n'ibimenyetso biri hafi",
    place_facts: "Kubara imibare, ubuso no kugereranya ahantu",
    external_research: "Gushakisha amakuru yo hanze",
  };
  return makeReply(intent, (labels[intent] ?? "Iki gikoresho") + " ntibirahuzwa n'amakuru yagenzuwe muri iki gice. Ntabwo ngiye gutanga imibare cyangwa ibisobanuro bidafite inkomoko.", {
    status: "partial", confidence: "not_applicable", confidence_label: "Igikoresho cy'iki kibazo kiracyategurwa.",
    capability: intent, suggestions: ["Shaka umuyobozi w'ahantu", "Shaka ahantu mu Rwanda", "Reba nimero z'ubutabazi"],
  });
}

const MODEL_ALLOWED_TOOLS = new Set([
  "search_places", "find_leaders_at_place", "search_public_leaders", "get_verified_emergency_contacts",
]);

function scrubModelInput(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?<!\w)\+?\d[\d\s().-]{6,}\d(?!\w)/g, "[number removed]")
    .slice(0, 500);
}

async function classifyWithOptionalModel(
  query: string,
  context: AssistantContext | null | undefined,
  location: AssistantLocationContext | null | undefined,
  history: AssistantRequest["history"] = [],
) {
  const baseline = classifyAssistantIntent(query, context ?? null, location ?? null);
  if (baseline.intent === "emergency" || baseline.intent === "leader_contact_followup") return baseline;
  if (baseline.intent === "out_of_scope" && isGeneralAnswerEnabled()) return baseline;
  const requiresHelp = baseline.intent === "out_of_scope"
    || ((baseline.intent === "leader_by_place" || baseline.intent === "place_lookup") && !baseline.placeQuery)
    || (baseline.intent === "person_search" && !baseline.personQuery);
  if (!requiresHelp || !getAssistantProviderReadiness().ready) return baseline;
  try {
    const provider = await createAssistantLanguageModelProvider();
    if (!provider) return baseline;
    const priorTurns = (history ?? []).slice(-8).map((turn) => ({ role: turn.role, content: scrubModelInput(turn.content) }));
    const plan = await provider.plan({
      messages: [...priorTurns, { role: "user" as const, content: scrubModelInput(query) }].slice(-9),
      availableTools: [...MODEL_ALLOWED_TOOLS],
    });
    if (!plan || !plan.intent) return baseline;
    return {
      intent: plan.intent,
      placeQuery: plan.place_query || baseline.placeQuery,
      personQuery: plan.person_query || baseline.personQuery,
    };
  } catch {
    return baseline;
  }
}

export async function runAssistant(request: AssistantRequest): Promise<AssistantReply> {
  const query = request.query.trim();
  const location = request.location ?? null;
  const context = request.context ? AssistantContextSchema.parse(request.context) : null;
  if (!query) {
    return makeReply("help", "Andika ikibazo cyawe. Nshobora gushakisha ahantu, abayobozi, nimero z'ubutabazi n'amakuru y'inzego z'ubuyobozi mu Rwanda.", {
      suggestions: ["Ninde uyobora aho ndi?", "Meya w'Akarere ka Gasabo ni nde?", "Mpa nimero z'ubutabazi"],
    });
  }
  const intentResult = await classifyWithOptionalModel(query, context, location, request.history ?? []);
  const intent = intentResult.intent;
  if (intent === "greeting") {
    return makeReply(intent, "Muraho. Ndi Ishakiro rya IWACU RWANDA. Mbaza ikibazo cy'ahantu, umuyobozi, cyangwa nimero z'ubutabazi.", {
      suggestions: ["Ninde uyobora aho ndi?", "Meya w'Akarere ka Gasabo ni nde?", "Mpa nimero z'ubutabazi"],
    });
  }
  if (intent === "help") {
    return makeReply(intent, "Nshobora: gushaka ahantu riherereye, umuyobozi waryo, nimero z'ubutabazi cyangwa aho amakuru y'ubuyobozi aboneka. Kubara intera, gupima imbibi no gushaka ibyapa biri mu bice bigitegurwa. Nimbura amakuru y'ukuri, ndabikubwira.", {
      suggestions: ["Meya w'Akarere ka Gasabo ni nde?", "Ninde uyobora aho ndi?", "Mpa nimero z'ubutabazi"],
    });
  }
  if (intent === "emergency") return emergencyReply(query);
  if (intent === "country_facts") {
    const fact = getRwandaAdministrativeFact(query);
    if (!fact) return makeReply(intent, "Nshobora gutanga imibare y'inzego z'ubuyobozi bw'u Rwanda iyo urwego ushaka ruvuzwe neza.", {
      status: "partial", suggestions: ["U Rwanda rugizwe n'uturere tungahe?", "U Rwanda rufite imirenge ingahe?"],
    });
    return makeReply(intent, fact.answer, {
      status: "success", confidence: "high", confidence_label: fact.confidenceLabel,
      data_date_label: fact.dataDateLabel, sources: [fact.source], capability: "country_facts",
      context: { intent: "country_facts", place_name: "Rwanda", scope_code: null, level: null },
      suggestions: fact.suggestions,
    });
  }
  if (intent === "my_location") {
    if (!location?.scope_code || !location.level || !location.name_kiny) {
      return makeReply(intent, "Nta hantu telefone yawe imaze kumenya muri iki gihe. Ongera ugerageze kumenya aho uri; niba Location yazimye, yifungure muri Quick Settings za telefone.", {
        status: "partial",
        confidence: "low",
        confidence_label: "Aho hantu hazagaragazwa ari uko ibimenyetso bya Location bibonetse kandi bigahuza n'imbibi zibitswe muri IWACU.",
        suggestions: ["Ongera ugerageze kumenya aho ndi", "Shaka ahantu mu Rwanda"],
      });
    }

    const parentNames = location.path
      .filter((part) => part.scope_code !== location.scope_code)
      .map((part) => part.name_kiny);
    const fullPath = [...parentNames, location.name_kiny].join(" / ");
    const place = {
      scope_code: location.scope_code,
      name_kiny: location.name_kiny,
      name_eng: null,
      level: location.level,
      full_path: fullPath,
    };

    return makeReply(intent, "Aho IWACU imaze kumenya ni " + levelName(location.level) + " ya " + location.name_kiny + ". Inzira y'inzego: " + fullPath + ".", {
      status: "success",
      confidence: "medium",
      confidence_label: "Aho hantu havuye ku bisubizo bya Location bya telefone no ku mbibi zibitswe muri IWACU. Urwego rwerekanwe ni urwo ibimenyetso bishyigikiye.",
      sources: [PLACE_SOURCE],
      places: [place],
      context: {
        intent: "place_lookup",
        scope_code: location.scope_code,
        place_name: location.name_kiny,
        level: location.level,
      },
      capability: "location_resolution",
      suggestions: ["Ninde uyobora aho ndi?", "Shaka umuyobozi w'aho ndi", "Reba imbibi z'aho ndi"],
    });
  }
  if (intent === "leader_by_location") {
    if (!location?.scope_code || !location.level || !location.name_kiny) {
      return makeReply(intent, "Sinabonye amakuru y'aho telefone yawe iherereye muri iki kiganiro. Banza ukoreshe Menya aho ndi ku rubuga, hanyuma wongere umbaze umuyobozi w'aho uri.", {
        status: "partial", suggestions: ["Menya aho ndi", "Ninde uyobora umurenge wa Kacyiru?"],
      });
    }
    return buildLeaderReply(intent, location.scope_code, location.name_kiny, location.level, /nimero|numero|telefoni|phone|contact/i.test(query));
  }
  if (intent === "leader_contact_followup") {
    if (context?.appointment_id && context.person_name) return exactPersonFollowUp(context);
    const scopeCode = context?.scope_code;
    if (!scopeCode) {
      return makeReply(intent, "Sinabonye ahantu twari turimo tuganiraho. Baza izina ry'ahantu cyangwa umuyobozi mbere, hanyuma umbaze nimero ye.", {
        status: "partial", suggestions: ["Ninde uyobora aho ndi?", "Meya w'Akarere ka Gasabo ni nde?"],
      });
    }
    return buildLeaderReply(intent, scopeCode, context.place_name ?? "aha hantu", context.level ?? "village", true);
  }
  if (intent === "person_search") return searchPersonReply(intentResult.personQuery);
  if (intent === "leader_by_place" || intent === "place_lookup") {
    return lookupPlaceOrLeader(intent, intentResult.placeQuery, /nimero|numero|telefoni|phone|contact/i.test(query));
  }
  if (intent === "place_facts") {
    const placeQuery = intentResult.placeQuery;
    let scopeCode: string | null = context?.scope_code ?? location?.scope_code ?? null;
    if (!scopeCode && placeQuery && placeQuery.trim().length >= 2) {
      const places = await searchPlaces(placeQuery);
      if (places.status === "unavailable") return unavailableReply(intent);
      const matches = uniquePlaces(places.data ?? []);
      if (matches.length === 1) scopeCode = matches[0].scope_code;
      else if (matches.length > 1) {
        return makeReply(intent, "Hari ahantu henshi bihuye n'izina. Hitamo ahantu hagaragajwe mbere yo kubara imibare y'inzego:", {
          status: "partial", confidence: "low", sources: [PLACE_SOURCE], places: matches.map(toAssistantPlaceCard),
          suggestions: ["Hitamo ahantu hagaragara hano"],
        });
      }
    }
    if (!scopeCode) {
      return makeReply(intent, "Nkeneye izina cyangwa kode y'ahantu kugira ngo mbarire imibare y'inzego (umubare w'imirenge, utugari, n'ibindi). Urugero: Akarere ka Gasabo gafite imirenge ingahe?", {
        status: "partial", suggestions: ["Akarere ka Gasabo gafite imirenge ingahe?", "Umurenge wa Kacyiru ufite utugari tungahe?"],
      });
    }
    if (/\b(ubuso|area|size|superficie|how large|ingano y.?ubuso)\b/i.test(query)) {
      const area = await getAreaM2(scopeCode);
      return makeReply(intent, area.message_kiny, {
        status: area.status === "ok" ? "success" : area.status === "missing" ? "missing" : "partial",
        confidence: area.status === "ok" ? "medium" : "not_applicable",
        confidence_label: area.status === "ok"
          ? "Ubuso bwabazwe kuri geometry iri muri database ya IWACU RWANDA; iyi ni imibare ibarwa kuri geometry, si icyemezo cy'ubutaka."
          : "Nta mubare w'ubuso utabonetse mu makuru agenzuwe watanzwe.",
        sources: [{ label: area.source_label, data_date: area.data_date }],
        capability: "place_facts",
        suggestions: ["Akarere ka Gasabo gafite imirenge ingahe?", "Ninde uyobora aha?"],
      });
    }
    const factResult = lookupPlaceHierarchyFacts(scopeCode);
    if (factResult.status === "ok" && factResult.fact) {
      const f = factResult.fact;
      return makeReply(intent, factResult.message_kiny, {
        status: "success", confidence: "medium",
        confidence_label: "Icyizere kiri hagati: umubare uva ku index y'inzego z'ubuyobozi iri muri application; ntabwo ari official census count.",
        data_date_label: f.data_date_label, sources: [{ label: f.source_label, data_date: null }],
        places: [{ scope_code: f.scope_code, name_kiny: f.name_kiny, name_eng: f.name_eng, level: f.level, full_path: f.name_kiny }],
        context: { intent: "place_lookup", scope_code: f.scope_code, place_name: f.name_kiny, level: f.level },
        capability: "place_facts", suggestions: ["Ninde uyobora aha?", "Mpa nimero y'umuyobozi w'aha"],
      });
    }
    if (factResult.status === "missing") {
      const gapRecorded = await recordAssistantGapDetailed("capability_data_missing", scopeCode);
      return makeReply(intent, factResult.message_kiny, {
        status: "missing", confidence: "low", gap_recorded: gapRecorded.recorded,
        gap_notified: gapRecorded.notifiedAuthorities > 0, capability: "place_facts",
        suggestions: ["Shaka ahantu mu Rwanda", "Ninde uyobora aho ndi?"],
      });
    }
    return makeReply(intent, factResult.message_kiny, {
      status: "partial", capability: "place_facts", suggestions: ["Shaka umuyobozi w'ahantu", "Reba nimero z'ubutabazi"],
    });
  }
  if (intent === "distance") {
    const firstQuery = intentResult.placeQuery;
    const secondQuery = intentResult.secondaryPlaceQuery;
    const firstIsCurrentLocation = /\b(aho ndi|aho uri|aho turi|hafi yanjye|my location|where i am|near me|ma position)\b/.test(query.toLowerCase());

    if (!secondQuery || (!firstQuery && !(firstIsCurrentLocation && location?.scope_code))) {
      return makeReply(intent, "Kugira ngo ngereranye intera, andika ahantu habiri. Urugero: Intera iri hagati ya Gasabo na Huye ingana iki?", {
        status: "partial",
        suggestions: ["Intera iri hagati ya Gasabo na Huye ingana iki?", "How far is Kacyiru from Gasabo?"],
      });
    }

    let firstPlace: PlaceSearchRecord | null = null;
    if (firstIsCurrentLocation && location?.scope_code && location.level && location.name_kiny) {
      firstPlace = {
        place_id: location.scope_code,
        scope_code: location.scope_code,
        level: location.level,
        name_kiny: location.name_kiny,
        name_eng: null,
        full_path: location.path.map((part) => part.name_kiny).concat(location.name_kiny).join(" / "),
        match_score: 1,
      };
    } else if (firstQuery) {
      const first = await resolvePlaceName(firstQuery);
      if (first.status === "unavailable") return unavailableReply(intent);
      if (first.status === "missing") {
        return makeReply(intent, "Ahantu ha mbere ntihabonetse mu bubiko bw'ahantu bwa IWACU. Ongera ugenzure izina ryaho.", {
          status: "missing", sources: [PLACE_SOURCE], capability: "distance",
        });
      }
      if (first.status === "ambiguous") {
        return makeReply(intent, "Ahantu ha mbere hashobora kuba henshi. Hitamo aho washakaga mbere yo kugereranya intera.", {
          status: "partial", sources: [PLACE_SOURCE], places: first.places.map(toAssistantPlaceCard), capability: "distance",
        });
      }
      firstPlace = first.place;
    }

    const second = await resolvePlaceName(secondQuery);
    if (second.status === "unavailable") return unavailableReply(intent);
    if (second.status === "missing") {
      return makeReply(intent, "Ahantu ha kabiri ntihabonetse mu bubiko bw'ahantu bwa IWACU. Ongera ugenzure izina ryaho.", {
        status: "missing", sources: [PLACE_SOURCE], capability: "distance",
      });
    }
    if (second.status === "ambiguous") {
      return makeReply(intent, "Ahantu ha kabiri hashobora kuba henshi. Hitamo aho washakaga mbere yo kugereranya intera.", {
        status: "partial", sources: [PLACE_SOURCE], places: second.places.map(toAssistantPlaceCard), capability: "distance",
      });
    }
    if (!firstPlace || firstPlace.scope_code === second.place.scope_code) {
      return makeReply(intent, "Ahantu habiri hagomba kuba hatandukanye. Ongera utange amazina yombi.", {
        status: "partial", suggestions: ["Intera iri hagati ya Gasabo na Huye ingana iki?"],
      });
    }

    const dist = await getDistanceM(firstPlace.scope_code, second.place.scope_code);
    return makeReply(intent, dist.message_kiny, {
      status: dist.status === "ok" ? "success" : dist.status === "missing" ? "missing" : "partial",
      confidence: dist.status === "ok" ? "medium" : "not_applicable",
      confidence_label: dist.status === "ok"
        ? "Iyi ni intera yo mu murongo ugororotse hagati y'utudomo duhagarariye utwo turere; ntabwo ari intera yo mu muhanda cyangwa igihe cyo kugenda."
        : "Intera yatangwa gusa iyo geometry y'ahantu habiri ibonetse kandi igenzuwe.",
      sources: [{ label: dist.source_label, data_date: dist.data_date }],
      places: [toAssistantPlaceCard(firstPlace), toAssistantPlaceCard(second.place)],
      capability: "distance",
      suggestions: ["Ninde uyobora aho ndi?", "Shaka ahantu", "Reba nimero z'ubutabazi"],
    });
  }
  if (intent === "boundaries") {
    let place: PlaceSearchRecord | null = null;
    const requestedName = intentResult.placeQuery;
    if (requestedName) {
      const result = await resolvePlaceName(requestedName);
      if (result.status === "unavailable") return unavailableReply(intent);
      if (result.status === "missing") {
        return makeReply(intent, "Nta hantu bihuye n'izina watanze nabonye mu bubiko. Ongera ugenzure izina ry'aho ushaka imbibi.", {
          status: "missing", sources: [PLACE_SOURCE], capability: "boundaries",
        });
      }
      if (result.status === "ambiguous") {
        return makeReply(intent, "Hari ahantu henshi bihuye n'izina. Hitamo ahantu mbere yo gusuzuma imbibi.", {
          status: "partial", sources: [PLACE_SOURCE], places: result.places.map(toAssistantPlaceCard), capability: "boundaries",
        });
      }
      place = result.place;
    } else if (location?.scope_code && location.level && location.name_kiny) {
      place = {
        place_id: location.scope_code,
        scope_code: location.scope_code,
        level: location.level,
        name_kiny: location.name_kiny,
        name_eng: null,
        full_path: location.path.map((part) => part.name_kiny).concat(location.name_kiny).join(" / "),
        match_score: 1,
      };
    } else if (context?.scope_code && context.place_name && context.level) {
      place = {
        place_id: context.scope_code,
        scope_code: context.scope_code,
        level: context.level,
        name_kiny: context.place_name,
        name_eng: null,
        full_path: context.place_name,
        match_score: 1,
      };
    }

    if (!place) {
      return makeReply(intent, "Vuga ahantu ushaka kumenya imbibi zako. Urugero: Imbibi z'Akarere ka Gasabo ziri he?", {
        status: "partial",
        suggestions: ["Imbibi z'Akarere ka Gasabo ziri he?", "Show the boundaries of Gasabo"],
      });
    }

    const adj = await getAdjacentScopes(place.scope_code);
    return makeReply(intent, adj.message_kiny, {
      status: adj.status === "ok" ? "success" : adj.status === "missing" ? "missing" : "partial",
      confidence: adj.status === "ok" ? "medium" : "not_applicable",
      confidence_label: adj.status === "ok"
        ? "Urutonde rw'ahantu ruhana imbibi rushingiye kuri polygons ziri muri database no kuri ST_Touches; ntabwo bivuga ko ari ahantu honyine hafi y'aho."
        : "Ahantu hihana imbibi hagaragazwa gusa iyo geometry ibonetse kandi igenzuwe.",
      sources: [{ label: adj.source_label, data_date: adj.data_date }],
      places: [
        toAssistantPlaceCard(place),
        ...adj.neighbors.map((neighbor) => ({
          scope_code: neighbor.scope_code,
          name_kiny: neighbor.name_kiny,
          name_eng: null,
          level: neighbor.level ?? place?.level ?? "district",
          full_path: neighbor.name_kiny,
        })),
      ],
      capability: "boundaries",
      suggestions: ["Ninde uyobora aha?", "Shaka ahantu", "Reba nimero z'ubutabazi"],
    });
  }
  if (intent === "external_research") {
    const research = await runExternalResearch(intentResult.placeQuery ?? query);
    const researchSources = research.sources.map((source) => ({
      label: source.title,
      data_date: source.published_date,
      url: source.url,
      snippet: source.snippet,
      trust_tier: source.trust_tier,
    }));
    return makeReply(intent, research.message_kiny, {
      status: research.status === "ok" ? "success" : research.status === "no_results" ? "missing" : "partial",
      confidence: "low",
      confidence_label: "Amasoko ya internet ni ayo kugenzura. Incamake y'ishakiro ntabwo ihita iba ukuri kwemejwe; reba publisher, itariki n'inkomoko.",
      sources: researchSources,
      capability: "external_research",
      suggestions: ["Shakisha amakuru ku yindi ngingo", "Meya w'Akarere ka Gasabo ni nde?"],
    });
  }
  if (intent === "signs") {
    const signs = lookupNearbySigns(query);
    return makeReply(intent, signs.message_kiny, {
      status: "partial",
      confidence: "not_applicable",
      confidence_label: "Inkomoko y'amategeko iratanzwe, ariko nta dataset y'ibyapa n'aho biherereye yagenzuwe ihujwe na IWACU.",
      sources: [{
        label: signs.source_label,
        data_date: signs.data_date,
        url: signs.source_url,
        trust_tier: "official_government",
      }],
      capability: "signs",
      suggestions: ["Ninde uyobora aho ndi?", "Shaka ahantu", "Reba nimero z'ubutabazi"],
    });
  }
  if (intent === "out_of_scope" && isGeneralAnswerEnabled()) {
    try {
      const provider = await createAssistantLanguageModelProvider();
      if (provider) {
        const history = (request.history ?? []).slice(-8).map((turn) => ({
          role: turn.role,
          content: scrubModelInput(turn.content),
        }));
        const answer = await provider.answer({
          messages: [...history, { role: "user", content: scrubModelInput(query) }].slice(-9),
        });
        return makeReply(intent, answer, {
          status: "partial", confidence: "low",
          confidence_label: "Iki ni igisubizo rusange cyakozwe na AI; nticyagenzuwe n'isoko ryihariye cyangwa amakuru agezweho.",
          capability: "general_knowledge",
          suggestions: ["Baza ikindi kibazo", "Baza ku buyobozi n'ahantu mu Rwanda"],
        });
      }
    } catch {
      // Keep the deterministic no-invention fallback when model generation is unavailable.
    }
  }
  return makeReply("out_of_scope", "Iki kibazo kiri hanze y'amakuru ya IWACU RWANDA nshobora kugenzura. Nshobora kugufasha ku bijyanye n'aho uri, abayobozi, ahantu n'imibare y'ubutabazi. Sinatanga igisubizo ntashingiye ku makuru yizewe.", {
    status: "partial", suggestions: ["Ninde uyobora aho ndi?", "Shaka ahantu", "Reba nimero z'ubutabazi"],
  });
}

/** Public API used by the HTTP route. */
export async function executeAssistantRequest(
  request: AssistantRequest,
): Promise<AssistantReply> {
  return runAssistant(request);
}
