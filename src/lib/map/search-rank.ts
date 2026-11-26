const LEVEL_RANK: Record<string, number> = { province: 0, district: 1, sector: 2, cell: 3, village: 4 };
const NOISE = /^(umujyi wa|intara y'|intara y|akarere ka|umurenge wa|akagari ka|umudugudu wa)\s+/;

function plain(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’`]/g, "'").replace(/\s+/g, " ").trim().replace(NOISE, "");
}

/** Sort key for one name: how well it matches what was typed, then how big a place it is. Lower comes first. */
export function rankKey(name: string, level: string, query: string): number {
  const needle = plain(query);
  const text = plain(name);
  return (text === needle ? 0 : text.startsWith(needle) ? 1 : 2) * 10 + (LEVEL_RANK[level] ?? 5);
}

/** What a person means by a bare name: the city or province first, then districts, sectors, cells, and only then the many villages that share it. */
export function rankForMap<T extends { name_kiny: string; level: string }>(rows: T[], query: string): T[] {
  const needle = plain(query);
  const score = (row: T) => {
    const name = plain(row.name_kiny);
    const text = name === needle ? 0 : name.startsWith(needle) ? 1 : 2;
    return text * 10 + (LEVEL_RANK[row.level] ?? 5);
  };
  return rows.map((row, index) => ({ row, index, key: score(row) })).sort((a, b) => a.key - b.key || a.index - b.index).map((item) => item.row);
}
