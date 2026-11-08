import type {
  AssistantContextSchema,
  AssistantEmergencyContact,
  AssistantIntent,
  AssistantLeaderCard,
  AssistantLocationContext,
  AssistantReply,
  AssistantRequest,
} from "./contracts";
import type { z } from "zod";
import { classifyAssistantIntent } from "./intent";
import {
  findLeadersAtPlace,
  getVerifiedEmergencyContacts,
  recordAssistantGap,
  searchPlaces,
  toAssistantPlaceCard,
  type PlaceSearchRecord,
} from "./tools";
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
  label: "Urutonde rw'imibare y'ubutabazi rwashyizwe muri IWACU RWANDA",
  data_date: null,
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
  };
}

function hasPublicPhone(leader: AssistantLeaderCard): boolean {
  return leader.contacts.some((contact) =>
    /phone|mobile|telephone|tel|whatsapp/i.test(contact.type),
  );
}

function nearestParentLeaders(rows: PublicSharedLeader[]): PublicSharedLeader[] {
  const rank: Record<string, number> = {
    village: 5,
    cell: 4,
    sector: 3,
    district: 2,
    province: 1,
    country: 0,
  };
  const available = rows.filter((row) => row.place && rank[row.place.level] !== undefined);
  if (!available.length) return [];
  const nearestRank = Math.max(...available.map((row) => rank[row.place.level] ?? -1));
  return available.filter((row) => rank[row.place.level] === nearestRank);
}

