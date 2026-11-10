import {
  createSupabasePublicClient,
  isSupabasePublicConfigured,
  createSupabaseServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { VERIFIED_EMERGENCY_NUMBERS } from "@/lib/rwanda-geo";
import {
  sanitizePublicDirectory,
  type PublicDirectoryPayload,
  type PublicLeaderRecord,
  type PublicPlace,
  type PublicSharedLeader,
} from "@/lib/leaders/public-directory";
import type {
  AssistantEmergencyContact,
  AssistantPlaceCard,
} from "./contracts";
import {
  getDistanceUnavailable,
  getPlaceAreaUnavailable,
  getPlaceHierarchyFact,
  type PlaceFactsResult,
} from "./place-facts";

export interface PlaceSearchRecord {
  place_id: string;
  scope_code: string;
  level: string;
  name_kiny: string;
  name_eng: string | null;
  full_path: string;
  match_score: number;
}

export type ReadToolResult<T> =
  | { status: "ok"; data: T }
  | { status: "missing"; data: T }
  | { status: "unavailable"; data: null };

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function mapPlaceSearchRow(row: Record<string, unknown>): PlaceSearchRecord | null {
  const scopeCode = text(row.scope_code);
  const name = text(row.name_kiny);
  if (!scopeCode || !name) return null;

  return {
    place_id: text(row.place_id),
    scope_code: scopeCode,
    level: text(row.level),
    name_kiny: name,
    name_eng: typeof row.name_eng === "string" ? row.name_eng : null,
    full_path: text(row.full_path),
    match_score: Number.isFinite(Number(row.match_score)) ? Number(row.match_score) : 0,
  };
}

export async function searchPlaces(query: string): Promise<ReadToolResult<PlaceSearchRecord[]>> {
  if (!isSupabasePublicConfigured()) return { status: "unavailable", data: null };

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("search_places", {
      p_query: query,
      p_limit: 8,
    });
    if (error) return { status: "unavailable", data: null };

    const rows = Array.isArray(data)
      ? data.flatMap((row) => {
          if (!row || typeof row !== "object") return [];
          const mapped = mapPlaceSearchRow(row as Record<string, unknown>);
          return mapped ? [mapped] : [];
        })
      : [];

    return { status: rows.length ? "ok" : "missing", data: rows };
  } catch {
    return { status: "unavailable", data: null };
  }
}

export interface LeaderLookupData {
  candidatePlace: PublicPlace | null;
  directLeaders: PublicLeaderRecord[];
  higherLevelLeaders: PublicSharedLeader[];
}

export async function findLeadersAtPlace(scopeCode: string): Promise<ReadToolResult<LeaderLookupData>> {
  if (!isSupabasePublicConfigured()) return { status: "unavailable", data: null };

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("get_leader_candidates_v2", {
      p_scope_codes: [scopeCode],
    });
    if (error) return { status: "unavailable", data: null };

    const directory: PublicDirectoryPayload = sanitizePublicDirectory(
      data,
      new Map<string, number | undefined>(),
    );
    const candidate = directory.candidates[0] ?? null;
    const result: LeaderLookupData = {
      candidatePlace: candidate?.place ?? null,
      directLeaders: candidate?.leaders ?? [],
      higherLevelLeaders: directory.shared_leaders ?? [],
    };

    return {
      status: result.directLeaders.length || result.higherLevelLeaders.length ? "ok" : "missing",
      data: result,
    };
  } catch {
    return { status: "unavailable", data: null };
  }
}

export interface PublicPersonSearchHit {
  leader: PublicLeaderRecord;
  place: PublicPlace;
}

function mapPublicPersonRow(row: Record<string, unknown>): PublicPersonSearchHit | null {
  const appointmentId = text(row.appointment_id);
  const personId = text(row.person_id);
  const displayName = text(row.display_name);
  const scopeCode = text(row.scope_code);
  const placeName = text(row.administrative_unit_name_kiny);
  const placeLevel = text(row.administrative_unit_level);
  const placeId = text(row.administrative_unit_id);
  if (!appointmentId || !personId || !displayName || !scopeCode || !placeName || !placeLevel || !placeId) {
    return null;
  }

  const publicContacts = Array.isArray(row.public_contacts)
    ? row.public_contacts.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const contact = value as Record<string, unknown>;
        const type = text(contact.type);
        const contactValue = text(contact.value);
        if (!type || !contactValue) return [];
        return [{ type, label: typeof contact.label === "string" ? contact.label : null, value: contactValue }];
      })
    : [];

  return {
    leader: {
      appointment_id: appointmentId,
      person_id: personId,
      display_name: displayName,
      position: {
        code: text(row.position_code),
        title_kiny: text(row.title_kiny),
        title_eng: text(row.title_eng),
        title_fra: text(row.title_fra),
      },
      appointment: {
        effective_from: text(row.effective_from),
        effective_to: typeof row.effective_to === "string" ? row.effective_to : null,
        status: "approved",
        verified_at: null,
      },
      profile: {
        biography: typeof row.biography === "string" ? row.biography : null,
        office_hours: typeof row.office_hours === "string" ? row.office_hours : null,
        service_priorities: typeof row.service_priorities === "string" ? row.service_priorities : null,
        photo_key: typeof row.public_photo_object_key === "string" ? row.public_photo_object_key : null,
        thumbnail_key: typeof row.public_photo_thumbnail_key === "string" ? row.public_photo_thumbnail_key : null,
      },
      public_contacts: publicContacts,
    },
    place: {
      id: placeId,
      scope_code: scopeCode,
      name_kiny: placeName,
      name_eng: typeof row.administrative_unit_name_eng === "string" ? row.administrative_unit_name_eng : null,
      level: placeLevel,
    },
  };
}

