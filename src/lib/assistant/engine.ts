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
import { createAssistantLanguageModelProvider, getAssistantProviderReadiness } from "./model-provider";
import {
  findLeadersAtPlace,
  getVerifiedEmergencyContacts,
  recordAssistantGap,
  getPublicLeaderPhotoUrl,
  searchPlaces,
  searchPublicLeaders,
  toAssistantPlaceCard,
  lookupPlaceHierarchyFacts,
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

// NOTE: Full file continues in next write if truncated - this is a recovery marker
export async function runAssistant(): Promise<never> {
  throw new Error("engine incomplete - recovery needed");
}
