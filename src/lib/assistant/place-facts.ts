/**
 * Place facts for Ishakiro (Part 2 foundation).
 *
 * Hierarchy facts (parent, direct children counts) use the bundled offline
 * NISR administrative index already present in the repository.
 * Geometry-dependent facts (area, adjacency, geodesic distance) are not
 * invented: they return an explicit "not available" contract until a
 * disposable PostGIS fixture set is added and tested.
 */

import offlineLocationIndex from "../../../public/offline/location-index.json";
import {
  getAdministrativeUnitChoices,
  type AdministrativeLevel,
} from "@/lib/administrative-units";

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
  "Ububiko bw'inzego z'ubuyobozi — offline NISR administrative index (bundled)";
const DATA_DATE_LABEL =
  "Itariki y'ivugurura y'iyi liste ntigaragajwe nk'itariki imwe; index iri muri application.";

type IndexUnit = {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: AdministrativeLevel;
  parent_scope_code: string | null;
};

let cachedByScope: Map<string, IndexUnit> | null = null;

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
    const parent_scope_code = entry[4] == null ? null : String(entry[4]);
    map.set(scope_code, {
      scope_code,
      name_kiny,
      name_eng: entry[2] == null ? null : String(entry[2]),
      level,
      parent_scope_code: level === "province" ? null : parent_scope_code,
    });
  }
  cachedByScope = map;
  return map;
}

function findUnit(scopeCode: string): IndexUnit | null {
  return getIndexMap().get(scopeCode) ?? null;
}

/**
 * Hierarchy fact for one scope code: parent + direct child count.
 * Does not compute area, adjacency or distance.
 */
export function getPlaceHierarchyFact(scopeCode: string): PlaceFactsResult {
  const code = scopeCode.trim();
  if (!/^RW(?:-[0-9A-Z]+){0,4}$/.test(code)) {
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
  if (unit.parent_scope_code) {
    const parentUnit = findUnit(unit.parent_scope_code);
    if (parentUnit) {
      parent = {
        scope_code: parentUnit.scope_code,
        name_kiny: parentUnit.name_kiny,
        name_eng: parentUnit.name_eng,
        level: parentUnit.level,
      };
    }
  }

  const childLevel = CHILD_LEVEL[unit.level];
  let child_count = 0;
  const children_sample: PlaceHierarchyFact["children_sample"] = [];

  if (childLevel) {
    const children = getAdministrativeUnitChoices(
      offlineLocationIndex,
      childLevel,
      unit.scope_code,
      "",
    );
    child_count = children.length;
    for (const child of children.slice(0, 8)) {
      children_sample.push({
        scope_code: child.scope_code,
        name_kiny: child.name_kiny,
        name_eng: child.name_eng,
      });
    }
  }

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

  const levelNames: Record<AdministrativeLevel, string> = {
    province: "Intara",
    district: "Akarere",
    sector: "Umurenge",
    cell: "Akagari",
    village: "Umudugudu",
  };

  let message: string;
  if (childLevel) {
    message =
      levelNames[unit.level] +
      " ya " +
      unit.name_kiny +
      " ifite " +
      String(child_count) +
      " " +
      levelNames[childLevel].toLowerCase() +
      " mu bubiko bw'inzego. " +
      (parent
        ? "Iherereye muri " + levelNames[parent.level].toLowerCase() + " ya " + parent.name_kiny + "."
        : "");
  } else {
    message =
      levelNames[unit.level] +
      " ya " +
      unit.name_kiny +
      " nta rwego rukurikiyeho mu hierarchy. " +
      (parent
        ? "Iherereye muri " + levelNames[parent.level].toLowerCase() + " ya " + parent.name_kiny + "."
        : "");
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
