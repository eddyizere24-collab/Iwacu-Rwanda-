import {
  booleanPointInPolygon,
  lineString,
  point,
  pointToLineDistance,
  polygonToLine,
} from "@turf/turf";
import type {
  Feature,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
} from "geojson";

export type VillageBoundaryFeature = Feature<
  Polygon | MultiPolygon,
  Record<string, unknown>
>;

export interface NearbyVillageBoundary {
  currentScopeCode: string | null;
  currentVillageName: string | null;
  targetScopeCode: string;
  targetVillageName: string;
  distanceMeters: number;
}

const LEVELS = [
  { level: "province", label: "Intara", prefixParts: 2 },
  { level: "district", label: "Akarere", prefixParts: 3 },
  { level: "sector", label: "Umurenge", prefixParts: 4 },
  { level: "cell", label: "Akagari", prefixParts: 5 },
  { level: "village", label: "Umudugudu", prefixParts: 6 },
] as const;

export type AdministrativeLevel = (typeof LEVELS)[number]["level"];

function getFeatureScopeCode(feature: VillageBoundaryFeature): string | null {
  const value = feature.properties?.scope_code ?? feature.properties?.village_scope_code;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getFeatureName(feature: VillageBoundaryFeature): string {
  const value = feature.properties?.name_kiny ?? feature.properties?.village;
  return typeof value === "string" && value.trim() ? value.trim() : "Umudugudu muturanye";
}

function isPolygonFeature(feature: VillageBoundaryFeature): boolean {
  return feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon";
}

/**
 * Finds the nearest other village polygon boundary from the measured phone fix.
 * The actual polygon data comes from the existing official-boundary map RPC.
 */
export function findNearestVillageBoundary(
  latitude: number,
  longitude: number,
  features: VillageBoundaryFeature[],
  preferredCurrentScopeCode?: string | null
): NearbyVillageBoundary | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    features.length === 0
  ) {
    return null;
  }

  const origin = point([longitude, latitude]);
  const valid = features.filter((feature) =>
    isPolygonFeature(feature) && getFeatureScopeCode(feature)
  );
  if (valid.length === 0) return null;

  const containing = valid.filter((feature) => {
    try {
      return booleanPointInPolygon(origin, feature as Feature<Polygon | MultiPolygon>);
    } catch {
      return false;
    }
  });

  const current = containing.find(
    (feature) => getFeatureScopeCode(feature) === preferredCurrentScopeCode
  ) ?? containing[0] ?? null;
  const currentScopeCode = current ? getFeatureScopeCode(current) : null;

  const candidates = valid.filter((feature) => {
    const code = getFeatureScopeCode(feature);
    return code && code !== currentScopeCode;
  });

  let nearest: NearbyVillageBoundary | null = null;
  for (const feature of candidates) {
    try {
      const outline = polygonToLine(feature as Feature<Polygon | MultiPolygon>);
      const lines: Array<Feature<LineString>> =
        outline.geometry.type === "LineString"
          ? [outline as Feature<LineString>]
          : outline.geometry.type === "MultiLineString"
            ? outline.geometry.coordinates.map((coordinates) => lineString(coordinates))
            : [];
      const distances = lines.map((line) =>
        pointToLineDistance(origin, line, { units: "meters" })
      ).filter(Number.isFinite);
      const distanceMeters = distances.length ? Math.min(...distances) : Number.POSITIVE_INFINITY;
      if (!Number.isFinite(distanceMeters)) continue;

      if (!nearest || distanceMeters < nearest.distanceMeters) {
        nearest = {
          currentScopeCode,
          currentVillageName: current ? getFeatureName(current) : null,
          targetScopeCode: getFeatureScopeCode(feature)!,
          targetVillageName: getFeatureName(feature),
          distanceMeters,
        };
      }
    } catch {
      // Ignore one malformed polygon and continue with the remaining boundary rows.
    }
  }

  return nearest;
}

/** Lists administrative levels whose official scope-code prefix changes. */
export function getChangedAdministrativeLevels(
  fromScopeCode: string | null | undefined,
  toScopeCode: string | null | undefined
): AdministrativeLevel[] {
  if (!fromScopeCode || !toScopeCode || fromScopeCode === toScopeCode) return [];

  const fromParts = fromScopeCode.split("-");
  const toParts = toScopeCode.split("-");

  return LEVELS
    .filter(({ prefixParts }) => {
      if (fromParts.length < prefixParts || toParts.length < prefixParts) return false;
      return fromParts.slice(0, prefixParts).join("-") !==
        toParts.slice(0, prefixParts).join("-");
    })
    .map(({ level }) => level);
}

export function getAdministrativeLevelLabel(level: AdministrativeLevel): string {
  return LEVELS.find((item) => item.level === level)?.label ?? "Ahantu";
}

/**
 * A threshold is reportable only when the device uncertainty radius is no
 * wider than that threshold. This avoids claiming "5 m left" from a ±30 m fix.
 */
export function getCrossedApproachThreshold(
  previousDistanceMeters: number | null,
  nextDistanceMeters: number,
  accuracyMeters: number
): number | null {
  if (
    previousDistanceMeters === null ||
    !Number.isFinite(previousDistanceMeters) ||
    !Number.isFinite(nextDistanceMeters) ||
    !Number.isFinite(accuracyMeters) ||
    nextDistanceMeters >= previousDistanceMeters
  ) {
    return null;
  }

  const thresholds = [5, 50, 100, 250];
  return thresholds.find((threshold) =>
    accuracyMeters <= threshold &&
    previousDistanceMeters > threshold &&
    nextDistanceMeters <= threshold
  ) ?? null;
}

/** Approximate distance along the Earth's surface, in metres. */
export function distanceBetweenFixesMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(latitudeB - latitudeA);
  const deltaLon = radians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(deltaLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
