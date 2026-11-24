import assert from "node:assert/strict";
import test from "node:test";
import { boundsIntersectRect, kigaliBlocksFor, planOverlay, tileBounds, tilesFor, tileInsideRect } from "./tiles";

test("zoom decides the level: villages close up, cells, sectors, then nothing", () => {
  assert.equal(planOverlay(16)?.level, "village");
  assert.equal(planOverlay(16)?.sizeMilli, 20);
  assert.equal(planOverlay(12)?.sizeMilli, 50);
  assert.equal(planOverlay(11)?.level, "cell");
  assert.equal(planOverlay(9)?.level, "sector");
  assert.equal(planOverlay(8), null);
});

test("tiles cover the viewport with no gaps and stay inside Rwanda", () => {
  const view = { west: 30.054, south: -1.969, east: 30.075, north: -1.941 };
  const tiles = tilesFor(view, 20);
  for (const lng of [view.west, view.east, 30.06]) for (const lat of [view.south, view.north, -1.95]) {
    assert.ok(tiles.some((t) => { const b = tileBounds(t, 20); return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north; }), `point ${lat},${lng} is covered`);
  }
  assert.ok(tiles.length >= 4 && tiles.length <= 12);
  assert.equal(tilesFor({ west: 10, south: 10, east: 11, north: 11 }, 20).length, 0);
});

test("Kigali pack blocks line up with the build script's 0.1 degree grid", () => {
  const keys = kigaliBlocksFor({ west: 30.05, south: -1.97, east: 30.08, north: -1.94 }, 0.1);
  assert.deepEqual(keys, ["300,-20"]);
  assert.deepEqual(kigaliBlocksFor({ west: 30.05, south: -1.95, east: 30.15, north: -1.85 }, 0.1).sort(), ["300,-19", "300,-20", "301,-19", "301,-20"]);
  const rect: [number, number, number, number] = [29.967, -2.09, 30.287, -1.77];
  assert.ok(boundsIntersectRect({ west: 30.0, south: -1.97, east: 30.1, north: -1.9 }, rect));
  assert.ok(!boundsIntersectRect({ west: 29.0, south: -1.5, east: 29.2, north: -1.4 }, rect));
  assert.ok(tileInsideRect({ ix: 1503, iy: -99 }, 20, rect));
  assert.ok(!tileInsideRect({ ix: 1498, iy: -99 }, 20, rect));
});
