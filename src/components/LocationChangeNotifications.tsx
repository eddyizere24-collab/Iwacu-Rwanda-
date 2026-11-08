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
import { buildAdministrativeTransitionMessages } from "@/lib/administrative-transition-messages";
import {
  NOTIFICATION_ARCHIVE_STORAGE_KEY,
  NOTIFICATION_ARCHIVE_UPDATED_EVENT,
} from "@/lib/notification-archive";

const INDEX_URL = "/offline/location-index.json";
const WELCOME_STORAGE_KEY = "iwacu-location-welcome-date-v1";
const CONFIRMED_VILLAGE_STORAGE_KEY = "iwacu-last-confirmed-village-v1";
const REQUEST_PERMISSION_EVENT = "iwacu:request-notifications";

type LocalArchivedNotification = {
  id: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
};

let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = navigator.serviceWorker.getRegistration()
      .then(async (existing) => {
        if (existing?.active) return existing;

        // The site registers /sw.js on first load. If this browser has no
        // registration yet, ensure one exists rather than waiting forever
        // on ServiceWorkerContainer.ready with no registration to activate.
        const registration = existing ?? await navigator.serviceWorker.register("/sw.js");
        if (registration.active) return registration;
        return navigator.serviceWorker.ready;
      })
      .catch((error) => {
        serviceWorkerRegistrationPromise = null;
        throw error;
      });
  }
  return serviceWorkerRegistrationPromise;
}

function saveLocalNotification(title: string, body: string, tag: string, id: string): boolean {
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_ARCHIVE_STORAGE_KEY) ?? "[]"
    );
    const rows = Array.isArray(raw) ? raw as LocalArchivedNotification[] : [];
    const next: LocalArchivedNotification[] = [
      { id, title, body, tag, createdAt: new Date().toISOString() },
      ...rows.filter((item) => item && item.id !== id),
    ].slice(0, 500);
    window.localStorage.setItem(NOTIFICATION_ARCHIVE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NOTIFICATION_ARCHIVE_UPDATED_EVENT));
    return true;
  } catch {
    // Do not claim that an archive row was saved when browser storage failed.
    return false;
  }
}

type NotificationDeliveryResult = {
  archived: boolean;
  displayed: boolean;
};

