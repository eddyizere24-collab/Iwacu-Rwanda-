import { gunzipSync } from "node:zlib";
import { parseRoadGraph, type RoadGraph } from "./graph";

let cached: Promise<RoadGraph> | null = null;

/**
 * Reads IWACU's own road graph (public/routing/graph.bin.gz) once per server instance and keeps it in memory.
 * The file is served by the site itself, so no outside routing service is involved.
 */
export function loadRoadGraph(origin: string): Promise<RoadGraph> {
  if (!cached) {
    cached = (async () => {
      const response = await fetch(origin + "/routing/graph.bin.gz", { cache: "force-cache" });
      if (!response.ok) throw new Error("road_graph_unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      const raw = bytes[0] === 0x1f && bytes[1] === 0x8b ? new Uint8Array(gunzipSync(bytes)) : bytes;
      return parseRoadGraph(raw);
    })().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}
