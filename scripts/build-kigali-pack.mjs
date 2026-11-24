#!/usr/bin/env node
/**
 * Prepares IWACU's "Kigali pack": every village, cell, sector and district outline of Kigali (and a small margin)
 * as static files in public/kigali, so the map opens Kigali instantly from the site's own CDN instead of
 * computing outlines in the database on every visit.
 *
 * Runs before `next build` (npm "prebuild"). It only reads public administrative boundaries through the
 * anon-callable RPC get_ikarita_overlay_v1. It never fails the build: if the database is unreachable the pack is
 * simply empty and the map falls back to loading tiles from /api/ikarita/overlay.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "kigali");
const RECT = { west: 29.967, south: -2.09, east: 30.287, north: -1.77 }; // Kigali province plus a small margin
const BLOCK = 0.1;
const PAD = 0.0005;
const LEVELS = [
  { level: "cell", tolerance: 0.00015, file: "cell.json" },
  { level: "sector", tolerance: 0.0003, file: "sector.json" },
  { level: "district", tolerance: 0.0008, file: "district.json" },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function rpc(box, level, tolerance) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(`${url}/rest/v1/rpc/get_ikarita_overlay_v1`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          p_west: box.west, p_south: box.south, p_east: box.east, p_north: box.north,
          p_level: level, p_tolerance: tolerance, p_limit: 2500,
        }),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const json = await response.json();
      if (!json || json.type !== "FeatureCollection" || !Array.isArray(json.features) || json.truncated) throw new Error("bad payload");
      return json.features;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }
  throw lastError;
}

async function pool(items, size, worker) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    while (queue.length) await worker(queue.shift());
  }));
}

async function main() {
  const version = Date.now().toString(36);
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const index = { v: version, rect: [RECT.west, RECT.south, RECT.east, RECT.north], block: BLOCK, village: {}, failed: [], cell: null, sector: null, district: null };
  if (!url || !key) {
    console.warn("[kigali-pack] Supabase env not set; writing an empty pack (the map will use live tiles).");
    await writeFile(path.join(OUT, "index.json"), JSON.stringify(index));
    return;
  }

  const started = Date.now();
  const blocks = [];
  for (let ix = Math.floor(RECT.west / BLOCK); ix <= Math.floor(RECT.east / BLOCK); ix++) {
    for (let iy = Math.floor(RECT.south / BLOCK); iy <= Math.floor(RECT.north / BLOCK); iy++) blocks.push({ ix, iy });
  }
  let bytes = 0;
  const save = async (name, features) => {
    const body = JSON.stringify({ type: "FeatureCollection", features });
    bytes += body.length;
    await writeFile(path.join(OUT, name), body);
  };

  await pool(blocks, 4, async ({ ix, iy }) => {
    const box = {
      west: Math.max(RECT.west, ix * BLOCK - PAD), east: Math.min(RECT.east, (ix + 1) * BLOCK + PAD),
      south: Math.max(RECT.south, iy * BLOCK - PAD), north: Math.min(RECT.north, (iy + 1) * BLOCK + PAD),
    };
    if (box.west >= box.east || box.south >= box.north) return;
    try {
      const features = await rpc(box, "village", 0.00003);
      if (!features.length) return;
      const name = `village-${ix}_${iy}.json`;
      await save(name, features);
      index.village[`${ix},${iy}`] = name;
    } catch (error) {
      index.failed.push(`${ix},${iy}`);
      console.warn(`[kigali-pack] village block ${ix},${iy} skipped:`, String(error));
    }
  });

  for (const { level, tolerance, file } of LEVELS) {
    try {
      await save(file, await rpc(RECT, level, tolerance));
      index[level] = file;
    } catch (error) {
      console.warn(`[kigali-pack] ${level} skipped:`, String(error));
    }
  }

  await writeFile(path.join(OUT, "index.json"), JSON.stringify(index));
  console.log(`[kigali-pack] ${Object.keys(index.village).length} village blocks + levels, ${(bytes / 1e6).toFixed(2)} MB raw, ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main().catch(async (error) => {
  console.warn("[kigali-pack] failed, continuing without a pack:", String(error));
  try {
    await mkdir(OUT, { recursive: true });
    await writeFile(path.join(OUT, "index.json"), JSON.stringify({ v: "none", rect: null, block: BLOCK, village: {}, failed: [], cell: null, sector: null, district: null }));
  } catch { /* nothing else to do */ }
});
