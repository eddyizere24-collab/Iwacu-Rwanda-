import calibrationConfig from "./calibration-v2.json"; // CHANGED 2026-11-03 GROK: wire calibration-v2; keep v1 for rollback

export const BACKOFF_LEVELS = ["village", "cell", "sector", "district", "province"] as const;
export type BackoffLevel = typeof BACKOFF_LEVELS[number];

export interface BackoffNode {
  scope_code: string;
  name_kiny: string;
  name_eng?: string | null;
  intersection_area_m2?: number;
}

export interface BackoffVillageInput extends BackoffNode {
  raw_score: number;
  parent_chain: {
    akagari?: BackoffNode | null;
    umurenge?: BackoffNode | null;
    akarere?: BackoffNode | null;
    intara?: BackoffNode | null;
  };
}

export interface BackoffCandidate extends BackoffNode {
  level: BackoffLevel;
  raw_score: number;
  calibrated_probability: number;
  /** Existing API compatibility: raw probability represented on a 0–100 scale. */
  confidence: number;
}

export interface BackoffResult {
  chosen_level: BackoffLevel;
  chosen: BackoffCandidate;
  hierarchy: Partial<Record<BackoffLevel, BackoffCandidate>>;
  path: {
    intara?: string;
    akarere?: string;
    umurenge?: string;
    akagari?: string;
    umudugudu?: string;
  };
  per_level_candidates: Partial<Record<BackoffLevel, BackoffCandidate[]>>;
  top3_villages: BackoffCandidate[];
}

interface CalibrationCurve {
  x: number[];
  y: number[];
}
interface CalibrationFile {
  version: string;
  tau: number;
  levels: Record<BackoffLevel, CalibrationCurve>;
}

const CALIBRATION = calibrationConfig as CalibrationFile;
export const TAU = Number.isFinite(CALIBRATION.tau)
  ? Math.min(1, Math.max(0, CALIBRATION.tau))
  : 0.8;
export const CALIBRATION_VERSION = CALIBRATION.version || "unknown";

/** Piecewise-linear isotonic lookup. Inputs outside the knots clamp to the endpoints. */
export function calibrationLookup(value: number, curve: CalibrationCurve): number {
  const x = curve.x;
  const y = curve.y;
  if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || x.length !== y.length) {
    return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  }
  if (x.some((v, i) => !Number.isFinite(v) || (i > 0 && v < x[i - 1])) ||
      y.some((v, i) => !Number.isFinite(v) || v < 0 || v > 1 ||
        (i > 0 && v < y[i - 1]))) {
    throw new Error("Calibration curve must have finite, monotone x/y arrays in [0,1].");
  }
  const input = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  if (input <= x[0]) return y[0];
  if (input >= x[x.length - 1]) return y[y.length - 1];
  let lo = 0;
  let hi = x.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= input) lo = mid;
    else hi = mid;
  }
  const t = (input - x[lo]) / (x[hi] - x[lo] || 1);
  return y[lo] + t * (y[hi] - y[lo]);
}

function curveFor(level: BackoffLevel): CalibrationCurve | null {
  const levels = CALIBRATION.levels;
  if (!levels) return null;
  const c = levels[level];
  if (!c || !Array.isArray(c.x) || !Array.isArray(c.y)) return null;
  return c;
}

