import type { AdministrativeLevel } from "@/lib/administrative-units";

/**
 * One search across every level (villages, cells, sectors, districts, provinces) over the bundled NISR index.
 * Every place that carries the typed name is returned, with the places above it, so people can tell the
 * Gihembe in the north from the Gihembe in the south. No database, no personal data: only the typed words.
 */
export type SearchAncestor = { scope_code: string; name_kiny: string; name_eng: string | null; level: AdministrativeLevel };
export type SearchUnit = SearchAncestor & {
  lat: number | null;
  lng: number | null;
  path: SearchAncestor[];
  /** 0 exact name, 1 starts with, 2 every word starts a word, 3 contains, 4 spelled almost the same. */
  tier: number;
};
export type SearchResult = { total: number; units: SearchUnit[] };

type Row = {
  scope: string; kiny: string; eng: string | null; level: AdministrativeLevel; lat: number | null; lng: number | null;
  parent: string | null; nk: string; ne: string; wk: string[]; we: string[];
};

const LEVELS: AdministrativeLevel[] = ["province", "district", "sector", "cell", "village"];
const LEVEL_ORDER: Record<AdministrativeLevel, number> = { province: 0, district: 1, sector: 2, cell: 3, village: 4 };
const LEVEL_WORDS: Record<string, AdministrativeLevel> = {
  intara: "province", intara4: "province", akarere: "district", uturere: "district", umurenge: "sector", imirenge: "sector",
  akagari: "cell", utugari: "cell", umudugudu: "village", imidugudu: "village",
};
const NOISE_WORDS = new Set(["wa", "ka", "y", "ya", "mu", "umujyi"]);
/** Large enough to hold every place that shares one exact name (the most common, Kabeza, is 172 places). */
const MAX_RESULTS = 250;

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function words(text: string): string[] {
  return fold(text).split(/[^a-z0-9]+/).filter(Boolean);
}

/** "Umujyi wa Kigali" and "Intara y'Amajyaruguru" are found by "Kigali" and "Amajyaruguru". */
function bareWords(list: string[]): string[] {
  let start = 0;
  while (start < list.length - 1 && (NOISE_WORDS.has(list[start]) || LEVEL_WORDS[list[start]])) start += 1;
  return list.slice(start);
}

const indexCache = new WeakMap<object, Map<string, Row>>();

function indexOf(payload: unknown): Map<string, Row> {
  const cached = typeof payload === "object" && payload ? indexCache.get(payload) : undefined;
  if (cached) return cached;
  const rows = new Map<string, Row>();
  const raw = (payload as { choices?: unknown } | null)?.choices;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!Array.isArray(entry) || entry.length < 5) continue;
      const scope = String(entry[0] ?? "");
      const kiny = String(entry[1] ?? "");
      const level = String(entry[3]) as AdministrativeLevel;
      if (!/^RW(?:-[0-9A-Z]+)*$/.test(scope) || !kiny || !LEVELS.includes(level)) continue;
      const eng = entry[2] == null ? null : String(entry[2]);
      const lat = typeof entry[5] === "number" && Number.isFinite(entry[5]) ? entry[5] : null;
      const lng = typeof entry[6] === "number" && Number.isFinite(entry[6]) ? entry[6] : null;
      const wk = bareWords(words(kiny));
      const we = eng ? bareWords(words(eng)) : [];
      rows.set(scope, {
        scope, kiny, eng, level, lat, lng, parent: entry[4] == null ? null : String(entry[4]),
        nk: wk.join(" "), ne: we.join(" "), wk, we,
      });
    }
  }
  if (typeof payload === "object" && payload) indexCache.set(payload, rows);
  return rows;
}

function ancestorsOf(row: Row, rows: Map<string, Row>): Row[] {
  const chain: Row[] = [];
  let parent = row.parent ? rows.get(row.parent) : undefined;
  for (let guard = 0; parent && guard < 6; guard += 1) {
    if (parent.scope === "RW") break;
    chain.unshift(parent);
    parent = parent.parent ? rows.get(parent.parent) : undefined;
  }
  return chain;
}

/** Spelled the same but for one slip (an added, missing, changed or swapped letter). */
function nearlyEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 4) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

function tierFor(row: Row, own: string[], fuzzy: boolean): number | null {
  const typed = own.join(" ");
  for (const name of [row.nk, row.ne]) {
    if (name && name === typed) return 0;
  }
  for (const name of [row.nk, row.ne]) {
    if (name && name.startsWith(typed)) return 1;
  }
  for (const list of [row.wk, row.we]) {
    if (list.length && own.every((token) => list.some((word) => word.startsWith(token)))) return 2;
  }
  for (const name of [row.nk, row.ne]) {
    if (name && typed.length >= 3 && name.includes(typed)) return 3;
  }
  if (fuzzy) {
    for (const list of [row.wk, row.we]) {
      if (list.length && own.every((token) => list.some((word) => nearlyEqual(word, token)))) return 4;
    }
  }
  return null;
}

