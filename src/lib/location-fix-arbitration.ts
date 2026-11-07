export type LocationRequestMode = "low-power" | "high-accuracy";

export interface LocationFixSummary {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  requestMode: LocationRequestMode;
}

function distanceMeters(a: LocationFixSummary, b: LocationFixSummary): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

/**
 * A browser's high-accuracy flag is only a request hint, not proof that GNSS
 * was used. When its two request modes return far-apart coordinates, prefer
 * the high-accuracy-request result if its own uncertainty remains bounded.
 */
export function shouldPreferHighAccuracyRequest(
  existing: LocationFixSummary,
  incoming: LocationFixSummary
): boolean {
  if (existing.requestMode !== "low-power" || incoming.requestMode !== "high-accuracy") {
    return false;
  }

  const values = [
    existing.latitude,
    existing.longitude,
    existing.accuracyMeters,
    incoming.latitude,
    incoming.longitude,
    incoming.accuracyMeters,
  ];
  if (!values.every(Number.isFinite)) return false;
  if (
    existing.latitude < -90 || existing.latitude > 90 ||
    incoming.latitude < -90 || incoming.latitude > 90 ||
    existing.longitude < -180 || existing.longitude > 180 ||
    incoming.longitude < -180 || incoming.longitude > 180 ||
    existing.accuracyMeters < 0 || incoming.accuracyMeters < 0
  ) return false;

  const separation = distanceMeters(existing, incoming);
  const disagreementThreshold = Math.max(
    500,
    (existing.accuracyMeters + incoming.accuracyMeters) * 1.5
  );
  if (separation <= disagreementThreshold) return false;

  const maximumAcceptableHighAccuracyRadius = Math.max(
    1_500,
    existing.accuracyMeters * 3
  );
  return incoming.accuracyMeters <= maximumAcceptableHighAccuracyRadius;
}
