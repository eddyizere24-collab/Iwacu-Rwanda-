"use client";

import { useEffect, useRef, useState } from "react";
import { Download, MapPin, Trash2, X } from "lucide-react";

type Point = { latitude: number; longitude: number };
type OfflineMapState = "checking" | "missing" | "downloading" | "saved" | "error";

declare global {
  interface Window {
    maplibregl?: any;
    pmtiles?: any;
    __iwacuPmtilesProtocol?: boolean;
  }
}

const MAP_FILE = "/maps/rwanda.pmtiles";
const MAP_CACHE = "iwacu-map-basemap-v1";
let mapLibraryPromise: Promise<void> | null = null;

function loadScript(src: string, key: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  const selector = 'script[data-iwacu-map-script="' + key + '"]';
  const existing = document.querySelector<HTMLScriptElement>(selector);

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      script.dataset.iwacuLoaded = "true";
      ready() ? resolve() : reject(new Error("Map library did not initialise: " + key));
    };
    const onError = () => reject(new Error("Map library could not load: " + key));
    if (existing?.dataset.iwacuLoaded === "true") {
      onLoad();
      return;
    }
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.iwacuMapScript = key;
      document.body.appendChild(script);
    }
  });
}

function loadMapLibraries(): Promise<void> {
  if (window.maplibregl && window.pmtiles) return Promise.resolve();
  if (mapLibraryPromise) return mapLibraryPromise;
  mapLibraryPromise = (async () => {
    if (!document.querySelector('link[data-iwacu-map-css="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/maps/vendor/maplibre-gl.css";
      link.dataset.iwacuMapCss = "true";
      document.head.appendChild(link);
    }
    await loadScript("/maps/vendor/maplibre-gl.js", "maplibre", () => Boolean(window.maplibregl));
    await loadScript("/maps/vendor/pmtiles.js", "pmtiles", () => Boolean(window.pmtiles));
    if (!window.__iwacuPmtilesProtocol) {
      const protocol = new window.pmtiles.Protocol();
      window.maplibregl.addProtocol("pmtiles", protocol.tile);
      window.__iwacuPmtilesProtocol = true;
    }
  })().catch((error) => {
    mapLibraryPromise = null;
    throw error;
  });
  return mapLibraryPromise;
}

async function hasOfflineMap(): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  const cache = await caches.open(MAP_CACHE);
  return Boolean(await cache.match(new Request(new URL(MAP_FILE, window.location.origin).toString())));
}

