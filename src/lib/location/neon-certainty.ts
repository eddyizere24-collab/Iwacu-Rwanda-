/**
 * Calls certainty_lookup_v1 on the separate Neon database ("iwacu-icyizere") through
 * Neon's HTTP SQL endpoint. Returns the same { data, error } shape as supabase.rpc so
 * the caller's validation (isCertaintyLookupResult) stays the single gate.
 */
export function isNeonCertaintyConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(neonEndpoint(env.NEON_ICYIZERE_DATABASE_URL));
}

function neonEndpoint(connectionString: string | undefined): string | null {
  if (!connectionString) return null;
  try {
    const host = new URL(connectionString).hostname;
    return host.endsWith(".neon.tech") ? `https://${host}/sql` : null;
  } catch {
    return null;
  }
}

export async function neonCertaintyLookup(
  lng: number,
  lat: number,
  accuracyM: number,
  signal: AbortSignal,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const connectionString = env.NEON_ICYIZERE_DATABASE_URL;
  const endpoint = neonEndpoint(connectionString);
  if (!connectionString || !endpoint) return { data: null, error: { message: "neon_not_configured" } };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Neon-Connection-String": connectionString },
      body: JSON.stringify({
        query: "SELECT public.certainty_lookup_v1($1::double precision,$2::double precision,$3::double precision) AS r",
        params: [lng, lat, accuracyM],
      }),
      signal,
      cache: "no-store",
    });
    if (!res.ok) return { data: null, error: { message: `neon_http_${res.status}` } };
    const body = (await res.json()) as { rows?: Array<{ r?: unknown }> };
    const value = body.rows?.[0]?.r;
    return { data: typeof value === "string" ? JSON.parse(value) : value ?? null, error: null };
  } catch {
    return { data: null, error: { message: "neon_unreachable" } };
  }
}
