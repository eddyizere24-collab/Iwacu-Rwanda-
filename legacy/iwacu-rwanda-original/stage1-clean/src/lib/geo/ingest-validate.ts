/** Feature validation and parent-first ordering for boundary ingest. */

export type RawFeature = {
  type: "Feature";
  properties: {
    scope_code: string;
    level: string;
    parent_scope_code: string | null;
    name_kiny?: string;
    name_eng?: string | null;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
};

export type ValidateResult = {
  ok: boolean;
  errors: string[];
  features: RawFeature[];
};

export function geometryProblem(geom: { type: string; coordinates: unknown } | null | undefined): string | null {
  if (!geom) return "missing geometry";
  if (!geom.type) return "missing geometry type";
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") {
    return `unsupported type ${geom.type}`;
  }
  if (!geom.coordinates || (Array.isArray(geom.coordinates) && geom.coordinates.length === 0)) {
    return "empty coordinates";
  }
  return null;
}

export function orderParentFirst(features: RawFeature[]): RawFeature[] {
  const levelRank: Record<string, number> = {
    country: 0,
    province: 1,
    district: 2,
    sector: 3,
    cell: 4,
    village: 5,
  };
  return [...features].sort((a, b) => {
    const ra = levelRank[String(a.properties.level).toLowerCase()] ?? 99;
    const rb = levelRank[String(b.properties.level).toLowerCase()] ?? 99;
    if (ra !== rb) return ra - rb;
    return String(a.properties.scope_code).localeCompare(String(b.properties.scope_code));
  });
}

export function validateFeatures(features: RawFeature[]): ValidateResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const code = f.properties?.scope_code;
    if (!code) {
      errors.push("feature missing scope_code");
      continue;
    }
    if (seen.has(code)) errors.push(`duplicate scope_code ${code}`);
    seen.add(code);
    const gp = geometryProblem(f.geometry);
    if (gp) errors.push(`${code}: ${gp}`);
  }
  return { ok: errors.length === 0, errors, features: orderParentFirst(features) };
}
