import { registryDbError, registryJson } from "@/lib/leaders/registry-api";

/** Database errors for the office functions; 22023 is "your input is not allowed" (raised on purpose). */
export function officeDbError(error: { code?: string; message?: string }, fallbackKiny: string) {
  if (error.code === "22023") {
    return registryJson({ status: "error", code: "NOT_ALLOWED", message_kiny: "Ibyo wasabye ntibyemewe cyangwa nta wo bigenewe uhari." }, 422);
  }
  return registryDbError(error, fallbackKiny);
}

/** Safe integer query parameter (bounded), for paging. */
export function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Scope codes look like RW, RW-P1, RW-P1-D11 ... Anything else is refused before it reaches the database. */
export const SCOPE_CODE = /^RW(-[A-Za-z0-9]{1,12}){0,5}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
