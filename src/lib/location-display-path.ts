export const LOCATION_DISPLAY_LEVELS = ["province", "district", "sector", "cell", "village"] as const;
export type LocationDisplayLevel = typeof LOCATION_DISPLAY_LEVELS[number];

type LocationDisplayNode = {
  scope_code: string;
  name_kiny: string;
  supported_probability?: number | null;
  calibrated_probability?: number | null;
  confidence?: number | null;
};

type LocationDisplayHierarchy = Partial<Record<LocationDisplayLevel, LocationDisplayNode>>;

const LEVEL_LABELS: Record<LocationDisplayLevel, string> = {
  province: "Intara",
  district: "Akarere",
  sector: "Umurenge",
  cell: "Akagari",
  village: "Umudugudu",
};

const LEVEL_RANK: Record<LocationDisplayLevel, number> = {
  province: 0,
  district: 1,
  sector: 2,
  cell: 3,
  village: 4,
};

export interface LocationDisplayPathItem {
  level: LocationDisplayLevel;
  label: string;
  scope_code: string;
  name_kiny: string;
  kind: "supported" | "estimate";
  confidencePercent: number | null;
}

/**
 * Keep a coherent administrative path visible even when the engine has only
 * enough evidence to select a coarser level. Any descendants below that level
 * are explicitly labelled as estimates, never presented as confirmed facts.
 */
export function getLocationDisplayPath(
  hierarchy: LocationDisplayHierarchy | null | undefined,
  selectedLevel?: LocationDisplayLevel,
): LocationDisplayPathItem[] {
  const supportedRank = selectedLevel ? LEVEL_RANK[selectedLevel] : -1;

  return LOCATION_DISPLAY_LEVELS.flatMap((level) => {
    const node = hierarchy?.[level];
    if (!node?.scope_code || !node.name_kiny) return [];

    const probability = typeof node.supported_probability === "number" && Number.isFinite(node.supported_probability)
      ? node.supported_probability
      : typeof node.calibrated_probability === "number" && Number.isFinite(node.calibrated_probability)
        ? node.calibrated_probability
        : typeof node.confidence === "number" && Number.isFinite(node.confidence)
          ? node.confidence / 100
          : null;

    return [{
      level,
      label: LEVEL_LABELS[level],
      scope_code: node.scope_code,
      name_kiny: node.name_kiny,
      kind: LEVEL_RANK[level] <= supportedRank ? "supported" as const : "estimate" as const,
      confidencePercent: probability === null
        ? null
        : Math.round(Math.min(1, Math.max(0, probability)) * 100),
    }];
  });
}
