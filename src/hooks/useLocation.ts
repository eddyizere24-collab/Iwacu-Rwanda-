"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocateResponse, LocateSuccess, LocationErrorCode } from "@/types/location";
import type { ConfidenceMatch } from "@/types/boundary";
import type { LeaderPublic } from "@/types/leader";
import { calculateConfidenceOffline } from "@/lib/turf-logic";
import type { OfflineBoundaryCollection } from "@/lib/turf-logic";
import { nearestVillageEstimateFromIndex } from "@/lib/representative-location";
import { createRwandaProvincePrior } from "@/lib/location-prior";
import {
  isDuplicateDeviceFix,
  locationFixesDisagree,
  shouldPreferHighAccuracyRequest,
  type LocationFixSummary,
} from "@/lib/location-fix-arbitration";

export type LocationStatus =
  | "idle"
  | "requesting_gps"
  | "locating"
  | "success"
  | "error"
  | "offline";

type FeedbackMethod = "gps" | "map" | "manual" | "nearest" | "offline";

export interface UseLocationState {
  status: LocationStatus;
  data: LocateSuccess | null;
  errorCode: LocationErrorCode | null;
  errorMessageKiny: string | null;
  errorMessageEng: string | null;
  isOffline: boolean;
  noticeKiny: string | null;
}

const INITIAL: UseLocationState = {
  status: "idle",
  data: null,
  errorCode: null,
  errorMessageKiny: null,
  errorMessageEng: null,
  isOffline: false,
  noticeKiny: null,
};

// Do not flash a coarse first answer (for example, Kigali) before a better
// location result from the same tap has had a chance to arrive.
const LOCATION_RESULT_SETTLE_MS = 200;