export async function searchPublicLeaders(query: string): Promise<ReadToolResult<PublicPersonSearchHit[]>> {
  const searchText = query.trim().replace(/[%_]/g, " ").replace(/\s+/g, " ");
  if (searchText.length < 2) return { status: "missing", data: [] };
  if (!isSupabasePublicConfigured()) return { status: "unavailable", data: null };

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("leader_directory_public")
      .select([
        "appointment_id",
        "person_id",
        "display_name",
        "position_code",
        "title_kiny",
        "title_eng",
        "title_fra",
        "administrative_unit_id",
        "scope_code",
        "administrative_unit_name_kiny",
        "administrative_unit_name_eng",
        "administrative_unit_level",
        "effective_from",
        "effective_to",
        "biography",
        "office_hours",
        "service_priorities",
        "public_photo_object_key",
        "public_photo_thumbnail_key",
        "public_contacts",
      ].join(","))
      .ilike("display_name", "%" + searchText + "%")
      .limit(8);

    if (error) return { status: "unavailable", data: null };
    const rows = Array.isArray(data)
      ? data.flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const mapped = mapPublicPersonRow(value as Record<string, unknown>);
          return mapped ? [mapped] : [];
        })
      : [];
    return { status: rows.length ? "ok" : "missing", data: rows };
  } catch {
    return { status: "unavailable", data: null };
  }
}

/**
 * Server-only aggregate gap logging. The RPC is not executable by anon or
 * authenticated roles; the server validates the request and applies rate limits.
 */
export interface AssistantGapResult {
  recorded: boolean;
  notifiedAuthorities: number;
}

export async function recordAssistantGapDetailed(
  gapType: "leader_missing" | "contact_missing" | "place_not_found" | "capability_data_missing",
  scopeCode?: string | null,
): Promise<AssistantGapResult> {
  if (!isSupabaseConfigured()) return { recorded: false, notifiedAuthorities: 0 };

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.rpc("record_assistant_gap_v1", {
      p_gap_type: gapType,
      p_scope_code: scopeCode ?? null,
    });
    if (error || !data || typeof data !== "object") {
      return { recorded: false, notifiedAuthorities: 0 };
    }
    const result = data as Record<string, unknown>;
    return {
      recorded: result.recorded === true,
      notifiedAuthorities: typeof result.notified_authorities === "number" &&
        Number.isInteger(result.notified_authorities) && result.notified_authorities > 0
        ? result.notified_authorities
        : 0,
    };
  } catch {
    return { recorded: false, notifiedAuthorities: 0 };
  }
}

export async function recordAssistantGap(
  gapType: "leader_missing" | "contact_missing" | "place_not_found" | "capability_data_missing",
  scopeCode?: string | null,
): Promise<boolean> {
  return (await recordAssistantGapDetailed(gapType, scopeCode)).recorded;
}

export function getPublicLeaderPhotoUrl(objectKey: string | null | undefined): string | null {
  const key = objectKey?.trim();
  if (!key || !isSupabasePublicConfigured()) return null;
  try {
    const supabase = createSupabasePublicClient();
    const result = supabase.storage.from("leader-photos").getPublicUrl(key);
    return result.data.publicUrl || null;
  } catch {
    return null;
  }
}

export function getVerifiedEmergencyContacts(): AssistantEmergencyContact[] {
  return VERIFIED_EMERGENCY_NUMBERS
    .filter((item) => item.is_verified)
    .map((item) => ({
      number: item.number,
      name_kiny: item.name_kiny,
      source: item.source,
      category: item.category,
    }));
}

export function toAssistantPlaceCard(place: PlaceSearchRecord): AssistantPlaceCard {
  return {
    scope_code: place.scope_code,
    name_kiny: place.name_kiny,
    name_eng: place.name_eng,
    level: place.level,
    full_path: place.full_path || place.name_kiny,
  };
}

/** Hierarchy facts from offline NISR index. No area/distance invention. */
export function lookupPlaceHierarchyFacts(scopeCode: string): PlaceFactsResult {
  return getPlaceHierarchyFact(scopeCode);
}

export function lookupPlaceArea(scopeCode: string): PlaceFactsResult {
  return getPlaceAreaUnavailable(scopeCode);
}

export function lookupDistanceBetween(fromScope: string, toScope: string): PlaceFactsResult {
  return getDistanceUnavailable(fromScope, toScope);
}

export const ASSISTANT_CAPABILITY_CATALOGUE = {
  place_lookup: { ready: true, source: "search_places" },
  leader_lookup: { ready: true, source: "get_leader_candidates_v2" },
  person_search: { ready: true, source: "leader_directory_public (approved public records only)" },
  emergency_contacts: { ready: true, source: "VERIFIED_EMERGENCY_NUMBERS" },
  location_resolution: { ready: true, source: "existing /api/locate result passed by the site" },
  gap_logging: { ready: true, source: "record_assistant_gap_v1 (aggregate-only, server-side service_role, no visitor text or PII)" },
  place_facts_hierarchy: {
    ready: true,
    source: "offline NISR administrative index (parent + direct child counts only)",
  },
  place_facts_area: {
    ready: true,
    source: "service_role-only read-only RPC over active public.boundaries geometry; square metres via ST_Area(geography)",
  },
  boundaries: {
    ready: true,
    source: "same-level polygon adjacency via ST_Touches on active public.boundaries geometry",
  },
  distance: {
    ready: true,
    source: "straight-line geodesic distance between ST_PointOnSurface representative points; not road distance",
  },
  signs: { ready: false, source: "verified road-sign dataset/tool is not yet connected" },
  external_research: {
    ready: false,
    source: "adapter present; disabled until owner enables provider + secrets",
  },
} as const;
