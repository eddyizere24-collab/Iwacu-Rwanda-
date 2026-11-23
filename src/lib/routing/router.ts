import { edgeName, edgeShape, type RoadGraph } from "./graph";
import { ACCESS_KMH, edgeSpeedKmh, PROFILES, type TravelMode } from "./profiles";

export type LatLng = { lat: number; lng: number };
export type RouteLeg = { name: string | null; cls: number; distance_m: number; duration_s: number };
export type RouteResult = {
  distance_m: number;
  duration_s: number;
  geometry: Array<[number, number]>;
  legs: RouteLeg[];
};
export type RouteFailure = { error: "no_road_near_start" | "no_road_near_end" | "no_route" };

const CELL = 0.01; // degrees (about 1.1 km)
const MAX_SNAP_M = 3000;
const MAX_SEEDS = 4;
const MODES: TravelMode[] = ["car", "moto", "bike", "foot"];

type Index = {
  minLat: number; minLng: number; cols: number; rows: number;
  cellStart: Uint32Array; cellEdges: Uint32Array;
  cost: Record<TravelMode, Float32Array>;
  /** per mode: size of the connected road network each edge belongs to (tiny islands are skipped when snapping) */
  island: Record<TravelMode, Uint32Array>;
};
const MIN_NETWORK_EDGES = 200;
const indexes = new WeakMap<RoadGraph, Index>();

