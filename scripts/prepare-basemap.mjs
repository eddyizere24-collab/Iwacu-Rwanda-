import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "public", "maps");
const SOURCE = "https://raw.githubusercontent.com/eddyizere24-collab/iwacu-rwanda-grid/gh-pages/";
const ASSETS = [
  { source: "basemap/rwanda.pmtiles", target: "rwanda.pmtiles", size: 45127285, sha: "8aee94d88ee798ebbfa0f32d5fad1e3a79f31449" },
  { source: "basemap/vendor/maplibre-gl.js", target: "vendor/maplibre-gl.js", size: 803086, sha: "2caee97b06d1493c0c0393cb2d36f36b3d4d3ec6" },
  { source: "basemap/vendor/maplibre-gl.css", target: "vendor/maplibre-gl.css", size: 65534, sha: "6ceb5de955fe61e92098ecce4fdc4905c1581964" },
  { source: "basemap/vendor/pmtiles.js", target: "vendor/pmtiles.js", size: 51739, sha: "d3d188da2ca8dc4b076f15f06e431c86e8c10f51" },
  { source: "basemap/vendor/fonts/Noto Sans Regular/0-255.pbf", target: "vendor/fonts/Noto Sans Regular/0-255.pbf", size: 76044, sha: "7f65901599b368dc8c1d70d5fed9642148db9836" },
  { source: "basemap/vendor/fonts/Noto Sans Regular/256-511.pbf", target: "vendor/fonts/Noto Sans Regular/256-511.pbf", size: 127726, sha: "f0302889321b2fb9f83e13b5df1a9a6b0b10e6f3" },
  { source: "basemap/vendor/fonts/Noto Sans Regular/512-767.pbf", target: "vendor/fonts/Noto Sans Regular/512-767.pbf", size: 94728, sha: "5cde89d339b3cf0be2039f376fe20cadc75e533e" },
  { source: "basemap/vendor/fonts/Noto Sans Regular/768-1023.pbf", target: "vendor/fonts/Noto Sans Regular/768-1023.pbf", size: 77034, sha: "a1d0bd9140db88a231ba88991e3d3e2191387448" },
  { source: "basemap/vendor/fonts/Noto Sans Regular/1024-1279.pbf", target: "vendor/fonts/Noto Sans Regular/1024-1279.pbf", size: 125320, sha: "d2ae7ab5bc345cbffad661e017e9444a27f78444" },
  { source: "basemap/vendor/licenses/MAPLIBRE-LICENSE.txt", target: "vendor/licenses/MAPLIBRE-LICENSE.txt", size: 5984, sha: "1e8acbb54fa7baddc844377507cc5a79353174fb" },
  { source: "basemap/vendor/licenses/NOTO-SANS-OFL.txt", target: "vendor/licenses/NOTO-SANS-OFL.txt", size: 4396, sha: "6843f31878c9945e1e71e1baa275546b4eefead8" },
  { source: "basemap/vendor/licenses/PMTILES-LICENSE.txt", target: "vendor/licenses/PMTILES-LICENSE.txt", size: 1713, sha: "ec3d69a55220793cb4b2074ebe202df25f9cb417" },
  { source: "ATTRIBUTION.md", target: "ATTRIBUTION.md", size: 828, sha: "4631ebfb8e45c79bacdf63493028c25bc6451c70" },
];

function gitBlobSha(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

async function ensureAsset(asset) {
  const target = join(OUT, asset.target);
  await mkdir(dirname(target), { recursive: true });

  try {
    const existing = await readFile(target);
    if (existing.length === asset.size && gitBlobSha(existing) === asset.sha) {
      console.log("[basemap] cached", asset.target, existing.length);
      return;
    }
  } catch {
    // Fresh Vercel build or local clone without generated map assets.
  }

  console.log("[basemap] fetching", asset.source);
  const response = await fetch(SOURCE + asset.source, {
    signal: AbortSignal.timeout(180000),
    headers: { "User-Agent": "IWACU-RWANDA-2-build" },
  });
  if (!response.ok) {
    throw new Error("Basemap download failed: " + asset.source + " HTTP " + response.status);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualSha = gitBlobSha(bytes);
  if (bytes.length !== asset.size || actualSha !== asset.sha) {
    throw new Error(
      "Basemap integrity check failed for " + asset.target +
      ": expected size=" + asset.size + " sha=" + asset.sha +
      "; got size=" + bytes.length + " sha=" + actualSha
    );
  }
  await writeFile(target, bytes);
  console.log("[basemap] verified", asset.target, bytes.length, actualSha);
}

for (const asset of ASSETS) await ensureAsset(asset);
console.log("[basemap] ready:", ASSETS.length, "verified assets in public/maps");
