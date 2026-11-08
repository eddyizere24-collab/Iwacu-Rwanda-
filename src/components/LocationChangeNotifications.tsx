"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import type { LocateSuccess } from "@/types/location";
import type { LocationStatus } from "@/hooks/useLocation";
import {
  distanceBetweenFixesMeters,
  findNearestVillageBoundary,
  getChangedAdministrativeLevels,
  getCrossedApproachThreshold,
  getAdministrativeLevelLabel,
  type VillageBoundaryFeature,
} from "@/lib/geofence-monitor";
import { getLocationNotificationTarget } from "@/lib/location-notifications";

const INDEX_URL = "/offline/location-index.json";
const WELCOME_STORAGE_KEY = "iwacu-location-welcome-date-v1";
const REQUEST_PERMISSION_EVENT = "iwacu:request-notifications";

type PermissionState = NotificationPermission | "unsupported";
type IndexItem = {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: string;
  parent_scope_code: string | null;
};
type CachedBoundaries = {
  latitude: number;
  longitude: number;
  fetchedAt: number;
  features: VillageBoundaryFeature[];
};
type StableVillage = { code: string | null; count: number };

let indexPromise: Promise<Map<string, IndexItem>> | null = null;

function loadLocationIndex(): Promise<Map<string, IndexItem>> {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("location_index_unavailable");
        const payload = await response.json() as { choices?: unknown[] };
        const rows = Array.isArray(payload.choices) ? payload.choices : [];
        const result = new Map<string, IndexItem>();
        for (const raw of rows) {
          let item: IndexItem | null = null;
          if (Array.isArray(raw) && raw.length >= 5) {
            item = {
              scope_code: String(raw[0]),
              name_kiny: String(raw[1]),
              name_eng: raw[2] == null ? null : String(raw[2]),
              level: String(raw[3]),
              parent_scope_code: raw[4] == null ? null : String(raw[4]),
            };
          } else if (raw && typeof raw === "object") {
            const row = raw as Record<string, unknown>;
            if (typeof row.scope_code === "string" && typeof row.name_kiny === "string") {
              item = {
                scope_code: row.scope_code,
                name_kiny: row.name_kiny,
                name_eng: typeof row.name_eng === "string" ? row.name_eng : null,
                level: typeof row.level === "string" ? row.level : "",
                parent_scope_code: typeof row.parent_scope_code === "string" ? row.parent_scope_code : null,
              };
            }
          }
          if (item) result.set(item.scope_code, item);
        }
        return result;
      })
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
}

function getTargetPathNames(
  scopeCode: string,
  index: Map<string, IndexItem>
): Array<{ level: string; name: string }> {
  const parts = scopeCode.split("-");
  const prefixes = [
    { level: "province", count: 2 },
    { level: "district", count: 3 },
    { level: "sector", count: 4 },
    { level: "cell", count: 5 },
    { level: "village", count: 6 },
  ];
  return prefixes.flatMap(({ level, count }) => {
    if (parts.length < count) return [];
    const item = index.get(parts.slice(0, count).join("-"));
    return item?.name_kiny ? [{ level, name: item.name_kiny }] : [];
  });
}

function getTargetPathText(
  scopeCode: string,
  index: Map<string, IndexItem>,
  fallbackVillage: string
): string {
  const path = getTargetPathNames(scopeCode, index);
  if (!path.some((item) => item.level === "village")) {
    path.push({ level: "village", name: fallbackVillage });
  }
  return path
    .map((item) => `${getAdministrativeLevelLabel(item.level as never)}: ${item.name}`)
    .join(" · ");
}

async function getNearbyBoundaries(
  latitude: number,
  longitude: number,
  cache: CachedBoundaries | null
): Promise<{ features: VillageBoundaryFeature[]; cache: CachedBoundaries }> {
  if (
    cache &&
    Date.now() - cache.fetchedAt < 5 * 60_000 &&
    distanceBetweenFixesMeters(cache.latitude, cache.longitude, latitude, longitude) < 1_000
  ) {
    return { features: cache.features, cache };
  }

  const deltaLat = 0.022;
  const deltaLon = 0.024;
  const query = new URLSearchParams({
    west: String(Math.max(28.7001, longitude - deltaLon)),
    south: String(Math.max(-2.9999, latitude - deltaLat)),
    east: String(Math.min(31.0999, longitude + deltaLon)),
    north: String(Math.min(-0.8001, latitude + deltaLat)),
  });
  const response = await fetch("/api/location-map?" + query.toString(), { cache: "no-store" });
  if (!response.ok) throw new Error("village_boundaries_unavailable");
  const payload = await response.json() as { features?: VillageBoundaryFeature[] };
  const features = Array.isArray(payload.features) ? payload.features : [];
  const nextCache = { latitude, longitude, fetchedAt: Date.now(), features };
  return { features, cache: nextCache };
}

