/** Fixed map tiles so every visitor asks for the same few URLs (cacheable on the CDN and in the browser). */

export type OverlayLevel = "village" | "cell" | "sector" | "district";
export type OverlayPlan = { level: OverlayLevel; sizeMilli: number; tolerance: number } | null;

export const OVERLAY_SIZES_MILLI = [20, 50, 100, 250] as const;
export const KIGALI_BLOCK_DEG = 0.1;

/** What to draw at a zoom: villages up close, then cells, sectors; nothing when the whole country is in view. */
export function planOverlay(zoom: number): OverlayPlan {
  if (zoom >= 14) return { level: "village", sizeMilli: 20, tolerance: 0.00003 };
  if (zoom >= 12) return { level: "village", sizeMilli: 50, tolerance: 0.00006 };
  if (zoom >= 11) return { level: "cell", sizeMilli: 100, tolerance: 0.00015 };
  if (zoom >= 9) return { level: "sector", sizeMilli: 250, tolerance: 0.0003 };
  return null;
}

export type Bounds = { west: number; south: number; east: number; north: number };
export type Tile = { ix: number; iy: number };

export function tileBounds(tile: Tile, sizeMilli: number): Bounds {
  const size = sizeMilli / 1000;
  const pad = 0.0005;
  return {
    west: Math.max(28.7, +(tile.ix * size - pad).toFixed(5)),
    east: Math.min(31.1, +((tile.ix + 1) * size + pad).toFixed(5)),
    south: Math.max(-3.0, +(tile.iy * size - pad).toFixed(5)),
    north: Math.min(-0.8, +((tile.iy + 1) * size + pad).toFixed(5)),
  };
}

/** The tiles that cover a viewport (a hair of slack so boundary rounding never leaves a gap). */
export function tilesFor(view: Bounds, sizeMilli: number): Tile[] {
  const size = sizeMilli / 1000;
  const slack = 0.001;
  const x0 = Math.floor((view.west - slack) / size);
  const x1 = Math.floor((view.east + slack) / size);
  const y0 = Math.floor((view.south - slack) / size);
  const y1 = Math.floor((view.north + slack) / size);
  const out: Tile[] = [];
  for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
    const b = tileBounds({ ix, iy }, sizeMilli);
    if (b.west < b.east && b.south < b.north && b.east > 28.7 && b.west < 31.1 && b.north > -3.0 && b.south < -0.8) out.push({ ix, iy });
  }
  return out;
}

export function tileKey(level: OverlayLevel, sizeMilli: number, tile: Tile): string {
  return `${level}:${sizeMilli}:${tile.ix},${tile.iy}`;
}

export function tileUrl(level: OverlayLevel, sizeMilli: number, tile: Tile): string {
  return `/api/ikarita/overlay?level=${level}&size=${sizeMilli}&ix=${tile.ix}&iy=${tile.iy}`;
}

/** True when a whole tile lies inside the area the static Kigali pack covers. */
export function tileInsideRect(tile: Tile, sizeMilli: number, rect: [number, number, number, number]): boolean {
  const size = sizeMilli / 1000;
  const [w, s, e, n] = rect;
  return tile.ix * size >= w && (tile.ix + 1) * size <= e && tile.iy * size >= s && (tile.iy + 1) * size <= n;
}

/** Index of a village block in the Kigali pack, as written by scripts/build-kigali-pack.mjs. */
export type KigaliIndex = {
  v: string;
  rect: [number, number, number, number] | null;
  block: number;
  village: Record<string, string>;
  failed?: string[];
  cell: string | null;
  sector: string | null;
  district: string | null;
};

export function kigaliBlocksFor(view: Bounds, block: number): string[] {
  const keys: string[] = [];
  const slack = 0.001;
  for (let ix = Math.floor((view.west - slack) / block); ix <= Math.floor((view.east + slack) / block); ix++) {
    for (let iy = Math.floor((view.south - slack) / block); iy <= Math.floor((view.north + slack) / block); iy++) keys.push(`${ix},${iy}`);
  }
  return keys;
}

export function boundsIntersectRect(view: Bounds, rect: [number, number, number, number]): boolean {
  return view.east > rect[0] && view.west < rect[2] && view.north > rect[1] && view.south < rect[3];
}