async function unavailableReply(
  intent: AssistantIntent,
  placeName?: string | null,
): Promise<AssistantReply> {
  const gapRecorded = await recordAssistantGap("capability_data_missing", null);
  return makeReply(
    intent,
    placeName
      ? "Nabonye ko ushaka amakuru ya " + placeName + ", ariko igikoresho gikenewe ntikirahuzwa n'ububiko bw'amakuru. Ntabwo ngiye kuguhimbira igisubizo."
      : "Ububiko bw'amakuru ntibwashoboye kuboneka ubu. Nta makuru nshobora kwemeza. Ongera ugerageze nyuma.",
    {
      status: "partial",
      gap_recorded: gapRecorded,
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
  if (result.status === "unavailable" || !result.data) {
    return unavailableReply(intent, requestedPlaceName);
  }

  // The canonical place name and level come from the database, not from chat text.
  const placeName = result.data.candidatePlace?.name_kiny || requestedPlaceName;
  const placeLevel = result.data.candidatePlace?.level || requestedPlaceLevel;
  const direct = result.data.directLeaders.map((leader) =>
    leaderCard(leader, placeName, placeLevel),
  );
  const directWithPhone = direct.filter(hasPublicPhone);
  const parents = nearestParentLeaders(result.data.higherLevelLeaders);
  const parentCards = parents.map((row) =>
    leaderCard(row, row.place.name_kiny, row.place.level),
  );
  const safeContext = {
    intent,
    scope_code: scopeCode,
    place_name: placeName,
    level: placeLevel as AssistantContext["level"],
  };

  if (requestContact) {
    const contactLeaders = directWithPhone.length
      ? directWithPhone
      : parentCards.filter(hasPublicPhone);

    if (contactLeaders.length) {
      const isFallback = directWithPhone.length === 0;
      return makeReply(
        intent,
        isFallback
          ? "Nta nimero rusange y'umuyobozi wa " + placeName + " iri mu bubiko. Ariko hari nimero yatangajwe y'umuyobozi wo ku rwego rukurikiyeho hejuru:"
          : "Dore nimero zemewe zatangajwe z'umuyobozi wa " + placeName + ":",
        {
          status: isFallback ? "partial" : "success",
          confidence: isFallback ? "low" : "medium",
          confidence_label: isFallback
            ? "Icyizere kiri hasi: nimero ni iy'urwego rwo hejuru, si iy'umuyobozi w'aho hantu."
            : "Icyizere kiri hagati: umuyobozi yemejwe mu bubiko rusange, ariko itariki yo kuvugurura ntigaragajwe.",
          sources: [LEADER_SOURCE],
          leaders: contactLeaders,
          context: safeContext,
          suggestions: ["Nimero ye", "Reba abayobozi bo ku rwego rwo hejuru"],
        },
      );
    }

    const gapRecorded = await recordAssistantGap("contact_missing", scopeCode);
    return makeReply(
      intent,
      "Nta nimero rusange y'umuyobozi wa " + placeName + " cyangwa iy'urwego rwegereye iri mu bubiko bwa IWACU. Ntabwo mfite nimero yemewe yo kuguha. Intambwe ikurikira ni ukubaza ibiro by'ubuyobozi bw'ako gace.",
      {
        status: "missing",
        confidence: "low",
        confidence_label: "Nta nimero yemewe yabonetse.",
        sources: [LEADER_SOURCE],
        gap_recorded: gapRecorded,
        context: safeContext,
        suggestions: ["Reba umuyobozi w'urwego rwo hejuru", "Shaka amakuru y'ahandi"],
      },
    );
  }

  if (direct.length) {
    return makeReply(
      intent,
      "Abayobozi banditswe kandi bemejwe kuri " + levelName(placeLevel).toLowerCase() + " ya " + placeName + ":",
      {
        confidence: "medium",
        confidence_label: "Icyizere kiri hagati: amakuru yavuye ku rutonde rw'abayobozi rwemejwe, ariko itariki yo kuvugurura ntigaragajwe.",
        sources: [LEADER_SOURCE],
        leaders: direct,
        context: safeContext,
        suggestions: ["Mpa nimero y'umuyobozi", "Reba abayobozi bo ku rwego rwo hejuru"],
      },
    );
  }

  if (parentCards.length) {
    const gapRecorded = await recordAssistantGap("leader_missing", scopeCode);
    return makeReply(
      intent,
      "Nta muyobozi wanditswe kuri " + levelName(placeLevel).toLowerCase() + " ya " + placeName + ". Umuyobozi wo ku rwego rwegereye hejuru twabonye ni:",
      {
        status: "partial",
        confidence: "low",
        confidence_label: "Icyizere kiri hasi: igisubizo kivuye ku rwego rwo hejuru kuko urwego wabajije rutuzuye.",
        sources: [LEADER_SOURCE],
        leaders: parentCards,
        gap_recorded: gapRecorded,
        context: safeContext,
        suggestions: ["Nimero ye", "Reba aho aka gace gaherereye"],
      },
    );
  }

  const gapRecorded = await recordAssistantGap("leader_missing", scopeCode);
  return makeReply(
    intent,
    "Nta muyobozi wemejwe wanditswe kuri " + levelName(placeLevel).toLowerCase() + " ya " + placeName + ", kandi nta muyobozi wo ku rwego rwo hejuru wabonetse muri database. Nta zina cyangwa nimero nshobora guhimba. Intambwe ikurikira ni ukumenyesha ibiro by'ubuyobozi bw'ako gace ko aya makuru abura.",
    {
      status: "missing",
      confidence: "low",
      confidence_label: "Nta muyobozi wabonetse mu makuru rusange.",
      sources: [LEADER_SOURCE],
      gap_recorded: gapRecorded,
      context: safeContext,
      suggestions: ["Shaka amakuru y'akarere", "Reba nimero z'ubutabazi"],
    },
  );
}

function uniquePlaces(rows: PlaceSearchRecord[]): PlaceSearchRecord[] {
  const byScope = new Map<string, PlaceSearchRecord>();
  for (const row of rows) {
    if (!byScope.has(row.scope_code)) byScope.set(row.scope_code, row);
  }
  return [...byScope.values()];
}

async function lookupPlaceOrLeader(
  intent: "place_lookup" | "leader_by_place",
  placeQuery: string | null,
  requestContact = false,
): Promise<AssistantReply> {
  if (!placeQuery || placeQuery.trim().length < 2) {
    return makeReply(
      intent,
      "Nkeneye izina ry'ahantu kugira ngo nshakishe neza. Urugero: Gasabo, Kacyiru cyangwa Kamatamu.",
      {
        status: "partial",
        suggestions: ["Ninde uyobora umurenge wa Kacyiru?", "Meya w'Akarere ka Gasabo ni nde?"],
      },
    );
  }

  const result = await searchPlaces(placeQuery);
  if (result.status === "unavailable" || !result.data) {
    return unavailableReply(intent, placeQuery);
  }

  const matches = uniquePlaces(result.data);
  if (!matches.length) {
    const gapRecorded = await recordAssistantGap("place_not_found", null);
    return makeReply(
      intent,
      "Ntabwo nabonye ahantu hitwa " + placeQuery + " mu bubiko bw'ahantu bwa IWACU. Ntabwo nzagerageza guhimba aho ari ho. Ongera urebe uko izina ryanditse, cyangwa wongereho Akarere/Umurenge niba uhabizi.",
      {
        status: "missing",
        confidence: "low",
        confidence_label: "Nta hantu bihuye n'izina habonetse.",
        sources: [PLACE_SOURCE],
        gap_recorded: gapRecorded,
        suggestions: ["Shakisha irindi zina", "Baza umuyobozi w'aho uri"],
      },
    );
  }

  if (matches.length > 1) {
    return makeReply(
      intent,
      "Hari ahantu henshi hafite izina risa na " + placeQuery + ". Hitamo aho ushaka kugira ngo ntavange ahantu:",
      {
        status: "partial",
        confidence: "low",
        confidence_label: "Izina rihuriye ahantu henshi; nta hantu nahisemo mu mwanya wawe.",
        sources: [PLACE_SOURCE],
        places: matches.map(toAssistantPlaceCard),
        suggestions: ["Hitamo ahantu hagaragara hano"],
      },
    );
  }

  const place = matches[0];
  if (intent === "place_lookup") {
    return makeReply(
      intent,
      "Nabonye " + place.name_kiny + ". Dore aho iherereye mu nzego z'ubuyobozi: " + (place.full_path || place.name_kiny) + ".",
      {
        confidence: "medium",
        confidence_label: "Icyizere kiri hagati: izina ryabonetse mu bubiko bw'ahantu, ariko itariki y'amakuru ntigaragajwe.",
        sources: [PLACE_SOURCE],
        places: [toAssistantPlaceCard(place)],
        context: { intent: "place_lookup", scope_code: place.scope_code, place_name: place.name_kiny, level: place.level as AssistantContext["level"] },
        suggestions: ["Ninde uyobora aha?", "Mpa nimero y'umuyobozi w'aha"],
      },
    );
  }

  return buildLeaderReply(intent, place.scope_code, place.name_kiny, place.level, requestContact);
}

function emergencyReply(): AssistantReply {
  const contacts: AssistantEmergencyContact[] = getVerifiedEmergencyContacts();
  if (!contacts.length) {
    return makeReply(
      "emergency",
      "Urutonde rw'imibare y'ubutabazi ntiruboneka muri iyi verisiyo. Mu gihe uri mu kaga, koresha nimero y'ubutabazi yemewe mu gace urimo.",
      { status: "missing", confidence: "low" },
    );
  }

  return makeReply(
    "emergency",
    "Dore nimero z'ubutabazi ziri mu rutonde rwemejwe ruri muri IWACU. Kanda nimero kugira ngo uhamagare.",
    {
      confidence: "medium",
      confidence_label: "Izi nimero zakuwe ku rutonde rw'ubutabazi rwashyizwe muri code ya IWACU; itariki yo kurusuzuma bwa nyuma ntigaragajwe.",
      sources: [EMERGENCY_SOURCE],
      emergency_contacts: contacts,
      suggestions: ["Shaka umuyobozi w'aho ndi", "Subira ku bindi bibazo"],
    },
  );
}

async function capabilityNotReady(
  intent: AssistantIntent,
  location?: AssistantLocationContext | null,
): Promise<AssistantReply> {
  const descriptions: Record<string, string> = {
    distance: "Kubara intera nyayo mu metero hagati y'ahantu habiri",
    boundaries: "Kwerekana no gusobanura imbibi z'ahantu",
    signs: "Kumenya ibyapa byo mu muhanda n'ibindi bimenyetso biri hafi",
    place_facts: "Kubara umubare w'ibice, ubuso n'andi makuru y'ahantu",
  };
  const gapRecorded = await recordAssistantGap("capability_data_missing", location?.scope_code ?? null);
  return makeReply(
    intent,
    "Ndumva ushaka: " + (descriptions[intent] ?? "amakuru y'inyongera") + ". Iki gice kirimo gutegurwa, ariko amakuru yacyo n'igikoresho cyo kuyasuzuma ntibirahuzwa. Sinshobora gutanga metero, imbibi cyangwa ibyapa ntarabona mu makuru yemewe. Icyo gice kizakorwa ku buryo kizajya gitanga igisubizo gifite inkomoko y'amakuru.",
    {
      status: "partial",
      confidence: "low",
      confidence_label: "Nta makuru yemewe ahagije araboneka kuri iki kibazo.",
      gap_recorded: gapRecorded,
      capability: intent,
      suggestions: ["Shaka ahantu mu Rwanda", "Ninde uyobora aho ndi?", "Reba nimero z'ubutabazi"],
    },
  );
}

export async function executeAssistantRequest(request: AssistantRequest): Promise<AssistantReply> {
  const { query, context, location } = request;
  const intentResult = classifyAssistantIntent(query, context ?? null, location ?? null);
  const intent = intentResult.intent;

  if (intent === "emergency") return emergencyReply();

  if (intent === "greeting") {
    return makeReply(
      intent,
      "Muraho. Ndi Ishakiro ry'Ubuhanga rya IWACU RWANDA. Nshobora kugufasha gushaka ahantu, kureba abayobozi n'imibare y'ubutabazi. Ku makuru atarashyirwa muri database ndakubwira ko abura aho kuyahimba.",
      {
        suggestions: ["Ninde uyobora aho ndi?", "Shaka ahitwa Kacyiru", "Mpa nimero z'ubutabazi"],
      },
    );
  }

  if (intent === "help") {
    return makeReply(
      intent,
      "Ushobora kumbaza aho ahantu riherereye, umuyobozi waryo, nimero z'ubutabazi cyangwa aho amakuru y'ubuyobozi aboneka. Kubara intera, gupima imbibi no gushaka ibyapa biri mu bice bigitegurwa. Nimbura amakuru y'ukuri, ndabikubwira.",
      {
        suggestions: ["Meya w'Akarere ka Gasabo ni nde?", "Ninde uyobora aho ndi?", "Mpa nimero z'ubutabazi"],
      },
    );
  }

  if (intent === "leader_by_location") {
    if (!location?.scope_code || !location.level || !location.name_kiny) {
      return makeReply(
        intent,
        "Sinabonye amakuru y'aho telefone yawe iherereye muri iki kiganiro. Banza ukande Menya aho ndi ku rubuga, hanyuma wongere umbaze umuyobozi w'aho uri.",
        {
          status: "partial",
          suggestions: ["Menya aho ndi", "Ninde uyobora umurenge wa Kacyiru?"],
        },
      );
    }
    return buildLeaderReply(
      intent,
      location.scope_code,
      location.name_kiny,
      location.level,
      /nimero|numero|telefoni|phone|contact/i.test(query),
    );
  }

  if (intent === "leader_contact_followup") {
    const scopeCode = context?.scope_code;
    if (!scopeCode) {
      return makeReply(
        intent,
        "Sinabonye ahantu twari turimo tuganiraho. Baza izina ry'ahantu cyangwa umuyobozi mbere, hanyuma umbaze nimero ye.",
        { status: "partial", suggestions: ["Ninde uyobora aho ndi?", "Meya w'Akarere ka Gasabo ni nde?"] },
      );
    }
    return buildLeaderReply(
      intent,
      scopeCode,
      context.place_name ?? "aha hantu",
      context.level ?? "village",
      true,
    );
  }

  if (intent === "leader_by_place" || intent === "place_lookup") {
    const requestContact = /nimero|numero|telefoni|phone|contact/i.test(query);
    return lookupPlaceOrLeader(intent, intentResult.placeQuery, requestContact);
  }

  if (intent === "distance" || intent === "boundaries" || intent === "signs" || intent === "place_facts") {
    return capabilityNotReady(intent, location);
  }

  return makeReply(
    "out_of_scope",
    "Iki kibazo kiri hanze y'amakuru ya IWACU RWANDA nshobora kugenzura. Nshobora kugufasha ku bijyanye n'aho uri, abayobozi, ahantu n'imibare y'ubutabazi. Sinatanga igisubizo ntashingiye ku makuru yizewe.",
    {
      status: "partial",
      suggestions: ["Ninde uyobora aho ndi?", "Shaka ahantu", "Reba nimero z'ubutabazi"],
    },
  );
}