export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371000;
  const p1 = (aLat * Math.PI) / 180;
  const p2 = (bLat * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((bLng - aLng) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Every vertex of an edge (both end nodes and the shape points between them) as [lat, lng] degrees. */
function edgePoints(graph: RoadGraph, e: number): Array<[number, number]> {
  const a = graph.from[e], b = graph.to[e];
  return [[graph.lat[a] / 1e6, graph.lng[a] / 1e6], ...edgeShape(graph, e), [graph.lat[b] / 1e6, graph.lng[b] / 1e6]];
}

function getIndex(graph: RoadGraph): Index {
  const existing = indexes.get(graph);
  if (existing) return existing;
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (let n = 0; n < graph.nodeCount; n++) {
    const la = graph.lat[n] / 1e6, ln = graph.lng[n] / 1e6;
    if (la < minLat) minLat = la; if (la > maxLat) maxLat = la;
    if (ln < minLng) minLng = ln; if (ln > maxLng) maxLng = ln;
  }
  minLat -= CELL; minLng -= CELL; maxLat += CELL; maxLng += CELL;
  const cols = Math.ceil((maxLng - minLng) / CELL) + 1;
  const rows = Math.ceil((maxLat - minLat) / CELL) + 1;
  const cellOf = (la: number, ln: number) => Math.floor((la - minLat) / CELL) * cols + Math.floor((ln - minLng) / CELL);
  const cellStart = new Uint32Array(rows * cols + 1);
  const cellsOfEdge = (e: number): number[] => {
    const cells: number[] = [];
    for (const [la, ln] of edgePoints(graph, e)) {
      const c = cellOf(la, ln);
      if (!cells.includes(c)) cells.push(c);
    }
    return cells;
  };
  for (let e = 0; e < graph.edgeCount; e++) for (const c of cellsOfEdge(e)) cellStart[c + 1]++;
  for (let i = 0; i < rows * cols; i++) cellStart[i + 1] += cellStart[i];
  const fill = new Uint32Array(rows * cols);
  const cellEdges = new Uint32Array(cellStart[rows * cols]);
  for (let e = 0; e < graph.edgeCount; e++) for (const c of cellsOfEdge(e)) cellEdges[cellStart[c] + fill[c]++] = e;

  const cost = {} as Record<TravelMode, Float32Array>;
  const island = {} as Record<TravelMode, Uint32Array>;
  for (const mode of MODES) {
    const secs = new Float32Array(graph.edgeCount);
    const parent = new Int32Array(graph.nodeCount);
    for (let n = 0; n < graph.nodeCount; n++) parent[n] = n;
    const find = (x: number) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    for (let e = 0; e < graph.edgeCount; e++) {
      const speed = edgeSpeedKmh(mode, graph.cls[e], graph.surf[e]);
      secs[e] = speed > 0 ? (graph.lenDm[e] / 10) / (speed / 3.6) : Infinity;
      if (speed > 0) parent[find(graph.from[e])] = find(graph.to[e]);
    }
    const size = new Uint32Array(graph.nodeCount);
    for (let e = 0; e < graph.edgeCount; e++) if (secs[e] !== Infinity) size[find(graph.from[e])]++;
    const perEdge = new Uint32Array(graph.edgeCount);
    for (let e = 0; e < graph.edgeCount; e++) if (secs[e] !== Infinity) perEdge[e] = size[find(graph.from[e])];
    cost[mode] = secs;
    island[mode] = perEdge;
  }
  const built = { minLat, minLng, cols, rows, cellStart, cellEdges, cost, island };
  indexes.set(graph, built);
  return built;
}

type Snap = {
  edge: number;
  meters: number;
  /** share of the edge length between `from` and the snapped point (0..1) */
  fraction: number;
  /** polyline segment holding the snapped point, and the point itself */
  seg: number;
  point: [number, number];
  pts: Array<[number, number]>;
};

function projectOnEdge(graph: RoadGraph, e: number, p: LatLng): Snap {
  const pts = edgePoints(graph, e);
  const kx = Math.cos((p.lat * Math.PI) / 180) * 111320, ky = 110540;
  let best = Infinity, bestSeg = 0, bestT = 0;
  const cum = [0];
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = (pts[i][1] - p.lng) * kx, ay = (pts[i][0] - p.lat) * ky;
    const bx = (pts[i + 1][1] - p.lng) * kx, by = (pts[i + 1][0] - p.lat) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    cum.push(cum[i] + Math.sqrt(len2));
    if (d < best) { best = d; bestSeg = i; bestT = t; }
  }
  const total = cum[cum.length - 1];
  const along = cum[bestSeg] + bestT * (cum[bestSeg + 1] - cum[bestSeg]);
  const a = pts[bestSeg], b = pts[bestSeg + 1];
  return {
    edge: e,
    meters: best,
    fraction: total > 0 ? along / total : 0,
    seg: bestSeg,
    point: [a[0] + bestT * (b[0] - a[0]), a[1] + bestT * (b[1] - a[1])],
    pts,
  };
}

function snapPoint(graph: RoadGraph, index: Index, mode: TravelMode, p: LatLng): Snap[] {
  const costs = index.cost[mode];
  const row = Math.floor((p.lat - index.minLat) / CELL);
  const col = Math.floor((p.lng - index.minLng) / CELL);
  const seen = new Set<number>();
  const found: Snap[] = [];
  for (const radius of [1, 3, 4]) {
    for (let r = row - radius; r <= row + radius; r++) {
      if (r < 0 || r >= index.rows) continue;
      for (let c = col - radius; c <= col + radius; c++) {
        if (c < 0 || c >= index.cols) continue;
        const cell = r * index.cols + c;
        for (let k = index.cellStart[cell]; k < index.cellStart[cell + 1]; k++) {
          const e = index.cellEdges[k];
          if (seen.has(e)) continue;
          seen.add(e);
          if (costs[e] === Infinity) continue;
          const s = projectOnEdge(graph, e, p);
          if (s.meters <= MAX_SNAP_M) found.push(s);
        }
      }
    }
    if (found.length) break;
  }
  // Prefer roads that belong to the real network; a lone footpath fragment cannot lead anywhere.
  const connected = found.filter((s) => index.island[mode][s.edge] >= MIN_NETWORK_EDGES);
  const pool = connected.length ? connected : found;
  pool.sort((a, b) => a.meters - b.meters);
  if (!pool.length) return [];
  const limit = pool[0].meters + 250;
  return pool.filter((s) => s.meters <= limit).slice(0, MAX_SEEDS);
}

class MinHeap {
  private keys: number[] = [];
  private items: number[] = [];
  get size() { return this.keys.length; }
  push(key: number, item: number) {
    const keys = this.keys, items = this.items;
    let i = keys.length;
    keys.push(key); items.push(item);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      keys[i] = keys[p]; items[i] = items[p];
      i = p;
    }
    keys[i] = key; items[i] = item;
  }
  pop(): [number, number] {
    const keys = this.keys, items = this.items;
    const topKey = keys[0], topItem = items[0];
    const lastKey = keys.pop() as number, lastItem = items.pop() as number;
    const n = keys.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= lastKey) break;
        keys[i] = keys[c]; items[i] = items[c];
        i = c;
      }
      keys[i] = lastKey; items[i] = lastItem;
    }
    return [topKey, topItem];
  }
}

