import { timingSafeEqual } from "node:crypto";

export const COPY_LEVELS = ["country", "province", "district", "sector", "cell", "village"] as const;
export type CopyLevel = (typeof COPY_LEVELS)[number];

export const MAX_COPY_LIMIT = 200;
export const DEFAULT_COPY_LIMIT = 25;

export function tokenMatches(expected: string | undefined, provided: string | null): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCopyParams(
  params: URLSearchParams,
): { level: CopyLevel; offset: number; limit: number } | null {
  const level = params.get("level");
  if (!level || !(COPY_LEVELS as readonly string[]).includes(level)) return null;
  const offset = Number(params.get("offset") ?? "0");
  if (!Number.isInteger(offset) || offset < 0) return null;
  const rawLimit = Number(params.get("limit") ?? String(DEFAULT_COPY_LIMIT));
  if (!Number.isInteger(rawLimit) || rawLimit < 1) return null;
  return { level: level as CopyLevel, offset, limit: Math.min(rawLimit, MAX_COPY_LIMIT) };
}

/** Neon serverless HTTP endpoint derived from a connection string (no secret is returned). */
export function neonSqlEndpoint(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    if (!url.hostname.endsWith(".neon.tech")) return null;
    return `https://${url.hostname}/sql`;
  } catch {
    return null;
  }
}
