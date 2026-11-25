"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpDown, Bike, Car, ChevronDown, ChevronUp, Crosshair, Footprints, Layers, Loader2, MapPin, Navigation, Route as RouteIcon, Search, Share2, X } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { useAccessibilitySettings } from "@/components/AccessibilityProvider";
import { PublicLeaderDirectory, levelName } from "@/components/PublicLeaderDirectory";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { loadLeaflet } from "@/lib/map/leaflet-loader";
import { findVillageAt, isInsideRwandaWindow, type VillageFeature } from "@/lib/map/geometry";
import {
  boundsIntersectRect, kigaliBlocksFor, planOverlay, tileBounds, tileInsideRect, tileKey, tilesFor, tileUrl,
  type KigaliIndex, type OverlayLevel,
} from "@/lib/map/tiles";

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

const KIGALI_VIEW: { center: [number, number]; zoom: number } = { center: [-1.9536, 30.0605], zoom: 11 };
const LEVEL_STYLE: Record<OverlayLevel, { color: string; weight: number; fill: number }> = {
  village: { color: "#20603D", weight: 1.2, fill: 0.07 },
  cell: { color: "#0A6FA3", weight: 2, fill: 0.04 },
  sector: { color: "#C2410C", weight: 2.5, fill: 0.03 },
  district: { color: "#6B21A8", weight: 3, fill: 0.02 },
};
const CHILD_LABEL: Record<string, string> = {
  country: "Intara",
  province: "Uturere",
  district: "Imirenge",
  sector: "Utugari",
  cell: "Imidugudu",
};
const LEADER_LEVELS = new Set(["district", "sector", "cell", "village"]);

