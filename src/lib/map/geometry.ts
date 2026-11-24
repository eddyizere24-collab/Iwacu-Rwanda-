/** Small geometry helpers for the map page. GeoJSON coordinates are [longitude, latitude]. */

type Ring = number[][];

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (!rings.length || !inRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) if (inRing(lng, lat, rings[i])) return false;
  return true;
}

export function pointInGeometry(lng: number, lat: number, geometry: unknown): boolean {
  if (!geometry || typeof geometry !== "object") return false;
  const geo = geometry as { type?: string; coordinates?: unknown };
  if (geo.type === "Polygon") return inPolygon(lng, lat, geo.coordinates as Ring[]);
  if (geo.type === "MultiPolygon") return (geo.coordinates as Ring[][]).some((poly) => inPolygon(lng, lat, poly));
  return false;
}

export type VillageFeature = {
  geometry?: unknown;
  properties?: { scope_code?: string; name_kiny?: string; name_eng?: string | null; level?: string } | null;
};

/** The village polygon that contains the point, if any. */
export function findVillageAt(lng: number, lat: number, features: VillageFeature[]): VillageFeature | null {
  return features.find((feature) => pointInGeometry(lng, lat, feature.geometry)) ?? null;
}

export function isInsideRwandaWindow(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -3.0 && lat <= -0.8 && lng >= 28.7 && lng <= 31.1;
}
