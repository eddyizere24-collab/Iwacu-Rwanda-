/**
 * Place facts for Ishakiro (Part 2 foundation).
 *
 * Hierarchy facts (parent, direct children counts) use the bundled offline
 * administrative index (public/offline/location-index.json).
 * Index codes follow RW-P#-D##-S####-C######-V######## (not RW-01-01).
 * Geometry-dependent facts return explicit "not available" — never invented.
 */

import offlineLocationIndex from "../../../public/offline/location-index.json";
import type { AdministrativeLevel } from "@/lib/administrative-units";

export type PlaceFactsStatus = "ok" | "missing" | "unavailable";

export interface PlaceHierarchyFact {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: AdministrativeLevel;
  parent: {
    scope_code: string;
    name_kiny: string;
    name_eng: string | null;
    level: AdministrativeLevel;
  } | null;
  child_level: AdministrativeLevel | null;
  child_count: number;
  children_sample: Array<{
    scope_code: string;
    name_kiny: string;
    name_eng: string | null;
  }>;
  source_label: string;
  data_date_label: string;
  limitations: string[];
}

export interface PlaceFactsResult {
  status: PlaceFactsStatus;
  fact: PlaceHierarchyFact | null;
  message_kiny: string;
}

const LEVEL_ORDER: AdministrativeLevel[] = [
  "province",
  "district",
  "sector",
  "cell",
  "village",
];

const CHILD_LEVEL: Record<AdministrativeLevel, AdministrativeLevel | null> = {
  province: "district",
  district: "sector",
  sector: "cell",
  cell: "village",
  village: null,
};

const SOURCE_LABEL =
  "Ububiko bw'inzego z'ubuyobozi — offline administrative index (bundled from public.boundaries)";
const DATA_DATE_LABEL =
  "Index yakuwe kuri Supabase public.boundaries (active hierarchy); itariki y'ivugurura yose ntigaragajwe nk'itariki imwe.";

/** Offline index path depth: province..village = up to 5 segments after RW. */
const SCOPE_CODE_RE = /^RW(?:-[0-9A-Z]+){0,5}$/;

type IndexUnit = {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: AdministrativeLevel;
  parent_scope_code: string | null;
};

let cachedByScope: Map<string, IndexUnit> | null = null;
let cachedChildrenByParent: Map<string, IndexUnit[]> | null = null;

function getIndexMap(): Map<string, IndexUnit> {
  if (cachedByScope) return cachedByScope;
  const map = new Map<string, IndexUnit>();
  const raw = (offlineLocationIndex as { choices?: unknown }).choices;
  if (!Array.isArray(raw)) {
    cachedByScope = map;
    return map;
  }
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 5) continue;
    const scope_code = String(entry[0] ?? "");
    const name_kiny = String(entry[1] ?? "");
    const level = String(entry[3]) as AdministrativeLevel;
    if (!scope_code || !name_kiny || !LEVEL_ORDER.includes(level)) continue;
    const parentRaw = entry[4] == null ? null : String(entry[4]);
    // Country root "RW" is not a selectable unit in the hierarchy tools.
    const parent_scope_code =
      level === "province" || parentRaw === "RW" || parentRaw === ""
        ? null
        : parentRaw;
    map.set(scope_code, {
      scope_code,
      name_kiny,
      name_eng: entry[2] == null ? null : String(entry[2]),
      level,
      parent_scope_code,
    });
  }
  cachedByScope = map;
  return map;
}

function findUnit(scopeCode: string): IndexUnit | null {
  return getIndexMap().get(scopeCode) ?? null;
}

function normalizeUnitName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Exact-name fallback for hierarchy facts when the live place-search RPC is
 * temporarily unavailable. It reads only the bundled administrative index;
 * ambiguous names are returned as multiple codes and must never be guessed.
 */
export function findAdministrativeScopeCodesByName(
  name: string,
  expectedLevel?: AdministrativeLevel,
): string[] {
  const query = normalizeUnitName(name);
  if (query.length < 2) return [];
  return [...getIndexMap().values()]
    .filter((unit) =>
      (!expectedLevel || unit.level === expectedLevel) &&
      (normalizeUnitName(unit.name_kiny) === query ||
        (unit.name_eng !== null && normalizeUnitName(unit.name_eng) === query)),
    )
    .map((unit) => unit.scope_code)
    .sort();
}