export function MapPinPicker({
  onSelect,
  initialPoint = null,
}: {
  onSelect: (latitude: number, longitude: number, accuracyMeters: number) => void;
  initialPoint?: Point | null;
}) {
  const [open, setOpen] = useState(false);
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [overlayMessage, setOverlayMessage] = useState("Kwegera ku ikarita kugira ngo ubone imbibi z'imidugudu.");
  const [selected, setSelected] = useState<Point | null>(null);
  const [offlineMapState, setOfflineMapState] = useState<OfflineMapState>("checking");
  const initialLatitude = initialPoint?.latitude;
  const initialLongitude = initialPoint?.longitude;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    void hasOfflineMap()
      .then((saved) => { if (!cancelled) setOfflineMapState(saved ? "saved" : "missing"); })
      .catch(() => { if (!cancelled) setOfflineMapState("missing"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    setMapStatus("loading");

    void loadMapLibraries().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      let lastKnown: Point | null = null;
      try {
        const raw = localStorage.getItem("iwacu-last-location-fix");
        if (raw) {
          const saved = JSON.parse(raw) as { latitude?: number; longitude?: number; recordedAt?: number };
          const age = Number.isFinite(saved.recordedAt) ? Date.now() - (saved.recordedAt as number) : Infinity;
          if (Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) && age >= 0 && age <= 86_400_000) {
            lastKnown = { latitude: saved.latitude as number, longitude: saved.longitude as number };
          }
        }
      } catch {
        // Open the Rwanda overview when no saved device location is available.
      }

      const hasInitialPoint = Number.isFinite(initialLatitude) && Number.isFinite(initialLongitude);
      const mapStart = hasInitialPoint
        ? { latitude: initialLatitude as number, longitude: initialLongitude as number }
        : lastKnown;
      const origin = window.location.origin;
      const style = {
        version: 8,
        sources: {
          rwanda: {
            type: "vector",
            url: "pmtiles://" + origin + MAP_FILE,
            attribution: "© OpenStreetMap contributors · © OpenMapTiles",
          },
        },
        glyphs: origin + "/maps/vendor/fonts/{fontstack}/{range}.pbf",
        layers: [
          { id: "iwacu-bg", type: "background", paint: { "background-color": "#f0f4f0" } },
          { id: "iwacu-landcover", type: "fill", source: "rwanda", "source-layer": "landcover", paint: { "fill-color": "#c6ddb0", "fill-opacity": 0.55 } },
          { id: "iwacu-landuse", type: "fill", source: "rwanda", "source-layer": "landuse", paint: { "fill-color": "#d5e8c8", "fill-opacity": 0.4 } },
          { id: "iwacu-water", type: "fill", source: "rwanda", "source-layer": "water", paint: { "fill-color": "#7eb6d9" } },
          { id: "iwacu-waterway", type: "line", source: "rwanda", "source-layer": "waterway", paint: { "line-color": "#7eb6d9", "line-width": 1 } },
          { id: "iwacu-buildings", type: "fill", source: "rwanda", "source-layer": "building", minzoom: 13, paint: { "fill-color": "#c9c4b8", "fill-opacity": 0.7 } },
          { id: "iwacu-roads", type: "line", source: "rwanda", "source-layer": "transportation", paint: { "line-color": "#f0c27a", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 14, 3] } },
          {
            id: "iwacu-places", type: "symbol", source: "rwanda", "source-layer": "place",
            layout: { "text-field": ["coalesce", ["get", "name"], ""], "text-size": 12, "text-font": ["Noto Sans Regular"] },
            paint: { "text-color": "#222", "text-halo-color": "#fff", "text-halo-width": 1.2 },
          },
        ],
      };

      const map = new window.maplibregl.Map({
        container: containerRef.current,
        style,
        center: mapStart ? [mapStart.longitude, mapStart.latitude] : [30.06, -1.95],
        zoom: mapStart ? 14 : 8,
        minZoom: 7,
        maxZoom: 18,
        attributionControl: true,
      });
      mapRef.current = map;
      map.addControl(new window.maplibregl.NavigationControl(), "bottom-right");

      const updateMarker = (latitude: number, longitude: number) => {
        setSelected({ latitude, longitude });
        if (!markerRef.current) {
          const marker = new window.maplibregl.Marker({ draggable: true })
            .setLngLat([longitude, latitude]).addTo(map);
          marker.on("dragend", () => {
            const point = marker.getLngLat();
            setSelected({ latitude: point.lat, longitude: point.lng });
          });
          markerRef.current = marker;
        } else {
          markerRef.current.setLngLat([longitude, latitude]);
        }
      };

      if (mapStart && Number.isFinite(mapStart.latitude) && Number.isFinite(mapStart.longitude)) {
        updateMarker(mapStart.latitude, mapStart.longitude);
      }
      // Clicking a returned village polygon selects its bounding-box centre.
      // The map overlay itself comes from /api/location-map (Supabase geometry).
      map.on("click", "iwacu-village-fill", (event: any) => {
        const feature = event.features?.[0];
        const coordinates: Array<[number, number]> = [];
        const collectCoordinates = (value: any) => {
          if (!Array.isArray(value)) return;
          if (typeof value[0] === "number" && typeof value[1] === "number") {
            coordinates.push([value[0], value[1]]);
            return;
          }
          for (const child of value) collectCoordinates(child);
        };
        collectCoordinates(feature?.geometry?.coordinates);
        if (coordinates.length === 0) return;
        const longitudes = coordinates.map((point) => point[0]);
        const latitudes = coordinates.map((point) => point[1]);
        const longitude = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
        const latitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
        updateMarker(latitude, longitude);
      });
      map.on("click", (event: any) => {
        const villageHits = map.queryRenderedFeatures(event.point, { layers: ["iwacu-village-fill"] });
        if (villageHits.length > 0) return;
        updateMarker(event.lngLat.lat, event.lngLat.lng);
      });

      const refreshOverlay = async () => {
        if (cancelled || !mapRef.current || !map.isStyleLoaded()) return;
        if (map.getZoom() < 9) {
          setOverlayMessage("Kwegera ku ikarita (zoom) kugira ngo ubone imbibi z'imidugudu.");
          return;
        }
        const bounds = map.getBounds();
        const west = bounds.getWest();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const north = bounds.getNorth();
        if (west < 28.7 || east > 31.1 || south < -3.0 || north > -0.8 || east - west > 0.5 || north - south > 0.5) {
          setOverlayMessage("Kwegera imbere mu Rwanda no muri aka gace kugira ngo ubone imbibi z'imidugudu.");
          return;
        }

        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        const params = new URLSearchParams({
          west: west.toFixed(6), south: south.toFixed(6), east: east.toFixed(6), north: north.toFixed(6),
        });
        try {
          setOverlayMessage("Turimo gushaka imbibi z'imidugudu...");
          const response = await fetch("/api/location-map?" + params.toString(), {
            signal: controller.signal,
            cache: "force-cache",
          });
          if (!response.ok) throw new Error("boundary_overlay_unavailable");
          const geojson = await response.json();
          if (cancelled || controller.signal.aborted || !mapRef.current) return;
          const source = map.getSource("iwacu-village-boundaries");
          if (source && typeof source.setData === "function") source.setData(geojson);
          const count = Array.isArray(geojson.features) ? geojson.features.length : 0;
          setOverlayMessage(count > 0
            ? "Imbibi z'imidugudu zagaragajwe: " + count + ". Zikuwe muri database."
            : "Nta mbibi z'imidugudu zabonetse muri aka gace; gerageza kwegera cyangwa uhitemo ahandi.");
        } catch {
          if (!controller.signal.aborted && !cancelled) {
            setOverlayMessage("Imbibi z'imidugudu ntizabonetse. Ushobora gukomeza guhitamo aho uri ku ikarita.");
          }
        }
      };

      const scheduleOverlayRefresh = () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => void refreshOverlay(), 450);
      };

      map.once("load", () => {
        if (cancelled) return;
        map.addSource("iwacu-village-boundaries", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "iwacu-village-fill", type: "fill", source: "iwacu-village-boundaries",
          paint: { "fill-color": "#48A868", "fill-opacity": 0.06 },
        });
        map.addLayer({
          id: "iwacu-village-outline", type: "line", source: "iwacu-village-boundaries",
          paint: { "line-color": "#20603D", "line-width": 1, "line-opacity": 0.8 },
        });
        setMapStatus("ready");
        map.resize();
        scheduleOverlayRefresh();
      });
      map.on("moveend", scheduleOverlayRefresh);
      map.on("error", () => {
        if (!cancelled) setOverlayMessage("Hari amakuru y'ikarita atabashije gufunguka. Gerageza internet cyangwa ubike ikarita offline.");
      });
    }).catch(() => {
      if (!cancelled) setMapStatus("error");
    });

    return () => {
      cancelled = true;
      requestRef.current?.abort();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [open, initialLatitude, initialLongitude]);

  async function cacheOfflineMap() {
    if (offlineMapState === "downloading") return;
    setOfflineMapState("downloading");
    try {
      if (typeof caches === "undefined" || navigator.onLine === false) throw new Error("offline_storage_unavailable");
      const storage = await navigator.storage?.estimate?.();
      if (storage?.quota && storage.quota - (storage.usage ?? 0) < 55 * 1024 * 1024) {
        throw new Error("not_enough_storage");
      }
      const response = await fetch(MAP_FILE, { cache: "reload" });
      if (!response.ok) throw new Error("map_download_failed");
      const cache = await caches.open(MAP_CACHE);
      const key = new Request(new URL(MAP_FILE, window.location.origin).toString());
      await cache.put(key, response.clone());
      setOfflineMapState("saved");
    } catch {
      setOfflineMapState("error");
    }
  }

  async function removeOfflineMap() {
    try {
      const cache = await caches.open(MAP_CACHE);
      const key = new Request(new URL(MAP_FILE, window.location.origin).toString());
      await cache.delete(key);
      setOfflineMapState("missing");
    } catch {
      setOfflineMapState("error");
    }
  }

  function closeMap() {
    setOpen(false);
    setMapStatus("idle");
    setOverlayMessage("Kwegera ku ikarita kugira ngo ubone imbibi z'imidugudu.");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <MapPin className="h-4 w-4 text-[#20603D]" aria-hidden />
            Hitamo aho uri ku ikarita
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Kanda aho uri cyangwa ukurure akamenyetso. Imbibi z'imidugudu zigaragara aho amakuru aboneka.
          </p>
        </div>
        <button type="button" onClick={() => open ? closeMap() : setOpen(true)}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
          {open ? <X className="h-4 w-4" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
          {open ? "Funga ikarita" : "Fungura ikarita"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          <div ref={containerRef} className="h-[320px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[400px]"
            aria-label="Ikarita yo guhitamo aho uri" />
          {mapStatus === "loading" && <p role="status" className="mt-2 text-xs text-muted-foreground">Turimo gufungura ikarita...</p>}
          {mapStatus === "error" && <p role="status" className="mt-2 text-xs text-amber-700">Ikarita ntiyafungutse. Reba interineti cyangwa ukoreshe urutonde rw'imidugudu.</p>}
          <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">{overlayMessage}</p>

          <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <p className="font-semibold">Ikarita yo gukoresha offline (45 MB)</p>
                <p className="mt-1 text-muted-foreground">Yibika ku gikoresho. Ntabwo irimo imbibi z'imidugudu cyangwa amakuru y'abayobozi.</p>
              </div>
              {offlineMapState === "saved" ? (
                <button type="button" onClick={() => void removeOfflineMap()}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />Kuraho
                </button>
              ) : (
                <button type="button" disabled={offlineMapState === "downloading" || offlineMapState === "checking"}
                  onClick={() => void cacheOfflineMap()}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#20603D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {offlineMapState === "downloading" ? "Turimo kubika..." : "Bika ikarita"}
                </button>
              )}
            </div>
            {offlineMapState === "error" && <p role="status" className="mt-2 text-xs text-amber-700">Ikarita ntiyabitswe. Reba interineti n'umwanya usigaye kuri telefone.</p>}
            {offlineMapState === "saved" && <p role="status" className="mt-2 text-xs text-emerald-700">Ikarita ibitswe kuri iyi telefone. Offline map ni background gusa; umudugudu n'ijanisha biracyasaba amakuru y'imbibi cyangwa igereranya rigenzurwa.</p>}
          </div>

          {selected && (
            <div className="mt-3 rounded-xl bg-emerald-500/10 p-3">
              <p className="text-xs font-semibold">Ahantu wahisemo</p>
              <p className="mt-1 text-xs text-muted-foreground">{selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}</p>
              <button type="button" onClick={() => onSelect(selected.latitude, selected.longitude, 200)}
                className="mt-3 min-h-[44px] w-full rounded-xl bg-[#20603D] px-4 py-2 text-sm font-bold text-white hover:bg-[#17492D]">
                Koresha aha hantu
              </button>
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Ikarita: © OpenStreetMap contributors na OpenMapTiles; imbibi z'imidugudu zivanwa muri database. Offline estimate ikeneye kugenzurwa.
          </p>
        </div>
      )}
    </section>
  );
}
