"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "@/hooks/useLocation";
import { LocationButton } from "@/components/LocationButton";
import { LocationChangeNotifications } from "@/components/LocationChangeNotifications";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { RwandanSun } from "@/components/RwandanSun";
import { AiSearchAssistant } from "@/components/AiSearchAssistant";
import { VillagePicker } from "@/components/VillagePicker";
import { MapPinPicker } from "@/components/MapPinPicker";
import { NearbyLandmarks } from "@/components/NearbyLandmarks";
import { LocationReportButton } from "@/components/LocationReportButton";
import { PublicLeaderDirectory, type LeaderPlaceCandidate } from "@/components/PublicLeaderDirectory";
import { isLandmarksFeatureEnabled } from "@/lib/feature-flags";
import { getLocationDisplayPath } from "@/lib/location-display-path";
import {
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  const {
    status,
    data,
    errorCode,
    errorMessageKiny,
    errorMessageEng,
    locate,
    reset,
    chooseVillage,
    locateAtCoordinate,
    submitLocationFeedback,
    noticeKiny,
    isLastKnown,
  } = useLocation();

  // Pre-permission consent dialog state (D1 section D)
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [feedbackConsent, setFeedbackConsent] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [activeLeaderScope, setActiveLeaderScope] = useState<string | null>(null);
  const autoLocateStartedRef = useRef(false);

  // After the visitor has granted device-location permission once, refresh the
  // location automatically whenever IWACU is opened again. Never trigger a
  // first-time browser permission prompt on page load.
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions) {
      return () => { cancelled = true; };
    }

    void navigator.permissions.query({ name: "geolocation" as PermissionName })
      .then((permission) => {
        if (
          cancelled ||
          permission.state !== "granted" ||
          autoLocateStartedRef.current
        ) return;
        autoLocateStartedRef.current = true;
        locate();
      })
      .catch(() => {
        // Browsers without the Permissions API keep the explicit location button.
      });

    return () => { cancelled = true; };
  }, [locate]);

  // Trigger locate with D1 pre-permission consent explanation
  function handleLocateClick() {
    if (status === "idle" || status === "error") {
      setShowConsentModal(true);
    } else {
      locate();
    }
  }

  function handleReset() {
    setActiveLeaderScope(null);
    reset();
  }

  function handleConsentConfirm() {
    setShowConsentModal(false);
    // Request notification permission during the same first-use tap.
    window.dispatchEvent(new Event("iwacu:request-notifications"));
    locate();
  }

  const mapInitialPoint = data &&
    Number.isFinite(data.latitude) &&
    Number.isFinite(data.longitude)
    ? { latitude: data.latitude as number, longitude: data.longitude as number }
    : null;

  // Use only the finest level actually resolved by the location engine.
  // An absent village is never inferred from a cell or a lower-confidence suggestion.
  // The engine reports the finest level it can actually support (data.level). Anything finer
  // (a guessed cell or village) is never shown: indoors, the honest answer is often the sector.
  const LEVEL_RANK = { province: 0, district: 1, sector: 2, cell: 3, village: 4 } as const;
  const supportedRank = data?.level && data.level in LEVEL_RANK
    ? LEVEL_RANK[data.level as keyof typeof LEVEL_RANK]
    : LEVEL_RANK.village;
  const allowedLevel = (level: keyof typeof LEVEL_RANK) => LEVEL_RANK[level] <= supportedRank;
  const resolvedLeaderLevel = data?.hierarchy?.village && allowedLevel("village")
    ? "village"
    : data?.hierarchy?.cell && allowedLevel("cell")
      ? "cell"
      : data?.hierarchy?.sector && allowedLevel("sector")
        ? "sector"
        : data?.hierarchy?.district && allowedLevel("district")
          ? "district"
          : null;

  // Breadcrumb of the place the engine resolved: province > district > sector > cell > village (only levels that exist).
  const leaderTrail = (["province", "district", "sector", "cell", "village"] as const).flatMap((level) => {
    const item = data?.hierarchy?.[level];
    return item?.name_kiny && allowedLevel(level) ? [{ level, name_kiny: item.name_kiny }] : [];
  });

  const percentOf = (m: { supported_probability?: number; calibrated_probability?: number; confidence: number }): number =>
    Math.round(Math.max(0, Math.min(100,
      m.supported_probability != null ? m.supported_probability * 100
        : m.calibrated_probability != null ? m.calibrated_probability * 100
          : m.confidence)));

  const leaderCandidates: LeaderPlaceCandidate[] = (() => {
    if (!data || !resolvedLeaderLevel) return [];
    const confirmed = data.hierarchy[resolvedLeaderLevel];
    const perLevel = data.hierarchyCandidates?.[resolvedLeaderLevel]
      ?? data.per_level_candidates?.[resolvedLeaderLevel]
      ?? [];
    // Keep the complete per-level candidate list so the public UI can page
    // through the first three and fetch further candidates on demand.
    // The explicit top-three village result is only a fallback.
    const sourceCandidates = perLevel.length
      ? perLevel
      : resolvedLeaderLevel === "village" ? data.top3_villages ?? [] : [];
    const rows = sourceCandidates.length ? sourceCandidates : (confirmed ? [confirmed] : []);
    const seen = new Set<string>();
    const result: LeaderPlaceCandidate[] = [];
    for (const match of rows) {
      if (!match?.scope_code || seen.has(match.scope_code)) continue;
      seen.add(match.scope_code);
      result.push({
        scope_code: match.scope_code,
        name_kiny: match.name_kiny,
        name_eng: match.name_eng,
        level: resolvedLeaderLevel,
        supported_probability: match.supported_probability,
        percent: percentOf(match),
      });
    }
    if (confirmed && !seen.has(confirmed.scope_code)) {
      result.unshift({
        scope_code: confirmed.scope_code,
        name_kiny: confirmed.name_kiny,
        name_eng: confirmed.name_eng,
        level: resolvedLeaderLevel,
        supported_probability: confirmed.supported_probability,
        percent: percentOf(confirmed),
      });
    }
    return result;
  })();

  // Put the place the engine itself resolved first, so it is the one shown by default.
  const engineScope = resolvedLeaderLevel ? data?.hierarchy?.[resolvedLeaderLevel]?.scope_code ?? null : null;
  if (engineScope) {
    const at = leaderCandidates.findIndex((item) => item.scope_code === engineScope);
    if (at > 0) leaderCandidates.unshift(...leaderCandidates.splice(at, 1));
  }
  const activePlace =
    leaderCandidates.find((item) => item.scope_code === activeLeaderScope) ?? leaderCandidates[0] ?? null;
  const activeIsEngine = !!activePlace && activePlace.scope_code === engineScope;
  const levelPlaces: Record<string, { name: string; scope_code: string }> = {};
  for (const level of ["district", "sector", "cell", "village"] as const) {
    const unit = data?.hierarchy?.[level];
    if (unit?.scope_code && unit.name_kiny && allowedLevel(level)) levelPlaces[level] = { name: unit.name_kiny, scope_code: unit.scope_code };
  }
  // Breadcrumb above the place name: parents only, and only for the place the engine resolved.
  const headerTrail = activeIsEngine ? leaderTrail.slice(0, -1) : [];
  // Show the full coherent best-fit lineage; mark any level below the evidence threshold as an estimate.
  const displayPath = getLocationDisplayPath(
    data?.hierarchy,
    data?.level && data.level !== "country" ? data.level : undefined
  );
  const displayPlace = displayPath[displayPath.length - 1] ?? null;

  async function handleFeedbackSubmit() {
    const scopeCode = data?.hierarchy?.village?.scope_code ?? data?.matches[0]?.scope_code;
    if (!scopeCode || !feedbackConsent) return;
    setFeedbackStatus("sending");
    try {
      await submitLocationFeedback(scopeCode);
      setFeedbackStatus("sent");
      setFeedbackConsent(false);
    } catch {
      setFeedbackStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* 1. HERO PLACE CARD WITH RWANDAN SUN ("Rugo y'Izuba") */}
      {status === "idle" && (
        <section className="photo-surface photo-hills relative overflow-hidden rounded-[28px] p-6 pb-8 sm:p-12 sm:pb-12 text-center shadow-[0_24px_64px_rgba(6,35,26,0.28)] mb-8">
          {/* National Ribbon Accent */}
          <div className="ribbon-rwanda absolute top-0 inset-x-0 h-1.5" aria-hidden />

          {/* Luminous Rwandan Sun ("Rugo y'Izuba") */}
          <div className="mx-auto mb-6 flex items-center justify-center">
            <div className="relative p-2 rounded-full sun-pulse">
              <RwandanSun size={76} glow={true} />
            </div>
          </div>

          {/* D1 B1 Headline & Subtitle */}
          <h1 className="iwacu-hero-title font-display mx-auto max-w-2xl text-[2.15rem] font-bold leading-[1.04] tracking-[-0.045em] sm:text-5xl">
            <span className="block">Menya aho uri</span>
            <span className="iwacu-hero-title-accent block">n&apos;abayobozi baho.</span>
          </h1>

          {/* D1 B3 & B4 Big Hero Location Button */}
          <div className="mt-8 flex flex-col items-center justify-center">
            <LocationButton status={status} onClick={handleLocateClick} />
          </div>
          <div className="mx-auto mt-6 max-w-2xl space-y-4 text-left text-foreground">
            <div className="rounded-[22px] bg-white/95 p-2 shadow-[0_12px_32px_rgba(6,35,26,0.22)]">
              <MapPinPicker initialPoint={mapInitialPoint} onSelect={(latitude, longitude, accuracy) => {
                void locateAtCoordinate(latitude, longitude, accuracy);
              }} />
            </div>
            <details className="rounded-2xl border border-white/60 bg-white/95 p-3 text-left shadow-lg">
              <summary className="cursor-pointer min-h-[42px] py-2 text-sm font-semibold">
                Si hano? Hindura (gukosora aho hantu)
              </summary>
              <div className="mt-3">
                <VillagePicker onSelect={chooseVillage} />
              </div>
            </details>
          </div>

          {/* NCSA Law compliance note */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-white/90 drop-shadow">
            <ShieldCheck className="h-4 w-4 text-[#FAD201]" aria-hidden />
            <span>
              Amakuru yawe arinzwe (NCSA 058/2021)
            </span>
          </div>
        </section>
      )}

      <LocationChangeNotifications data={data} status={status} isLastKnown={isLastKnown} />

      {/* 2. SEARCHING STATE (D1 section E) */}
      {(status === "requesting_gps" || status === "locating") && (
        <section
          role="status"
          aria-live="polite"
          className="rounded-3xl border border-sky-200/80 bg-card p-8 sm:p-14 text-center shadow-lg my-8 animate-in fade-in"
        >
          <div className="mx-auto mb-6 flex justify-center sun-pulse">
            <RwandanSun size={64} glow={true} />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {status === "requesting_gps"
              ? "Turimo gushaka aho uri…"
              : "Turimo gushaka aho uri…"}
          </h2>

          {noticeKiny && (
            <p role="status" aria-live="polite" className="mx-auto mt-3 max-w-xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {noticeKiny}
            </p>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-border px-5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Reka
            </button>
          </div>
        </section>
      )}



      {/* 3. ERROR DISPLAY (D1 section H) */}
      {status === "error" && (
        <div className="my-6 space-y-4">
          <ErrorDisplay
            code={errorCode || "NETWORK_ERROR"}
            messageKiny={errorMessageKiny || undefined}
            messageEng={errorMessageEng}
            onRetry={locate}
          />
          <div className="mx-auto max-w-2xl space-y-3">
            <MapPinPicker onSelect={(latitude, longitude, accuracy) => {
              void locateAtCoordinate(latitude, longitude, accuracy);
            }} />
            {isLandmarksFeatureEnabled() && Number.isFinite(data?.latitude) && Number.isFinite(data?.longitude) && (
              <NearbyLandmarks
                latitude={data?.latitude as number}
                longitude={data?.longitude as number}
                onSelect={(latitude, longitude, accuracy) => {
                  void locateAtCoordinate(latitude, longitude, accuracy);
                }}
              />
            )}
            <details className="rounded-2xl border border-border bg-card p-3">
              <summary className="cursor-pointer min-h-[42px] py-2 text-sm font-semibold">Si hano? Hindura umudugudu (uburyo bwa nyuma)</summary>
              <div className="mt-3"><VillagePicker onSelect={chooseVillage} /></div>
            </details>
          </div>
          <div className="mt-4 text-center">
            <button type="button" onClick={reset}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Subira ku ntangiriro</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. RESULTS DISPLAY (D1 section F) */}
      {status === "success" && data && (
        <section className="space-y-4 animate-in fade-in duration-300">
          {/* One view: the place (photo header) and, right below it, its leaders. */}
          <div className="photo-surface photo-road relative overflow-hidden rounded-[28px] px-5 pb-6 pt-4 shadow-[0_24px_64px_rgba(6,35,26,0.28)] sm:px-10 sm:pb-8">
            <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#FAD201]">
                {displayPlace?.kind === "estimate" ? "Igereranyo cy'aho uri" : "Aho ibimenyetso byerekana"}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-white/95 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Ongera ushake</span>
              </button>
            </div>
            {(displayPlace || activePlace) && (
              <h2 className="font-display mt-1 text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-6xl">
                {displayPlace?.name_kiny ?? activePlace?.name_kiny}
              </h2>
            )}
            {displayPath.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {displayPath.map((item) => (
                  <div key={item.level} className="rounded-xl border border-white/20 bg-black/15 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white/75">{item.label}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#FAD201]">
                        {item.kind === "supported" ? "Icyizere gihagije" : "Ikigereranyo"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">{item.name_kiny}</p>
                    {item.confidencePercent !== null && (
                      <p className="mt-1 text-[10px] text-white/70">Icyizere: {item.confidencePercent}%</p>
                    )}
                  </div>
                ))}
              </div>
            ) : headerTrail.length > 0 ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-white/85">
                {headerTrail.map((item, index) => (
                  <span key={item.level} className="inline-flex items-center gap-1.5">
                    {index > 0 && <span aria-hidden>&rsaquo;</span>}
                    <span>{item.name_kiny}</span>
                  </span>
                ))}
              </p>
            ) : null}
            {displayPath.some((item) => item.kind === "estimate") && (
              <p className="mt-3 text-xs leading-relaxed text-white/80">
                &quot;Ikigereranyo&quot; bivuga ko aho hantu hashobora kuba ari ho uri, ariko ibimenyetso ntibirabyemeza.
              </p>
            )}
          </div>

          {noticeKiny && (
            <p role="status" className="rounded-2xl bg-white/95 px-4 py-3 text-sm text-amber-900 shadow">
              {noticeKiny}
            </p>
          )}
          {data.flags?.includes("border_zone") && (
            <p role="status" className="rounded-2xl bg-white/95 px-4 py-3 text-sm text-amber-900 shadow">
              Uri hafi y&apos;imbibi z&apos;u Rwanda cyangwa ku nkengero z&apos;ikiyaga. Turerekana Akarere kari hafi gusa.
            </p>
          )}

          <div className="rounded-[28px] bg-[#06231A]/80 p-3 shadow-[0_18px_48px_rgba(6,35,26,0.3)] sm:p-6">
            <PublicLeaderDirectory
              candidates={leaderCandidates}
              activeScope={activeLeaderScope}
              onActiveChange={setActiveLeaderScope}
              levelPlaces={activeIsEngine ? levelPlaces : undefined}
            />
          </div>

          <details className="rounded-[22px] bg-white/95 p-4 shadow-[0_10px_28px_rgba(6,35,26,0.18)]">
            <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-[#10261C]">
              Si hano? Gukosora aho uri
            </summary>
            <div className="mt-3 space-y-4">
              {data.accuracy_m ? (
                <p className="text-xs text-[#4A5D54]">
                  Telefone yawe ishobora kuba ifite ikosa rya hafi metero {Math.round(data.accuracy_m).toLocaleString("rw-RW")}.
                </p>
              ) : null}
              <MapPinPicker onSelect={(latitude, longitude, accuracy) => {
                void locateAtCoordinate(latitude, longitude, accuracy);
              }} />
              <VillagePicker onSelect={chooseVillage} />
              <LocationReportButton data={data} />

              {data.hierarchy?.village && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-bold">Fasha kunoza urubuga (ubishatse gusa)</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4A5D54]">
                    Niba wemera, tubika gusa umudugudu wemeje n&apos;aho hafi y&apos;aho telefone yari iri. Ntidubika izina ryawe, telefone, konti cyangwa IP. Ushobora kutabyemera.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={feedbackConsent}
                      onChange={(event) => {
                        setFeedbackConsent(event.target.checked);
                        if (!event.target.checked) setFeedbackStatus("idle");
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#20603D]"
                    />
                    <span>Nemeza ko aho ngaragaye ari ho, kandi nemeye gutanga aya makuru atarimo umwirondoro.</span>
                  </label>
                  <button
                    type="button"
                    disabled={!feedbackConsent || feedbackStatus === "sending"}
                    onClick={() => void handleFeedbackSubmit()}
                    className="mt-3 min-h-[44px] w-full rounded-full bg-[#20603D] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {feedbackStatus === "sending" ? "Turimo kohereza..." : "Emeza kandi wohereze"}
                  </button>
                  {feedbackStatus === "sent" && (
                    <p role="status" className="mt-2 text-xs text-emerald-700">Urakoze. Igitekerezo cyawe cyakiriwe.</p>
                  )}
                  {feedbackStatus === "error" && (
                    <p role="status" className="mt-2 text-xs text-amber-700">Ntibyashobotse kubika igitekerezo. Ushobora gukomeza gukoresha urubuga.</p>
                  )}
                </div>
              )}
            </div>
          </details>
        </section>
      )}

      {/* 5. AI SEARCH & QUESTIONS ASSISTANT */}
      <div className="mt-12">
        <AiSearchAssistant />
      </div>

      {/* D1 SECTION D: PRE-PERMISSION CONSENT DIALOG */}
      {showConsentModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-sky-200 bg-card p-6 sm:p-7 shadow-2xl">
            <div className="mx-auto mb-4 flex justify-center">
              <RwandanSun size={52} glow={true} />
            </div>

            <h3 id="consent-title" className="text-center text-lg font-bold text-foreground">
              Dukeneye kumenya aho uri
            </h3>

            <p className="mt-3 text-center text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Telefone yawe iri bukubaze niba wemera kumenya aho uri. Nta konti ukeneye.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleConsentConfirm}
                className="flex-1 min-h-[48px] rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
              >
                Emera
              </button>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="min-h-[48px] rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Si ubu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
