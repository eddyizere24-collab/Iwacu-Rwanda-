import type { LocateSuccess } from "@/types/location";
import { getLocationDisplayPath } from "@/lib/location-display-path";

export interface LocationNotificationTarget {
  key: string;
  body: string;
}

/**
 * Build a notification identity from evidence-supported administrative levels only.
 * Estimates below the engine's selected level are intentionally excluded.
 */
export function getLocationNotificationTarget(
  data: LocateSuccess | null | undefined
): LocationNotificationTarget | null {
  if (!data?.level || data.level === "country") return null;

  const supportedPath = getLocationDisplayPath(data.hierarchy, data.level)
    .filter((item) => item.kind === "supported");

  if (supportedPath.length === 0) return null;

  return {
    key: supportedPath.map((item) => item.scope_code).join("/"),
    body: `Ubu uri: ${supportedPath.map((item) => `${item.label}: ${item.name_kiny}`).join(" · ")}.`,
  };
}
