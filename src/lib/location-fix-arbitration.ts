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
export function locationFixesDisagree(
  existing: LocationFixSummary,
  incoming: LocationFixSummary
): boolean {
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
  return separation > disagreementThreshold;
}

/**
 * Decides whether a new device fix represents real movement rather than GPS
 * jitter. The floor is five metres because ordinary phone geolocation cannot
 * reliably resolve centimetre-scale movement.
 */
export function isMeaningfulLocationMovement(
  previous: LocationFixSummary,
  incoming: LocationFixSummary,
): boolean {
  const values = [
    previous.latitude,
    previous.longitude,
    previous.accuracyMeters,
    incoming.latitude,
    incoming.longitude,
    incoming.accuracyMeters,
  ];
  if (!values.every(Number.isFinite)) return false;
  if (
    previous.latitude < -90 || previous.latitude > 90 ||
    incoming.latitude < -90 || incoming.latitude > 90 ||
    previous.longitude < -180 || previous.longitude > 180 ||
    incoming.longitude < -180 || incoming.longitude > 180 ||
    previous.accuracyMeters < 0 || incoming.accuracyMeters < 0
  ) return false;

  const separation = distanceMeters(previous, incoming);
  const uncertaintyAwareThreshold = Math.max(
    5,
    (previous.accuracyMeters + incoming.accuracyMeters) / 2,
  );
  return Number.isFinite(separation) && separation >= uncertaintyAwareThreshold;
}

export function isDuplicateDeviceFix(
  previous: LocationFixSummary,
  incoming: LocationFixSummary,
  previousSubmittedAt: number,
  now: number,
): boolean {
  const values = [
    previous.latitude,
    previous.longitude,
    previous.accuracyMeters,
    incoming.latitude,
    incoming.longitude,
    incoming.accuracyMeters,
    previousSubmittedAt,
    now,
  ];
  if (!values.every(Number.isFinite)) return false;
  if (now < previousSubmittedAt || now - previousSubmittedAt > 4_000) return false;
  if (
    previous.latitude < -90 || previous.latitude > 90 ||
    incoming.latitude < -90 || incoming.latitude > 90 ||
    previous.longitude < -180 || previous.longitude > 180 ||
    incoming.longitude < -180 || incoming.longitude > 180 ||
    previous.accuracyMeters < 0 || incoming.accuracyMeters < 0
  ) return false;

  const separation = distanceMeters(previous, incoming);
  if (!Number.isFinite(separation)) return false;
  const samePlaceThreshold = Math.max(
    25,
    Math.min(previous.accuracyMeters, incoming.accuracyMeters) * 0.25
  );
  const materiallyImprovesAccuracy = incoming.accuracyMeters < previous.accuracyMeters * 0.8;
  return separation <= samePlaceThreshold && !materiallyImprovesAccuracy;
}

export function shouldPreferHighAccuracyRequest(
  existing: LocationFixSummary,
  incoming: LocationFixSummary
): boolean {
  if (existing.requestMode !== "low-power" || incoming.requestMode !== "high-accuracy") {
    return false;
  }

  if (!locationFixesDisagree(existing, incoming)) return false;

  const maximumAcceptableHighAccuracyRadius = Math.max(
    1_500,
    existing.accuracyMeters * 3
  );
  return incoming.accuracyMeters <= maximumAcceptableHighAccuracyRadius;
}