/** Aggregate village hits into coarser admin levels and pick the finest level at/above TAU. */
export function backoffLocation(
  villages: BackoffVillageInput[],
  tau: number = TAU,
): BackoffResult {
  type Agg = { node: BackoffNode; raw_score: number; path: Partial<Record<BackoffLevel, BackoffNode>> };
  const aggregates = new Map<BackoffLevel, Map<string, Agg>>();
  for (const level of BACKOFF_LEVELS) aggregates.set(level, new Map());

  for (const village of villages) {
    const path: Partial<Record<BackoffLevel, BackoffNode>> = {
      village: { scope_code: village.scope_code, name_kiny: village.name_kiny, name_eng: village.name_eng, intersection_area_m2: village.intersection_area_m2 },
      cell: village.parent_chain.akagari ?? undefined,
      sector: village.parent_chain.umurenge ?? undefined,
      district: village.parent_chain.akarere ?? undefined,
      province: village.parent_chain.intara ?? undefined,
    };
    for (const level of BACKOFF_LEVELS) {
      const node = path[level];
      if (!node?.scope_code) continue;
      const bucket = aggregates.get(level)!;
      const existing = bucket.get(node.scope_code);
      if (!existing || village.raw_score > existing.raw_score) {
        bucket.set(node.scope_code, { node, raw_score: village.raw_score, path });
      }
    }
  }

  const perLevel: Partial<Record<BackoffLevel, BackoffCandidate[]>> = {};
  const allPerLevel = new Map<BackoffLevel, BackoffCandidate[]>();
  for (const level of BACKOFF_LEVELS) {
    const curve = curveFor(level);
    const sortedCandidates = Array.from(aggregates.get(level)?.values() ?? []).map((entry) => {
      const calibrated = curve ? calibrationLookup(entry.raw_score, curve) : entry.raw_score;
      return {
        ...entry.node,
        level,
        raw_score: entry.raw_score,
        calibrated_probability: calibrated,
        confidence: Math.round(calibrated * 1000) / 10,
      } as BackoffCandidate;
    }).sort((a, b) =>
      b.calibrated_probability - a.calibrated_probability ||
      a.scope_code.localeCompare(b.scope_code)
    );
    allPerLevel.set(level, sortedCandidates);
    perLevel[level] = sortedCandidates.slice(0, 3);
  }

  const threshold = Number.isFinite(tau) ? Math.min(1, Math.max(0, tau)) : TAU;
  let chosenLevel: BackoffLevel = "province";
  for (const level of BACKOFF_LEVELS) {
    const top = perLevel[level]?.[0];
    if (top && top.calibrated_probability >= threshold) {
      chosenLevel = level;
      break;
    }
  }

  let chosen = perLevel[chosenLevel]?.[0];
  if (!chosen) {
    const fallback = villages.find((item) => item.parent_chain.intara?.scope_code);
    const node = fallback?.parent_chain.intara;
    if (!node) {
      throw new Error("Backoff requires at least one village with an intara/province parent.");
    }
    chosen = {
      ...node,
      level: "province",
      raw_score: 0,
      calibrated_probability: 0,
      confidence: 0,
      intersection_area_m2: 0,
    };
    perLevel.province = [chosen];
  }

  const chosenEntry = Array.from(aggregates.get(chosenLevel)?.values() ?? [])
    .find((entry) => entry.node.scope_code === chosen?.scope_code);
  const lineage = chosenEntry?.path ?? {};
  const hierarchy: Partial<Record<BackoffLevel, BackoffCandidate>> = {};
  const pathLevelIndex = BACKOFF_LEVELS.indexOf(chosenLevel);
  for (const level of BACKOFF_LEVELS) {
    if (BACKOFF_LEVELS.indexOf(level) < pathLevelIndex) continue;
    const node = lineage[level];
    if (!node) continue;
    const candidate = allPerLevel.get(level)?.find((item) => item.scope_code === node.scope_code);
    if (candidate) hierarchy[level] = candidate;
  }
  hierarchy[chosenLevel] = chosen;

  const path = {
    intara: lineage.province?.name_kiny,
    akarere: lineage.district?.name_kiny,
    umurenge: lineage.sector?.name_kiny,
    akagari: lineage.cell?.name_kiny,
    umudugudu: lineage.village?.name_kiny,
  };
  if (pathLevelIndex > 0) path.umudugudu = undefined;
  if (pathLevelIndex > 1) path.akagari = undefined;
  if (pathLevelIndex > 2) path.umurenge = undefined;
  if (pathLevelIndex > 3) path.akarere = undefined;

  return {
    chosen_level: chosenLevel,
    chosen,
    hierarchy,
    path,
    per_level_candidates: perLevel,
    top3_villages: perLevel.village ?? [],
  };
}