/**
 * Build the immediate-child index once. The bundled administrative JSON is
 * large, so re-parsing it for every child-count request would create avoidable
 * latency and memory churn on low-end phones/serverless instances.
 */
function getChildrenByParent(): Map<string, IndexUnit[]> {
  if (cachedChildrenByParent) return cachedChildrenByParent;
  const children = new Map<string, IndexUnit[]>();
  for (const unit of getIndexMap().values()) {
    if (!unit.parent_scope_code) continue;
    const list = children.get(unit.parent_scope_code) ?? [];
    list.push(unit);
    children.set(unit.parent_scope_code, list);
  }
  for (const list of children.values()) {
    list.sort((left, right) => left.name_kiny.localeCompare(right.name_kiny, "rw"));
  }
  cachedChildrenByParent = children;
  return children;
}

export interface RwandaAdministrativeSummary {
  counts: Record<AdministrativeLevel, number>;
  city_of_kigali: number;
  source_label: string;
  source_url: string;
  data_date_label: string;
}

/**
 * A source-stamped national snapshot from the Government of Rwanda overview.
 *
 * Do not use the bundled boundary index for national totals: the currently
 * bundled village rows (14,823) do not match the Government's published
 * national total (14,837), and Kigali City is a first-level entity but is not
 * one of the four Provinces. Keep this snapshot and its provenance explicit;
 * refresh it only after checking the official government source.
 */
export function getRwandaAdministrativeSummary(): RwandaAdministrativeSummary {
  return {
    counts: {
      province: 4,
      district: 30,
      sector: 416,
      cell: 2148,
      village: 14837,
    },
    city_of_kigali: 1,
    source_label: "Government of Rwanda — Overview and Local Government Directory",
    source_url: "https://www.gov.rw/overview",
    data_date_label:
      "Imibare yagenzuwe ku rubuga rwa Guverinoma y'u Rwanda ku wa 10/11/2026. Urubuga ntirugaragaza itariki imwe iyi mibare yatangarijweho; igomba kongera kugenzurwa mbere yo kuvugururwa.",
  };
}

function missingHierarchy(message: string): PlaceFactsResult {
  return { status: "missing", fact: null, message_kiny: message };
}

/**
 * Hierarchy fact for one scope code: parent + direct child count.
 * Does not compute area, adjacency or distance.
 */
