# HANDOFF — iwacu-rwanda-grid

Standing rule: append a dated entry for every change. Never delete earlier entries.

Commit format: `[GROK] area: what - why - next`
Code: `CHANGED YYYY-MM-DD GROK: <what/why>; see docs/HANDOFF.md`

---

## 2026-11-02 06:45 — GROK — grid-lookup version decision

**Agent:** GROK

**What:** Restored g3 version of `packages/grid-lookup` (irg2.ts 2003 B, index.ts 4167 B, geohash.ts 932 B). Kept both test suites: g3 `parity.test.js` (1738 B) and offline `smoke.test.js` (203 B).

**Why:** `-X theirs` during integrate3 kept offline copies (1650/2960/719). CI failed: parity.test.js imports `encode` from irg2 which offline irg2 does not export. g3 is the full IRG2 TS port aligned with Python codec (0/100k parity is the deciding criterion). offline-locate imports (`encode`, `locate`, `GridIndex`, `loadRootFile`) are satisfied by the g3 API.

**Version kept:** g3. Never delete a test.

---

## 2026-11-02 06:35 — GROK — S0 INTEGRATION ACCEPTED (wip/integrate3)

**Agent:** GROK

**What:** Real merges of all seven WIP branches into `wip/integrate3` via `do_integrate.sh` v2 (`--allow-unrelated-histories -X theirs`). Guard passed in run https://github.com/eddyizere24-collab/iwacu-rwanda-grid/actions/runs/41386312656. Prior branches `wip/integrate` and `wip/integrate2` are obsolete and must not be treated as done.

**Branch status table (all 7 are ancestors of this HEAD)**

| branch | head SHA (40) | what it holds | verified |
|--------|---------------|---------------|----------|
| main | ada1c59401589fadb1b785c95ac2cef483adb82f | offline_parity registration; basemap vendor licences | partial |
| wip/g2 | 9d59f3e0770c73c8e601751cd5cdbe38834d39e1 | matrix exact-build invariants 11/12/13/37 | partial |
| wip/g3 | 03d2facaff46bc060d023bc3cdd00cbbe7a9899d | packages/grid-lookup IRG2 TS + basemap-style | partial |
| wip/g4 | 5335eca1c06cc224fae828eb4049e39bdad3cd8d | export-boundaries + Kivu comparison | yes counts |
| wip/g-dissolve | d95f726a703cf31ac066b00e303633b85196f4c0 | dissolve hierarchy snap 1 m | yes tables |
| wip/offline | 7d517a261d63440839d447a5650011fb71bd8096 | offline-locate + offline_validate harness | partial |
| wip/j | f3d94b82ab914ee57fa49f85582a7f8e3c77ecef | landmarks OSM extract + packages/landmarks | partial extract |
| wip/k | c553e86385365cd22f57a9980b8915b7a61a2a8e | packages/places-search | smoke only |
| wip/integrate3 | (see HEAD after restore) | all of the above merged for real + g3 grid-lookup | guard OK |

**Key file sizes on integrate3 (from guard + restore)**

| file | bytes |
|------|-------|
| scripts/dissolve_hierarchy.py | 8606 |
| scripts/export_boundaries.py | 5327 |
| scripts/extract_landmarks.py | 3294 |
| scripts/offline_validate_district.py | 4325 |
| .github/workflows/grid_invariants_g2.yml | 5486 |
| packages/grid-lookup/test/parity.test.js | 1738 |
| packages/grid-lookup/src/irg2.ts | 2003 |
| packages/grid-lookup/src/index.ts | 4167 |
| packages/grid-lookup/src/geohash.ts | 932 |
| packages/offline-locate/src/index.ts | 7060 |
| packages/basemap-style/src/style.json | 2821 |

**Guard summary:** ANCESTOR YES for all 7; missing_files=0 for all 7; third-party URLs in demo page = 0; GUARD OK.

**Next:** re-run grid-lookup-ts + offline-locate CI; Pages check; heavy jobs (G/E/H/I) only after 22:00 Kigali one at a time.

---

## Prior entries (summary)

- 2026-11-01 offline-locate design (Gaussian + pyramid + TAU).
- dissolve hierarchy snap 1 m on wip/g-dissolve.
- IRG2 binary format; exclusive pure; hierarchical merge; Planetiler Java 21 + PMTiles success.
- Do not treat wip/integrate or wip/integrate2 as complete.
