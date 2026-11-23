"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Crosshair, Layers, Loader2, Search, Share2, X } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { useAccessibilitySettings } from "@/components/AccessibilityProvider";
import { PublicLeaderDirectory, levelName } from "@/components/PublicLeaderDirectory";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { loadLeaflet } from "@/lib/map/leaflet-loader";
import { findVillageAt, isInsideRwandaWindow, type VillageFeature } from "@/lib/map/geometry";

type PlaceRef = { scope_code: string; name_kiny: string; name_eng: string | null; level: string };
type Child = PlaceRef & { center?: [number, number] };
type PlaceInfo = PlaceRef & {
  path?: string;
  bbox: [number, number, number, number];
  center: [number, number];
  geometry: unknown;
  children: Child[];
  ancestors: PlaceRef[];
};
type Suggestion = PlaceRef & { full_path?: string };

const RWANDA_CENTER: [number, number] = [-1.94, 29.87];
const CHILD_LABEL: Record<string, string> = {
  country: "Intara",
  province: "Uturere",
  district: "Imirenge",
  sector: "Utugari",
  cell: "Imidugudu",
};
const LEADER_LEVELS = new Set(["district", "sector", "cell", "village"]);

function displayName(place: PlaceRef, locale: string): string {
  return locale === "en" && place.name_eng ? place.name_eng : place.name_kiny;
}

function levelTitle(level: string): string {
  return level === "country" ? "Igihugu" : level === "province" ? "Intara" : levelName(level);
}