export function getPlaceHierarchyFact(scopeCode: string): PlaceFactsResult {
  const code = scopeCode.trim();
  if (!SCOPE_CODE_RE.test(code)) {
    return {
      status: "missing",
      fact: null,
      message_kiny:
        "Kode y'ahantu ntabwo yemewe. Ntabwo nshobora kubara imibare idafite kode yemewe.",
    };
  }

  const unit = findUnit(code);
  if (!unit) {
    return {
      status: "missing",
      fact: null,
      message_kiny:
        "Nta hantu bihuye n'iyi kode nabonye mu bubiko bw'inzego z'ubuyobozi. Ntabwo nzahimba umubare.",
    };
  }

  let parent: PlaceHierarchyFact["parent"] = null;
  if (unit.level !== "province") {
    const parentUnit = unit.parent_scope_code ? findUnit(unit.parent_scope_code) : null;
    const expectedParentLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(unit.level) - 1];
    if (!parentUnit || parentUnit.level !== expectedParentLevel) {
      return missingHierarchy(
        "Urwego rw'ahantu rufite parent ituzuye muri index. Ntabwo nshobora kwemeza hierarchy y'iyi kode.",
      );
    }
    parent = {
      scope_code: parentUnit.scope_code,
      name_kiny: parentUnit.name_kiny,
      name_eng: parentUnit.name_eng,
      level: parentUnit.level,
    };
  }

  const childLevel = CHILD_LEVEL[unit.level];
  const children = childLevel
    ? (getChildrenByParent().get(unit.scope_code) ?? []).filter((child) => child.level === childLevel)
    : [];
  if (childLevel && children.length === 0) {
    return missingHierarchy(
      "Index nta nyandiko z'urwego rukurikiyeho ifite kuri aha hantu. Ntabwo nzerekana ko ifite abana zero, kuko amakuru ashobora kuba atuzuye.",
    );
  }
  const child_count = children.length;
  const children_sample: PlaceHierarchyFact["children_sample"] = children.slice(0, 8).map((child) => ({
    scope_code: child.scope_code,
    name_kiny: child.name_kiny,
    name_eng: child.name_eng,
  }));

  const fact: PlaceHierarchyFact = {
    scope_code: unit.scope_code,
    name_kiny: unit.name_kiny,
    name_eng: unit.name_eng,
    level: unit.level,
    parent,
    child_level: childLevel,
    child_count,
    children_sample,
    source_label: SOURCE_LABEL,
    data_date_label: DATA_DATE_LABEL,
    limitations: [
      "Umubare w'abana ni uw'inzego ziri mu index yashyizwe muri application; ntabwo ari official census count.",
      "Ubuso (area), imbibi zihurira n'intera ntibiboneka muri iki gice — bikeneye geometry + disposable PostGIS tests.",
    ],
  };

  const unitSubject: Record<AdministrativeLevel, string> = {
    province: unit.name_kiny === "Umujyi wa Kigali"
      ? unit.name_kiny
      : /^intara\b/i.test(unit.name_kiny)
        ? unit.name_kiny
        : "Intara ya " + unit.name_kiny,
    district: "Akarere ka " + unit.name_kiny,
    sector: "Umurenge wa " + unit.name_kiny,
    cell: "Akagari ka " + unit.name_kiny,
    village: "Umudugudu wa " + unit.name_kiny,
  };
  const unitVerb: Record<AdministrativeLevel, string> = {
    province: unit.name_kiny === "Umujyi wa Kigali" ? "ufite" : "ifite",
    district: "gafite",
    sector: "ufite",
    cell: "kafite",
    village: "ufite",
  };
  const pluralChildNames: Partial<Record<AdministrativeLevel, string>> = {
    district: "uturere",
    sector: "imirenge",
    cell: "utugari",
    village: "imidugudu",
  };

  const parentDisplayName = parent
    ? parent.scope_code === "RW-P1"
      ? "Umujyi wa Kigali"
      : parent.level === "province"
        ? parent.name_kiny
        : parent.level === "district"
          ? "Akarere ka " + parent.name_kiny
          : parent.level === "sector"
            ? "Umurenge wa " + parent.name_kiny
            : parent.level === "cell"
              ? "Akagari ka " + parent.name_kiny
              : "Umudugudu wa " + parent.name_kiny
    : null;

  let message: string;
  if (childLevel) {
    const childLabel = pluralChildNames[childLevel];
    if (!childLabel) {
      return missingHierarchy(
        "Index nta mazina y'ubwinshi y'urwego rukurikiyeho ifite. Ntabwo nzatanga umubare utasobanuwe neza.",
      );
    }
    message =
      unitSubject[unit.level] +
      " " +
      unitVerb[unit.level] +
      " " +
      childLabel +
      " " +
      String(child_count) +
      " mu bubiko bw'inzego. " +
      (parentDisplayName ? "Aho iri mu nzego: " + parentDisplayName + "." : "");
  } else {
    message =
      unitSubject[unit.level] +
      " nta rwego rukurikiyeho mu hierarchy. " +
      (parentDisplayName ? "Aho iri mu nzego: " + parentDisplayName + "." : "");
  }

  return {
    status: "ok",
    fact,
    message_kiny: message.trim(),
  };
}

/** Geometry-dependent facts are intentionally unavailable until disposable PostGIS is ready. */
export function getPlaceAreaUnavailable(_scopeCode: string): PlaceFactsResult {
  return {
    status: "unavailable",
    fact: null,
    message_kiny:
      "Ubuso bw'ahantu (km²) ntabwo bushobora gutangwa ubu. Bikeneye geometry yagenzuwe n'ibizamini bya PostGIS. Ntabwo nzahimba umubare.",
  };
}

export function getDistanceUnavailable(
  _fromScope: string,
  _toScope: string,
): PlaceFactsResult {
  return {
    status: "unavailable",
    fact: null,
    message_kiny:
      "Intera hagati y'ahantu habiri ntabwo ishobora kubarwa ubu. Iyo intera igomba kuba intera y'akarere igereranijwe mu murongo ugororotse (si yo ku muhanda) kandi ikeneye geometry + tests. Ntabwo nzahimba intera.",
  };
}
