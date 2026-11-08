import {
  createSupabasePublicClient,
  isSupabasePublicConfigured,
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

export async function recordAssistantGap(
  gapType: "leader_missing" | "contact_missing" | "place_not_found" | "capability_data_missing",
  scopeCode?: string | null,
): Promise<boolean> {
  if (!isSupabasePublicConfigured()) return false;

  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("record_assistant_gap_v1", {
      p_gap_type: gapType,
      p_scope_code: scopeCode ?? null,
    });
    if (error) return false;
    return Boolean(data && typeof data === "object" && (data as Record<string, unknown>).recorded === true);
  } catch {
    // The additive SQL migration is deliberately not applied by this code change.
    // Until it is installed, a missing RPC is treated as an unrecorded gap, not a failed answer.
    return false;
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

export const ASSISTANT_CAPABILITY_CATALOGUE = {
  place_lookup: { ready: true, source: "search_places" },
  leader_lookup: { ready: true, source: "get_leader_candidates_v2" },
  emergency_contacts: { ready: true, source: "VERIFIED_EMERGENCY_NUMBERS" },
  location_resolution: { ready: true, source: "existing /api/locate result passed by the site" },
  gap_logging: { ready: false, source: "record_assistant_gap_v1 migration is prepared but not applied" },
  place_facts: { ready: false, source: "national facts tools are planned for Part 2" },
  boundaries: { ready: false, source: "assistant boundary query tool is planned for Part 2" },
  distance: { ready: false, source: "distance calculation tool is planned for Part 2" },
  signs: { ready: false, source: "verified road-sign dataset/tool is not yet connected" },
} as const;
