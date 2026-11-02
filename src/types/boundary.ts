import type { MultiPolygon } from "geojson";

export type BoundaryLevel =
  | "country"
  | "province"
  | "district"
  | "sector"
  | "cell"
  | "village";

export interface Boundary {
  id: string;
  scope_code: string;
  path: string;
  name_kiny: string;
  name_eng: string | null;
  level: BoundaryLevel;
  parent_id: string | null;
  geom?: MultiPolygon;
  area_m2?: number;
  valid_from: string;
  valid_to: string | null;
  version: number;
}

export interface ConfidenceMatch {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: BoundaryLevel;
  confidence: number;
  intersection_area_m2: number;
}
