import data from "@/data/places.json";

/**
 * Named places of Rwanda from OpenStreetMap (cities, towns, suburbs, hospitals, markets, bus stations, stadiums...).
 * One small file, searched on the server and usable offline later. Built by scripts/gazetteer/build_places.py.
 */
type Raw = { cats: string[]; p: [string, number, number, number, string][] };
const raw = data as unknown as Raw;

const NOISE = /^(umujyi wa|intara y'|intara y|akarere ka|umurenge wa|akagari ka|umudugudu wa)\s+/;

export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’`]/g, "'").replace(/\s+/g, " ").trim().replace(NOISE, "");
}

/** Kinyarwanda names for what a place is. */
export const KIND_LABEL: Record<string, string> = {
  city: "Umujyi", town: "Umujyi muto", suburb: "Agace", neighbourhood: "Agace", quarter: "Agace",
  aerodrome: "Ikibuga cy'indege", hospital: "Ivuriro", university: "Kaminuza", college: "Ishuri",
  stadium: "Sitade", bus_station: "Sitasiyo y'imodoka", marketplace: "Isoko", townhall: "Ibiro by'ubuyobozi",
  museum: "Inzu ndangamurage", attraction: "Ahantu nyaburanga", viewpoint: "Ahantu hareba neza",
  hotel: "Hoteli", guest_house: "Inzu y'abashyitsi", peak: "Impinga", lake: "Ikiyaga",
};

type Entry = { name: string; key: string; alts: string[]; cat: string; lat: number; lng: number };
let entries: Entry[] | null = null;

function all(): Entry[] {
  if (!entries) {
    entries = raw.p.map((row) => ({
      name: row[0], key: fold(row[0]), alts: row[4] ? row[4].split("|").map(fold) : [],
      cat: raw.cats[row[1]], lat: row[2], lng: row[3],
    }));
  }
  return entries;
}

/** Where a kind of place sits next to the administrative levels (province 0, district 1, sector 2, cell 3, village 4). */
function kindRank(cat: string): number {
  if (cat === "city" || cat === "town") return 1;
  if (cat === "suburb") return 2;
  if (cat === "neighbourhood" || cat === "quarter") return 3.2;
  if (["stadium", "bus_station", "university", "hospital", "aerodrome", "marketplace", "townhall", "museum", "attraction"].includes(cat)) return 3.5;
  return 4.5;
}

/** 0 exact, 1 starts with, 2 every typed word starts a word of the name, null no match. */
function textTier(name: string, needle: string): number | null {
  if (name === needle) return 0;
  if (name.startsWith(needle)) return 1;
  const words = name.split(/[\s\-\/(),]+/);
  const typed = needle.split(" ");
  return typed.every((token) => words.some((word) => word.startsWith(token))) ? 2 : null;
}

export type PlaceHit = {
  scope_code: string; name_kiny: string; name_eng: null; level: string; full_path: string;
  lat: number; lng: number; key: number;
};

export function searchGazetteer(query: string, limit = 6): PlaceHit[] {
  const needle = fold(query);
  if (needle.length < 2) return [];
  const hits: PlaceHit[] = [];
  all().forEach((entry, index) => {
    let tier = textTier(entry.key, needle);
    for (const alt of entry.alts) {
      const alternative = textTier(alt, needle);
      if (alternative !== null && (tier === null || alternative < tier)) tier = alternative;
    }
    if (tier === null) return;
    hits.push({
      scope_code: "poi:" + index, name_kiny: entry.name, name_eng: null, level: entry.cat,
      full_path: KIND_LABEL[entry.cat] ?? "", lat: entry.lat, lng: entry.lng, key: tier * 10 + kindRank(entry.cat),
    });
  });
  return hits.sort((a, b) => a.key - b.key || a.name_kiny.length - b.name_kiny.length).slice(0, limit);
}

/** The middle of the town that carries the name of a district or province (Huye, Musanze, Kigali), where people actually go. */
export function townCentre(name: string, level: string): { lat: number; lng: number } | null {
  if (level !== "province" && level !== "district") return null;
  const target = fold(name);
  let best: Entry | null = null;
  for (const entry of all()) {
    if (entry.key !== target || (entry.cat !== "city" && entry.cat !== "town")) continue;
    if (!best || (best.cat === "town" && entry.cat === "city")) best = entry;
  }
  return best ? { lat: best.lat, lng: best.lng } : null;
}
