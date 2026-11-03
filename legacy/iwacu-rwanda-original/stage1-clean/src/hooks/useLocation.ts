"use client";

/**
 * GPS → online /api/locate, with offline fallback from the IndexedDB sector pack.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocateError, LocateResponse, LocateSuccess } from "@/types/location";
import { calculateConfidenceOffline, type OfflineBoundaryCollection } from "@/lib/turf-logic";
import { warmSectorCache, getCachedSector, sectorCodeFromScope } from "@/lib/offline/sector-cache";
import { createLocateError } from "@/lib/utils/errors";
import { classifyGeolocationError, validateGpsFix, GPS_TIMEOUT_MS } from "@/lib/geo/gps";

export type LocationPhase =
  | "idle"
  | "requesting_gps"
  | "locating"
  | "success"
  | "error"
  | "offline";

export interface UseLocationState {
  phase: LocationPhase;
  result: LocateResponse | null;
  accuracy: number | null;
  slow: boolean;
}

const INITIAL: UseLocationState = { phase: "idle", result: null, accuracy: null, slow: false };
const LAST_SECTOR_KEY = "iwacu:last_sector";
const API_TIMEOUT_MS = 12_000;
const SLOW_AFTER_MS = 6_000;

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: GPS_TIMEOUT_MS,
      maximumAge: 0,
    });
  });
}

function readLastSector(): string | null {
  try {
    return localStorage.getItem(LAST_SECTOR_KEY);
  } catch {
    return null;
  }
}
function writeLastSector(code: string) {
  try {
    localStorage.setItem(LAST_SECTOR_KEY, code);
  } catch {
    /* storage unavailable */
  }
}

export function useLocation() {
  const [state, setState] = useState<UseLocationState>(INITIAL);
  const runId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    runId.current += 1;
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  const locate = useCallback(async () => {
    const myRun = ++runId.current;
    const stale = () => myRun !== runId.current;
    const fail = (err: LocateError, accuracy: number | null = null) => {
      if (!stale()) setState({ phase: "error", result: err, accuracy, slow: false });
    };

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      fail(createLocateError("BROWSER_NOT_SUPPORTED"));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ phase: "requesting_gps", result: null, accuracy: null, slow: false });

    let position: GeolocationPosition;
    try {
      position = await getPosition();
    } catch (err) {
      fail(createLocateError(classifyGeolocationError(err)));
      return;
    }
    if (stale()) return;

    const { latitude, longitude, accuracy } = position.coords;
    const check = validateGpsFix(latitude, longitude, accuracy);
    if (!check.ok) {
      fail(createLocateError(check.code, { accuracy }), accuracy);
      return;
    }

    setState({ phase: "locating", result: null, accuracy, slow: false });
    const slowTimer = setTimeout(() => {
      if (!stale()) setState((s) => (s.phase === "locating" ? { ...s, slow: true } : s));
    }, SLOW_AFTER_MS);
    const apiTimer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    if (navigator.onLine) {
      try {
        const res = await fetch("/api/locate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, accuracy }),
          signal: controller.signal,
        });
        let data: LocateResponse | null = null;
        try {
          data = (await res.json()) as LocateResponse;
        } catch {
          data = null;
        }
        clearTimeout(slowTimer);
        clearTimeout(apiTimer);
        if (stale()) return;

        if (data?.status === "success") {
          const scope =
            data.hierarchy?.village?.scope_code ?? data.matches?.[0]?.scope_code ?? null;
          if (scope) {
            writeLastSector(sectorCodeFromScope(scope));
            void warmSectorCache(scope);
          }
          setState({ phase: "success", result: data, accuracy, slow: false });
          return;
        }
        if (data?.status === "error") {
          setState({ phase: "error", result: data, accuracy, slow: false });
          return;
        }
      } catch {
        // network failure → offline cache
      }
    }
    clearTimeout(slowTimer);
    clearTimeout(apiTimer);
    if (stale()) return;

    const lastSector = readLastSector();
    const cached = lastSector ? await getCachedSector(lastSector) : null;
    if (stale()) return;

    if (!cached) {
      fail(
        createLocateError("OFFLINE_CACHE", {
          reason: "no_cached_sector",
          hint: "Connect once in your area so boundaries can be saved on this device.",
        }),
        accuracy
      );
      return;
    }

    const offline = calculateConfidenceOffline(
      latitude,
      longitude,
      accuracy,
      cached as unknown as OfflineBoundaryCollection
    );
    if (offline.status === "error") {
      fail(offline, accuracy);
      return;
    }
    const success: LocateSuccess = {
      ...offline,
      source: "offline",
      leaders_notice: {
        message_kiny: "Uri offline: abayobozi ntibagaragara. Ongera ugerageze ufite interineti.",
        message_eng: "You are offline: leaders are not shown. Try again with internet access.",
      },
    };
    setState({ phase: "offline", result: success, accuracy, slow: false });
  }, []);

  return { ...state, locate, reset };
}
