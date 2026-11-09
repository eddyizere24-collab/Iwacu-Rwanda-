/**
 * Spatial facts read from the live IWACU boundary geometry.
 *
 * The database function is read-only and callable only by the server-side
 * service_role client. It never returns synthetic fixtures to the website.
 */

import {
  createSupabaseServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  getPlaceHierarchyFact,
  type PlaceFactsResult,
} from "./place-facts";

export type SpatialStatus = "ok" | "missing" | "not_ready" | "error";

const SOURCE_LABEL = "IWACU RWANDA — public.boundaries (geometry ibitswe muri database)";
const SCOPE_CODE_RE = /^RW(?:-[A-Z0-9]{1,12}){0,5}$/;
const DISTANCE_METHOD = "point_on_surface_geography" as const;

export interface SpatialAreaResult {
  status: SpatialStatus;
  scope_code: string;
  area_m2: number | null;
  data_date: string | null;
  message_kiny: string;
  source_label: string;
}

export interface SpatialDistanceResult {
  status: SpatialStatus;
  from_scope: string;
  to_scope: string;
  distance_m: number | null;
  method: "geodesic_point_on_surface" | null;
  data_date: string | null;
  message_kiny: string;
  source_label: string;
}

export interface SpatialAdjacencyResult {
  status: SpatialStatus;
  scope_code: string;
  neighbors: Array<{ scope_code: string; name_kiny: string; level?: string }>;
  data_date: string | null;
  message_kiny: string;
  source_label: string;
}

interface PlaceIdentity {
  scope_code: string;
  name_kiny: string;
  level: string;
}