/** Points on an edge from the snapped point toward its `to` (forward) or `from` (backward) end. */
function partialPoints(s: Snap, forward: boolean): Array<[number, number]> {
  return forward ? [s.point, ...s.pts.slice(s.seg + 1)] : [s.point, ...s.pts.slice(0, s.seg + 1).reverse()];
}

export function findRoute(graph: RoadGraph, mode: TravelMode, start: LatLng, end: LatLng): RouteResult | RouteFailure {
  const index = getIndex(graph);
  const startSnaps = snapPoint(graph, index, mode, start);
  if (!startSnaps.length) return { error: "no_road_near_start" };
  const endSnaps = snapPoint(graph, index, mode, end);
  if (!endSnaps.length) return { error: "no_road_near_end" };

  const walk = ACCESS_KMH / 3.6;
  const obey = PROFILES[mode].obeysOneWay;
  const costs = index.cost[mode];
  const canForward = (e: number) => !obey || !(graph.flags[e] & 2); // from -> to
  const canBackward = (e: number) => !obey || !(graph.flags[e] & 1); // to -> from

  const dist = new Float64Array(graph.nodeCount).fill(Infinity);
  const prevEdge = new Int32Array(graph.nodeCount).fill(-1);
  const prevSide = new Int8Array(graph.nodeCount);
  const seedOf = new Int32Array(graph.nodeCount).fill(-1);
  const seedForward = new Int8Array(graph.nodeCount);
  const heap = new MinHeap();

  // Start: leave the snapped point along its road toward either end.
  startSnaps.forEach((s, i) => {
    const access = s.meters / walk;
    if (canForward(s.edge)) {
      const n = graph.to[s.edge], t = access + costs[s.edge] * (1 - s.fraction);
      if (t < dist[n]) { dist[n] = t; seedOf[n] = i; seedForward[n] = 1; heap.push(t, n); }
    }
    if (canBackward(s.edge)) {
      const n = graph.from[s.edge], t = access + costs[s.edge] * s.fraction;
      if (t < dist[n]) { dist[n] = t; seedOf[n] = i; seedForward[n] = 0; heap.push(t, n); }
    }
  });

  // Goal: arrive at an end node of the destination's road, then drive to the snapped point.
  const goal = new Map<number, { snap: Snap; extra: number; fromNode: boolean }>();
  for (const g of endSnaps) {
    const access = g.meters / walk;
    if (canForward(g.edge)) {
      const t = access + costs[g.edge] * g.fraction, n = graph.from[g.edge];
      if (!goal.has(n) || t < goal.get(n)!.extra) goal.set(n, { snap: g, extra: t, fromNode: true });
    }
    if (canBackward(g.edge)) {
      const t = access + costs[g.edge] * (1 - g.fraction), n = graph.to[g.edge];
      if (!goal.has(n) || t < goal.get(n)!.extra) goal.set(n, { snap: g, extra: t, fromNode: false });
    }
  }

  // Start and destination on the same road piece: go straight along it.
  let direct: { cost: number; s: Snap; g: Snap } | null = null;
  for (const s of startSnaps) for (const g of endSnaps) {
    if (s.edge !== g.edge) continue;
    const forward = g.fraction >= s.fraction;
    if (forward ? !canForward(s.edge) : !canBackward(s.edge)) continue;
    const cost = (s.meters + g.meters) / walk + costs[s.edge] * Math.abs(g.fraction - s.fraction);
    if (!direct || cost < direct.cost) direct = { cost, s, g };
  }

  let best = direct ? direct.cost : Infinity;
  let bestNode = -1;
  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    if (d >= best) break;
    const target = goal.get(u);
    if (target && d + target.extra < best) { best = d + target.extra; bestNode = u; }
    for (let k = graph.adjStart[u]; k < graph.adjStart[u + 1]; k++) {
      const entry = graph.adj[k];
      const e = entry >> 1, side = entry & 1;
      const c = costs[e];
      if (c === Infinity) continue;
      if (obey) {
        const f = graph.flags[e];
        if (side === 0 && (f & 2)) continue;
        if (side === 1 && (f & 1)) continue;
      }
      const v = side === 0 ? graph.to[e] : graph.from[e];
      const nd = d + c;
      if (nd < dist[v]) { dist[v] = nd; prevEdge[v] = e; prevSide[v] = side; seedOf[v] = -1; heap.push(nd, v); }
    }
  }
  if (!direct && bestNode < 0) return { error: "no_route" };

  const geometry: Array<[number, number]> = [[start.lat, start.lng]];
  const legs: RouteLeg[] = [];
  let distance = 0;
  let duration = 0;
  const addLeg = (e: number, share: number) => {
    const meters = (graph.lenDm[e] / 10) * share;
    const secs = costs[e] * share;
    distance += meters; duration += secs;
    const name = edgeName(graph, e);
    const last = legs[legs.length - 1];
    if (last && last.name === name && last.cls === graph.cls[e]) { last.distance_m += meters; last.duration_s += secs; }
    else legs.push({ name, cls: graph.cls[e], distance_m: meters, duration_s: secs });
  };

  if (direct && (bestNode < 0 || direct.cost <= best)) {
    const { s, g } = direct;
    const forward = g.fraction >= s.fraction;
    geometry.push(s.point);
    const lo = Math.min(s.seg, g.seg), hi = Math.max(s.seg, g.seg);
    const mid = s.pts.slice(lo + 1, hi + 1);
    if (forward === (s.seg <= g.seg)) for (const p of (forward ? mid : mid.reverse())) geometry.push(p);
    geometry.push(g.point);
    distance += s.meters + g.meters; duration += (s.meters + g.meters) / walk;
    addLeg(s.edge, Math.abs(g.fraction - s.fraction));
  } else {
    // Walk the path back from the goal node to the start seed, then lay it out forwards.
    const chain: Array<{ e: number; side: number }> = [];
    let node = bestNode;
    while (prevEdge[node] !== -1) {
      chain.push({ e: prevEdge[node], side: prevSide[node] });
      node = prevSide[node] === 0 ? graph.from[prevEdge[node]] : graph.to[prevEdge[node]];
    }
    chain.reverse();
    const seed = startSnaps[seedOf[node]];
    const forwardFromStart = seedForward[node] === 1;
    // The seed leaves the snapped point toward `node`: forward means node is the edge's `to` end.
    geometry.push(...partialPoints(seed, forwardFromStart));
    distance += seed.meters; duration += seed.meters / walk;
    addLeg(seed.edge, forwardFromStart ? 1 - seed.fraction : seed.fraction);
    for (const { e, side } of chain) {
      const shape = edgeShape(graph, e);
      if (side === 1) shape.reverse();
      for (const p of shape) geometry.push(p);
      const t = side === 0 ? graph.to[e] : graph.from[e];
      geometry.push([graph.lat[t] / 1e6, graph.lng[t] / 1e6]);
      addLeg(e, 1);
    }
    const goalInfo = goal.get(bestNode)!;
    const g = goalInfo.snap;
    // From the goal node along the road to the snapped destination point.
    const approach = goalInfo.fromNode ? g.pts.slice(0, g.seg + 1) : g.pts.slice(g.seg + 1).reverse();
    for (const p of approach.slice(1)) geometry.push(p);
    geometry.push(g.point);
    distance += g.meters; duration += g.meters / walk;
    addLeg(g.edge, goalInfo.fromNode ? g.fraction : 1 - g.fraction);
  }
  geometry.push([end.lat, end.lng]);

  const clean = geometry.filter((p, i) => i === 0 || p[0] !== geometry[i - 1][0] || p[1] !== geometry[i - 1][1]);
  return {
    distance_m: Math.round(distance),
    duration_s: Math.round(duration),
    geometry: clean,
    legs: legs.map((l) => ({ ...l, distance_m: Math.round(l.distance_m), duration_s: Math.round(l.duration_s) })),
  };
}

export function isFailure(result: RouteResult | RouteFailure): result is RouteFailure {
  return "error" in result;
}

/** Drop points that are closer than `minMeters` to the previous kept point (always keeps the first and last). */
export function thinPath(points: Array<[number, number]>, minMeters = 12): Array<[number, number]> {
  if (points.length <= 2) return points;
  const out: Array<[number, number]> = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1];
    if (distanceM(last[0], last[1], points[i][0], points[i][1]) >= minMeters) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}
