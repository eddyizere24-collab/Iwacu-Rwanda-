/**
 * IWACU's own road graph for Rwanda (built from OpenStreetMap by scripts/roads/build_graph.py).
 * This module only reads the compact binary format; routing lives in router.ts.
 */

export type RoadGraph = {
  nodeCount: number;
  edgeCount: number;
  /** degrees * 1e6 */
  lat: Int32Array;
  lng: Int32Array;
  from: Uint32Array;
  to: Uint32Array;
  /** edge length in decimetres */
  lenDm: Uint32Array;
  /** 0 = no name, otherwise name index + 1 */
  name: Uint32Array;
  shapeStart: Uint32Array;
  shapeCount: Uint16Array;
  cls: Uint8Array;
  surf: Uint8Array;
  /** bit0: one way (from to to); bit1: one way (to to from) */
  flags: Uint8Array;
  shapeDLat: Int16Array;
  shapeDLng: Int16Array;
  nameOffsets: Uint32Array;
  nameBytes: Uint8Array;
  /** CSR adjacency: entries are edge * 2 + side (side 0 leaves `from`, side 1 leaves `to`). */
  adjStart: Uint32Array;
  adj: Uint32Array;
};

const pad4 = (n: number) => n + ((4 - (n % 4)) % 4);

export function parseRoadGraph(source: ArrayBuffer | Uint8Array): RoadGraph {
  const buffer = source instanceof Uint8Array
    ? source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer
    : source;
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "IWRG") throw new Error("Not an IWACU road graph");
  if (view.getUint32(4, true) !== 1) throw new Error("Unsupported road graph version");
  const nodeCount = view.getUint32(8, true);
  const edgeCount = view.getUint32(12, true);
  const shapeCount = view.getUint32(16, true);
  const nameCount = view.getUint32(20, true);
  const nameByteCount = view.getUint32(24, true);

  let offset = 28;
  const take = <T extends ArrayBufferView>(ctor: { new (b: ArrayBuffer, o: number, l: number): T; BYTES_PER_ELEMENT: number }, length: number): T => {
    const out = new ctor(buffer, offset, length);
    offset += pad4(length * ctor.BYTES_PER_ELEMENT);
    return out;
  };

  const lat = take(Int32Array, nodeCount);
  const lng = take(Int32Array, nodeCount);
  const from = take(Uint32Array, edgeCount);
  const to = take(Uint32Array, edgeCount);
  const lenDm = take(Uint32Array, edgeCount);
  const name = take(Uint32Array, edgeCount);
  const shapeStart = take(Uint32Array, edgeCount);
  const eShapeCount = take(Uint16Array, edgeCount);
  const cls = take(Uint8Array, edgeCount);
  const surf = take(Uint8Array, edgeCount);
  const flags = take(Uint8Array, edgeCount);
  const shapeDLat = take(Int16Array, shapeCount);
  const shapeDLng = take(Int16Array, shapeCount);
  const nameOffsets = take(Uint32Array, nameCount + 1);
  const nameBytes = new Uint8Array(buffer, offset, nameByteCount);

  const degree = new Uint32Array(nodeCount + 1);
  for (let e = 0; e < edgeCount; e++) {
    degree[from[e] + 1]++;
    degree[to[e] + 1]++;
  }
  for (let i = 0; i < nodeCount; i++) degree[i + 1] += degree[i];
  const adjStart = degree;
  const fill = new Uint32Array(nodeCount);
  const adj = new Uint32Array(edgeCount * 2);
  for (let e = 0; e < edgeCount; e++) {
    const f = from[e];
    const t = to[e];
    adj[adjStart[f] + fill[f]++] = e * 2;
    adj[adjStart[t] + fill[t]++] = e * 2 + 1;
  }

  return {
    nodeCount, edgeCount, lat, lng, from, to, lenDm, name, shapeStart, shapeCount: eShapeCount, cls, surf, flags,
    shapeDLat, shapeDLng, nameOffsets, nameBytes, adjStart, adj,
  };
}

export function edgeName(graph: RoadGraph, edge: number): string | null {
  const index = graph.name[edge];
  if (!index) return null;
  const start = graph.nameOffsets[index - 1];
  const end = graph.nameOffsets[index];
  return new TextDecoder().decode(graph.nameBytes.subarray(start, end));
}

/** Interior points of an edge as [lat, lng] degrees, in the direction from `from` to `to`. */
export function edgeShape(graph: RoadGraph, edge: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let la = graph.lat[graph.from[edge]];
  let ln = graph.lng[graph.from[edge]];
  const start = graph.shapeStart[edge];
  for (let i = 0; i < graph.shapeCount[edge]; i++) {
    la += graph.shapeDLat[start + i];
    ln += graph.shapeDLng[start + i];
    out.push([la / 1e6, ln / 1e6]);
  }
  return out;
}
