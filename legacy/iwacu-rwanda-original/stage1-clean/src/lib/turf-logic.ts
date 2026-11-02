/**
 * Offline geospatial confidence using @turf/turf against a cached sector pack.
 */

import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { BoundaryLevel, ConfidenceMatch } from "@/types/boundary";
import type { LocateError, LocateSuccess } from "@/types/location";
import { createLocateError } from "@/lib/utils/errors";
import { toMatch, resolveHierarchy } from "@/lib/geo/hierarchy";
import { MAX_ACCURACY_M, validateGpsFix, isNearBoundary, isOutsideRwandaPrefilter } from "@/lib/geo/gps";

export interface OfflineBoundaryProperties {
  scope_code: string;
  parent_scope_code?: string | null;
  name_kiny: string;
  name_eng: string | null;
  level: BoundaryLevel;
  path?: string;
}

export type OfflineBoundaryFeature = Feature<Polygon | MultiPolygon, OfflineBoundaryProperties>;
export type OfflineBoundaryCollection = FeatureCollection<Polygon | MultiPolygon, OfflineBoundaryProperties>;

export const MIN_CONFIDENCE = 5;
export { resolveHierarchy };

function intersectionAreaM2(a: Feature<Polygon | MultiPolygon>, b: Feature<Polygon | MultiPolygon>): number {
  try {
    const inter = turf.intersect(turf.featureCollection([a, b]));
    return inter ? turf.area(inter) : 0;
  } catch {
    return 0;
  }
}

export function calculateConfidenceOffline(
  latitude: number,
  longitude: number,
  accuracy: number,
  boundaries: OfflineBoundaryCollection
): LocateSuccess | LocateError {
  const check = validateGpsFix(latitude, longitude, accuracy);
  if (!check.ok) return createLocateError(check.code, { accuracy });

  if (isOutsideRwandaPrefilter(latitude, longitude)) return createLocateError("OUTSIDE_RWANDA");

  if (!boundaries?.features?.length) return createLocateError("OFFLINE_CACHE", { reason: "empty_pack" });

  const circle = turf.circle([longitude, latitude], accuracy / 1000, { steps: 64, units: "kilometers" });
  const circleArea = turf.area(circle);
  if (circleArea <= 0) return createLocateError("GPS_ACCURACY_TOO_LOW", { accuracy });

  const matches: ConfidenceMatch[] = [];
  for (const f of boundaries.features) {
    if (f.properties?.level !== "village") continue;
    const area = intersectionAreaM2(circle, f);
    if (area <= 0) continue;
    matches.push(toMatch(f.properties, Math.round(Math.min(100, (area / circleArea) * 100) * 100) / 100, area));
  }

  if (matches.length === 0) {
    const point = turf.point([longitude, latitude]);
    const insideAny = boundaries.features.some((f) => {
      try {
        return turf.booleanPointInPolygon(point, f);
      } catch {
        return false;
      }
    });
    return createLocateError("OFFLINE_CACHE", {
      reason: insideAny ? "no_village_polygon_here" : "outside_cached_area",
    });
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  if (matches[0].confidence < MIN_CONFIDENCE) {
    return createLocateError("CONFIDENCE_TOO_LOW", { max_confidence: matches[0].confidence });
  }

  const topFeature = boundaries.features.find((f) => f.properties.scope_code === matches[0].scope_code)!;
  const hierarchy = resolveHierarchy(topFeature.properties, boundaries.features, matches[0].confidence);
  hierarchy.village = matches[0];

  const result: LocateSuccess = {
    status: "success",
    matches,
    hierarchy,
    leaders: [],
    source: "offline",
  };
  if (isNearBoundary(matches)) {
    result.warning = {
      code: "NEAR_BOUNDARY",
      message_kiny: "Uri hafi y'umupaka w'imidugudu ibiri. Reba imidugudu yombi.",
      message_eng: "You are near a village border. Check both villages.",
    };
  }
  return result;
}

export { MAX_ACCURACY_M };
