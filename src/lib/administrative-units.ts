export type AdministrativeLevel = "province" | "district" | "sector" | "cell" | "village";

export type AdministrativeUnitChoice = {
  id: string;
  code: string;
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: AdministrativeLevel;
  parent_id: string | null;
};

type IndexChoice = {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: AdministrativeLevel;
  parent_scope_code: string | null;
};

const ALLOWED_LEVELS = new Set<AdministrativeLevel>([
  "province",
  "district",
  "sector",
  "cell",
  "village",
]);

function normaliseName(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

function parseIndex(payload: unknown): IndexChoice[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): IndexChoice[] => {
    if (!Array.isArray(entry) || entry.length < 5) return [];
    const scope_code = String(entry[0] ?? "");
    const name_kiny = String(entry[1] ?? "");
    const level = String(entry[3]) as AdministrativeLevel;
    const parent_scope_code = entry[4] == null ? null : String(entry[4]);
    if (
      !/^RW(?:-[0-9A-Z]+)*$/.test(scope_code) ||
      !name_kiny ||
      !ALLOWED_LEVELS.has(level) ||
      (level === "province" ? parent_scope_code !== null : !parent_scope_code)
    ) return [];
    return [{
      scope_code,
      name_kiny,
      name_eng: entry[2] == null ? null : String(entry[2]),
      level,
      parent_scope_code,
    }];
  });
}

/**
 * Reads the bundled NISR administrative index without a database round trip.
 * id/parent_id use canonical scope codes, so the picker works during Supabase
 * outages and doesn't depend on UUID lookups for the parent chain.
 */
export function getAdministrativeUnitChoices(
  payload: unknown,
  level: AdministrativeLevel,
  parentScopeCode = "",
  searchTerm = "",
): AdministrativeUnitChoice[] {
  if (!ALLOWED_LEVELS.has(level)) return [];
  if (level === "province" && parentScopeCode) return [];
  if (level !== "province" && !/^RW(?:-[0-9A-Z]+){1,4}$/.test(parentScopeCode)) return [];

  const query = normaliseName(searchTerm.trim());
  return parseIndex(payload)
    .filter((choice) => choice.level === level)
    .filter((choice) => level === "province" || choice.parent_scope_code === parentScopeCode)
    .filter((choice) => !query || normaliseName(choice.name_kiny).includes(query) ||
      normaliseName(choice.name_eng ?? "").includes(query))
    .sort((a, b) => a.name_kiny.localeCompare(b.name_kiny, "rw"))
    .map((choice) => ({
      id: choice.scope_code,
      code: choice.scope_code,
      scope_code: choice.scope_code,
      name_kiny: choice.name_kiny,
      name_eng: choice.name_eng,
      level: choice.level,
      parent_id: choice.parent_scope_code,
    }));
}