export function useLocation() {
  const [state, setState] = useState<UseLocationState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const lastFixRef = useRef<{ latitude: number; longitude: number; accuracy: number; method: FeedbackMethod; recordedAt: number } | null>(null);
  const feedbackMethodRef = useRef<FeedbackMethod>("manual");
  const watchIdRef = useRef<number | null>(null);
  const watchStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchStopTimerRef.current) {
      clearTimeout(watchStopTimerRef.current);
      watchStopTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    stopLocationWatch();
  }, [stopLocationWatch]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stopLocationWatch();
    setState(INITIAL);
  }, [stopLocationWatch]);

  const locate = useCallback(async () => {
    const requestStartedAt = Date.now();
    abortRef.current?.abort();
    stopLocationWatch();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...INITIAL, status: "requesting_gps" });

    const online = typeof navigator !== "undefined" && navigator.onLine !== false;
    // Only measured device fixes participate in best-fix ranking. IP and
    // confirmed-place priors are display fallbacks, never accuracy cut-offs.
    let bestAccuracy = Number.POSITIVE_INFINITY;
    let bestHasCoordinates = false;
    let bestFixKind: "network" | "gps" | null = null;
    let bestHasCenterPointMatch = false;
    let bestCenterPointVillageCode: string | null = null;
    let bestGpsReportedRadiusMeters = Number.POSITIVE_INFINITY;
    let hasMeasuredFix = false;
    let firstAnswerResolved = false;
    let resolveFirstAnswer: (() => void) | null = null;
    const firstAnswer = new Promise<void>((resolve) => { resolveFirstAnswer = resolve; });
    let lastSubmittedDeviceFix: { summary: LocationFixSummary; submittedAt: number } | null = null;
    const signalFirstAnswer = () => {
      if (firstAnswerResolved) return;
      firstAnswerResolved = true;
      resolveFirstAnswer?.();
    };

    type SuccessCandidate = {
      json: LocateSuccess;
      reportedRadiusMeters: number;
      fixAgeMs: number;
      notice?: string;
      point?: { latitude: number; longitude: number };
      trackAsBestFix: boolean;
      fixKind?: "network" | "gps";
    };
    let pendingSuccess: SuccessCandidate | null = null;
    let publishedSuccess: SuccessCandidate | null = null;
    let successCommitTimer: ReturnType<typeof setTimeout> | null = null;

    const commitSuccess = (candidate: SuccessCandidate) => {
      if (controller.signal.aborted) return;
      pendingSuccess = null;
      publishedSuccess = candidate;
      setState({
        status: "success",
        data: {
          ...candidate.json,
          accuracy_m: Number.isFinite(candidate.reportedRadiusMeters)
            ? Math.round(candidate.reportedRadiusMeters)
            : undefined,
          latitude: candidate.point?.latitude ?? candidate.json.latitude,
          longitude: candidate.point?.longitude ?? candidate.json.longitude,
          fix_age_ms: Math.max(0, candidate.fixAgeMs),
          elapsed_ms: Math.max(0, Date.now() - requestStartedAt),
        },
        errorCode: null,
        errorMessageKiny: null,
        errorMessageEng: null,
        isOffline: !online,
        noticeKiny: candidate.notice ?? null,
      });
      signalFirstAnswer();
    };

    const showSuccess = (
      json: LocateSuccess,
      reportedRadiusMeters: number,
      fixAgeMs: number,
      notice?: string,
      point?: { latitude: number; longitude: number },
      trackAsBestFix = true,
      fixKind?: "network" | "gps"
    ) => {
      const hasCoordinates = Boolean(point || (Number.isFinite(json.latitude) && Number.isFinite(json.longitude)));
      const incomingCenterPointMatch = json.hierarchy?.village?.center_point_match === true;
      const incomingCenterPointVillageCode = incomingCenterPointMatch
        ? json.hierarchy?.village?.scope_code ?? null
        : null;
      const gpsCenterPointOverride =
        trackAsBestFix &&
        fixKind === "gps" &&
        incomingCenterPointMatch &&
        bestFixKind !== "gps";
      const protectGpsCenterPoint =
        trackAsBestFix &&
        bestFixKind === "gps" &&
        bestHasCenterPointMatch &&
        fixKind === "network" &&
        incomingCenterPointVillageCode !== bestCenterPointVillageCode;
      const previousCandidate = pendingSuccess ?? publishedSuccess;
      const incomingPoint = point ?? (
        Number.isFinite(json.latitude) && Number.isFinite(json.longitude)
          ? { latitude: json.latitude as number, longitude: json.longitude as number }
          : undefined
      );
      const previousPoint = previousCandidate
        ? previousCandidate.point ?? (
            Number.isFinite(previousCandidate.json.latitude) &&
            Number.isFinite(previousCandidate.json.longitude)
              ? {
                  latitude: previousCandidate.json.latitude as number,
                  longitude: previousCandidate.json.longitude as number,
                }
              : undefined
          )
        : undefined;
      const bothPointsAvailable = Boolean(incomingPoint && previousPoint && previousCandidate);
      const incomingSummary = incomingPoint && {
        ...incomingPoint,
        accuracyMeters: reportedRadiusMeters,
        requestMode: fixKind === "gps" ? "high-accuracy" as const : "low-power" as const,
      };
      const previousSummary = previousPoint && previousCandidate && {
        ...previousPoint,
        accuracyMeters: previousCandidate.reportedRadiusMeters,
        requestMode: previousCandidate.fixKind === "gps"
          ? "high-accuracy" as const
          : "low-power" as const,
      };
      const conflictingHighAccuracyOverride = Boolean(
        bothPointsAvailable &&
        incomingSummary &&
        previousSummary &&
        shouldPreferHighAccuracyRequest(previousSummary, incomingSummary)
      );
      const conflictingLowPowerAgainstHighAccuracy = Boolean(
        bothPointsAvailable &&
        incomingSummary &&
        previousSummary &&
        previousSummary.requestMode === "high-accuracy" &&
        incomingSummary.requestMode === "low-power" &&
        locationFixesDisagree(previousSummary, incomingSummary)
      );

      if (controller.signal.aborted || (!trackAsBestFix && hasMeasuredFix)) return;
      if (protectGpsCenterPoint || conflictingLowPowerAgainstHighAccuracy) return;

      // Do not publish a coarse low-power coordinate over a materially
      // different high-accuracy-request fix. Conversely, a bounded high-
      // accuracy-request fix may replace a conflicting coarse result, even
      // when its reported radius is somewhat wider.
      if (publishedSuccess) {
        if (!sharesAdministrativePath(publishedSuccess.json, json) && !conflictingHighAccuracyOverride) return;
        const improvesAccuracy = reportedRadiusMeters < publishedSuccess.reportedRadiusMeters;
        const addsVillageCenterMatch =
          incomingCenterPointMatch &&
          publishedSuccess.json.hierarchy?.village?.center_point_match !== true;
        if (!conflictingHighAccuracyOverride && !improvesAccuracy && !addsVillageCenterMatch) return;
      } else if (
        trackAsBestFix &&
        !gpsCenterPointOverride &&
        !conflictingHighAccuracyOverride &&
        (reportedRadiusMeters > bestAccuracy ||
          (reportedRadiusMeters === bestAccuracy && bestHasCoordinates && !hasCoordinates))
      ) {
        return;
      }

      if (trackAsBestFix) {
        bestAccuracy = reportedRadiusMeters;
        bestHasCoordinates = hasCoordinates;
        bestFixKind = fixKind ?? null;
        bestHasCenterPointMatch = incomingCenterPointMatch;
        bestCenterPointVillageCode = incomingCenterPointVillageCode;
        hasMeasuredFix = true;
      }

      const candidate: SuccessCandidate = {
        json,
        reportedRadiusMeters,
        fixAgeMs,
        notice,
        point,
        trackAsBestFix,
        fixKind,
      };

      if (publishedSuccess) {
        commitSuccess(candidate);
        return;
      }

      // Give the other current-device callback a short settling window after
      // the first server-resolved fix, then publish one selected answer.
      pendingSuccess = candidate;
      if (successCommitTimer === null) {
        // Start the arbitration window when the first server-resolved
        // answer arrives, not when the button was tapped. This gives the other
        // location provider a full chance to report a conflicting/better fix.
        successCommitTimer = setTimeout(() => {
          successCommitTimer = null;
          if (pendingSuccess) commitSuccess(pendingSuccess);
        }, LOCATION_RESULT_SETTLE_MS);
      }
    };

    const showNotice = (notice: string) => {
      setState((current) => ({ ...current, noticeKiny: notice }));
    };

    const submitFix = async (
      latitude: number,
      longitude: number,
      rawAccuracy: number,
      timestamp: number,
      kind: "network" | "gps"
    ) => {
      if (controller.signal.aborted) return;
      const fixAgeMs = Math.max(0, Date.now() - timestamp);
      const reportedRadiusMeters = Math.min(
        50_000,
        Math.max(0, Number.isFinite(rawAccuracy) ? rawAccuracy : 50_000) +
          (fixAgeMs / 1000) * 5
      );
      const incomingFix: LocationFixSummary = {
        latitude,
        longitude,
        accuracyMeters: reportedRadiusMeters,
        requestMode: kind === "gps" ? "high-accuracy" : "low-power",
      };
      const submittedAt = Date.now();
      if (
        lastSubmittedDeviceFix &&
        isDuplicateDeviceFix(
          lastSubmittedDeviceFix.summary,
          incomingFix,
          lastSubmittedDeviceFix.submittedAt,
          submittedAt
        )
      ) return;
      lastSubmittedDeviceFix = { summary: incomingFix, submittedAt };

      // A fresh high-accuracy request is worth evaluating even when Android
      // reports a wide indoor radius. Keep only material improvements to avoid
      // flooding the RPC; the result still has to pass the normal evidence
      // ranking before it can replace a better fix.
      const allowIndoorGpsCandidate =
        kind === "gps" &&
        bestFixKind !== "gps" &&
        (bestGpsReportedRadiusMeters === Number.POSITIVE_INFINITY ||
          reportedRadiusMeters <= bestGpsReportedRadiusMeters * 0.75);
      if (allowIndoorGpsCandidate) {
        bestGpsReportedRadiusMeters = reportedRadiusMeters;
      }
      if (reportedRadiusMeters > bestAccuracy && !allowIndoorGpsCandidate) return;
      lastFixRef.current = {
        latitude,
        longitude,
        accuracy: reportedRadiusMeters,
        method: "gps",
        recordedAt: timestamp,
      };

      if (!online) {
        const offline = await runOfflineConfidence(latitude, longitude, reportedRadiusMeters);
        if (offline.status === "success") {
          showSuccess(
            offline,
            reportedRadiusMeters,
            fixAgeMs,
            reportedRadiusMeters > 2_000 ? "Telefone yatanze ahantu hagereranyijwe (approximate). Turakoresha nubwo radius yaba nini; ushobora gukomeza kureba ibimenyetso byegereye." : undefined,
            { latitude, longitude },
            true,
            kind
          );
        } else {
          showNotice("Telefone ntirabona ibisubizo bihagije. Turacyategereje ibimenyetso bya Location.");
        }
        return;
      }

      const showOfflineCandidateFallback = async (notice: string) => {
        const fallback = await runOfflineConfidence(latitude, longitude, reportedRadiusMeters);
        if (controller.signal.aborted) return;
        if (fallback.status === "success") {
          showSuccess(
            fallback,
            reportedRadiusMeters,
            fixAgeMs,
            notice,
            { latitude, longitude },
            true,
            kind
          );
        } else {
          showNotice(notice);
        }
      };

      try {
        const response = await fetch("/api/locate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            accuracy: reportedRadiusMeters,
            method: kind === "network" ? "network" : "gps",
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          await showOfflineCandidateFallback("Serivisi yo kuri interineti ntiyasubije neza; turakoresha imbibi z'u Rwanda zabitswe muri telefone.");
          return;
        }
        const json = (await response.json()) as LocateResponse;
        if (json.status === "success") {
          const precisionNotice = reportedRadiusMeters > 2_000
            ? "Telefone yatanze ahantu hagereranyijwe (approximate). Niba ushaka kunoza aho uri, fungura Settings → Location → Google Location Accuracy; igisubizo kiracyakora kandi kiravugururwa."
            : undefined;
          showSuccess(json, reportedRadiusMeters, fixAgeMs, precisionNotice, { latitude, longitude }, true, kind);
        } else if (json.status === "outside") {
          showNotice("Ikimenyetso kimwe kiri hanze y'imbibi z'u Rwanda; turacyagenzura ikindi kimenyetso cya telefone.");
        } else {
          await showOfflineCandidateFallback("Serivisi y'imbibi ntiyatanze igisubizo; turakoresha imbibi z'u Rwanda zabitswe muri telefone.");
        }
      } catch {
        if (!controller.signal.aborted) {
          await showOfflineCandidateFallback("Interineti yatinze; turagerageza kumenya aho uri dukoresheje amakuru y'imbibi abitswe muri telefone.");
        }
      }
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      await Promise.race([
        firstAnswer,
        new Promise<void>((resolve) => setTimeout(resolve, 3_000)),
      ]);
      if (!controller.signal.aborted) {
        setState({
          ...INITIAL,
          status: "error",
          errorCode: "BROWSER_NOT_SUPPORTED",
          errorMessageKiny: "Iyi browser ntiyemera kumenya Location ya telefone. Fungura uru rubuga muri Chrome igezweho.",
          errorMessageEng: "This browser does not provide device location. Open the site in an updated Chrome browser.",
        });
      }
      return;
    }

    type QueuedDevicePosition = {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
      kind: "network" | "gps";
    };
    let queuedDevicePosition: QueuedDevicePosition | null = null;
    let devicePositionBatchTimer: ReturnType<typeof setTimeout> | null = null;

    const onPosition = (position: GeolocationPosition, kind: "network" | "gps") => {
      const candidate: QueuedDevicePosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        kind,
      };
      // The one-shot request and location watch usually report the same phone
      // fix together. Coalesce their callbacks and send only the better one.
      if (
        !queuedDevicePosition ||
        candidate.accuracy < queuedDevicePosition.accuracy ||
        (candidate.accuracy === queuedDevicePosition.accuracy &&
          candidate.timestamp > queuedDevicePosition.timestamp)
      ) {
        queuedDevicePosition = candidate;
      }
      if (devicePositionBatchTimer === null) {
        devicePositionBatchTimer = setTimeout(() => {
          devicePositionBatchTimer = null;
          const selected = queuedDevicePosition;
          queuedDevicePosition = null;
          if (selected) {
            void submitFix(
              selected.latitude,
              selected.longitude,
              selected.accuracy,
              selected.timestamp,
              selected.kind
            );
          }
        }, 120);
      }
    };

    const onGeolocationError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        showNotice("Uburenganzira bwa Location burafunze. Bufungure muri Settings → Apps → Chrome → Permissions → Location, hanyuma wongere ugerageze.");
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        showNotice("Reba ko Location ya telefone iri ON. Fungura Google Location Accuracy na Wi-Fi/Bluetooth scanning; ntitwereka ahantu hataragenzurwa.");
      } else if (error.code === error.TIMEOUT) {
        showNotice("Location iracyashakisha. Android ikoresha ibimenyetso biboneka, harimo mobile network; igisubizo gishobora kuvugururwa.");
      }
    };

    // Both current-device requests start together. The first accepted
    // coordinate is resolved before any place is shown.
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => onPosition(position, "gps"),
        onGeolocationError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8_000 }
      );
    } catch {
      showNotice("Ntabwo twashoboye gutangiza uburyo bwihuse bwo kumenya aho uri.");
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => onPosition(position, "gps"),
        onGeolocationError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 45_000 }
      );
      // Keep refining after the first answer, then stop to save battery.
      watchStopTimerRef.current = setTimeout(stopLocationWatch, 60_000);
    } catch {
      showNotice("Ntibyashobotse gutangiza Location watch; turacyategereje igisubizo cy'ahantu kiva kuri telefone.");
    }

    await Promise.race([
      firstAnswer,
      new Promise<void>((resolve) => setTimeout(resolve, 3_000)),
    ]);

    if (!firstAnswerResolved && !controller.signal.aborted) {
      setState((current) => ({
        ...current,
        status: "locating",
        noticeKiny: "Turacyagenzura ikimenyetso cya Location ya telefone. Ntabwo turakwereka ahantu hataragenzurwa.",
      }));
    }
  }, [stopLocationWatch]);

  const chooseVillage = useCallback(async (scopeCode: string, selectionMethod: FeedbackMethod = "manual") => {
    const requestStartedAt = Date.now();
    feedbackMethodRef.current = typeof navigator !== "undefined" && !navigator.onLine && selectionMethod === "manual" ? "offline" : selectionMethod;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...INITIAL, status: "locating" });
    try {
      let json: LocateResponse;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // Offline picker mode: read the bundled/cached static index first.
        // Its compact tuple rows avoid unnecessary download bytes on mobile.
        let indexPayload: { choices?: unknown[] };
        try {
          const staticResponse = await fetch("/offline/location-index.json", {
            signal: controller.signal,
            cache: "force-cache",
          });
          if (!staticResponse.ok) throw new Error("static_location_index_unavailable");
          indexPayload = await staticResponse.json() as { choices?: unknown[] };
        } catch {
          // Older app shells may only have the cached API index.
          const indexResponse = await fetch("/api/locate?index=1", { signal: controller.signal });
          if (!indexResponse.ok) throw new Error("offline_location_index_unavailable");
          indexPayload = await indexResponse.json() as { choices?: unknown[] };
        }
        const rawEntries = Array.isArray(indexPayload.choices) ? indexPayload.choices : [];
        type CachedChoice = {
          scope_code: string;
          name_kiny: string;
          name_eng: string | null;
          level: "province" | "district" | "sector" | "cell" | "village";
          parent_scope_code: string | null;
        };
        const entries = rawEntries.flatMap((raw): CachedChoice[] => {
          if (Array.isArray(raw) && raw.length >= 5) {
            return [{
              scope_code: String(raw[0]),
              name_kiny: String(raw[1]),
              name_eng: raw[2] == null ? null : String(raw[2]),
              level: String(raw[3]) as CachedChoice["level"],
              parent_scope_code: raw[4] == null ? null : String(raw[4]),
            }];
          }
          if (raw && typeof raw === "object") {
            return [raw as CachedChoice];
          }
          return [];
        });
        const byCode = new Map(entries.map((entry) => [entry.scope_code, entry]));
        let current = byCode.get(scopeCode);
        if (!current || current.level !== "village") throw new Error("village_not_in_cached_index");

        const hierarchy: LocateSuccess["hierarchy"] = {};
        let villageMatch: ConfidenceMatch | null = null;
        for (let depth = 0; current && depth < 6; depth += 1) {
          const match: ConfidenceMatch = {
            scope_code: current.scope_code,
            name_kiny: current.name_kiny,
            name_eng: current.name_eng,
            level: current.level,
            confidence: 100,
            intersection_area_m2: 0,
          };
          if (current.level === "province") hierarchy.province = match;
          if (current.level === "district") hierarchy.district = match;
          if (current.level === "sector") hierarchy.sector = match;
          if (current.level === "cell") hierarchy.cell = match;
          if (current.level === "village") {
            hierarchy.village = match;
            villageMatch = match;
          }
          current = current.parent_scope_code ? byCode.get(current.parent_scope_code) : undefined;
        }
        if (!villageMatch) throw new Error("village_hierarchy_unavailable");
        json = {
          status: "success",
          matches: [villageMatch],
          hierarchy,
          leaders: [],
          source: "manual",
          warning: "USER_CONFIRMED_OFFLINE",
        };
      } else {
        const response = await fetch("/api/locate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "manual", scope_code: scopeCode }),
          signal: controller.signal,
        });
        json = (await response.json()) as LocateResponse;
      }
      if (json.status === "outside") {
        setState({
          ...INITIAL,
          status: "error",
          errorCode: "OUTSIDE_RWANDA",
          errorMessageKiny: "Ibi bipimo bya coordinates biri hanze y'u Rwanda. Nta mudugudu twahisemo.",
          errorMessageEng: "These coordinates are outside Rwanda. No village was selected.",
        });
        return;
      }
      if (json.status !== "success") {
        setState({
          ...INITIAL,
          status: "error",
          errorCode: json.code,
          errorMessageKiny: json.message_kiny,
          errorMessageEng: json.message_eng,
        });
        return;
      }
      try {
        localStorage.setItem("iwacu-confirmed-village", JSON.stringify({
          scope_code: scopeCode,
          name_kiny: json.matches[0]?.name_kiny ?? "",
          confirmed_at: new Date().toISOString(),
        }));
      } catch {
        // The location selection still works if storage is disabled.
      }
      setState({
        status: "success",
        data: { ...json, elapsed_ms: Math.max(0, Date.now() - requestStartedAt) },
        errorCode: null,
        errorMessageKiny: null,
        errorMessageEng: null,
        isOffline: typeof navigator !== "undefined" && !navigator.onLine,
        noticeKiny: null,
      });
    } catch {
      if (controller.signal.aborted) return;
      setState({
        ...INITIAL,
        status: "error",
        errorCode: "NETWORK_ERROR",
        errorMessageKiny: "Interineti irimo ikibazo. Gerageza guhitamo umudugudu uri ku rutonde.",
        errorMessageEng: "Network error. Choose a village from the list.",
      });
    }
  }, []);

  const locateAtCoordinate = useCallback(async (
    latitude: number,
    longitude: number,
    accuracy = 200
  ) => {
    const requestStartedAt = Date.now();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastFixRef.current = { latitude, longitude, accuracy, method: "map", recordedAt: Date.now() };
    feedbackMethodRef.current = "map";
    setState({ ...INITIAL, status: "locating" });

    const showCoordinateFallback = async (notice: string) => {
      const fallback = await runOfflineConfidence(latitude, longitude, accuracy);
      if (controller.signal.aborted) return;
      const data = fallback.status === "success"
        ? { ...fallback, source: "nearest" as const, elapsed_ms: Math.max(0, Date.now() - requestStartedAt) }
        : { ...createRwandaProvincePrior(false), elapsed_ms: Math.max(0, Date.now() - requestStartedAt) };
      setState({
        status: "success",
        data,
        errorCode: null,
        errorMessageKiny: null,
        errorMessageEng: null,
        isOffline: typeof navigator !== "undefined" && navigator.onLine === false,
        noticeKiny: notice,
      });
    };

    try {
      const response = await fetch("/api/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, accuracy, method: "map" }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        await showCoordinateFallback("Ikarita ntiyabashije kugenzura neza. Turakwereka igereranya rishingiye ku makuru y'ahantu abitswe.");
        return;
      }
      const json = (await response.json()) as LocateResponse;
      if (json.status === "outside") {
        setState({
          ...INITIAL,
          status: "error",
          errorCode: "OUTSIDE_RWANDA",
          errorMessageKiny: "Ibi bipimo bya coordinates biri hanze y'u Rwanda. Nta mudugudu twahisemo.",
          errorMessageEng: "These coordinates are outside Rwanda. No village was selected.",
        });
        return;
      }
      if (json.status === "error") {
        await showCoordinateFallback("Serivisi y'imbibi ntibonetse. Igereranya rishingiye ku makuru yemewe riracyagaragara.");
        return;
      }
      setState({
        status: "success",
        data: { ...json, elapsed_ms: Math.max(0, Date.now() - requestStartedAt) },
        errorCode: null,
        errorMessageKiny: null,
        errorMessageEng: null,
        isOffline: false,
        noticeKiny: null,
      });
    } catch {
      if (controller.signal.aborted) return;
      await showCoordinateFallback("Interineti ntibashije kugenzura ikarita. Turakwereka igereranya rishingiye ku makuru yari abitswe.");
    }
  }, []);

  const submitLocationFeedback = useCallback(async (scopeCode: string): Promise<void> => {
    const method = feedbackMethodRef.current;
    const candidateFix = lastFixRef.current;
    const fixIsRecent = candidateFix && Date.now() - candidateFix.recordedAt <= 30 * 60 * 1000;
    const fix = method !== "manual" &&
      fixIsRecent &&
      (method !== "offline" || candidateFix?.method === "offline")
      ? candidateFix
      : null;
    const response = await fetch("/api/location-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent: true,
        scope_code: scopeCode,
        method,
        accuracy_m: fix?.accuracy ?? null,
        latitude: fix?.latitude ?? null,
        longitude: fix?.longitude ?? null,
      }),
    });
    if (!response.ok) {
      throw new Error("location_feedback_unavailable");
    }
  }, []);

  return { ...state, locate, reset, chooseVillage, locateAtCoordinate, submitLocationFeedback };
}

