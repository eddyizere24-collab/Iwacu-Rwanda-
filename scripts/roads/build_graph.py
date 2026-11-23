"""
Builds IWACU's own road graph for Rwanda from OpenStreetMap data (ODbL, (c) OpenStreetMap contributors).

Output: a gzip-compressed binary file (little endian) read by src/lib/routing/graph.ts.
  header : "IWRG", version u32, nNodes u32, nEdges u32, nShape u32, nNames u32, nameBytes u32
  nodes  : lat int32[nNodes], lng int32[nNodes]                      (degrees * 1e6)
  edges  : from u32[], to u32[], len_dm u32[] (decimetres), name u32[] (0 = none, else index + 1),
           shape_start u32[], shape_count u16[], cls u8[], surf u8[], flags u8[]   (each padded to 4 bytes)
  shape  : dlat int16[nShape], dlng int16[nShape]                    (interior points, delta from the previous point)
  names  : offsets u32[nNames + 1], then the UTF-8 bytes (padded to 4 bytes)
Only intersections and dead ends become nodes; everything between is kept as shape points of an edge.
"""
import array
import gzip
import math
import os
import struct
import sys

import numpy as np
import osmium

CLASS = {
    "trunk": 0, "trunk_link": 0, "primary": 1, "primary_link": 1, "secondary": 2, "secondary_link": 2,
    "tertiary": 3, "tertiary_link": 3, "residential": 4, "unclassified": 4, "road": 4, "living_street": 4,
    "service": 5, "track": 6, "path": 7, "bridleway": 7, "footway": 8, "pedestrian": 8, "steps": 9, "cycleway": 10,
}
PAVED = {"asphalt", "paved", "concrete", "paving_stones", "cobblestone", "concrete:plates", "concrete:lanes", "sett", "metal"}
UNPAVED = {"unpaved", "compacted", "dirt", "ground", "gravel", "sand", "earth", "mud", "grass", "fine_gravel", "pebblestone", "clay", "rock"}
INT16 = 32000  # largest delta kept in one int16 shape step