export function searchAdministrativeUnits(payload: unknown, query: string, limit = MAX_RESULTS): SearchResult {
  const rows = indexOf(payload);
  let hint: AdministrativeLevel | null = null;
  const tokens: string[] = [];
  for (const word of words(query.slice(0, 80))) {
    if (NOISE_WORDS.has(word)) continue;
    const level = LEVEL_WORDS[word];
    if (level) { hint = level; continue; }
    tokens.push(word);
  }
  if (tokens.length === 0 && !hint) return { total: 0, units: [] };

  const hits: Array<{ row: Row; tier: number }> = [];
  const attempt = (fuzzy: boolean) => {
    hits.length = 0;
    for (const row of rows.values()) {
      if (tokens.length === 0) {
        if (row.level === hint) hits.push({ row, tier: 0 });
        continue;
      }
      // Words that match the place's own name; the others must match a place above it ("gihembe burera").
      const own = tokens.filter((token) => row.wk.some((w) => w.startsWith(token)) || row.we.some((w) => w.startsWith(token)) ||
        (token.length >= 3 && (row.nk.includes(token) || row.ne.includes(token))) ||
        (fuzzy && (row.wk.some((w) => nearlyEqual(w, token)) || row.we.some((w) => nearlyEqual(w, token)))));
      if (own.length === 0) continue;
      const rest = tokens.filter((token) => !own.includes(token));
      if (rest.length > 0) {
        const above = ancestorsOf(row, rows).map((a) => a.wk.concat(a.we)).flat();
        if (!rest.every((token) => above.some((word) => word.startsWith(token)))) continue;
      }
      const tier = tierFor(row, own, fuzzy);
      if (tier !== null) hits.push({ row, tier });
    }
  };
  attempt(false);
  if (hits.length < 3 && tokens.length > 0) attempt(true);
  // Extra words that name nothing above (a wrong district, say) must not hide the places with the first word's name.
  if (hits.length === 0 && tokens.length > 1) {
    tokens.splice(1);
    attempt(false);
  }

  hits.sort((a, b) =>
    a.tier - b.tier ||
    Number(hint !== null && b.row.level === hint) - Number(hint !== null && a.row.level === hint) ||
    LEVEL_ORDER[a.row.level] - LEVEL_ORDER[b.row.level] ||
    a.row.kiny.localeCompare(b.row.kiny, "rw") || a.row.scope.localeCompare(b.row.scope));

  const units = hits.slice(0, Math.max(1, Math.min(limit, MAX_RESULTS))).map(({ row, tier }): SearchUnit => ({
    scope_code: row.scope, name_kiny: row.kiny, name_eng: row.eng, level: row.level, lat: row.lat, lng: row.lng, tier,
    path: ancestorsOf(row, rows).map((a) => ({ scope_code: a.scope, name_kiny: a.kiny, name_eng: a.eng, level: a.level })),
  }));
  return { total: hits.length, units };
}

/** Metres between two points; plenty accurate for ordering places by how close they are. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Best match first. Among places with the same kind of match: provinces and districts first, then the ones inside
 * the area being browsed, then the nearest to the person (when their position is known), otherwise the larger areas first.
 */
export function orderForPerson(
  units: SearchUnit[],
  position: { lat: number; lng: number } | null,
  insideScope = "",
): Array<SearchUnit & { meters: number | null }> {
  return units
    .map((unit) => ({
      ...unit,
      meters: position && unit.lat !== null && unit.lng !== null ? distanceMeters(position, { lat: unit.lat, lng: unit.lng }) : null,
    }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      // A named province or district is what people usually mean by its name; below that, nearest first.
      const large = (u: SearchUnit) => (u.level === "province" || u.level === "district" ? 0 : 1);
      if (large(a) !== large(b)) return large(a) - large(b);
      const inside = (u: SearchUnit) => (insideScope && (u.scope_code === insideScope || u.scope_code.startsWith(insideScope + "-")) ? 0 : 1);
      if (inside(a) !== inside(b)) return inside(a) - inside(b);
      if (a.meters !== null && b.meters !== null && a.meters !== b.meters) return a.meters - b.meters;
      return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.name_kiny.localeCompare(b.name_kiny, "rw");
    });
}
