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
  probability: number;
  parent_scope_code?: string | null;
}

export interface BackoffResult {
  level: BackoffLevel | "unknown";
  candidates: BackoffCandidate[];
  selected: BackoffCandidate | null;
  reason: string;
}

type CalibrationCurve = { x: number[]; y: number[] };
type CalibrationFile = {
  version?: string;
  tau?: number;
  levels?: Record<string, CalibrationCurve>;
};

const CALIBRATION = calibrationConfig as CalibrationFile;

export const TAU = Number.isFinite(CALIBRATION.tau)
  ? Math.min(1, Math.max(0, CALIBRATION.tau as number))
  : 0.55;

export function calibrationLookup(value: number, curve: CalibrationCurve): number {
  const xs = curve.x;
  const ys = curve.y;
  if (!xs.length || xs.length !== ys.length) return value;
  if (value <= xs[0]) return ys[0];
  if (value >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 1; i < xs.length; i += 1) {
    if (value <= xs[i]) {
      const t = (value - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

function curveFor(level: BackoffLevel): CalibrationCurve | null {
  const levels = CALIBRATION.levels;
  if (!levels) return null;
  const c = levels[level];
  if (!c || !Array.isArray(c.x) || !Array.isArray(c.y)) return null;
  return c;
}

export function buildBackoffCandidates(input: BackoffVillageInput): BackoffCandidate[] {
  const chain = input.parent_chain || {};
  const out: BackoffCandidate[] = [];
  const push = (level: BackoffLevel, node: BackoffNode | null | undefined, raw: number) => {
    if (!node?.scope_code) return;
    const curve = curveFor(level);
    const calibrated = curve ? calibrationLookup(raw, curve) : raw;
    out.push({
      scope_code: node.scope_code,
      name_kiny: node.name_kiny,
      name_eng: node.name_eng,
      intersection_area_m2: node.intersection_area_m2,
      level,
      raw_score: raw,
      calibrated_probability: calibrated,
      probability: Math.round(calibrated * 1000) / 10,
    });
  };
  push("village", input, input.raw_score);
  push("cell", chain.akagari ?? null, input.raw_score);
  push("sector", chain.umurenge ?? null, input.raw_score);
  push("district", chain.akarere ?? null, input.raw_score);
  push("province", chain.intara ?? null, input.raw_score);
  return out;
}

export function selectBackoffLevel(
  candidates: BackoffCandidate[],
  tau: number = TAU,
): BackoffResult {
  const threshold = Number.isFinite(tau) ? Math.min(1, Math.max(0, tau)) : TAU;
  const ordered = [...candidates].sort((a, b) => {
    const ai = BACKOFF_LEVELS.indexOf(a.level);
    const bi = BACKOFF_LEVELS.indexOf(b.level);
    return ai - bi;
  });
  for (const c of ordered) {
    if (c.calibrated_probability >= threshold) {
      return { level: c.level, candidates: ordered, selected: c, reason: "tau_pass" };
    }
  }
  return {
    level: ordered.length ? ordered[ordered.length - 1].level : "unknown",
    candidates: ordered,
    selected: ordered.length ? ordered[ordered.length - 1] : null,
    reason: ordered.length ? "fallback_coarsest" : "empty",
  };
}
