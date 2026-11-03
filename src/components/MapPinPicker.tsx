"use client";
// CHANGED 2026-11-03 GROK: MapLibre + same-origin PMTiles; remove unpkg and OSM raster tiles; see docs/HANDOFF.md
import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { buildBasemapStyle } from "@/lib/basemap-style";

type Point = { latitude: number; longitude: number };
declare global { interface Window { maplibregl?: any; pmtiles?: any; } }
let pmtilesProtocolRegistered = false;

function loadVendor(): Promise<{ maplibregl: any }> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.maplibregl && window.pmtiles) return Promise.resolve({ maplibregl: window.maplibregl });
  const base = window.location.origin + "/rwanda-grid-map/basemap/vendor";
  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-iwacu-maplibre="css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = base + "/maplibre-gl.css";
      css.dataset.iwacuMaplibre = "css";
      document.head.appendChild(css);
    }
    const loadScript = (src: string, flag: string) =>
      new Promise<void>((res, rej) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[data-iwacu-vendor="${flag}"]`);
        if (existing) {
          existing.addEventListener("load", () => res(), { once: true });
          existing.addEventListener("error", () => rej(new Error("vendor " + flag)), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.iwacuVendor = flag;
        script.onload = () => res();
        script.onerror = () => { script.remove(); rej(new Error("vendor " + flag)); };
        document.body.appendChild(script);
      });
    loadScript(base + "/pmtiles.js", "pmtiles")
      .then(() => loadScript(base + "/maplibre-gl.js", "maplibre"))
      .then(() => {
        if (!window.maplibregl || !window.pmtiles) { reject(new Error("vendor init")); return; }
        if (!pmtilesProtocolRegistered) {
          const protocol = new window.pmtiles.Protocol();
          window.maplibregl.addProtocol("pmtiles", protocol.tile);
          pmtilesProtocolRegistered = true;
        }
        resolve({ maplibregl: window.maplibregl });
      })
      .catch(reject);
  });
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
  const [overlayMessage, setOverlayMessage] = useState("Kwegera ku ikarita (zoom) kugira ngo ubone imbibi z'imidugudu.");
  const [selected, setSelected] = useState<Point | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const requestRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeMap = () => { setOpen(false); setMapStatus("idle"); };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMapStatus("loading");
    loadVendor().then(({ maplibregl }) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      let lastKnown: Point | null = null;
      try {
        const raw = localStorage.getItem("iwacu-last-location-fix");
        if (raw) {
          const saved = JSON.parse(raw) as { latitude?: number; longitude?: number; recordedAt?: number };
          const age = Number.isFinite(saved.recordedAt) ? Date.now() - (saved.recordedAt as number) : Infinity;
          if (Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) && age >= 0 && age <= 24 * 60 * 60 * 1000) {
            lastKnown = { latitude: saved.latitude as number, longitude: saved.longitude as number };
          }
        }
      } catch { /* overview still works */ }
      const estimated = initialPoint && Number.isFinite(initialPoint.latitude) && Number.isFinite(initialPoint.longitude) ? initialPoint : null;
      const mapStart = estimated ?? lastKnown;
      const center: [number, number] = mapStart ? [mapStart.longitude, mapStart.latitude] : [29.87, -1.94];
      const zoom = mapStart ? 13 : 7;
      const style = buildBasemapStyle(window.location.origin);
      const map = new maplibregl.Map({
        container: containerRef.current, style, center, zoom, minZoom: 6, maxZoom: 17, scrollZoom: false, attributionControl: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;
      const updateMarker = (latitude: number, longitude: number) => {
        setSelected({ latitude, longitude });
        if (!markerRef.current) {
          markerRef.current = new maplibregl.Marker({ draggable: true }).setLngLat([longitude, latitude]).addTo(map);
          markerRef.current.on("dragend", () => {
            const ll = markerRef.current.getLngLat();
            setSelected({ latitude: ll.lat, longitude: ll.lng });
          });
        } else markerRef.current.setLngLat([longitude, latitude]);
      };
      if (mapStart) updateMarker(mapStart.latitude, mapStart.longitude);
      map.on("click", (event: any) => {
        const features = map.queryRenderedFeatures(event.point, { layers: ["villages-fill"] });
        if (features && features.length > 0) {
          try {
            const coords = features[0].geometry?.coordinates;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const walk = (c: any) => {
              if (typeof c[0] === "number") { minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]); minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]); }
              else for (const x of c) walk(x);
            };
            if (coords) walk(coords);
            if (Number.isFinite(minX)) { updateMarker((minY + maxY) / 2, (minX + maxX) / 2); return; }
          } catch { /* free tap */ }
        }
        updateMarker(event.lngLat.lat, event.lngLat.lng);
      });
      const refreshOverlay = async () => {
        if (cancelled) return;
        const currentMap = mapRef.current;
        if (!currentMap) return;
        if (currentMap.getZoom() < 8) {
          if (currentMap.getSource("villages")) {
            if (currentMap.getLayer("villages-line")) currentMap.removeLayer("villages-line");
            if (currentMap.getLayer("villages-fill")) currentMap.removeLayer("villages-fill");
            currentMap.removeSource("villages");
          }
          setOverlayMessage("Kwegera ku ikarita (zoom) kugira ngo ubone imbibi z'imidugudu.");
          return;
        }
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        const bounds = currentMap.getBounds();
        const params = new URLSearchParams({
          west: String(bounds.getWest()), south: String(bounds.getSouth()),
          east: String(bounds.getEast()), north: String(bounds.getNorth()),
        });
        try {
          setOverlayMessage("Turimo gushaka imbibi z'imidugudu...");
          const response = await fetch("/api/location-map?" + params.toString(), { signal: controller.signal, cache: "force-cache" });
          if (!response.ok) throw new Error("boundary_overlay_unavailable");
          const geojson = await response.json();
          if (cancelled || controller.signal.aborted || !mapRef.current) return;
          if (currentMap.getSource("villages")) (currentMap.getSource("villages") as any).setData(geojson);
          else {
            currentMap.addSource("villages", { type: "geojson", data: geojson });
            currentMap.addLayer({ id: "villages-fill", type: "fill", source: "villages", paint: { "fill-color": "#48A868", "fill-opacity": 0.06 } });
            currentMap.addLayer({ id: "villages-line", type: "line", source: "villages", paint: { "line-color": "#20603D", "line-width": 1, "line-opacity": 0.8 } });
          }
          setOverlayMessage("Kanda ku mudugudu cyangwa aho uri ku ikarita.");
        } catch (error: any) {
          if (error?.name === "AbortError") return;
          setOverlayMessage("Imbibi ntizibashije gufunguka. Ushobora gukomeza guhitamo aho uri ku ikarita.");
        }
      };
      const scheduleOverlayRefresh = () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => void refreshOverlay(), 450);
      };
      map.on("load", () => { setMapStatus("ready"); scheduleOverlayRefresh(); });
      map.on("moveend", scheduleOverlayRefresh);
    }).catch(() => { if (!cancelled) setMapStatus("error"); });
    return () => {
      cancelled = true;
      requestRef.current?.abort();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
    };
  }, [open, initialPoint?.latitude, initialPoint?.longitude]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <MapPin className="h-4 w-4 text-[#20603D]" aria-hidden />
            Hitamo aho uri ku ikarita
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Kanda aho uri cyangwa ukurure akamenyetso. Imbibi zigaragara aho amakuru aboneka.
          </p>
        </div>
        <button type="button" onClick={() => (open ? closeMap() : setOpen(true))}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
          {open ? <X className="h-4 w-4" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
          {open ? "Funga ikarita" : "Fungura ikarita"}
        </button>
      </div>
      {open && (
        <div className="mt-4">
          <div ref={containerRef} className="h-[320px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[400px]" aria-label="Ikarita yo guhitamo aho uri" />
          {mapStatus === "loading" && <p role="status" className="mt-2 text-xs text-muted-foreground">Turimo gufungura ikarita...</p>}
          {mapStatus === "error" && <p role="status" className="mt-2 text-xs text-amber-700">Ikarita ntiyafungutse. Reba interineti cyangwa ukoreshe urutonde rw'imidugudu.</p>}
          <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">{overlayMessage}</p>
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
            Amakarita: © OpenStreetMap contributors (ODbL); OpenMapTiles; MapLibre GL; PMTiles; Noto Sans (SIL OFL 1.1).
            Imbibi z'imidugudu zivanwa muri database. IP cyangwa GPS ishobora kwibeshya; genzura umudugudu mbere yo kuwemeza.
          </p>
        </div>
      )}
    </section>
  );
}
