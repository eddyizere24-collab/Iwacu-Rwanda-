import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { neonSqlEndpoint, parseCopyParams, tokenMatches } from "@/lib/icyizere/copy-params";

/**
 * TEMPORARY one-off route: copies current rows of public.boundaries (read only on
 * Supabase) into the separate Neon database "iwacu-icyizere". Delete after use.
 * Returns 404 unless both ICYIZERE_COPY_TOKEN and NEON_ICYIZERE_DATABASE_URL are set.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COLUMNS =
  "id,scope_code,path::text,name_kiny,name_eng,level,parent_id,valid_from,valid_to,created_at,updated_at,version,geom,area_m2";

const UPSERT = `INSERT INTO public.boundaries
  (id,scope_code,path,name_kiny,name_eng,level,parent_id,valid_from,valid_to,created_at,updated_at,version,geom,area_m2)
  VALUES ($1,$2,$3,$4,$5,$6::public.boundary_level,$7,$8,$9,$10,$11,$12,
    extensions.ST_Multi(extensions.ST_SetSRID(extensions.ST_GeomFromEWKB(decode($13,'hex')),4326)),$14)
  ON CONFLICT (id) DO UPDATE SET scope_code=EXCLUDED.scope_code,path=EXCLUDED.path,name_kiny=EXCLUDED.name_kiny,
    name_eng=EXCLUDED.name_eng,level=EXCLUDED.level,parent_id=EXCLUDED.parent_id,valid_from=EXCLUDED.valid_from,
    valid_to=EXCLUDED.valid_to,updated_at=EXCLUDED.updated_at,version=EXCLUDED.version,geom=EXCLUDED.geom,area_m2=EXCLUDED.area_m2`;

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });
const fail = (stage: string, detail?: string) =>
  NextResponse.json({ error: "copy_failed", stage, detail: detail?.slice(0, 300) }, { status: 500 });

export async function GET(request: Request) {
  const expectedToken = process.env.ICYIZERE_COPY_TOKEN;
  const neonUrl = process.env.NEON_ICYIZERE_DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedToken || !neonUrl) return notFound();

  const search = new URL(request.url).searchParams;
  if (!tokenMatches(expectedToken, search.get("token"))) return notFound();
  const parsed = parseCopyParams(search);
  const endpoint = neonSqlEndpoint(neonUrl);
  if (!parsed || !endpoint || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const started = Date.now();
  let offset = parsed.offset;
  let copied = 0;
  let done = false;
  let total: number | null = null;

  try {
    const { count } = await supabase
      .from("boundaries")
      .select("id", { count: "exact", head: true })
      .eq("level", parsed.level)
      .is("valid_to", null);
    total = count ?? null;

    while (Date.now() - started < 45_000) {
      const { data, error } = await supabase
        .from("boundaries")
        .select(COLUMNS)
        .eq("level", parsed.level)
        .is("valid_to", null)
        .order("id", { ascending: true })
        .range(offset, offset + parsed.limit - 1);
      if (error) return fail("supabase_read", error.message);
      const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        done = true;
        break;
      }
      const queries = rows.map((r) => ({
        query: UPSERT,
        params: [
          r.id, r.scope_code, r.path, r.name_kiny, r.name_eng ?? null, r.level, r.parent_id ?? null,
          r.valid_from, r.valid_to ?? null, r.created_at, r.updated_at, r.version,
          String(r.geom ?? "").replace(/^\\x/, ""), r.area_m2 ?? null,
        ],
      }));
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Neon-Connection-String": neonUrl },
        body: JSON.stringify({ queries }),
      });
      if (!res.ok) return fail("neon_write", `${res.status} ${await res.text()}`);
      copied += rows.length;
      offset += rows.length;
      if (rows.length < parsed.limit) {
        done = true;
        break;
      }
    }
  } catch (e) {
    return fail("exception", e instanceof Error ? e.message : "unknown");
  }

  return NextResponse.json({
    level: parsed.level,
    copied_in_this_call: copied,
    next_offset: offset,
    done,
    total_for_level: total,
  });
}