async function showLocationNotification(
  title: string,
  body: string,
  tag: string,
  eventId = crypto.randomUUID()
): Promise<NotificationDeliveryResult> {
  // Persist locally first; the display path must not wait on any server request.
  const archived = saveLocalNotification(title, body, tag, eventId);

  if (
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return { archived, displayed: false };
  }

  const options: NotificationOptions = {
    body: `${body}\nKanda kuri iri menyesha wongere ukoreshe IWACU RWANDA.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag,
    data: { url: "/" },
  };

  const registrationPromise = getServiceWorkerRegistration();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const registration = await Promise.race([
    registrationPromise,
    new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), 400);
    }),
  ]).catch(() => null).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  if (!registration) {
    // Never hold the location-result UI hostage while a first-install worker
    // activates. Keep a late completion attached so Android can still receive
    // the alert when the worker becomes active.
    void registrationPromise.then(async (readyRegistration) => {
      if (readyRegistration.active) {
        await readyRegistration.showNotification(title, options);
      }
    }).catch(() => {
      serviceWorkerRegistrationPromise = null;
    });
    return { archived, displayed: false };
  }

  try {
    if (!registration.active) return { archived, displayed: false };
    await registration.showNotification(title, options);
    return { archived, displayed: true };
  } catch {
    // Chrome on Android requires ServiceWorkerRegistration.showNotification();
    // the page Notification constructor is not a valid mobile fallback.
    serviceWorkerRegistrationPromise = null;
    return { archived, displayed: false };
  }
}

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


interface LocationChangeNotificationsProps {
  data: LocateSuccess | null;
  status: LocationStatus;
  isLastKnown?: boolean;
}

export function LocationChangeNotifications({
  data,
  status,
  isLastKnown = false,
}: LocationChangeNotificationsProps) {
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
    // Start waking the already-installed worker before the first location result.
    void getServiceWorkerRegistration().catch(() => undefined);

    const requestPermission = () => {
      if (Notification.permission === "denied") {
        refreshPermission();
        return;
      }
      if (Notification.permission === "granted") {
        refreshPermission();
        return;
      }

      void Notification.requestPermission().then((result) => {
        setPermission(result);
        if (result !== "granted") {
          setNotice("Chrome ntiyemereye ubutumwa. Reba Site settings → Notifications.");
        }
      }).catch(() => setPermission(Notification.permission));
    };

    // Warm up the service worker and place-name index before a location change.
    void navigator.serviceWorker.ready.catch(() => undefined);

    window.addEventListener(REQUEST_PERMISSION_EVENT, requestPermission);
    return () => window.removeEventListener(REQUEST_PERMISSION_EVENT, requestPermission);
  }, []);

  // Welcome the person after the first location has been resolved.
  useEffect(() => {
    if (status !== "success" || isLastKnown || !target) return;
    let lastWelcomed = "";
    try {
      lastWelcomed = window.localStorage.getItem(WELCOME_STORAGE_KEY) ?? "";
    } catch {
      // Continue without persistent deduplication if storage is unavailable.
    }
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Kigali",
    }).format(new Date());
    if (lastWelcomed === today) return;

    const eventId = `iwacu-welcome-${today}`;
    void showLocationNotification(
      "IWACU RWANDA — Murakaza neza",
      `Murakaza neza! ${target.body}`,
      "iwacu-location-welcome",
      eventId
    ).then(({ archived, displayed }) => {
      if (!archived) {
        setNotice("Ubutumwa ntibwabitswe kuri iyi telefone. Reba umwanya wa Chrome, wongere ugerageze.");
      }
      // When permission is not granted, the local archive remains the available
      // record. When permission is granted, only mark the welcome complete
      // after the OS notification was actually accepted by the active worker.
      const notificationApiAvailable =
        "Notification" in window && "serviceWorker" in navigator;
      const currentPermission = notificationApiAvailable ? Notification.permission : "denied";
      if (displayed || currentPermission === "denied") {
        try {
          window.localStorage.setItem(WELCOME_STORAGE_KEY, today);
        } catch {
          // The notification was still shown/saved even if the dedupe marker fails.
        }
      } else if (currentPermission === "granted") {
        setNotice("Ubutumwa bwo kukwakira ntibwageze kuri telefone. Turongera kubugerageza ubutaha.");
      }
    });
  }, [status, target, isLastKnown, permission]);

  // Use the official village polygons to calculate approach and entry notifications.
  useEffect(() => {
    if (
      status !== "success" ||
      isLastKnown ||
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
        const locationIndexPromise = loadLocationIndex().catch(() => new Map<string, IndexItem>());
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

        // Confirm only when the GPS uncertainty circle fits inside the official
        // village polygon and two successive fixes agree.
        const confidentlyInsideCurrentVillage = Boolean(
          measured.currentScopeCode &&
          measured.currentBoundaryDistanceMeters !== null &&
          Number.isFinite(measured.currentBoundaryDistanceMeters) &&
          measured.currentBoundaryDistanceMeters >= accuracy
        );

        if (confidentlyInsideCurrentVillage && measured.currentScopeCode) {
          const priorStable = stableVillageRef.current;
          const stableVillage: StableVillage =
            priorStable?.code === measured.currentScopeCode
              ? { code: priorStable.code, count: priorStable.count + 1 }
              : { code: measured.currentScopeCode, count: 1 };
          stableVillageRef.current = stableVillage;

          if (stableVillage.count >= 2) {
            let previousVillageCode = confirmedVillageRef.current;
            if (!previousVillageCode) {
              try {
                previousVillageCode =
                  window.localStorage.getItem(CONFIRMED_VILLAGE_STORAGE_KEY);
              } catch {
                previousVillageCode = null;
              }
            }

            if (previousVillageCode !== measured.currentScopeCode) {
              const index = await locationIndexPromise;
              const nameIndex = new Map<string, string>(
                Array.from(index.entries()).map(([scopeCode, item]) => [
                  scopeCode,
                  item.name_kiny,
                ])
              );
              const messages = buildAdministrativeTransitionMessages(
                previousVillageCode,
                measured.currentScopeCode,
                nameIndex
              );

              // Display all changed administrative levels immediately on this phone.
              const results = await Promise.all(messages.map((message) =>
                showLocationNotification(
                  message.title,
                  message.body,
                  `iwacu-transition-${message.key}`
                )
              ));
              if (results.some((result) => !result.archived)) {
                setNotice("Hari ubutumwa butabitswe kuri iyi telefone. Reba umwanya wa Chrome.");
              } else if (permissionGranted && results.some((result) => !result.displayed)) {
                setNotice("Chrome ntiyashoboye kwerekana amwe mu menyesha kuri telefone.");
              }
            }

            confirmedVillageRef.current = measured.currentScopeCode;
            try {
              window.localStorage.setItem(
                CONFIRMED_VILLAGE_STORAGE_KEY,
                measured.currentScopeCode
              );
            } catch {
              // Session tracking remains available if browser storage is blocked.
            }
          }
        } else {
          stableVillageRef.current = null;
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
            const index = await locationIndexPromise;
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
            const result = await showLocationNotification(
              "IWACU RWANDA — Uri hafi y'imbibi",
              `Usigaje hafi ya metero ${crossedThreshold} ngo winjire mu gace muturanye. ${detail}. GPS accuracy: ±${Math.round(accuracy)} m.`,
              `iwacu-approach-${boundaryKey}-${crossedThreshold}`
            );
            if (!result.archived) {
              setNotice("Imburi ntiyabitswe kuri iyi telefone. Reba umwanya wa Chrome.");
            } else if (permissionGranted && !result.displayed) {
              setNotice("Chrome ntiyashoboye kwerekana imburi y'imbibi kuri telefone.");
            }
          }
        }

        lastBoundaryDistancesRef.current.set(boundaryKey, measured.distanceMeters);
        previousFixRef.current = { latitude, longitude, accuracy };
      } catch {
        setNotice("Gukurikirana imbibi z'imidugudu ntibyabashije kuvugururwa kuri iyi GPS fix.");
      }
    })();
  }, [data, status, isLastKnown, permissionGranted]);

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