async function showPersistentNotification(title: string, body: string, tag: string): Promise<void> {
  if (!("serviceWorker" in navigator) || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag,
    data: { url: "/" },
  });
}

interface LocationChangeNotificationsProps {
  data: LocateSuccess | null;
  status: LocationStatus;
}

export function LocationChangeNotifications({ data, status }: LocationChangeNotificationsProps) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [notice, setNotice] = useState("");
  const permissionGranted = permission === "granted";
  const target = useMemo(() => getLocationNotificationTarget(data), [data]);

  const boundaryCacheRef = useRef<CachedBoundaries | null>(null);
  const previousFixRef = useRef<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const lastBoundaryDistancesRef = useRef(new Map<string, number>());
  const sentMilestonesRef = useRef(new Set<string>());
  const stableVillageRef = useRef<StableVillage | null>(null);
  const confirmedVillageRef = useRef<string | null>(null);
  const latestRequestRef = useRef(0);
  const lastFixKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      !window.isSecureContext ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setPermission("unsupported");
      return;
    }

    const refreshPermission = () => setPermission(Notification.permission);
    refreshPermission();

    const requestPermission = () => {
      if (Notification.permission === "granted" || Notification.permission === "denied") {
        refreshPermission();
        return;
      }
      // Dispatched synchronously from the first location confirmation tap.
      void Notification.requestPermission().then((result) => {
        setPermission(result);
        if (result !== "granted") {
          setNotice("Chrome ntiyemereye ubutumwa. Reba Site settings → Notifications.");
        }
      }).catch(() => setPermission(Notification.permission));
    };

    window.addEventListener(REQUEST_PERMISSION_EVENT, requestPermission);
    return () => window.removeEventListener(REQUEST_PERMISSION_EVENT, requestPermission);
  }, []);

  // Welcome the person after the first location has been resolved.
  useEffect(() => {
    if (!permissionGranted || status !== "success" || !target) return;
    let lastWelcomed = "";
    try {
      lastWelcomed = window.localStorage.getItem(WELCOME_STORAGE_KEY) ?? "";
    } catch {
      // Continue without persistent deduplication if storage is unavailable.
    }
    const today = new Date().toISOString().slice(0, 10);
    if (lastWelcomed === today) return;

    void showPersistentNotification(
      "IWACU RWANDA — Murakaza neza",
      `Murakaza neza! ${target.body}`,
      "iwacu-location-welcome"
    ).then(() => {
      try {
        window.localStorage.setItem(WELCOME_STORAGE_KEY, today);
      } catch {
        // Ignore storage restrictions after the notification has been shown.
      }
    }).catch(() => setNotice("Ubutumwa bwo kukwakira ntibwashoboye kugaragara."));
  }, [permissionGranted, status, target]);

  // Use the official village polygons to calculate approach and entry notifications.
  useEffect(() => {
    if (
      !permissionGranted ||
      status !== "success" ||
      !data ||
      (data.source !== "gps" && data.source !== "network") ||
      !Number.isFinite(data.latitude) ||
      !Number.isFinite(data.longitude)
    ) return;

    const latitude = data.latitude as number;
    const longitude = data.longitude as number;
    const accuracy = Number.isFinite(data.accuracy_m) ? Number(data.accuracy_m) : 50_000;
    const fixKey = `${latitude.toFixed(6)}:${longitude.toFixed(6)}:${accuracy.toFixed(1)}`;
    if (lastFixKeyRef.current === fixKey) return;
    lastFixKeyRef.current = fixKey;

    const previousFix = previousFixRef.current;
    if (
      previousFix &&
      distanceBetweenFixesMeters(previousFix.latitude, previousFix.longitude, latitude, longitude) <
        Math.max(5, Math.min(25, accuracy * 0.2))
    ) return;

    const requestId = ++latestRequestRef.current;
    void (async () => {
      try {
        const { features, cache } = await getNearbyBoundaries(
          latitude,
          longitude,
          boundaryCacheRef.current
        );
        if (requestId !== latestRequestRef.current) return;
        boundaryCacheRef.current = cache;
        if (features.length === 0) return;

        const measured = findNearestVillageBoundary(
          latitude,
          longitude,
          features,
          data.hierarchy?.village?.scope_code
        );
        if (!measured) return;

        // Require two successive device fixes in the same polygon before confirming entry.
        if (measured.currentScopeCode) {
          const stable = stableVillageRef.current;
          if (stable?.code === measured.currentScopeCode) {
            stable.count += 1;
          } else {
            stableVillageRef.current = { code: measured.currentScopeCode, count: 1 };
          }

          if (
            stableVillageRef.current.count >= 2 &&
            confirmedVillageRef.current &&
            confirmedVillageRef.current !== measured.currentScopeCode
          ) {
            const entryKey = `entered:${confirmedVillageRef.current}:${measured.currentScopeCode}`;
            if (!sentMilestonesRef.current.has(entryKey)) {
              sentMilestonesRef.current.add(entryKey);
              const index = await loadLocationIndex().catch(() => new Map<string, IndexItem>());
              const path = getTargetPathText(
                measured.currentScopeCode,
                index,
                measured.currentVillageName ?? measured.targetVillageName
              );
              await showPersistentNotification(
                "IWACU RWANDA — Winjiye mu kandi gace",
                `Winjiye muri ${path}. Dore inzego z'aho ugeze.`,
                `iwacu-entered-${measured.currentScopeCode}`
              );
            }
          }
          if (stableVillageRef.current.count >= 2) {
            confirmedVillageRef.current = measured.currentScopeCode;
          }
        }

        const boundaryKey = `${measured.currentScopeCode ?? "unknown"}>${measured.targetScopeCode}`;
        const previousDistance = lastBoundaryDistancesRef.current.get(boundaryKey) ?? null;
        const crossedThreshold = getCrossedApproachThreshold(
          previousDistance,
          measured.distanceMeters,
          accuracy
        );

        if (crossedThreshold !== null) {
          const milestoneKey = `approach:${boundaryKey}:${crossedThreshold}`;
          if (!sentMilestonesRef.current.has(milestoneKey)) {
            sentMilestonesRef.current.add(milestoneKey);
            const index = await loadLocationIndex().catch(() => new Map<string, IndexItem>());
            const changedLevels = getChangedAdministrativeLevels(
              measured.currentScopeCode,
              measured.targetScopeCode
            );
            const changedLabels = changedLevels.flatMap((level) => {
              const prefixParts = ({
                province: 2, district: 3, sector: 4, cell: 5, village: 6,
              } as const)[level];
              const code = measured.targetScopeCode.split("-").slice(0, prefixParts).join("-");
              const item = index.get(code);
              return item?.name_kiny
                ? [`${getAdministrativeLevelLabel(level)}: ${item.name_kiny}`]
                : [];
            });
            const detail = changedLabels.length
              ? changedLabels.join(" · ")
              : `Umudugudu: ${measured.targetVillageName}`;
            await showPersistentNotification(
              "IWACU RWANDA — Uri hafi y'imbibi",
              `Usigaje hafi ya metero ${crossedThreshold ngo winjire mu gace muturanye. ${detail}. GPS accuracy: ±${Math.round(accuracy)} m.`,
              `iwacu-approach-${boundaryKey}-${crossedThreshold}`
            );
          }
        }

        lastBoundaryDistancesRef.current.set(boundaryKey, measured.distanceMeters);
        previousFixRef.current = { latitude, longitude, accuracy };
      } catch {
        setNotice("Gukurikirana imbibi z'imidugudu ntibyabashije kuvugururwa kuri iyi GPS fix.");
      }
    })();
  }, [data, permissionGranted, status]);

  return (
    <section
      aria-label="Kumenyeshwa impinduka z'aho uri"
      className="mx-auto my-3 flex max-w-3xl items-start gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-left shadow-sm"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
        {permissionGranted ? <BellRing className="h-5 w-5" aria-hidden /> : permission === "denied" ? <BellOff className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900">Ubutumwa bw'aho uri n'imbibi z'imidugudu</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {permission === "unsupported"
            ? "Iyi browser ntiyemera system notifications. Gerageza Chrome igezweho kuri HTTPS."
            : permission === "denied"
              ? "Chrome yahagaritse ubutumwa bwa IWACU. Bihindurire muri Site settings → Notifications."
              : permissionGranted
                ? "Bikora. Uzakira ikaze, imburi zo hafi y'imbibi, no kumenyeshwa aho winjiye igihe GPS ikomeje gutanga amakuru."
                : "Ku nshuro ya mbere ukanda Emera, Chrome izakubaza niba IWACU yemerewe kukwoherereza ubutumwa."}
        </p>
        {notice && <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-amber-800">{notice}</p>}
      </div>
    </section>
  );
}
