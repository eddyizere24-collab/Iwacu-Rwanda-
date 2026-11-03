// CHANGED 2026-11-03 GROK: embed packages/basemap-style/src/style.json (blob ba61cef7); substitute __BASE__ only; see docs/HANDOFF.md
const EMBEDDED = {"version": 8, "name": "iwacu-rwanda-light", "sources": {"rwanda": {"type": "vector", "url": "pmtiles://__BASE__/rwanda.pmtiles"}}, "glyphs": "__BASE__/vendor/fonts/{fontstack}/{range}.pbf", "layers": [{"id": "bg", "type": "background", "paint": {"background-color": "#f0f4f0"}}, {"id": "landcover", "type": "fill", "source": "rwanda", "source-layer": "landcover", "paint": {"fill-color": "#c6ddb0", "fill-opacity": 0.55}}, {"id": "landuse", "type": "fill", "source": "rwanda", "source-layer": "landuse", "paint": {"fill-color": "#d5e8c8", "fill-opacity": 0.4}}, {"id": "park", "type": "fill", "source": "rwanda", "source-layer": "park", "paint": {"fill-color": "#b8d9a0", "fill-opacity": 0.5}}, {"id": "water", "type": "fill", "source": "rwanda", "source-layer": "water", "paint": {"fill-color": "#7eb6d9"}}, {"id": "waterway", "type": "line", "source": "rwanda", "source-layer": "waterway", "paint": {"line-color": "#7eb6d9", "line-width": 1}}, {"id": "building", "type": "fill", "source": "rwanda", "source-layer": "building", "minzoom": 13, "paint": {"fill-color": "#c9c4b8", "fill-opacity": 0.7}}, {"id": "transportation", "type": "line", "source": "rwanda", "source-layer": "transportation", "paint": {"line-color": "#f0c27a", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 14, 3]}}, {"id": "transportation_name", "type": "symbol", "source": "rwanda", "source-layer": "transportation_name", "layout": {"text-field": ["get", "name"], "text-size": 11, "text-font": ["Noto Sans Regular"]}, "paint": {"text-color": "#444", "text-halo-color": "#fff", "text-halo-width": 1}}, {"id": "boundary", "type": "line", "source": "rwanda", "source-layer": "boundary", "paint": {"line-color": "#888", "line-width": 1, "line-dasharray": [2, 2]}}, {"id": "place", "type": "symbol", "source": "rwanda", "source-layer": "place", "layout": {"text-field": ["coalesce", ["get", "name"], ""], "text-size": 12, "text-font": ["Noto Sans Regular"]}, "paint": {"text-color": "#222", "text-halo-color": "#fff", "text-halo-width": 1.2}}, {"id": "poi", "type": "symbol", "source": "rwanda", "source-layer": "poi", "minzoom": 12, "layout": {"text-field": ["get", "name"], "text-size": 10, "text-font": ["Noto Sans Regular"]}, "paint": {"text-color": "#555", "text-halo-color": "#fff", "text-halo-width": 1}}, {"id": "mountain_peak", "type": "symbol", "source": "rwanda", "source-layer": "mountain_peak", "layout": {"text-field": ["get", "name"], "text-size": 11, "text-font": ["Noto Sans Regular"]}, "paint": {"text-color": "#333", "text-halo-color": "#fff", "text-halo-width": 1}}]} as const;

/** Same-origin basemap style. Replaces __BASE__ with absolute origin path for PMTiles workers. */
export function buildBasemapStyle(origin: string): Record<string, unknown> {
  const base = origin.replace(/\/+$/, "") + "/rwanda-grid-map/basemap";
  const raw = JSON.stringify(EMBEDDED);
  if (raw.includes("http://") || raw.includes("https://")) {
    throw new Error("basemap style contains absolute http(s) before substitution");
  }
  const withBase = raw.split("__BASE__").join(base);
  const style = JSON.parse(withBase) as Record<string, unknown>;
  const asText = JSON.stringify(style);
  for (const m of asText.matchAll(/https?:\/\/[^"\s]+/g)) {
    const u = m[0];
    if (!u.startsWith(origin)) {
      throw new Error("basemap style URL not same-origin: " + u);
    }
  }
  return style;
}
