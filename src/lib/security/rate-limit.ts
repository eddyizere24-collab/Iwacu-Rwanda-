/**
 * IWACU RWANDA — Rate Limiter Adapter
 *
 * Production: Upstash Redis REST API (shared across all serverless instances)
 * Development / fallback: in-memory sliding window (Map)
 */

const store = new Map<string, number[]>();

export async function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now(),
  options: { failClosed?: boolean } = {}
): Promise<boolean> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
      const redisKey = `iwacu:ratelimit:${key}`;

      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSec, "NX"],
        ]),
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as Array<{ result?: number }>;
        const requestCount = Number(data?.[0]?.result ?? 0);
        return requestCount > maxRequests;
      }
      console.warn("[rate-limit] Upstash HTTP", res.status);
    } catch (err) {
      console.warn("[rate-limit] Upstash failed:", err instanceof Error ? err.message : "unknown");
    }
    if (options.failClosed) return true;
  } else if (options.failClosed && process.env.NODE_ENV === "production") {
    return true;
  }

  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) {
    store.set(key, recent);
    return true;
  }
  recent.push(now);
  store.set(key, recent);

  if (store.size > 5000) {
    for (const [k, timestamps] of store) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length) store.set(k, active);
      else store.delete(k);
    }
  }
  return false;
}

/** Convenience wrapper: window in seconds (used by API routes). Returns true if limited. */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  return isRateLimited(key, maxRequests, windowSeconds * 1000);
}

export function clientIp(req: Request): string {
  const h = req.headers;
  const trusted = process.env.TRUSTED_IP_HEADER?.toLowerCase();
  const candidates = [trusted, "x-vercel-forwarded-for", "cf-connecting-ip", "x-real-ip"].filter(Boolean) as string[];
  for (const name of candidates) {
    const v = h.get(name)?.split(",")[0]?.trim();
    if (v) return v;
  }
  const xff = h.get("x-forwarded-for")?.split(",").map((x) => x.trim()).filter(Boolean);
  return xff?.[xff.length - 1] || "unknown";
}
