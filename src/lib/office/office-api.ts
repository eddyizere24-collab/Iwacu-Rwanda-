import { registryDbError, registryJson } from "@/lib/leaders/registry-api";

/** Database errors for the office functions; 22023 is "your input is not allowed" (raised on purpose). */
export function officeDbError(error: { code?: string; message?: string }, fallbackKiny: string) {
  if (error.code === "22023") {
    return registryJson({ status: "error", code: "NOT_ALLOWED", message_kiny: "Ibyo wasabye ntibyemewe cyangwa nta wo bigenewe uhari." }, 422);
  }
  return registryDbError(error, fallbackKiny);
}
