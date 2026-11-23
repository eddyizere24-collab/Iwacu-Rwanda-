import collections, sys
import osmium

class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.types = collections.Counter()
        self.len = collections.Counter()
        self.nodes = set()
        self.surface = collections.Counter()
        self.maxspeed = 0
        self.oneway = 0
        self.names = 0
    def way(self, w):
        hw = w.tags.get("highway")
        if not hw:
            return
        self.types[hw] += 1
        self.surface[w.tags.get("surface", "?")] += 1
        if w.tags.get("maxspeed"): self.maxspeed += 1
        if w.tags.get("oneway") in ("yes", "1"): self.oneway += 1
        if w.tags.get("name"): self.names += 1
        for n in w.nodes:
            self.nodes.add(n.ref)

h = H()
h.apply_file(sys.argv[1], locations=False)
print("ways by highway type:")
for k, v in h.types.most_common():
    print(f"  {k}: {v}")
print("total ways", sum(h.types.values()), "unique nodes", len(h.nodes))
print("surfaces", h.surface.most_common(8))
print("with maxspeed", h.maxspeed, "oneway", h.oneway, "named", h.names)