class Collector(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.refs = array.array("q")
        self.lats = array.array("i")
        self.lngs = array.array("i")
        self.way_start = array.array("q")
        self.way_cls = array.array("B")
        self.way_surf = array.array("B")
        self.way_flags = array.array("B")
        self.way_name = array.array("I")
        self.names = {}
        self.name_list = []

    def way(self, w):
        hw = w.tags.get("highway")
        cls = CLASS.get(hw) if hw else None
        if cls is None:
            return
        if w.tags.get("access") in ("no", "private") or w.tags.get("area") == "yes":
            return
        try:
            pts = [(n.ref, n.lat, n.lon) for n in w.nodes if n.location.valid()]
        except osmium.InvalidLocationError:
            return
        if len(pts) < 2:
            return
        surface = w.tags.get("surface", "")
        surf = 1 if surface in PAVED else 2 if surface in UNPAVED else 0
        oneway = w.tags.get("oneway", "")
        flags = 1 if oneway in ("yes", "1", "true") else 2 if oneway == "-1" else 0  # bit0 forward only, bit1 reverse only
        if w.tags.get("junction") == "roundabout":
            flags = 1
        name = w.tags.get("name", "").strip()
        idx = 0
        if name:
            if name not in self.names:
                self.names[name] = len(self.name_list) + 1
                self.name_list.append(name)
            idx = self.names[name]
        self.way_start.append(len(self.refs))
        self.way_cls.append(cls)
        self.way_surf.append(surf)
        self.way_flags.append(flags)
        self.way_name.append(idx)
        for ref, lat, lon in pts:
            self.refs.append(ref)
            self.lats.append(int(round(lat * 1e6)))
            self.lngs.append(int(round(lon * 1e6)))


def haversine_m(lat1, lng1, lat2, lng2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def pad4(buf):
    return buf + b"\0" * (-len(buf) % 4)


def main(src, out):
    c = Collector()
    c.apply_file(src, locations=True, idx="flex_mem")
    n_way = len(c.way_start)
    refs = np.frombuffer(c.refs, dtype=np.int64)
    lats = np.frombuffer(c.lats, dtype=np.int32)
    lngs = np.frombuffer(c.lngs, dtype=np.int32)
    starts = np.frombuffer(c.way_start, dtype=np.int64)
    ends = np.append(starts[1:], len(refs))
    print("ways", n_way, "points", len(refs), flush=True)

    uniq, counts = np.unique(refs, return_counts=True)
    is_node = counts >= 2
    is_node[np.searchsorted(uniq, np.concatenate([refs[starts], refs[ends - 1]]))] = True
    node_refs = uniq[is_node]
    n_nodes = len(node_refs)
    # per point: is it a node? and which node index
    pos = np.searchsorted(node_refs, refs)
    pos[pos >= n_nodes] = n_nodes - 1
    point_is_node = node_refs[pos] == refs
    node_lat = np.zeros(n_nodes, dtype=np.int32)
    node_lng = np.zeros(n_nodes, dtype=np.int32)
    node_lat[pos[point_is_node]] = lats[point_is_node]
    node_lng[pos[point_is_node]] = lngs[point_is_node]
    pos_l = pos.tolist()
    isn_l = point_is_node.tolist()
    lat_l = lats.tolist()
    lng_l = lngs.tolist()

    e_from, e_to, e_len, e_name, e_sstart = (array.array("I") for _ in range(5))
    e_scount = array.array("H")
    e_cls, e_surf, e_flags = (array.array("B") for _ in range(3))
    s_dlat, s_dlng = array.array("h"), array.array("h")

    for w in range(n_way):
        a, b = int(starts[w]), int(ends[w])
        seg = a
        for j in range(a + 1, b):
            if not isn_l[j]:
                continue
            length = 0.0
            for k in range(seg + 1, j + 1):
                length += haversine_m(lat_l[k - 1] / 1e6, lng_l[k - 1] / 1e6, lat_l[k] / 1e6, lng_l[k] / 1e6)
            sstart = len(s_dlat)
            pla, pln = lat_l[seg], lng_l[seg]
            kept = 0
            for k in range(seg + 1, j):
                la, ln = lat_l[k], lng_l[k]
                while abs(la - pla) > INT16 or abs(ln - pln) > INT16:
                    mla, mln = pla + (la - pla) // 2, pln + (ln - pln) // 2
                    s_dlat.append(mla - pla); s_dlng.append(mln - pln)
                    kept += 1
                    pla, pln = mla, mln
                s_dlat.append(la - pla); s_dlng.append(ln - pln)
                kept += 1
                pla, pln = la, ln
            if pos_l[seg] == pos_l[j] and kept == 0:
                seg = j
                continue  # a zero-length loop
            e_from.append(pos_l[seg]); e_to.append(pos_l[j])
            e_len.append(int(round(length * 10)))
            e_name.append(int(c.way_name[w]))
            e_sstart.append(sstart)
            e_scount.append(min(kept, 65535))
            e_cls.append(int(c.way_cls[w])); e_surf.append(int(c.way_surf[w])); e_flags.append(int(c.way_flags[w]))
            seg = j

    n_edges = len(e_from)
    names_b = [n.encode("utf-8") for n in c.name_list]
    offsets = array.array("I", [0])
    for nb in names_b:
        offsets.append(offsets[-1] + len(nb))
    raw = b"".join([
        struct.pack("<4sIIIIII", b"IWRG", 1, n_nodes, n_edges, len(s_dlat), len(names_b), sum(len(x) for x in names_b)),
        node_lat.tobytes(), node_lng.tobytes(),
        e_from.tobytes(), e_to.tobytes(), e_len.tobytes(), e_name.tobytes(), e_sstart.tobytes(),
        pad4(e_scount.tobytes()), pad4(e_cls.tobytes()), pad4(e_surf.tobytes()), pad4(e_flags.tobytes()),
        pad4(s_dlat.tobytes()), pad4(s_dlng.tobytes()),
        offsets.tobytes(), pad4(b"".join(names_b)),
    ])
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with gzip.open(out, "wb", compresslevel=9) as f:
        f.write(raw)
    print("nodes", n_nodes, "edges", n_edges, "shape points", len(s_dlat), "names", len(names_b))
    print("raw bytes", len(raw))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
