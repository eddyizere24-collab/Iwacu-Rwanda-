/**
 * Spatial place facts for Ishakiro.
 *
 * Hierarchy (parent + children counts) uses the offline administrative index
 * already shipped with the app — same source as place-facts.ts.
 *
 * Area (m²), geodesic distance, and adjacency require PostGIS functions from
 * sql/migrations/20261109_02_assistant_spatial_facts_disposable.sql which MUST
 * only be applied to a disposable database. Until that environment is wired,
 * those operations return status "not_ready" and never invent numbers.
 */

import {
  lookupPlaceHierarchyFacts,
  type PlaceFactsResult,
} from "./place-facts";

export type SpatialStatus = "ok" | "missing" | "not_ready" | "error";

export interface SpatialAreaResult {
  status: SpatialStatus;
  scope_code: string;
  area_m2: number | null;
  message_kiny: string;
  source_label: string;
}

export interface SpatialDistanceResult {
  status: SpatialStatus;
  from_scope: string;
  to_scope: string;
  distance_m: number | null;
  method: "geodesic_point_on_surface" | null;
  message_kiny: string;
  source_label: string;
}

export interface SpatialAdjacencyResult {
  status: SpatialStatus;
  scope_code: string;
  neighbors: Array<{ scope_code: string; name_kiny: string }>;
  message_kiny: string;
  source_label: string;
}

/** Hierarchy facts — available offline. */
export function getHierarchyFacts(scopeCode: string): PlaceFactsResult {
  return lookupPlaceHierarchyFacts(scopeCode);
}

/**
 * Area in square metres.
 * Requires disposable PostGIS fixture. Never invents a value.
 */
export async function getAreaM2(scopeCode: string): Promise<SpatialAreaResult> {
  const hierarchy = lookupPlaceHierarchyFacts(scopeCode);
  if (hierarchy.status === "missing") {
    return {
      status: "missing",
      scope_code: scopeCode,
      area_m2: null,
      message_kiny: hierarchy.message_kiny,
      source_label: "offline administrative index",
    };
  }

  // PostGIS path is intentionally not called against Production.
  // When a disposable connection is configured, replace this block with an RPC call
  // to assistant_spatial_fixture.get_area_m2(scope_code).
  return {
    status: "not_ready",
    scope_code: scopeCode,
    area_m2: null,
    message_kiny:
      "Kubara ubuso (m²) bisaba PostGIS muri database y'igerageza. Ntabwo bwashyizwe mu bikorwa kuri Production, kandi ntabwo nzahimba umubare.",
    source_label: "assistant_spatial_fixture (not connected)",
  };
}

/**
 * Straight-line geodesic distance between representative points.
 * Requires disposable PostGIS. Never invents a value.
 */
export async function getDistanceM(
  fromScope: string,
  toScope: string,
): Promise<SpatialDistanceResult> {
  const a = lookupPlaceHierarchyFacts(fromScope);
  const b = lookupPlaceHierarchyFacts(toScope);
  if (a.status === "missing" || b.status === "missing") {
    return {
      status: "missing",
      from_scope: fromScope,
      to_scope: toScope,
      distance_m: null,
      method: null,
      message_kiny: "Nta kode y'ahantu yemewe yabonetse yo gupima intera. Ntabwo nzahimba intera.",
      source_label: "offline administrative index",
    };
  }

  return {
    status: "not_ready",
    from_scope: fromScope,
    to_scope: toScope,
    distance_m: null,
    method: null,
    message_kiny:
      "Gupima intera (m) bisaba PostGIS (ST_Distance ku geography) muri database y'igerageza. Ntabwo byahujwe, kandi ntabwo nzahimba intera.",
    source_label: "assistant_spatial_fixture (not connected)",
  };
}

/**
 * Adjacent administrative units (ST_Touches). Requires disposable PostGIS.
 */
export async function getAdjacentScopes(scopeCode: string): Promise<SpatialAdjacencyResult> {
  const hierarchy = lookupPlaceHierarchyFacts(scopeCode);
  if (hierarchy.status === "missing") {
    return {
      status: "missing",
      scope_code: scopeCode,
      neighbors: [],
      message_kiny: hierarchy.message_kiny,
      source_label: "offline administrative index",
    };
  }

  return {
    status: "not_ready",
    scope_code: scopeCode,
    neighbors: [],
    message_kiny:
      "Kumenya ahantu hageranye (ST_Touches) bisaba PostGIS muri database y'igerageza. Ntabwo byahujwe, kandi ntabwo nzahimba urutonde.",
    source_label: "assistant_spatial_fixture (not connected)",
  };
}
