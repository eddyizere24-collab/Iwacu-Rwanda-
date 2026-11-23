import assert from "node:assert/strict";
import test from "node:test";
import { parseRoadGraph } from "./graph";
import { findRoute, isFailure } from "./router";

type N = [number, number];
type E = { a: number; b: number; len: number; cls: number; surf?: number; flags?: number; name?: string };

const pad4 = (n: number) => n + ((4 - (n % 4)) % 4);

/** Serialise a tiny graph in the same IWRG layout the builder script writes. */
function build(nodes: N[], edges: E[]): ArrayBuffer {
  const names: string[] = [];
  const nameIdx = (n?: string) => { if (!n) return 0; let i = names.indexOf(n); if (i < 0) { names.push(n); i = names.length - 1; } return i + 1; };
  const nameBlob = Buffer.from(names.join(""), "utf8");
  edges.forEach((e) => nameIdx(e.name));
  const blob = Buffer.from(names.join(""), "utf8");
  const offsets = [0]; let acc = 0;
  for (const n of names) { acc += Buffer.byteLength(n); offsets.push(acc); }
  void nameBlob;
  const nn = nodes.length, ne = edges.length;
  const total = 28 + pad4(nn * 4) * 2 + pad4(ne * 4) * 5 + pad4(ne * 2) + pad4(ne) * 3 + 0 + 0 + pad4((names.length + 1) * 4) + blob.length;
  const buf = new ArrayBuffer(total + 8);
  const v = new DataView(buf);
  "IWRG".split("").forEach((c, i) => v.setUint8(i, c.charCodeAt(0)));
  v.setUint32(4, 1, true); v.setUint32(8, nn, true); v.setUint32(12, ne, true);
  v.setUint32(16, 0, true); v.setUint32(20, names.length, true); v.setUint32(24, blob.length, true);
  let o = 28;
  nodes.forEach((n, i) => v.setInt32(o + i * 4, Math.round(n[0] * 1e6), true)); o += pad4(nn * 4);
  nodes.forEach((n, i) => v.setInt32(o + i * 4, Math.round(n[1] * 1e6), true)); o += pad4(nn * 4);
  edges.forEach((e, i) => v.setUint32(o + i * 4, e.a, true)); o += pad4(ne * 4);
  edges.forEach((e, i) => v.setUint32(o + i * 4, e.b, true)); o += pad4(ne * 4);
  edges.forEach((e, i) => v.setUint32(o + i * 4, e.len * 10, true)); o += pad4(ne * 4);
  edges.forEach((e, i) => v.setUint32(o + i * 4, nameIdx(e.name), true)); o += pad4(ne * 4);
  edges.forEach((_, i) => v.setUint32(o + i * 4, 0, true)); o += pad4(ne * 4);
  edges.forEach((_, i) => v.setUint16(o + i * 2, 0, true)); o += pad4(ne * 2);
  edges.forEach((e, i) => v.setUint8(o + i, e.cls)); o += pad4(ne);
  edges.forEach((e, i) => v.setUint8(o + i, e.surf ?? 1)); o += pad4(ne);
  edges.forEach((e, i) => v.setUint8(o + i, e.flags ?? 0)); o += pad4(ne);
  offsets.forEach((x, i) => v.setUint32(o + i * 4, x, true)); o += pad4(offsets.length * 4);
  new Uint8Array(buf, o, blob.length).set(blob);
  return buf;
}

// Three nodes in a row about 1.1 km apart, plus a footpath shortcut.
const nodes: N[] = [[-1.95, 30.06], [-1.95, 30.07], [-1.95, 30.08], [-1.96, 30.07]];

test("parses and routes a car along named roads", () => {
  const g = parseRoadGraph(build(nodes, [
    { a: 0, b: 1, len: 1100, cls: 2, name: "KG 1 Ave" },
    { a: 1, b: 2, len: 1100, cls: 2, name: "KG 1 Ave" },
  ]));
  const r = findRoute(g, "car", { lat: -1.95, lng: 30.0601 }, { lat: -1.95, lng: 30.0799 });
  assert.ok(!isFailure(r));
  if (isFailure(r)) return;
  assert.equal(r.legs.length, 1);
  assert.equal(r.legs[0].name, "KG 1 Ave");
  assert.ok(r.distance_m > 2100 && r.distance_m < 2400);
  assert.ok(r.duration_s > 150 && r.duration_s < 300);
});

test("foot can use steps and paths that a car cannot", () => {
  const g = parseRoadGraph(build(nodes, [{ a: 0, b: 1, len: 1100, cls: 8 }]));
  const car = findRoute(g, "car", { lat: -1.95, lng: 30.06 }, { lat: -1.95, lng: 30.07 });
  assert.ok(isFailure(car));
  const foot = findRoute(g, "foot", { lat: -1.95, lng: 30.06 }, { lat: -1.95, lng: 30.07 });
  assert.ok(!isFailure(foot));
  if (!isFailure(foot)) assert.ok(foot.duration_s > 800 && foot.duration_s < 1100);
});

test("one-way roads are obeyed by vehicles but not by walkers", () => {
  // flag bit0: allowed only from -> to
  const g = parseRoadGraph(build(nodes, [{ a: 0, b: 1, len: 1100, cls: 3, flags: 1 }]));
  const back = findRoute(g, "car", { lat: -1.95, lng: 30.07 }, { lat: -1.95, lng: 30.06 });
  assert.ok(isFailure(back));
  const fwd = findRoute(g, "car", { lat: -1.95, lng: 30.06 }, { lat: -1.95, lng: 30.07 });
  assert.ok(!isFailure(fwd));
  const walk = findRoute(g, "foot", { lat: -1.95, lng: 30.07 }, { lat: -1.95, lng: 30.06 });
  assert.ok(!isFailure(walk));
});

test("motorbike is faster than car on tracks and bike slower than moto on paved", () => {
  const g = parseRoadGraph(build(nodes, [{ a: 0, b: 1, len: 1100, cls: 6, surf: 2 }]));
  const a = { lat: -1.95, lng: 30.06 }, b = { lat: -1.95, lng: 30.07 };
  const car = findRoute(g, "car", a, b), moto = findRoute(g, "moto", a, b), bike = findRoute(g, "bike", a, b);
  assert.ok(!isFailure(car) && !isFailure(moto) && !isFailure(bike));
  if (!isFailure(car) && !isFailure(moto) && !isFailure(bike)) {
    assert.ok(moto.duration_s < car.duration_s);
    assert.ok(bike.duration_s > moto.duration_s);
  }
});

test("reports failure when no road is near or no path exists", () => {
  const g = parseRoadGraph(build(nodes, [{ a: 0, b: 1, len: 1100, cls: 3 }]));
  const far = findRoute(g, "car", { lat: 0, lng: 29 }, { lat: -1.95, lng: 30.07 });
  assert.deepEqual(far, { error: "no_road_near_start" });
  const g2 = parseRoadGraph(build(nodes, [
    { a: 0, b: 1, len: 1100, cls: 3 },
    { a: 2, b: 3, len: 1500, cls: 3 },
  ]));
  const disconnected = findRoute(g2, "car", { lat: -1.95, lng: 30.0605 }, { lat: -1.955, lng: 30.0755 });
  assert.ok(isFailure(disconnected));
});
