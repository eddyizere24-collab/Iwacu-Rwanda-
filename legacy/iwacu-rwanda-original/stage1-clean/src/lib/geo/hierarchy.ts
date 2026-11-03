/**
 * Pure hierarchy resolution from EXPLICIT parent links (no code-prefix guessing, no turf dependency).
 */
import type { BoundaryLevel, ConfidenceMatch } from "@/types/boundary";
import type { LocateSuccess } from "@/types/location";

export interface HierarchyProps {
  scope_code: string;
  parent_scope_code?: string | null;
  name_kiny: string;
  name_eng: string | null;
  level: BoundaryLevel;
}

export function toMatch(p: HierarchyProps, confidence: number, area: number): ConfidenceMatch {
  return {
    scope_code: p.scope_code,
    name_kiny: p.name_kiny,
    name_eng: p.name_eng,
    level: p.level,
    confidence,
    intersection_area_m2: area,
  };
}

/** Walk explicit parent links from a village up to the root. Cycles are cut. */
export function resolveHierarchy(
  village: HierarchyProps,
  features: ReadonlyArray<{ properties: HierarchyProps }>,
  confidence: number
): LocateSuccess["hierarchy"] {
  const byCode = new Map(features.map((f) => [f.properties.scope_code, f.properties]));
  const hierarchy: LocateSuccess["hierarchy"] = {
    village: toMatch(village, confidence, 0),
  };
  const seen = new Set<string>([village.scope_code]);
  let cursor = village.parent_scope_code ? byCode.get(village.parent_scope_code) : undefined;
  while (cursor && !seen.has(cursor.scope_code)) {
    seen.add(cursor.scope_code);
    if (cursor.level === "cell" || cursor.level === "sector" || cursor.level === "district") {
      hierarchy[cursor.level] = toMatch(cursor, confidence, 0);
    }
    cursor = cursor.parent_scope_code ? byCode.get(cursor.parent_scope_code) : undefined;
  }
  return hierarchy;
}