type ModeKey = "car" | "moto" | "bike" | "foot";
const MODE_ORDER: ModeKey[] = ["car", "moto", "bike", "foot"];
const MODE_LABEL: Record<ModeKey, string> = { car: "Imodoka", moto: "Moto", bike: "Igare", foot: "Amaguru" };
const ROAD_CLASS_LABEL = [
  "Umuhanda munini", "Umuhanda munini", "Umuhanda munini", "Umuhanda", "Umuhanda wo mu mudugudu",
  "Akayira k'imodoka", "Inzira y'itaka", "Akayira", "Inzira y'abanyamaguru", "Amadarajya", "Inzira y'amagare",
];
type RouteStep = { name: string | null; cls: number; distance_m: number; duration_s: number };
type RouteInfo = { distance_m: number; duration_s: number; geometry: Array<[number, number]>; steps: RouteStep[] } | { error: string };
type TripPoint = { lat: number; lng: number; label: string };
type TripField = "origin" | "dest";
type Trip = { dest: TripPoint | null; origin: TripPoint | null };

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return minutes + " min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h + " h" + (m ? " " + String(m).padStart(2, "0") : "");
}
function formatDistance(meters: number): string {
  return meters < 1000 ? Math.round(meters / 10) * 10 + " m" : (meters / 1000).toFixed(meters < 10000 ? 1 : 0) + " km";
}
function ModeIcon({ mode }: { mode: ModeKey }) {
  if (mode === "car") return <Car className="h-5 w-5" aria-hidden />;
  if (mode === "bike") return <Bike className="h-5 w-5" aria-hidden />;
  if (mode === "foot") return <Footprints className="h-5 w-5" aria-hidden />;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M8.5 17h4l3-7h-3M15.5 10l1-3h2M7 9h3" />
    </svg>
  );
}

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
  const contextRef = useRef<any[]>([]);
  const routeLayerRef = useRef<any[]>([]);
  const pickingRef = useRef<TripField | null>(null);
  const setPointRef = useRef<(field: TripField, point: TripPoint, onlyIfAt?: { lat: number; lng: number }) => void>(() => {});
  const labelPointRef = useRef<(lat: number, lng: number) => Promise<string | null>>(async () => null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const featuresRef = useRef<VillageFeature[]>([]);
  const overlayAbortRef = useRef<AbortController | null>(null);
  const featureCacheRef = useRef(new Map<string, VillageFeature[]>());
  const kigaliRef = useRef<Promise<KigaliIndex | null> | null>(null);
  const drawnKeyRef = useRef("");
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
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripMode, setTripMode] = useState<ModeKey>("car");
  const [routes, setRoutes] = useState<Record<string, RouteInfo> | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeFailed, setRouteFailed] = useState(false);
  const [pickingField, setPickingField] = useState<TripField | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [activeField, setActiveField] = useState<TripField | null>(null);
  const [fieldQuery, setFieldQuery] = useState<Record<TripField, string>>({ origin: "", dest: "" });
  const [fieldSuggestions, setFieldSuggestions] = useState<Suggestion[]>([]);
  setPointRef.current = (field, point, onlyIfAt) =>
    setTrip((previous) => {
      if (!previous) return previous;
      if (onlyIfAt) {
        const current = previous[field];
        if (!current || current.lat !== onlyIfAt.lat || current.lng !== onlyIfAt.lng) return previous;
      }
      return { ...previous, [field]: point };
    });

  /** Outline files: Kigali's static pack (instant, from our own site) and fixed API tiles everywhere else. */
  const getKigali = useCallback((): Promise<KigaliIndex | null> => {
    if (!kigaliRef.current) {
      kigaliRef.current = fetch("/kigali/index.json")
        .then((response) => (response.ok ? response.json() : null))
        .then((json) => (json && Array.isArray(json.rect) ? (json as KigaliIndex) : null))
        .catch(() => null);
    }
    return kigaliRef.current;
  }, []);

  const loadFeatures = useCallback(async (key: string, url: string, signal?: AbortSignal): Promise<VillageFeature[] | null> => {
    const cache = featureCacheRef.current;
    const hit = cache.get(key);
    if (hit) return hit;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error("overlay_unavailable");
        const json = await response.json();
        const features: VillageFeature[] = Array.isArray(json?.features) ? json.features : [];
        if (cache.size > 80) cache.delete(cache.keys().next().value as string);
        cache.set(key, features);
        return features;
      } catch {
        if (signal?.aborted) return null;
      }
    }
    return null;
  }, []);

  /** The village polygon that contains a point: from what is already loaded, otherwise one small tile. */
  const villageAt = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    const pick = (features: VillageFeature[]) =>
      findVillageAt(lng, lat, features.filter((f) => !f.properties?.level || f.properties.level === "village"))?.properties?.scope_code ?? null;
    const local = pick(featuresRef.current);
    if (local) return local;
    for (const [key, features] of featureCacheRef.current) {
      if (key.startsWith("kv:") || key.startsWith("village:")) {
        const found = pick(features);
        if (found) return found;
      }
    }
    if (!isInsideRwandaWindow(lat, lng)) return null;
    const index = await getKigali();
    if (index?.rect && boundsIntersectRect({ west: lng, south: lat, east: lng + 1e-6, north: lat + 1e-6 }, index.rect)) {
      for (const key of kigaliBlocksFor({ west: lng, south: lat, east: lng, north: lat }, index.block)) {
        const file = index.village[key];
        if (!file) continue;
        const features = await loadFeatures("kv:" + key, `/kigali/${file}?v=${index.v}`);
        const found = features ? pick(features) : null;
        if (found) return found;
      }
    }
    const tile = { ix: Math.floor(lng / 0.02), iy: Math.floor(lat / 0.02) };
    const features = await loadFeatures(tileKey("village", 20, tile), tileUrl("village", 20, tile));
    return features ? pick(features) : null;
  }, [getKigali, loadFeatures]);

  /** The name of the village around a tapped point, so a start or end shows a real name instead of "point". */
  const labelPoint = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    const code = await villageAt(lat, lng);
    if (!code) return null;
    try {
      const response = await fetch("/api/ikarita/place?scope_code=" + encodeURIComponent(code), { cache: "force-cache" });
      if (!response.ok) return null;
      const info = (await response.json()) as PlaceInfo;
      return displayName(info, locale);
    } catch {
      return null;
    }
  }, [villageAt, locale]);
  labelPointRef.current = labelPoint;

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

  /** For a village (or cell): draw its cell and sector outlines with names so the person sees where it sits. */
  const drawContext = useCallback(async (info: PlaceInfo) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    contextRef.current.forEach((layer) => map.removeLayer(layer));
    contextRef.current = [];
    if (info.level !== "village" && info.level !== "cell") return;
    const wanted = (info.ancestors ?? []).filter((a) => a.level === "cell" || a.level === "sector");
    const styles: Record<string, { color: string; dash: string; title: string }> = {
      cell: { color: "#0A6FA3", dash: "8 6", title: "Akagari" },
      sector: { color: "#C2410C", dash: "3 7", title: "Umurenge" },
    };
    for (const ancestor of wanted) {
      try {
        const response = await fetch("/api/ikarita/place?scope_code=" + encodeURIComponent(ancestor.scope_code), { cache: "force-cache" });
        if (!response.ok || !mapRef.current) continue;
        const data = (await response.json()) as PlaceInfo;
        const style = styles[ancestor.level];
        if (!style) continue;
        const outline = L.geoJSON(data.geometry as any, {
          interactive: false,
          style: () => ({ color: style.color, weight: 2.5, opacity: 0.9, dashArray: style.dash, fill: false }),
        }).addTo(map);
        const [west, , east, north] = data.bbox;
        const label = L.marker([north, (west + east) / 2], { interactive: false, icon: L.divIcon({ className: "", html: "", iconSize: [0, 0] }) })
          .bindTooltip(style.title + " " + data.name_kiny, { permanent: true, direction: "bottom", className: "iwacu-area-label", opacity: 0.95 })
          .addTo(map);
        contextRef.current.push(outline, label);
      } catch { /* outlines are optional extras */ }
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
      void drawContext(info);
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
  }, [drawHighlight, drawContext]);
  selectRef.current = selectScope;

  /** Names on the outlines: biggest pieces first, only where the name fits inside its piece and does not touch another name. */
  const syncLabels = useCallback(() => {
    const map = mapRef.current;
    const group = overlayRef.current;
    if (!map || !group) return;
    const zoom = map.getZoom();
    const level = planOverlay(zoom)?.level;
    const allowed = (level === "village" && zoom >= 14) || level === "sector";
    const size = map.getSize();
    const view = map.getBounds();
    const chosen = new Set<any>();
    const children: any[] = [];
    group.eachLayer((child: any) => { if (typeof child.__iwName === "string") children.push(child); });
    if (allowed) {
      const candidates: Array<{ child: any; area: number; w: number; h: number }> = [];
      for (const child of children) {
        const box = child.getBounds();
        if (!view.intersects(box)) continue;
        const nw = map.latLngToContainerPoint(box.getNorthWest());
        const se = map.latLngToContainerPoint(box.getSouthEast());
        const w = Math.abs(se.x - nw.x);
        const h = Math.abs(se.y - nw.y);
        if (w >= 30 && h >= 16) candidates.push({ child, area: w * h, w, h });
      }
      candidates.sort((a, b) => b.area - a.area);
      const taken: Array<[number, number, number, number]> = [];
      for (const { child, w } of candidates) {
        if (chosen.size >= 60) break;
        let centre: { x: number; y: number };
        try { centre = map.latLngToContainerPoint(child.getCenter()); } catch { continue; }
        const half = Math.min(w, Math.min(120, child.__iwName.length * 6.4 + 12)) / 2;
        const rect: [number, number, number, number] = [centre.x - half, centre.y - 9, centre.x + half, centre.y + 9];
        if (rect[0] < 4 || rect[2] > size.x - 4 || rect[1] < 4 || rect[3] > size.y - 4) continue;
        if (taken.some((t) => rect[0] < t[2] + 3 && rect[2] > t[0] - 3 && rect[1] < t[3] + 3 && rect[3] > t[1] - 3)) continue;
        taken.push(rect);
        chosen.add(child);
      }
    }
    for (const child of children) {
      const want = chosen.has(child);
      if (Boolean(child.__iwLabelled) === want) continue;
      child.unbindTooltip();
      child.bindTooltip(child.__iwName, { permanent: want, sticky: !want, direction: "center", className: "iwacu-village-label", opacity: 0.96 });
      child.__iwLabelled = want;
    }
  }, []);

  const refreshOverlay = useCallback(async () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const clear = () => {
      if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
      featuresRef.current = [];
      drawnKeyRef.current = "";
    };
    const zoom = map.getZoom();
    const plan = planOverlay(zoom);
    if (!plan || (lowDataRef.current && plan.level === "village")) { clear(); return; }
    const b = map.getBounds();
    const view = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };

    const index = await getKigali();
    if (!mapRef.current) return;
    const rect = index?.rect ?? null;
    const inKigali = rect ? boundsIntersectRect(view, rect) : false;
    const wanted: Array<{ key: string; url: string }> = [];
    const failedBlocks = new Set(index?.failed ?? []);
    const staticFile = rect && index && plan.level !== "village" ? index[plan.level] : null;
    if (inKigali && index) {
      if (plan.level === "village") {
        for (const key of kigaliBlocksFor(view, index.block)) {
          const file = index.village[key];
          if (file) wanted.push({ key: "kv:" + key, url: `/kigali/${file}?v=${index.v}` });
        }
      } else if (staticFile) {
        wanted.push({ key: "k" + plan.level, url: `/kigali/${staticFile}?v=${index.v}` });
      }
    }
    for (const tile of tilesFor(view, plan.sizeMilli)) {
      let covered = false;
      if (rect && index && tileInsideRect(tile, plan.sizeMilli, rect)) {
        if (plan.level === "village") {
          const centre = tileBounds(tile, plan.sizeMilli);
          const block = kigaliBlocksFor({ west: (centre.west + centre.east) / 2, south: (centre.south + centre.north) / 2, east: (centre.west + centre.east) / 2, north: (centre.south + centre.north) / 2 }, index.block)[0];
          covered = !failedBlocks.has(block);
        } else covered = Boolean(staticFile);
      }
      if (!covered) wanted.push({ key: tileKey(plan.level, plan.sizeMilli, tile), url: tileUrl(plan.level, plan.sizeMilli, tile) });
    }
    if (wanted.length > 40) return; // far too much for one screen: wait for the person to zoom in
    const drawKey = plan.level + "|" + wanted.map((w) => w.key).sort().join(";");
    if (drawKey === drawnKeyRef.current && overlayRef.current) { syncLabels(); return; }

    overlayAbortRef.current?.abort();
    const controller = new AbortController();
    overlayAbortRef.current = controller;
    // the small files that ship with the site come first, so Kigali shows at once while the rest is still on its way
    wanted.sort((a, b) => Number(b.url.startsWith("/kigali/")) - Number(a.url.startsWith("/kigali/")));
    const staticCount = wanted.filter((w) => w.url.startsWith("/kigali/")).length;
    const results: Array<VillageFeature[] | null> = new Array(wanted.length).fill(null);
    const fetchRange = async (from: number, to: number) => {
      let next = from;
      await Promise.all(Array.from({ length: Math.min(6, to - from) }, async () => {
        while (next < to && !controller.signal.aborted) {
          const i = next++;
          results[i] = await loadFeatures(wanted[i].key, wanted[i].url, controller.signal);
        }
      }));
    };
    const paint = (complete: boolean) => {
      const seen = new Set<string>();
      const features: VillageFeature[] = [];
      for (const list of results) for (const feature of list ?? []) {
        const code = feature.properties?.scope_code;
        if (!code || seen.has(code)) continue;
        seen.add(code);
        features.push(feature);
      }
      clear();
      if (!features.length) return;
      featuresRef.current = features;
      drawnKeyRef.current = complete && results.every((r) => r !== null) ? drawKey : ""; // a failed piece is retried on the next move
      const style = LEVEL_STYLE[plan.level];
      overlayRef.current = L.geoJSON({ type: "FeatureCollection", features } as any, {
        bubblingMouseEvents: false,
        style: () => ({ color: style.color, weight: style.weight, opacity: 0.85, fillColor: style.color, fillOpacity: style.fill }),
        onEachFeature: (feature: any, layer: any) => {
          const name = feature?.properties?.name_kiny;
          const code = feature?.properties?.scope_code;
          if (typeof name === "string" && name.trim()) {
            layer.__iwName = name;
            layer.bindTooltip(name, { permanent: false, sticky: true, direction: "center", className: "iwacu-village-label", opacity: 0.96 });
          }
          if (typeof code === "string") layer.on("click", () => void selectRef.current(code, false));
        },
      }).addTo(map);
      syncLabels();
      highlightRef.current?.bringToFront?.();
    };
    await fetchRange(0, staticCount);
    if (controller.signal.aborted || !mapRef.current) return;
    if (staticCount > 0 && staticCount < wanted.length) paint(false);
    await fetchRange(staticCount, wanted.length);
    if (controller.signal.aborted || !mapRef.current) return;
    paint(true);
  }, [getKigali, loadFeatures, syncLabels]);

  // Map setup
  useEffect(() => {
    let cancelled = false;
    void getKigali(); // fetch the small Kigali index while the map library loads
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      if (!document.getElementById("iwacu-village-label-style")) {
        const style = document.createElement("style");
        style.id = "iwacu-village-label-style";
        style.textContent = ".iwacu-village-label{border:1px solid rgba(32,96,61,.35);border-radius:4px;background:rgba(255,255,255,.94);box-shadow:0 1px 4px rgba(0,0,0,.18);color:#17492d;font-size:10px;font-weight:700;line-height:1.2;padding:1px 3px;white-space:nowrap}.iwacu-village-label:before{display:none}.iwacu-area-label{border:0;border-radius:999px;background:rgba(23,74,49,.92);color:#fff;font-size:10px;font-weight:700;line-height:1.2;padding:2px 7px;white-space:nowrap}.iwacu-area-label:before{display:none}";
        document.head.appendChild(style);
      }
      const map = L.map(containerRef.current, {
        zoomControl: false,
        minZoom: 7,
        maxZoom: 18,
        maxBounds: [[-3.3, 28.4], [-0.5, 31.5]],
        maxBoundsViscosity: 0.8,
        preferCanvas: true,
      }).setView(KIGALI_VIEW.center, KIGALI_VIEW.zoom);
      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      map.on("moveend", () => {
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = setTimeout(() => void refreshOverlay(), 220);
      });
      map.on("click", async (event: any) => {
        const picking = pickingRef.current;
        if (picking) {
          pickingRef.current = null;
          setPickingField(null);
          const { lat, lng } = event.latlng;
          if (isInsideRwandaWindow(lat, lng)) {
            setPointRef.current(picking, { lat, lng, label: "Aho wakanze" });
            void labelPointRef.current(lat, lng).then((name) => { if (name) setPointRef.current(picking, { lat, lng, label: name }, { lat, lng }); });
          } else setNotice("Hitamo ahantu mu Rwanda.");
          return;
        }
        const code = await villageAt(event.latlng.lat, event.latlng.lng);
        if (code) void selectRef.current(code, false);
        else setNotice("Aha hantu nta mudugudu wabonetse. Gerageza kwegera cyangwa ukande ahandi.");
      });
      setStatus("ready");
      map.invalidateSize();
      void refreshOverlay(); // the map opens on Kigali: draw its outlines straight away, not only after the first move

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
      } else if (params.get("inzira") === "1") {
        document.getElementById("ikarita-planner")?.click();
      }
    }).catch(() => { if (!cancelled) setStatus("error"); });

    return () => {
      cancelled = true;
      overlayAbortRef.current?.abort();
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      highlightRef.current = null; overlayRef.current = null; meRef.current = []; contextRef.current = []; routeLayerRef.current = [];
    };
  }, [refreshOverlay, villageAt, getKigali]);

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

  // Ask our own routing service whenever both ends of a trip are known.
  const tripKey = trip && trip.origin && trip.dest ? [trip.origin.lat, trip.origin.lng, trip.dest.lat, trip.dest.lng].join(",") : "";
  useEffect(() => {
    if (!trip || !trip.origin || !trip.dest) return;
    const controller = new AbortController();
    setRouting(true);
    setRouteFailed(false);
    const params = new URLSearchParams({
      from: trip.origin.lat.toFixed(6) + "," + trip.origin.lng.toFixed(6),
      to: trip.dest.lat.toFixed(6) + "," + trip.dest.lng.toFixed(6),
    });
    (async () => {
      try {
        let response = await fetch("/api/ikarita/route?" + params.toString(), { signal: controller.signal });
        if (response.status === 503) response = await fetch("/api/ikarita/route?" + params.toString(), { signal: controller.signal });
        if (!response.ok) throw new Error("route_unavailable");
        const json = await response.json();
        if (!controller.signal.aborted) setRoutes(json.routes ?? null);
      } catch {
        if (!controller.signal.aborted) { setRoutes(null); setRouteFailed(true); }
      } finally {
        if (!controller.signal.aborted) setRouting(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripKey]);

  // Place search for the start / end boxes of the planner.
  const activeQuery = activeField ? fieldQuery[activeField].trim() : "";
  useEffect(() => {
    if (!activeField || activeQuery.length < 2) { setFieldSuggestions([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/ikarita/search?q=" + encodeURIComponent(activeQuery), { signal: controller.signal });
        const json = await response.json();
        if (!controller.signal.aborted) setFieldSuggestions(Array.isArray(json?.places) ? json.places : []);
      } catch { /* a newer search replaced this one */ }
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [activeField, activeQuery]);

  // Draw the trip: start and end points and the chosen way.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    routeLayerRef.current.forEach((layer) => map.removeLayer(layer));
    routeLayerRef.current = [];
    if (!trip) return;
    const layers: any[] = [];
    const bounds: Array<[number, number]> = [];
    if (trip.dest) bounds.push([trip.dest.lat, trip.dest.lng]);
    const chosen = routes?.[tripMode];
    if (chosen && "geometry" in chosen && chosen.geometry.length > 1) {
      layers.push(L.polyline(chosen.geometry, { color: "#ffffff", weight: 9, opacity: 0.95, lineCap: "round", lineJoin: "round", interactive: false }));
      layers.push(L.polyline(chosen.geometry, { color: "#0A6FA3", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }));
      for (const point of chosen.geometry) bounds.push(point);
    }
    if (trip.origin) {
      bounds.push([trip.origin.lat, trip.origin.lng]);
      layers.push(L.circleMarker([trip.origin.lat, trip.origin.lng], { radius: 8, color: "#ffffff", weight: 3, fillColor: "#0A6FA3", fillOpacity: 1, interactive: false }));
    }
    if (trip.dest) layers.push(L.circleMarker([trip.dest.lat, trip.dest.lng], { radius: 9, color: "#ffffff", weight: 3, fillColor: "#C0392B", fillOpacity: 1, interactive: false }));
    layers.forEach((layer) => layer.addTo(map));
    routeLayerRef.current = layers;
    if (bounds.length === 0) return;
    if (bounds.length > 1) {
      map.fitBounds(bounds, { paddingTopLeft: [24, 90], paddingBottomRight: [24, Math.round(Math.min(window.innerHeight * 0.42, 340))], maxZoom: 16 });
    } else {
      map.setView(bounds[0], Math.max(map.getZoom(), 14));
    }
  }, [trip, routes, tripMode]);

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
      lastPosRef.current = { lat: latitude, lng: longitude };
      map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
      const code = await villageAt(latitude, longitude);
      if (code) void selectScope(code, false);
      else setNotice("Aho uri nta mudugudu wabonetse. Kanda ku ikarita ahantu uri hafi.");
    }, () => {
      setLocating(false);
      setNotice("Ntitwabashije kumenya aho uri. Emera ko urubuga rukoresha aho uri (location), cyangwa ushakishe izina.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function locateAsPoint(field: TripField) {
    if (!("geolocation" in navigator)) { setNotice("Iyi telefone ntishobora kuvuga aho uri (GPS). Hitamo ku ikarita aho uhagurukira."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setLocating(false);
      const { latitude, longitude } = position.coords;
      if (!isInsideRwandaWindow(latitude, longitude)) { setNotice("Aho uri hasa nk'ahari hanze y'u Rwanda. Hitamo ku ikarita aho uhagurukira."); return; }
      lastPosRef.current = { lat: latitude, lng: longitude };
      setPointRef.current(field, { lat: latitude, lng: longitude, label: "Aho ndi" });
      setActiveField(null);
    }, () => {
      setLocating(false);
      setNotice("Ntitwabashije kumenya aho uri. Hitamo ku ikarita aho uhagurukira.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function resetTripState() {
    setRoutes(null);
    setRouteFailed(false);
    setStepsOpen(false);
    setActiveField(null);
    setFieldQuery({ origin: "", dest: "" });
    setFieldSuggestions([]);
  }

  /** Open the small planner: type any start and any end, see the way and the time, no need to travel. */
  function openPlanner() {
    const known = lastPosRef.current;
    resetTripState();
    setSheetOpen(false);
    setSuggestions([]);
    setTrip({ origin: known ? { lat: known.lat, lng: known.lng, label: "Aho ndi" } : null, dest: null });
  }

  function startTrip(target: PlaceInfo) {
    const dest: TripPoint = { lat: target.center[1], lng: target.center[0], label: displayName(target, locale) };
    const known = lastPosRef.current;
    resetTripState();
    setSheetOpen(false);
    setTrip({ dest, origin: known ? { lat: known.lat, lng: known.lng, label: "Aho ndi" } : null });
    if (!known) setTimeout(() => locateAsPoint("origin"), 0);
  }

  function endTrip() {
    pickingRef.current = null;
    setPickingField(null);
    setTrip(null);
    resetTripState();
  }

  function swapEnds() {
    setRoutes(null);
    setTrip((previous) => (previous ? { origin: previous.dest, dest: previous.origin } : previous));
  }

  async function chooseFieldPlace(field: TripField, item: Suggestion) {
    setActiveField(null);
    setFieldSuggestions([]);
    setFieldQuery((previous) => ({ ...previous, [field]: "" }));
    try {
      const response = await fetch("/api/ikarita/place?scope_code=" + encodeURIComponent(item.scope_code), { cache: "force-cache" });
      if (!response.ok) throw new Error("place_unavailable");
      const info = (await response.json()) as PlaceInfo;
      setPointRef.current(field, { lat: info.center[1], lng: info.center[0], label: displayName(item, locale) });
    } catch {
      setNotice("Aha hantu ntiharabasha kuboneka. Ongera ugerageze cyangwa uhitemo ahandi.");
    }
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
          id="ikarita-planner"
          type="button"
          onClick={openPlanner}
          disabled={status !== "ready"}
          aria-label={t("Inzira n'igihe")}
          title={t("Inzira n'igihe")}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAD201] text-[#10261C] shadow-[0_4px_14px_rgba(6,35,26,0.3)] hover:bg-[#f0c800] disabled:opacity-60"
        >
          <RouteIcon className="h-5 w-5" aria-hidden />
        </button>
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
      {!sheetOpen && !trip && status === "ready" && (
        <p aria-live="polite" className="absolute inset-x-3 bottom-3 z-[900] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-[#17492D] shadow">
          {t(notice)}
        </p>
      )}

      {/* Trip panel: our own routing for Rwanda */}
      {pickingField && (
        <div role="status" className="absolute inset-x-3 top-[68px] z-[1000] flex items-center justify-between gap-2 rounded-xl bg-[#FAD201] px-3 py-2 text-sm font-bold text-[#10261C] shadow-lg">
          <span>{pickingField === "origin" ? t("Kanda ku ikarita aho uhagurukira.") : t("Kanda ku ikarita aho ujya.")}</span>
          <button type="button" onClick={() => { pickingRef.current = null; setPickingField(null); }} className="min-h-[44px] rounded-lg px-3 hover:bg-black/10">{t("Reka")}</button>
        </div>
      )}

      {trip && !pickingField && (
        <section aria-label={t("Urugendo")} className="absolute inset-x-0 bottom-0 z-[1000] max-h-[58%] overflow-y-auto rounded-t-3xl bg-[#174a31] px-4 pb-5 pt-3 text-white shadow-[0_-10px_30px_rgba(6,35,26,0.4)]">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-bold"><RouteIcon className="h-5 w-5 text-[#FAD201]" aria-hidden />{t("Inzira n'igihe")}</h2>
              <button type="button" onClick={endTrip} aria-label={t("Funga")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/10">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                {(["origin", "dest"] as TripField[]).map((field) => {
                  const point = trip[field];
                  const editing = activeField === field;
                  const label = field === "origin" ? t("Aho uhagurukira") : t("Aho ujya");
                  return (
                    <div key={field}>
                      <div className="flex min-h-[48px] items-center gap-2 rounded-xl bg-white pl-3 pr-1 text-[#10261C]">
                        <span className={"inline-block h-3 w-3 shrink-0 rounded-full border-2 border-white shadow " + (field === "origin" ? "bg-[#0A6FA3]" : "bg-[#C0392B]")} aria-hidden />
                        <input
                          type="text"
                          value={editing ? fieldQuery[field] : point ? t(point.label) : ""}
                          onFocus={() => { setActiveField(field); setFieldQuery((previous) => ({ ...previous, [field]: "" })); }}
                          onChange={(event) => setFieldQuery((previous) => ({ ...previous, [field]: event.target.value }))}
                          onBlur={() => setTimeout(() => setActiveField((current) => (current === field ? null : current)), 200)}
                          placeholder={label}
                          aria-label={label}
                          autoComplete="off"
                          enterKeyHint="search"
                          className="min-h-[44px] w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#6b7b72]"
                        />
                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => locateAsPoint(field)} disabled={locating} aria-label={t("Aho ndi")} title={t("Aho ndi")} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-[#0A6FA3] hover:bg-[#eef3ee] disabled:opacity-60">
                          {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Crosshair className="h-4 w-4" aria-hidden />}
                        </button>
                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { pickingRef.current = field; setPickingField(field); setActiveField(null); }} aria-label={t("Hitamo ku ikarita")} title={t("Hitamo ku ikarita")} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-[#20603D] hover:bg-[#eef3ee]">
                          <MapPin className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      {editing && fieldSuggestions.length > 0 && (
                        <ul className="mt-1 max-h-[28dvh] overflow-y-auto rounded-xl bg-white text-[#10261C] shadow-lg" role="listbox" aria-label={t("Ahantu habonetse")}>
                          {fieldSuggestions.map((item) => (
                            <li key={item.scope_code} role="option" aria-selected="false">
                              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void chooseFieldPlace(field, item)} className="flex min-h-[48px] w-full flex-col items-start justify-center px-3 py-1.5 text-left hover:bg-[#f1f6f2]">
                                <span className="text-sm font-bold">{displayName(item, locale)} <span className="text-[11px] font-semibold uppercase tracking-wide text-[#20603D]">{t(levelTitle(item.level))}</span></span>
                                {item.full_path && <span className="text-[11px] text-[#60746A]">{item.full_path}</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={swapEnds} aria-label={t("Hindura")} title={t("Hindura")} className="mt-[26px] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 hover:bg-white/10">
                <ArrowUpDown className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {!trip.origin || !trip.dest ? <p className="text-xs text-white/80">{t("Andika aho uhagurukira n'aho ujya, urebe inzira n'igihe.")}</p> : null}

            {routing && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t("Turimo kubara inzira...")}</p>}
            {routeFailed && <p role="status" className="rounded-xl bg-white/10 p-3 text-sm">{t("Ntitwabashije kubara inzira ubu. Ongera ugerageze.")}</p>}

            {routes && (
              <>
                <div role="tablist" aria-label={t("Uburyo bwo kugenda")} className="grid grid-cols-4 gap-2">
                  {MODE_ORDER.map((mode) => {
                    const info = routes[mode];
                    const ok = Boolean(info && "geometry" in info);
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={tripMode === mode}
                        onClick={() => { setTripMode(mode); setStepsOpen(false); }}
                        className={"flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center " + (tripMode === mode ? "border-[#FAD201] bg-white/15" : "border-white/25 hover:bg-white/10") + (ok ? "" : " opacity-60")}
                      >
                        <ModeIcon mode={mode} />
                        <span className="text-[11px] font-semibold">{t(MODE_LABEL[mode])}</span>
                        <span className="text-xs font-bold">{info && "geometry" in info ? formatDuration(info.duration_s) : "—"}</span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const info = routes[tripMode];
                  if (!info || !("geometry" in info)) {
                    return <p role="status" className="rounded-xl bg-white/10 p-3 text-sm">{t("Nta nzira ibonetse kuri ubu buryo. Gerageza ubundi buryo cyangwa uhitemo indi ntangiriro.")}</p>;
                  }
                  return (
                    <div className="space-y-2">
                      <p className="text-lg font-bold">{formatDuration(info.duration_s)} <span className="text-sm font-semibold text-white/80">· {formatDistance(info.distance_m)}</span></p>
                      <button type="button" onClick={() => setStepsOpen(!stepsOpen)} aria-expanded={stepsOpen} className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-white/40 px-4 text-sm font-semibold hover:bg-white/10">
                        {stepsOpen ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}{t("Inzira yose")}
                      </button>
                      {stepsOpen && (
                        <ol className="space-y-1.5 text-sm">
                          {info.steps.map((step, index) => (
                            <li key={index} className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-1.5">
                              <span data-no-localize={step.name ? "true" : undefined}>{step.name ?? t(ROAD_CLASS_LABEL[step.cls] ?? "Umuhanda")}</span>
                              <span className="shrink-0 text-white/80">{formatDistance(step.distance_m)}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      <p className="text-[11px] text-white/70">{t("Igihe ni igereranya ukurikije ubwoko bw'umuhanda; umubyigano ntiubariwemo.")}</p>
                    </div>
                  );
                })()}
              </>
            )}
            <p className="text-[10px] text-white/60">{t("Imihanda: © OpenStreetMap contributors (ODbL), yakusanyirijwe muri IWACU.")}</p>
          </div>
        </section>
      )}

      {/* Place sheet */}
      {sheetOpen && !trip && (
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
                  {status === "ready" && (
                    <button type="button" onClick={() => startTrip(place)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#FAD201] px-4 text-sm font-bold text-[#10261C] hover:bg-[#f0c800]">
                      <Navigation className="h-4 w-4" aria-hidden />{t("Jya hano")}
                    </button>
                  )}
                </div>
                {(place.level === "village" || place.level === "cell") && place.ancestors?.some((a) => a.level === "cell" || a.level === "sector") && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/85" aria-label={t("Imbibi z'aho hantu")}>
                    <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[#FAD201]" aria-hidden />{t(levelTitle(place.level))} <b data-no-localize="true">{displayName(place, locale)}</b></li>
                    {place.ancestors.filter((a) => a.level === "cell" || a.level === "sector").reverse().map((a) => (
                      <li key={a.scope_code} className="flex items-center gap-1.5">
                        <span className={"inline-block h-0 w-5 border-t-2 border-dashed " + (a.level === "cell" ? "border-[#5CC0F0]" : "border-[#FB923C]")} aria-hidden />
                        {t(levelTitle(a.level))} <b data-no-localize="true">{displayName(a, locale)}</b>
                      </li>
                    ))}
                  </ul>
                )}

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
