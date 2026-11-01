const PROJECT_REF = "buexgewxypvkqmphvfec";
const DISTRICT_NAMES = ["Nyarugenge", "Nyamasheke", "Musanze"];

async function rest(table, query) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (base !== `https://${PROJECT_REF}.supabase.co` || !key) {
    throw new Error("Refusing REST access: project URL/key is not the allow-listed project.");
  }
  const url = new URL(`/rest/v1/${table}`, base);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${table} REST HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${table} REST did not return an array.`);
  return rows;
}

export async function loadTruthRows() {
  const districts = await rest("boundaries", {
    select: "scope_code,name_kiny,level",
    level: "eq.district",
    valid_to: "is.null",
    name_kiny: `in.(${DISTRICT_NAMES.join(",")})`,
  });
  const byName = new Map(districts.map(row => [row.name_kiny, row]));
  for (const name of DISTRICT_NAMES) {
    if (!byName.has(name)) throw new Error(`District ${name} was not found in active public.boundaries.`);
  }

  const output = [];
  for (const name of DISTRICT_NAMES) {
    const district = byName.get(name);
    const rows = await rest("w2_truth_samples", {
      select: "district_scope_code,seed,idx,lng,lat,true_village_scope_code,kind",
      district_scope_code: `eq.${district.scope_code}`,
      seed: "eq.20261030",
      kind: "eq.interior",
      order: "idx.asc",
      limit: "25",
    });
    if (rows.length !== 25) throw new Error(`${name}: expected 25 truth rows, got ${rows.length}.`);
    const prefixes = new Set();
    for (const row of rows) {
      const parts = row.true_village_scope_code.split("-");
      if (parts.length !== 6 || parts[0] !== "RW" || !parts[5].startsWith("V")) {
        throw new Error(`${name}: invalid true village scope code ${row.true_village_scope_code}.`);
      }
      for (let size = 2; size <= 6; size += 1) prefixes.add(parts.slice(0, size).join("-"));
    }
    const ancestorRows = await rest("boundaries", {
      select: "scope_code,name_kiny,name_eng,level",
      scope_code: `in.(${Array.from(prefixes).join(",")})`,
      valid_to: "is.null",
    });
    const ancestors = new Map(ancestorRows.map(row => [row.scope_code, row]));
    for (const row of rows) {
      const codes = row.true_village_scope_code.split("-");
      const chain = {};
      for (let size = 2; size <= 6; size += 1) {
        const code = codes.slice(0, size).join("-");
        const ancestor = ancestors.get(code);
        if (!ancestor) throw new Error(`${name}: ancestor ${code} is missing.`);
        chain[ancestor.level] = { scope_code: code, name: ancestor.name_kiny };
      }
      output.push({
        district: name,
        district_scope_code: district.scope_code,
        idx: row.idx,
        latitude: Number(row.lat),
        longitude: Number(row.lng),
        true_village_scope_code: row.true_village_scope_code,
        chain,
      });
    }
  }
  return output;
}
