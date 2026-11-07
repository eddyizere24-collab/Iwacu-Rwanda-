import type { ConfidenceMatch } from "@/types/boundary";
import type { LocateSuccess } from "@/types/location";
import { aggregateLocationHierarchy } from "@/lib/location-hierarchy";

type AdministrativeLevel = "province" | "district" | "sector" | "cell" | "village";

type RepresentativeChoice = {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: AdministrativeLevel;
  parent_scope_code: string | null;
  latitude: number;
  longitude: number;
};

const LEVELS = new Set<AdministrativeLevel>(["province", "district", "sector", "cell", "village"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseRepresentativeChoices(payload: unknown): RepresentativeChoice[] {
  if (!payload || typeof payload !== "object") return [];
  const rawChoices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(rawChoices)) return [];

  return rawChoices.flatMap((raw): RepresentativeChoice[] => {
    let choice: RepresentativeChoice;
    if (Array.isArray(raw) && raw.length >= 7) {
      const [scope_code, name_kiny, name_eng, level, parent_scope_code, latitude, longitude] = raw;
      if (
        typeof scope_code !== "string" ||
        typeof name_kiny !== "string" ||
        typeof level !== "string" ||
        !LEVELS.has(level as AdministrativeLevel) ||
        !isFiniteNumber(latitude) ||
        !isFiniteNumber(longitude)
      ) return [];
      choice = {
        scope_code,
        name_kiny,
        name_eng: typeof name_eng === "string" ? name_eng : null,
        level: level as AdministrativeLevel,
        parent_scope_code: typeof parent_scope_code === "string" ? parent_scope_code : null,
        latitude,
        longitude,
      };
    } else if (raw && typeof raw === "object") {
      const row = raw as Record<string, unknown>;
      if (
        typeof row.scope_code !== "string" ||
        typeof row.name_kiny !== "string" ||
        typeof row.level !== "string" ||
        !LEVELS.has(row.level as AdministrativeLevel) ||
        !isFiniteNumber(row.latitude) ||
        !isFiniteNumber(row.longitude)
      ) return [];
      choice = {
        scope_code: row.scope_code,
        name_kiny: row.name_kiny,
        name_eng: typeof row.name_eng === "string" ? row.name_eng : null,
        level: row.level as AdministrativeLevel,
        parent_scope_code: typeof row.parent_scope_code === "string" ? row.parent_scope_code : null,
        latitude: row.latitude,
        longitude: row.longitude,
      };
    } else {
      return [];
    }

    return choice.scope_code && choice.name_kiny ? [choice] : [];
  });
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

/**
 * Builds a limited administrative-area estimate from official village
 * representative points when polygon services have no result or are offline.
 * Representative points are not polygon hits; this fallback never claims an
 * exact village and returns null when the uncertainty radius is too wide.
 */
export function nearestVillageEstimateFromIndex(
  payload: unknown,
  latitude: number,
  longitude: number,
  accuracyMeters = 1_000,
  warning = "NEAREST_VILLAGE_REPRESENTATIVE_POINT_ESTIMATE",
): LocateSuccess | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) return null;

  const validAccuracy = Number.isFinite(accuracyMeters) && accuracyMeters > 0
    ? accuracyMeters
    : Number.POSITIVE_INFINITY;
  // A representative-point index is only a fallback. With a very wide
  // device radius it cannot safely identify even a district.
  if (validAccuracy > 10_000) return null;

  const choices = parseRepresentativeChoices(payload);
  const villages = choices.filter((choice) => choice.level === "village");
  if (villages.length === 0) return null;

  const scale = Math.max(250, validAccuracy);
  const searchLimit = Math.min(20_000, Math.max(5_000, scale * 2));
  const candidates = villages
    .map((choice) => ({
      choice,
      distance: distanceMeters(latitude, longitude, choice.latitude, choice.longitude),
    }))
    .filter((item) => Number.isFinite(item.distance) && item.distance <= searchLimit)
    .sort((a, b) => a.distance - b.distance);

  // If no official representative point is close enough to the measured
  // coordinate, return null so the caller can use an honest higher-level
  // prior. Never invent a random Rwanda village for a remote/bad coordinate.
  const considered = candidates;
  if (considered.length === 0) return null;

  // Distance-weighted index scores, not calibrated probabilities. The index
  // has one representative point per village, so this is an estimate until
  // polygon-area/density priors and real-device hit rates are calibrated.
  const weights = considered.map((item) => Math.exp(-item.distance / scale));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  if (!(totalWeight > 0)) return null;
  const allVillageMatches: ConfidenceMatch[] = considered.map((item, index) => ({
    scope_code: item.choice.scope_code,
    name_kiny: item.choice.name_kiny,
    name_eng: item.choice.name_eng,
    level: "village",
    confidence: Math.round((weights[index] / totalWeight) * 10_000) / 100,
    intersection_area_m2: 0,
  }));

  // Representative points are not village polygon hits, so no exact village
  // is returned from this fallback.
  const byCode = new Map(choices.map((choice) => [choice.scope_code, choice]));
  const aggregates = aggregateLocationHierarchy(allVillageMatches);
  const hierarchyCandidates: NonNullable<LocateSuccess["hierarchyCandidates"]> = {};
  const hierarchy: LocateSuccess["hierarchy"] = {};

  const minimumShare = {
    province: 70,
    district: 80,
    sector: 85,
    cell: 90,
  } as const;

  for (const level of ["province", "district", "sector", "cell"] as const) {
    const best = aggregates[level]?.[0];
    if (!best || best.confidence < minimumShare[level]) continue;
    const choice = byCode.get(best.scope_code);
    if (!choice) continue;
    const match: ConfidenceMatch = {
      scope_code: choice.scope_code,
      name_kiny: choice.name_kiny,
      name_eng: choice.name_eng,
      level,
      confidence: best.confidence,
      intersection_area_m2: best.intersection_area_m2,
    };
    hierarchyCandidates[level] = [match];
    hierarchy[level] = match;
  }

  return {
    status: "success",
    matches: [],
    hierarchy,
    hierarchyCandidates,
    leaders: [],
    source: "nearest",
    warning,
  };
}