interface ParsedSpatialFacts {
  status: "ok" | "missing" | "missing_destination" | "invalid_geometry";
  origin: PlaceIdentity | null;
  destination: PlaceIdentity | null;
  area_m2: number | null;
  distance_m: number | null;
  distance_method: typeof DISTANCE_METHOD | null;
  neighbors: Array<{ scope_code: string; name_kiny: string; level: string }>;
  data_date: string | null;
  source: "public.boundaries";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPlaceIdentity(value: unknown): value is PlaceIdentity {
  if (!isRecord(value)) return false;
  return typeof value.scope_code === "string" &&
    SCOPE_CODE_RE.test(value.scope_code) &&
    typeof value.name_kiny === "string" &&
    value.name_kiny.trim().length > 0 &&
    typeof value.level === "string" &&
    ["province", "district", "sector", "cell", "village", "country"].includes(value.level);
}

function isDataDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Strictly validate the JSON contract returned by Postgres.
 * A missing or malformed field must never be converted into a made-up number.
 */
export function parseSpatialFactsPayload(
  value: unknown,
  expectedScopeCode: string,
  expectedDestinationScopeCode: string | null = null,
): ParsedSpatialFacts | null {
  if (!isRecord(value) || value.source !== "public.boundaries") return null;

  const status = value.status;
  const dataDate = isDataDate(value.data_date) ? value.data_date : null;
  if (status === "missing" || status === "missing_destination" || status === "invalid_geometry") {
    return {
      status,
      origin: isPlaceIdentity(value.origin) ? value.origin : null,
      destination: isPlaceIdentity(value.destination) ? value.destination : null,
      area_m2: null,
      distance_m: null,
      distance_method: null,
      neighbors: [],
      data_date: dataDate,
      source: "public.boundaries",
    };
  }

  if (status !== "ok" || !isPlaceIdentity(value.origin)) return null;
  const origin = value.origin;
  if (origin.scope_code !== expectedScopeCode ||
      typeof value.area_m2 !== "number" || !Number.isFinite(value.area_m2) || value.area_m2 <= 0) {
    return null;
  }

  let destination: PlaceIdentity | null = null;
  let distanceM: number | null = null;
  let distanceMethod: typeof DISTANCE_METHOD | null = null;

  if (expectedDestinationScopeCode) {
    if (!isPlaceIdentity(value.destination) ||
        value.destination.scope_code !== expectedDestinationScopeCode ||
        typeof value.distance_m !== "number" ||
        !Number.isFinite(value.distance_m) ||
        value.distance_m < 0 ||
        value.distance_method !== DISTANCE_METHOD) {
      return null;
    }
    destination = value.destination;
    distanceM = value.distance_m;
    distanceMethod = DISTANCE_METHOD;
  }

  const neighbors = Array.isArray(value.neighbors)
    ? value.neighbors.flatMap((neighbor) => {
        if (!isPlaceIdentity(neighbor)) return [];
        if (neighbor.level !== origin.level || neighbor.scope_code === origin.scope_code) return [];
        return [{
          scope_code: neighbor.scope_code,
          name_kiny: neighbor.name_kiny,
          level: neighbor.level,
        }];
      })
    : [];

  return {
    status: "ok",
    origin,
    destination,
    area_m2: value.area_m2,
    distance_m: distanceM,
    distance_method: distanceMethod,
    neighbors,
    data_date: dataDate,
    source: "public.boundaries",
  };
}

async function loadSpatialFacts(
  scopeCode: string,
  options: { toScopeCode?: string | null; includeNeighbors?: boolean } = {},
): Promise<ParsedSpatialFacts | null> {
  if (!SCOPE_CODE_RE.test(scopeCode)) return null;
  if (options.toScopeCode && !SCOPE_CODE_RE.test(options.toScopeCode)) return null;
  if (!isSupabaseConfigured()) return null;

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const supabase = createSupabaseServiceClient();
    timeout = setTimeout(() => controller.abort(), 2_500);
    const { data, error } = await supabase.rpc("assistant_spatial_facts_v1", {
      p_scope_code: scopeCode,
      p_to_scope_code: options.toScopeCode ?? null,
      p_include_neighbors: options.includeNeighbors === true,
    }).abortSignal(controller.signal);
    if (error) return null;
    return parseSpatialFactsPayload(data, scopeCode, options.toScopeCode ?? null);
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/** Hierarchy facts remain available offline from the bundled administrative index. */
export function getHierarchyFacts(scopeCode: string): PlaceFactsResult {
  return getPlaceHierarchyFact(scopeCode);
}

/** Area in square metres from the live IWACU boundary geometry. */
export async function getAreaM2(scopeCode: string): Promise<SpatialAreaResult> {
  const hierarchy = getPlaceHierarchyFact(scopeCode);
  if (hierarchy.status === "missing") {
    return {
      status: "missing",
      scope_code: scopeCode,
      area_m2: null,
      data_date: null,
      message_kiny: hierarchy.message_kiny,
      source_label: "offline administrative index",
    };
  }

  const facts = await loadSpatialFacts(scopeCode);
  if (!facts) {
    return {
      status: "not_ready",
      scope_code: scopeCode,
      area_m2: null,
      data_date: null,
      message_kiny: "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzatanga ubuso ntashingiye ku mibare yagenzuwe.",
      source_label: SOURCE_LABEL,
    };
  }
  if (facts.status === "missing") {
    return {
      status: "missing",
      scope_code: scopeCode,
      area_m2: null,
      data_date: facts.data_date,
      message_kiny: "Nta geometry yemewe y'ahantu habonetse muri database ya IWACU RWANDA.",
      source_label: SOURCE_LABEL,
    };
  }
  if (facts.status !== "ok" || facts.area_m2 === null || !facts.origin) {
    return {
      status: "error",
      scope_code: scopeCode,
      area_m2: null,
      data_date: facts.data_date,
      message_kiny: "Geometry y'ahantu ntiyashoboye kugenzurwa neza. Ntabwo nzatanga umubare w'ubuso utizewe.",
      source_label: SOURCE_LABEL,
    };
  }

  return {
    status: "ok",
    scope_code: scopeCode,
    area_m2: facts.area_m2,
    data_date: facts.data_date,
    message_kiny: "Ubuso bwa " + facts.origin.name_kiny + " bungana na " +
      Math.round(facts.area_m2).toLocaleString("rw-RW") +
      " m², bubarwa kuri geometry ibitswe muri database ya IWACU RWANDA.",
    source_label: SOURCE_LABEL,
  };
}

/**
 * Straight-line geodesic distance between ST_PointOnSurface representative
 * points. This is not a driving distance or a road route.
 */
export async function getDistanceM(
  fromScope: string,
  toScope: string,
): Promise<SpatialDistanceResult> {
  const a = getPlaceHierarchyFact(fromScope);
  const b = getPlaceHierarchyFact(toScope);
  if (a.status === "missing" || b.status === "missing") {
    return {
      status: "missing",
      from_scope: fromScope,
      to_scope: toScope,
      distance_m: null,
      method: null,
      data_date: null,
      message_kiny: "Nta kode ebyiri z'ahantu zemewe zabonetse zo gupima intera. Ntabwo nzahimba intera.",
      source_label: "offline administrative index",
    };
  }

  const facts = await loadSpatialFacts(fromScope, { toScopeCode: toScope });
  if (!facts) {
    return {
      status: "not_ready",
      from_scope: fromScope,
      to_scope: toScope,
      distance_m: null,
      method: null,
      data_date: null,
      message_kiny: "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzatanga intera ntashingiye ku mibare yagenzuwe.",
      source_label: SOURCE_LABEL,
    };
  }
  if (facts.status === "missing" || facts.status === "missing_destination") {
    return {
      status: "missing",
      from_scope: fromScope,
      to_scope: toScope,
      distance_m: null,
      method: null,
      data_date: facts.data_date,
      message_kiny: "Geometry y'ahantu habiri ntiyabonetse mu database ya IWACU RWANDA. Nta intera ntanze.",
      source_label: SOURCE_LABEL,
    };
  }
  if (facts.status !== "ok" || facts.distance_m === null || !facts.destination || !facts.origin) {
    return {
      status: "error",
      from_scope: fromScope,
      to_scope: toScope,
      distance_m: null,
      method: null,
      data_date: facts.data_date,
      message_kiny: "Geometry y'ahantu habiri ntiyashoboye kugenzurwa. Ntabwo nzatanga intera itizewe.",
      source_label: SOURCE_LABEL,
    };
  }

  return {
    status: "ok",
    from_scope: fromScope,
    to_scope: toScope,
    distance_m: facts.distance_m,
    method: "geodesic_point_on_surface",
    data_date: facts.data_date,
    message_kiny: "Intera yo mu murongo ugororotse hagati ya " + facts.origin.name_kiny +
      " na " + facts.destination.name_kiny + " ni hafi " +
      Math.round(facts.distance_m).toLocaleString("rw-RW") +
      " m. Ibarwa hagati y'utudomo duhagarariye buri gace, si intera yo mu muhanda.",
    source_label: SOURCE_LABEL,
  };
}

/** Adjacent units share a polygon boundary (ST_Touches); this does not mean merely nearby. */
export async function getAdjacentScopes(scopeCode: string): Promise<SpatialAdjacencyResult> {
  const hierarchy = getPlaceHierarchyFact(scopeCode);
  if (hierarchy.status === "missing") {
    return {
      status: "missing",
      scope_code: scopeCode,
      neighbors: [],
      data_date: null,
      message_kiny: hierarchy.message_kiny,
      source_label: "offline administrative index",
    };
  }

  const facts = await loadSpatialFacts(scopeCode, { includeNeighbors: true });
  if (!facts) {
    return {
      status: "not_ready",
      scope_code: scopeCode,
      neighbors: [],
      data_date: null,
      message_kiny: "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzahimba ahantu bihana imbibi.",
      source_label: SOURCE_LABEL,
    };
  }
  if (facts.status === "missing") {
    return {
      status: "missing",
      scope_code: scopeCode,
      neighbors: [],
      data_date: facts.data_date,
      message_kiny: "Nta geometry y'ahantu habonetse muri database ya IWACU RWANDA.",
      source_label: SOURCE_LABEL,
    };
  }
  if (facts.status !== "ok" || !facts.origin) {
    return {
      status: "error",
      scope_code: scopeCode,
      neighbors: [],
      data_date: facts.data_date,
      message_kiny: "Geometry y'ahantu ntiyashoboye kugenzurwa. Ntabwo nzatanga urutonde rw'ahantu hihana imbibi rutizewe.",
      source_label: SOURCE_LABEL,
    };
  }

  const names = facts.neighbors.map((neighbor) => neighbor.name_kiny);
  const message = names.length
    ? " " + facts.origin.name_kiny + " hihana imbibi na: " + names.join(", ") +
      ". Ibi bishingiye ku mipaka ya polygons ikoranaho muri database."
    : "Nta kandi gace ko ku rwego rumwe kabonetse gahanye imbibi na " +
      facts.origin.name_kiny + " muri geometry iri muri database.";

  return {
    status: "ok",
    scope_code: scopeCode,
    neighbors: facts.neighbors,
    data_date: facts.data_date,
    message_kiny: message.trim(),
    source_label: SOURCE_LABEL,
  };
}
