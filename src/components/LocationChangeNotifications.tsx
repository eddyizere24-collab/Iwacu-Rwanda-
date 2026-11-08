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

const INDEX_URL = "/offline/location-index.json";
const WELCOME_STORAGE_KEY = "iwacu-location-welcome-date-v1";
const CONFIRMED_VILLAGE_STORAGE_KEY = "iwacu-last-confirmed-village-v1";
const VISITOR_ID_STORAGE_KEY = "iwacu-push-visitor-id-v1";
const NOTIFICATION_ARCHIVE_STORAGE_KEY = "iwacu-notification-archive-v1";
const REQUEST_PERMISSION_EVENT = "iwacu:request-notifications";

type LocalArchivedNotification = {
  id: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
};

function saveLocalNotification(title: string, body: string, tag: string, id: string): void {
  try {
    const existing = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_ARCHIVE_STORAGE_KEY) ?? "[]"
    ) as LocalArchivedNotification[];
    const rows = Array.isArray(existing) ? existing : [];
    const next: LocalArchivedNotification[] = [
      { id, title, body, tag, createdAt: new Date().toISOString() },
      ...rows.filter((item) => item && item.id !== id),
    ].slice(0, 500);
    window.localStorage.setItem(NOTIFICATION_ARCHIVE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The server archive remains the durable copy when browser storage is unavailable.
  }
}

let pushPublicKeyPromise: Promise<string | null> | null = null;

function getAnonymousVisitorId(): string {
  const stored = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
    return stored;
  }
  const created = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, created);
  return created;
}

function decodeVapidPublicKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

async function getPushPublicKey(): Promise<string | null> {
  if (!pushPublicKeyPromise) {
    pushPublicKeyPromise = fetch("/api/push/config", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json() as { configured?: boolean; publicKey?: string | null };
        return result.configured && typeof result.publicKey === "string"
          ? result.publicKey
          : null;
      })
      .catch(() => null);
  }
  return pushPublicKeyPromise;
}

async function registerServerPushSubscription(publicKey: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const decodedKey = decodeVapidPublicKey(publicKey);
    const applicationServerKey = decodedKey.buffer.slice(
      decodedKey.byteOffset,
      decodedKey.byteOffset + decodedKey.byteLength
    ) as ArrayBuffer;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getAnonymousVisitorId(),
      subscription: subscription.toJSON(),
    }),
  });
  if (!response.ok) throw new Error("push_subscription_registration_failed");
}

async function showLocationNotification(title: string, body: string, tag: string): Promise<void> {
  const eventId = crypto.randomUUID();
  // The in-app archive works even when the visitor does not grant OS-level
  // notification permission. Browser permission controls only system banners.
  saveLocalNotification(title, body, tag, eventId);

  // The server first archives the event, then attempts Web Push delivery.
  // This keeps the history even when VAPID has not yet been configured.
  try {
    const response = await fetch("/api/push/send", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getAnonymousVisitorId(),
        eventId,
        title,
        body,
        tag,
      }),
      signal: AbortSignal.timeout(7_000),
    });
    const result = await response.json().catch(() => null) as { sent?: number } | null;
    if (response.ok && Number(result?.sent) > 0) return;
  } catch {
    // The local archive remains available if the server cannot be reached.
  }

  if (
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag,
    data: { url: "/amenyesha" },
  });
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

    const ensurePushSubscription = async () => {
      try {
        const publicKey = await getPushPublicKey();
        if (!publicKey) {
          setNotice("Ubutumwa bwo muri browser burakora; server push iracyategereje VAPID configuration.");
          return;
        }
        await registerServerPushSubscription(publicKey);
        setNotice("Ubutumwa bwa IWACU bwemerewe kuri iyi telefone.");
      } catch {
        setNotice("Chrome yemeye ubutumwa, ariko guhuza server push ntibyarangiye. Ubutumwa bwo kuri page buracyakora.");
      }
    };

    const requestPermission = () => {
      if (Notification.permission === "denied") {
        refreshPermission();
        return;
      }
      if (Notification.permission === "granted") {
        refreshPermission();
        void ensurePushSubscription();
        return;
      }

      // Permission is requested from the user's first location-start gesture.
      void Notification.requestPermission().then(async (result) => {
        setPermission(result);
        if (result === "granted") {
          await ensurePushSubscription();
        } else {
          setNotice("Chrome ntiyemereye ubutumwa. Reba Site settings → Notifications.");
        }
      }).catch(() => setPermission(Notification.permission));
    };

    // Notification permission survives page visits. Reuse it and refresh the
    // server subscription without asking the visitor to approve a second time.
    if (Notification.permission === "granted") {
      void ensurePushSubscription();
    }

    window.addEventListener(REQUEST_PERMISSION_EVENT, requestPermission);
    return () => window.removeEventListener(REQUEST_PERMISSION_EVENT, requestPermission);
  }, []);

  // Welcome the person after the first location has been resolved.
  useEffect(() => {
    if (status !== "success" || !target) return;
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

    void showLocationNotification(
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
  }, [status, target]);

  // Use the official village polygons to calculate approach and entry notifications.
  useEffect(() => {
    if (
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
              const index = await loadLocationIndex().catch(() => new Map<string, IndexItem>());
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

              // Send every changed level's departure and welcome message.
              for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
                const message = messages[messageIndex];
                await showLocationNotification(
                  message.title,
                  message.body,
                  `iwacu-transition-${message.key}`
                );
                if (messageIndex < messages.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 180));
                }
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
            await showLocationNotification(
              "IWACU RWANDA — Uri hafi y'imbibi",
              `Usigaje hafi ya metero ${crossedThreshold} ngo winjire mu gace muturanye. ${detail}. GPS accuracy: ±${Math.round(accuracy)} m.`,
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
  }, [data, status]);

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
