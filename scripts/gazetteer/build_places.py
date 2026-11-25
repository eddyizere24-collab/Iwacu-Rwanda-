"""Named places of Rwanda from OpenStreetMap, as one small JSON file for IWACU's search.

Cities, towns, suburbs (Kigali's neighbourhoods) and the landmarks people ask the way to:
hospitals, universities, stadiums, markets, bus stations, hotels, museums, attractions, airports, peaks, lakes.
Usage: python build_places.py rwanda.osm.pbf out.json
"""
import json
import sys

import osmium

# category key -> importance (0-9). The search ranks cities and towns above everything else.
CATS = {
    "city": 9, "town": 8, "suburb": 6, "neighbourhood": 4, "quarter": 4,
    "aerodrome": 8, "hospital": 7, "university": 7, "stadium": 7, "bus_station": 7,
    "marketplace": 6, "townhall": 6, "museum": 6, "attraction": 6, "college": 5,
    "hotel": 5, "peak": 5, "lake": 5, "viewpoint": 4, "guest_house": 3,
}
ALT_KEYS = ("name:rw", "name:en", "name:fr", "alt_name", "official_name", "short_name", "old_name")


def category(tags):
    place = tags.get("place")
    if place in ("city", "town", "suburb", "neighbourhood", "quarter"):
        return place
    amenity = tags.get("amenity")
    if amenity in ("hospital", "university", "college", "bus_station", "marketplace", "townhall"):
        return amenity
    tourism = tags.get("tourism")
    if tourism in ("hotel", "museum", "attraction", "viewpoint", "guest_house"):
        return tourism
    if tags.get("leisure") == "stadium":
        return "stadium"
    if tags.get("aeroway") == "aerodrome":
        return "aerodrome"
    natural = tags.get("natural")
    if natural == "peak":
        return "peak"
    if natural == "water" and tags.get("water") == "lake":
        return "lake"
    return None


class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.items = []

    def add(self, tags, lat, lng):
        cat = category(tags)
        name = tags.get("name") or tags.get("name:rw") or tags.get("name:en")
        if not cat or not name:
            return
        alts = []
        for key in ALT_KEYS:
            value = tags.get(key)
            if value and value != name and value not in alts:
                alts.append(value)
        self.items.append([name, cat, round(lat, 5), round(lng, 5), "|".join(alts)])

    def node(self, n):
        if n.location.valid():
            self.add(n.tags, n.location.lat, n.location.lon)

    def way(self, w):
        if not len(w.tags) or category(w.tags) is None:
            return
        try:
            pts = [(x.lat, x.lon) for x in w.nodes if x.location.valid()]
        except Exception:
            return
        if pts:
            self.add(w.tags, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def main(src, dst):
    handler = Handler()
    handler.apply_file(src, locations=True)
    # one entry per name + category within about 150 m
    seen = {}
    kept = []
    for item in sorted(handler.items, key=lambda i: -CATS[i[1]]):
        key = (item[0].lower(), item[1])
        near = [p for p in seen.get(key, []) if abs(p[0] - item[2]) < 0.0014 and abs(p[1] - item[3]) < 0.0014]
        if near:
            continue
        seen.setdefault(key, []).append((item[2], item[3]))
        kept.append(item)
    cats = sorted(CATS, key=lambda c: -CATS[c])
    out = {"v": 1, "cats": cats, "imp": [CATS[c] for c in cats],
           "p": [[i[0], cats.index(i[1]), i[2], i[3], i[4]] for i in kept]}
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    counts = {}
    for i in kept:
        counts[i[1]] = counts.get(i[1], 0) + 1
    print("kept", len(kept), "of", len(handler.items), counts)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