function sharesAdministrativePath(left: LocateSuccess, right: LocateSuccess): boolean {
  const levels = ["province", "district", "sector", "cell"] as const;
  let sharedLevel = false;
  for (const level of levels) {
    const leftUnit = left.hierarchy?.[level];
    const rightUnit = right.hierarchy?.[level];
    if (!leftUnit || !rightUnit) continue;
    sharedLevel = true;
    if (leftUnit.scope_code !== rightUnit.scope_code) return false;
  }
  return sharedLevel;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runOfflineConfidence(
  latitude: number,
  longitude: number,
  accuracy: number
): Promise<LocateResponse> {
  const representativeFallback = async (): Promise<LocateResponse> => {
    try {
      // The compact hierarchy index includes official representative points
      // and is precached by the Service Worker. It allows an explicitly
      // estimated village even when offline polygon data is not installed.
      const response = await fetch("/offline/location-index.json", {
        cache: "force-cache",
      });
      if (response.ok) {
        const estimate = nearestVillageEstimateFromIndex(
          await response.json(),
          latitude,
          longitude,
          accuracy,
          "OFFLINE_REPRESENTATIVE_POINT_ESTIMATE"
        );
        if (estimate) return estimate;
      }
    } catch {
      // Fall through to the honest OFFLINE_CACHE error if even the index is absent.
    }
    return {
      status: "error",
      code: "OFFLINE_CACHE",
      message_kiny:
        "Uri offline kandi urutonde rw'ahantu ntirwabitswe. Ongera uhuze interineti cyangwa uhitemo aho uzi ku rutonde.",
      message_eng:
        "You are offline and the location index is not cached. Reconnect or use a saved place list.",
    };
  };

  try {
    let response: Response | undefined;
    if (typeof caches !== "undefined") {
      try {
        const cache = await caches.open("iwacu-boundaries-v1");
        response = await cache.match("/offline/rwanda-village-boundaries.geojson");
      } catch {
        // Cache API unavailable
      }
    }
    if (!response) {
      try {
        response = await fetch("/offline/rwanda-village-boundaries.geojson");
      } catch {
        // Fetch failed
      }
    }
    if (!response || !response.ok) return representativeFallback();

    const geojson = (await response.json()) as OfflineBoundaryCollection;
    const polygonResult = calculateConfidenceOffline(
      latitude,
      longitude,
      accuracy,
      geojson
    );
    return polygonResult.status === "success" ? polygonResult : representativeFallback();
  } catch {
    return representativeFallback();
  }
}