export function IkaritaMap() {
  const { locale, t } = useI18n();
  const { lowDataMode } = useAccessibilitySettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const baseRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const highlightRef = useRef<any>(null);
  const meRef = useRef<any[]>([]);
  const featuresRef = useRef<VillageFeature[]>([]);
  const overlayAbortRef = useRef<AbortController | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectRef = useRef<(code: string, fit?: boolean) => Promise<void>>(async () => {});
  const lowDataRef = useRef(lowDataMode);
  lowDataRef.current = lowDataMode;

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [layer, setLayer] = useState<"street" | "terrain">("street");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [notice, setNotice] = useState<string>("Hitamo ahantu ushakisha, cyangwa wegere ikarita urebe imidugudu.");
  const [locating, setLocating] = useState(false);

  /** The village polygon that contains a point (from the loaded overlay, otherwise a tiny bbox request). */
  const villageAt = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    const local = findVillageAt(lng, lat, featuresRef.current);
    if (local?.properties?.scope_code) return local.properties.scope_code;
    if (!isInsideRwandaWindow(lat, lng)) return null;
    const d = 0.003;
    const params = new URLSearchParams({
      west: String(Math.max(28.7, lng - d)), south: String(Math.max(-3.0, lat - d)),
      east: String(Math.min(31.1, lng + d)), north: String(Math.min(-0.8, lat + d)),
    });
    try {
      const response = await fetch("/api/location-map?" + params.toString(), { cache: "no-store" });
      if (!response.ok) return null;
      const json = await response.json();
      const features: VillageFeature[] = Array.isArray(json?.features) ? json.features : [];
      return findVillageAt(lng, lat, features)?.properties?.scope_code ?? null;
    } catch {
      return null;
    }
  }, []);

  const drawHighlight = useCallback((info: PlaceInfo, fit: boolean) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (highlightRef.current) map.removeLayer(highlightRef.current);
    highlightRef.current = L.geoJSON(info.geometry as any, {
      interactive: false,
      style: () => ({ color: "#FAD201", weight: 3, opacity: 0.95, fillColor: "#FAD201", fillOpacity: 0.1 }),
    }).addTo(map);
    if (fit) {
      const [west, south, east, north] = info.bbox;
      const bottom = Math.round(Math.min(window.innerHeight * 0.38, 320));
      map.fitBounds([[south, west], [north, east]], {
        paddingTopLeft: [24, 90],
        paddingBottomRight: [24, bottom],
        maxZoom: info.level === "village" ? 17 : 15,
      });
    }
  }, []);

  const selectScope = useCallback(async (code: string, fit = true) => {
    setPlaceLoading(true);
    setSheetOpen(true);
    setSuggestions([]);
    try {
      const response = await fetch("/api/ikarita/place?scope_code=" + encodeURIComponent(code), { cache: "force-cache" });
      if (!response.ok) throw new Error("place_unavailable");
      const info = (await response.json()) as PlaceInfo;
      setPlace(info);
      drawHighlight(info, fit);
      try {
        const url = new URL(window.location.href);
        url.search = "?scope=" + encodeURIComponent(info.scope_code);
        window.history.replaceState(null, "", url.toString());
      } catch { /* the map still works without URL updates */ }
    } catch {
      setNotice("Aha hantu ntiharabasha kuboneka. Ongera ugerageze cyangwa uhitemo ahandi.");
      setSheetOpen(false);
    } finally {
      setPlaceLoading(false);
    }
  }, [drawHighlight]);
  selectRef.current = selectScope;

  const refreshOverlay = useCallback(async () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const clear = () => {
      if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
      featuresRef.current = [];
    };
    if (lowDataRef.current || map.getZoom() < 12) { clear(); return; }
    overlayAbortRef.current?.abort();
    const controller = new AbortController();
    overlayAbortRef.current = controller;
    const b = map.getBounds();
    const params = new URLSearchParams({
      west: String(b.getWest()), south: String(b.getSouth()), east: String(b.getEast()), north: String(b.getNorth()),
    });
    try {
      const response = await fetch("/api/location-map?" + params.toString(), { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("overlay_unavailable");
      const geojson = await response.json();
      if (controller.signal.aborted || !mapRef.current) return;
      clear();
      featuresRef.current = Array.isArray(geojson.features) ? geojson.features : [];
      const detailed = map.getZoom() >= 14;
      overlayRef.current = L.geoJSON(geojson, {
        bubblingMouseEvents: false,
        style: () => ({ color: "#20603D", weight: 1.2, opacity: 0.85, fillColor: "#48A868", fillOpacity: 0.07 }),
        onEachFeature: (feature: any, layer: any) => {
          const name = feature?.properties?.name_kiny;
          const code = feature?.properties?.scope_code;
          if (typeof name === "string" && name.trim()) {
            layer.bindTooltip(name, { permanent: detailed, sticky: !detailed, direction: "center", className: "iwacu-village-label", opacity: 0.96 });
          }
          if (typeof code === "string") layer.on("click", () => void selectRef.current(code, false));
        },
      }).addTo(map);
      highlightRef.current?.bringToFront?.();
    } catch {
      /* aborted or temporarily unavailable: the map keeps working with the base layer */
    }
  }, []);

  // Map setup
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      if (!document.getElementById("iwacu-village-label-style")) {
        const style = document.createElement("style");
        style.id = "iwacu-village-label-style";
        style.textContent = ".iwacu-village-label{border:1px solid rgba(32,96,61,.35);border-radius:4px;background:rgba(255,255,255,.94);box-shadow:0 1px 4px rgba(0,0,0,.18);color:#17492d;font-size:10px;font-weight:700;line-height:1.2;padding:1px 3px;white-space:nowrap}.iwacu-village-label:before{display:none}";
        document.head.appendChild(style);
      }
      const map = L.map(containerRef.current, {
        zoomControl: false,
        minZoom: 7,
        maxZoom: 18,
        maxBounds: [[-3.3, 28.4], [-0.5, 31.5]],
        maxBoundsViscosity: 0.8,
      }).setView(RWANDA_CENTER, 8);
      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      map.on("moveend", () => {
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = setTimeout(() => void refreshOverlay(), 450);
      });
      map.on("click", async (event: any) => {
        const code = await villageAt(event.latlng.lat, event.latlng.lng);
        if (code) void selectRef.current(code, false);
        else setNotice("Aha hantu nta mudugudu wabonetse. Gerageza kwegera cyangwa ukande ahandi.");
      });
      setStatus("ready");
      map.invalidateSize();

      // Deep links: ?scope=RW-..., ?lat=..&lng=.., ?go=1 (find my place)
      const params = new URLSearchParams(window.location.search);
      const scope = params.get("scope");
      const lat = Number(params.get("lat"));
      const lng = Number(params.get("lng"));
      if (scope && /^RW(-[A-Z0-9]{1,12}){0,5}$/.test(scope)) void selectRef.current(scope, true);
      else if (params.get("lat") && params.get("lng") && isInsideRwandaWindow(lat, lng)) {
        map.setView([lat, lng], 16);
        void villageAt(lat, lng).then((code) => { if (code) void selectRef.current(code, false); });
      } else if (params.get("go") === "1") {
        document.getElementById("ikarita-locate")?.click();
      }
    }).catch(() => { if (!cancelled) setStatus("error"); });

    return () => {
      cancelled = true;
      overlayAbortRef.current?.abort();
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      highlightRef.current = null; overlayRef.current = null; meRef.current = [];
    };
  }, [refreshOverlay, villageAt]);

  // Base layer (street or terrain)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (status !== "ready" || !L || !map) return;
    if (baseRef.current) map.removeLayer(baseRef.current);
    baseRef.current = layer === "street"
      ? L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19, updateWhenIdle: true, keepBuffer: lowDataMode ? 0 : 2, detectRetina: !lowDataMode,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        })
      : L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
          maxZoom: 17, updateWhenIdle: true, keepBuffer: lowDataMode ? 0 : 2,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>, <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC-BY-SA)',
        });
    baseRef.current.addTo(map);
    baseRef.current.bringToBack?.();
  }, [layer, status, lowDataMode]);

  // Search with debounce and abort
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) { setSuggestions([]); setSearching(false); return; }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/ikarita/search?q=" + encodeURIComponent(text), { signal: controller.signal });
        const json = await response.json();
        if (!controller.signal.aborted) setSuggestions(Array.isArray(json?.places) ? json.places : []);
      } catch { /* a newer search replaced this one */ }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  function locateMe() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!("geolocation" in navigator)) { setNotice("Iyi telefone ntishobora kuvuga aho uri (GPS). Shakisha izina ry'ahantu."); return; }
    setLocating(true);
    setNotice("Turimo gushaka aho uri...");
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      setLocating(false);
      if (!isInsideRwandaWindow(latitude, longitude)) {
        setNotice("Aho uri hasa nk'ahari hanze y'u Rwanda. Shakisha izina ry'ahantu.");
        return;
      }
      meRef.current.forEach((item) => map.removeLayer(item));
      meRef.current = [
        L.circle([latitude, longitude], { radius: Math.min(accuracy || 50, 2000), color: "#0A6FA3", weight: 1, fillColor: "#0A6FA3", fillOpacity: 0.12, interactive: false }).addTo(map),
        L.circleMarker([latitude, longitude], { radius: 7, color: "#ffffff", weight: 3, fillColor: "#0A6FA3", fillOpacity: 1, interactive: false }).addTo(map),
      ];
      map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
      const code = await villageAt(latitude, longitude);
      if (code) void selectScope(code, false);
      else setNotice("Aho uri nta mudugudu wabonetse. Kanda ku ikarita ahantu uri hafi.");
    }, () => {
      setLocating(false);
      setNotice("Ntitwabashije kumenya aho uri. Emera ko urubuga rukoresha aho uri (location), cyangwa ushakishe izina.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  async function share() {
    if (!place) return;
    const url = window.location.origin + "/ikarita?scope=" + encodeURIComponent(place.scope_code);
    try {
      if (navigator.share) await navigator.share({ title: displayName(place, locale), url });
      else { await navigator.clipboard.writeText(url); setNotice("Link yakoporowe."); }
    } catch { /* sharing was cancelled */ }
  }

  const levelPlaces: Record<string, { name: string; scope_code: string }> = {};
  if (place) {
    for (const item of [...(place.ancestors ?? []), place]) {
      if (LEADER_LEVELS.has(item.level)) levelPlaces[item.level] = { name: item.name_kiny, scope_code: item.scope_code };
    }
  }
  const spokenPath = place
    ? [...(place.ancestors ?? []).filter((a) => a.level !== "country"), place]
        .map((item) => levelTitle(item.level) + " " + displayName(item, locale)).reverse().join(", ")
    : "";

  return (
    <div className="relative h-[calc(100dvh-68px)] min-h-[460px] w-full overflow-hidden bg-[#dfe9e1]">
      <div ref={containerRef} className="absolute inset-0 z-0" aria-label={t("Ikarita ya IWACU RWANDA")} role="application" />

      {/* Search */}
      <div className="absolute left-3 right-14 top-3 z-[1000]">
        <form
          role="search"
          onSubmit={(event) => { event.preventDefault(); if (suggestions[0]) void selectScope(suggestions[0].scope_code, true); }}
          className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-white px-3 shadow-[0_6px_20px_rgba(6,35,26,0.28)]"
        >
          <Search className="h-5 w-5 shrink-0 text-[#20603D]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Shakisha umudugudu, akagari, umurenge...")}
            aria-label={t("Shakisha ahantu")}
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-[44px] w-full min-w-0 bg-transparent text-sm text-[#10261C] outline-none placeholder:text-[#6b7b72]"
          />
          {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#20603D]" aria-label={t("Turimo gushaka")} />}
          {query && (
            <button type="button" onClick={() => { setQuery(""); setSuggestions([]); }} aria-label={t("Siba")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#4A5D54] hover:bg-[#eef3ee]">
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </form>
        {suggestions.length > 0 && (
          <ul className="mt-1.5 max-h-[45dvh] overflow-y-auto rounded-2xl bg-white shadow-[0_10px_28px_rgba(6,35,26,0.3)]" role="listbox" aria-label={t("Ahantu habonetse")}>
            {suggestions.map((item) => (
              <li key={item.scope_code} role="option" aria-selected="false">
                <button type="button" onClick={() => { setQuery(""); void selectScope(item.scope_code, true); }} className="flex min-h-[52px] w-full flex-col items-start justify-center px-4 py-2 text-left hover:bg-[#f1f6f2]">
                  <span className="text-sm font-bold text-[#10261C]">
                    {displayName(item, locale)} <span className="text-[11px] font-semibold uppercase tracking-wide text-[#20603D]">{t(levelTitle(item.level))}</span>
                  </span>
                  {item.full_path && <span className="text-[11px] text-[#60746A]">{item.full_path}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-[132px] z-[1000] flex flex-col gap-2">
        <button
          id="ikarita-locate"
          type="button"
          onClick={locateMe}
          disabled={locating || status !== "ready"}
          aria-label={t("Menya aho ndi")}
          title={t("Menya aho ndi")}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0A6FA3] shadow-[0_4px_14px_rgba(6,35,26,0.3)] hover:bg-[#f1f6f2] disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Crosshair className="h-5 w-5" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setLayer(layer === "street" ? "terrain" : "street")}
          aria-pressed={layer === "terrain"}
          aria-label={layer === "street" ? t("Erekana imisozi") : t("Erekana imihanda")}
          title={layer === "street" ? t("Erekana imisozi") : t("Erekana imihanda")}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#20603D] shadow-[0_4px_14px_rgba(6,35,26,0.3)] hover:bg-[#f1f6f2]"
        >
          <Layers className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {status === "loading" && <p role="status" className="absolute inset-x-0 top-1/2 z-[900] text-center text-sm font-semibold text-[#17492D]">{t("Turimo gufungura ikarita...")}</p>}
      {status === "error" && (
        <p role="status" className="absolute inset-x-4 top-1/2 z-[900] rounded-xl bg-white p-3 text-center text-sm text-amber-800 shadow">
          {t("Ikarita ntiyafungutse. Reba interineti, hanyuma usubiremo.")}
        </p>
      )}

      {/* Hint when nothing is selected */}
      {!sheetOpen && status === "ready" && (
        <p aria-live="polite" className="absolute inset-x-3 bottom-3 z-[900] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-[#17492D] shadow">
          {t(notice)}
        </p>
      )}

      {/* Place sheet */}
      {sheetOpen && (
        <section
          aria-label={t("Amakuru y'aho hantu")}
          className={"absolute inset-x-0 bottom-0 z-[1000] overflow-y-auto rounded-t-3xl bg-[#174a31] px-4 pb-5 pt-2 text-white shadow-[0_-10px_30px_rgba(6,35,26,0.4)] " + (expanded ? "max-h-[62%]" : "max-h-[34%]")}
        >
          <div className="mx-auto mb-1 flex max-w-2xl items-center justify-between">
            <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={expanded ? t("Gabanya") : t("Fungura byose")} className="flex h-11 min-w-[44px] items-center justify-center gap-1 text-xs font-semibold text-white/80">
              {expanded ? <ChevronDown className="h-5 w-5" aria-hidden /> : <ChevronUp className="h-5 w-5" aria-hidden />}
            </button>
            <button type="button" onClick={() => setSheetOpen(false)} aria-label={t("Funga")} className="flex h-11 w-11 items-center justify-center rounded-full text-white/90 hover:bg-white/10">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="mx-auto max-w-2xl space-y-3">
            {placeLoading && !place && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t("Turimo gushaka")}</p>}
            {place && (
              <>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#FAD201]">{t(levelTitle(place.level))}</p>
                  <h2 data-no-localize="true" className="font-display text-2xl font-semibold leading-tight">{displayName(place, locale)}</h2>
                  {place.name_eng && place.name_kiny !== place.name_eng && (
                    <p data-no-localize="true" className="text-sm text-white/80">{locale === "en" ? place.name_kiny : place.name_eng}</p>
                  )}
                  {place.ancestors?.length > 0 && (
                    <p data-no-localize="true" className="mt-1 text-xs text-white/75">
                      {[...place.ancestors].filter((a) => a.level !== "country").reverse().map((a) => displayName(a, locale)).join(" › ")}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="[&_button]:min-h-[44px]"><ReadAloudButton text={spokenPath} label={t("Soma aho hantu")} /></span>
                  <button type="button" onClick={() => void share()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/40 px-4 text-sm font-semibold text-white hover:bg-white/10">
                    <Share2 className="h-4 w-4" aria-hidden />{t("Sangiza")}
                  </button>
                </div>

                {expanded && place.level === "village" && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.sessionStorage.setItem("iwacu-map-pick", JSON.stringify({ latitude: place.center[1], longitude: place.center[0], at: Date.now() }));
                      } catch { /* the home page simply opens without the chosen place */ }
                      window.location.assign("/");
                    }}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#FAD201] px-4 text-sm font-bold text-[#10261C] hover:bg-[#f0c800]"
                  >
                    {t("Koresha aha hantu nk'aho ndi")}
                  </button>
                )}

                {expanded && place.children?.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-sm font-bold">{t(CHILD_LABEL[place.level] ?? "Ahantu")} ({place.children.length})</h3>
                    <div className="flex max-h-[26dvh] flex-wrap gap-2 overflow-y-auto">
                      {place.children.map((child) => (
                        <button key={child.scope_code} type="button" data-no-localize="true" onClick={() => void selectScope(child.scope_code, true)} className="inline-flex min-h-[44px] items-center rounded-full border border-white/40 bg-white/10 px-4 text-sm font-semibold hover:bg-white/20">
                          {displayName(child, locale)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {expanded && LEADER_LEVELS.has(place.level) && (
                  <PublicLeaderDirectory
                    heading={t("Abayobozi b'aha hantu")}
                    candidates={[{ scope_code: place.scope_code, name_kiny: place.name_kiny, name_eng: place.name_eng, level: place.level }]}
                    activeScope={place.scope_code}
                    onActiveChange={() => {}}
                    levelPlaces={levelPlaces}
                  />
                )}
                <p className="text-[10px] text-white/60">{t("Amakarita: © OpenStreetMap; imbibi z'imidugudu zivanwa muri database ya IWACU.")}</p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
