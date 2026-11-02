/**
 * Pure GPS helpers (no browser or React dependencies) so they can be unit-tested.
 * GPS failures are NEVER reported as network errors.
 */
import type { LocationErrorCode } from "@/types/location";

export const MAX_ACCURACY_M = 150;
export const GPS_TIMEOUT_MS = 20_000;

/** GeolocationPositionError.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT */
export function classifyGeolocationError(err: unknown): LocationErrorCode {
  const code =
    err && typeof err === "object" && "code" in err ? (err as { code: unknown }).code : undefined;
  if (code === 1) return "GPS_DENIED";
  if (code === 3) return "GPS_TIMEOUT";
  return "GPS_UNAVAILABLE";
}

export type CoordinateCheck =
  | { ok: true }
  | { ok: false; code: "INVALID_COORDINATES" | "GPS_ACCURACY_TOO_LOW" };

/** Validates raw GPS output. Does NOT decide whether the point is in Rwanda (that needs real polygons). */
export function validateGpsFix(latitude: unknown, longitude: unknown, accuracy: unknown): CoordinateCheck {
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  if (!finite(latitude) || !finite(longitude) || !finite(accuracy)) {
    return { ok: false, code: "INVALID_COORDINATES" };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || accuracy <= 0) {
    return { ok: false, code: "INVALID_COORDINATES" };
  }
  if (accuracy > MAX_ACCURACY_M) return { ok: false, code: "GPS_ACCURACY_TOO_LOW" };
  return { ok: true };
}

/**
 * Honest confidence label. Never claims certainty: a single match at 100% only means the
 * GPS accuracy circle lies fully inside one polygon, not that the position is exact.
 */
export function confidenceBand(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 80) return "high";
  if (confidence >= 40) return "medium";
  return "low";
}

/** True when the top two matches are close, i.e. the user is likely near a village border. */
export function isNearBoundary(matches: ReadonlyArray<{ confidence: number }>): boolean {
  if (matches.length < 2) return false;
  const [a, b] = [...matches].sort((x, y) => y.confidence - x.confidence);
  return b.confidence >= 20 && a.confidence - b.confidence < 40;
}

/**
 * Coarse pre-filter ONLY. Outside this box => certainly outside Rwanda.
 * Inside this box proves nothing (it also covers parts of DRC, Uganda, Tanzania, Burundi);
 * the authoritative answer comes from the verified national polygon (PostGIS point_in_rwanda).
 */
const RWANDA_PREFILTER_BBOX: [number, number, number, number] = [28.8, -2.9, 31.0, -0.95];
export function isOutsideRwandaPrefilter(latitude: number, longitude: number): boolean {
  const [minLng, minLat, maxLng, maxLat] = RWANDA_PREFILTER_BBOX;
  return longitude < minLng || longitude > maxLng || latitude < minLat || latitude > maxLat;
}
