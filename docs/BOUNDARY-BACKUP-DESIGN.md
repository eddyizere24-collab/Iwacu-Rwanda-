# IWACU RWANDA 2 — Boundary backup design (metadata sidecar)

**Prepared:** 2026-11-01  
**Status:** Design only. No export was run and no database schema/data was changed.

## 1. Goal and scope

Create a recoverable, owner-controlled copy of the database-side administrative attributes for the **17,423 boundary records**, with district-by-district files, stable IDs, parent relationships, names and a manifest with counts and checksums.

**Do not duplicate the geometry work already being produced by Grok in `iwacu-rwanda-grid`.** Grok is producing the village export and dissolved polygons. This database-side export should be the small metadata sidecar that allows those geometry files to be matched to the official administrative hierarchy and restored into our own database.

The export must not introduce a new anon-callable RPC/function, expose geometry through PostgREST, use another organisation's runtime, or require a paid service.

## 2. What the database still needs to provide

Use `public.boundaries` as the canonical database-side hierarchy metadata source. It contains 17,423 rows and is the table used by the current location engine's database-backed boundary lookup.

For each row, the metadata sidecar should preserve:

| Field | Purpose |
|---|---|
| `id` | Existing internal UUID; preserve for database restore where practical. |
| `scope_code` | Stable official IWACU/NISR-derived key used to join to Grok's geometry files. |
| `level` | province / district / sector / cell / village (and any country row if present). |
| `name_kiny` | Primary Kinyarwanda name. |
| `name_eng` | English name where populated. |
| `parent_id` | Existing internal parent UUID. |
| `parent_scope_code` | Resolve `parent_id` to the parent's `scope_code` so joins and restore do not depend only on UUIDs. |
| `path` | Hierarchical `ltree` path. |
| `valid_from`, `valid_to` | Preserve validity and historical/current status. |
| `version`, `created_at`, `updated_at` | Preserve database version/audit metadata. |
| `area_m2` | Preserve calculated area metadata; geometry stays in Grok's geometry deliverable. |

Export `public.place_names` separately as the optional multilingual/alias sidecar, keyed by resolving `place_id` to `boundaries.id` or the canonical `scope_code`. It currently contains 34,846 rows, so it may preserve names beyond the two primary columns. Fields to keep: language, name, normalized_name, is_primary and source. It should not replace `name_kiny` / `name_eng` in the main boundary metadata file.

### Join rule

**Join the geometry delivered by Grok to the database metadata by `scope_code`, not by a newly generated UUID and not by name-only matching.** Names can repeat or change. `scope_code` is the stable administrative key.

The database side must supply the canonical codes, names and parent IDs/parent codes. It does not need to export another copy of the 17,423 geometries.

## 3. Lowest-risk export method

Use a trusted, owner-controlled database connection with read-only access and a client-side stream. The recommended mechanism is a single `psql` session running a read-only repeatable-read transaction and sequential client-side `\copy (SELECT ...)` commands.

- Use `COPY TO STDOUT` / psql's client-side `\copy` so bytes are written by the owner-controlled client to files under the owner's control. Do **not** use server-side `COPY TO '/server/path'`, `COPY PROGRAM`, server file functions, or database-side filesystem access.
- Open one `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY` transaction so the district files and manifest are from a consistent snapshot. End with `COMMIT`.
- Derive the district list from the database's active district rows (or a verified distinct hierarchy query); do not rely on a hand-maintained name list. Export one district at a time in sorted `scope_code` order.
- Include the district root row plus all child levels for that district. Partition by the canonical district `scope_code` prefix; explicitly test for collisions and rows that do not fall beneath one district.
- Export attributes only from `boundaries`; do not select `geom` and do not read the duplicate geometry backup table for this task.
- Use CSV with UTF-8, header row and deterministic column order; write one output file per district to a temporary directory, then atomically rename after validating it.
- Export `place_names` as a separate file per district or a single companion file partitioned by district; resolve `place_id` to `boundaries.scope_code` with a join. Do not use a broad unfiltered REST request.
- Calculate SHA-256 for every completed file and put the checksums in a manifest. Keep an immutable copy of that manifest alongside Grok's geometry package.
- The trusted read-only database connection and target directory must be provisioned by the owner/operator. Do not put credentials in GitHub, report output, source code or this document.

This is a read/export-only process. No new anon-callable SQL function or RPC is proposed or required. No server or external runtime dependency is introduced.

## 4. File layout

Suggested owner-controlled archive:

```text
iwacu-boundary-backup/
  README.md
  MANIFEST.json
  ATTRIBUTION.md
  metadata/
    RW-P1-D11.csv
    RW-P1-D12.csv
    ...
    RW-P5-D57.csv
    place-names/
      RW-P1-D11.csv
      ...
      RW-P5-D57.csv
  geometry-from-iwacu-rwanda-grid/
    [Grok-produced village geometry and dissolved polygons; copied/linked as delivered]
```

Do not regenerate the geometry folder. Record its source commit, output checksums, coordinate reference system, source dataset and transformation notes in `MANIFEST.json`.

## 5. Validation and restore checks

For each district file:

1. Record exact row count and min/max `scope_code`.
2. Confirm `scope_code` is unique within the file and across all files.
3. Confirm each child's `parent_id` resolves to an exported parent row, except legitimate top-level rows whose parent is null.
4. Confirm each non-null `parent_scope_code` resolves to the expected ancestor and that the scope-code prefix agrees with the hierarchy.
5. Confirm no row has been silently dropped at a per-file or client-side row limit.
6. Confirm UTF-8 names round-trip exactly and empty `name_eng` values remain null/empty as represented in source.
7. Compare total exported boundary rows with the database catalogue count: **17,423** at design time.
8. Validate that each Grok geometry feature has exactly one matching metadata `scope_code`, and list unmatched geometry and metadata codes separately.
9. Hash files, then perform a restore rehearsal into an isolated local/test database or schema before any production restore. The rehearsal is not part of this design-only task.

The restore should upsert by `scope_code`, retain existing internal UUIDs where possible, and resolve parent relationships only after all parent rows are present. Geometry is loaded from the Grok deliverable by `scope_code`; it is not regenerated from this metadata sidecar.

## 6. Observed storage figures and planning estimates

The following PostgreSQL catalog sizes were observed read-only in the allowed project `buexgewxypvkqmphvfec` on 2026-11-01. They are table/relation storage figures, not exported file sizes.

| Table | Rows observed | Total relation size | Heap | Indexes |
|---|---:|---:|---:|---:|
| `public.boundaries` | 17,423 | 102 MB | 61 MB | 6,720 kB |
| `public.places` | 17,423 | 98 MB | 59 MB | 6,536 kB |
| `public.place_names` | 34,846 | 10 MB | 3,288 kB | 7,360 kB |
| `public._bak_boundaries_geom` | 17,423 | 92 MB | 6,144 kB | 0 bytes |
| `public._bak_boundaries_meta` | 1 | 8 kB | 8 kB | 0 bytes |

The geometry backup relation's 92 MB includes large TOAST storage. It is **not** a reason to export it again because Grok is already preparing geometry files.

### Estimated metadata export size

These are rough planning estimates, not measured export output:

- `boundaries` attribute-only CSV (17,423 rows): approximately **4–10 MB uncompressed**, typically **1–3 MB gzip** depending on name and path lengths.
- `place_names` companion CSV (34,846 rows): approximately **2–6 MB uncompressed**, typically **0.5–2 MB gzip**.
- Manifest, README, attribution and checksums: well under **1 MB**.
- Expected database-side metadata archive: approximately **6–16 MB uncompressed**, approximately **1.5–5 MB gzip**.
- Geometry files from Grok are outside these estimates and should be accounted for using Grok's own generated file sizes and checksums.

Allow at least **25 MB** of free working space for the metadata sidecar and temporary writes. Keep geometry capacity planning separate and use actual Grok output measurements.

## 7. What was not done

- No boundary table or geometry was exported.
- No database rows, schema, permissions or RPC functions were changed.
- No new anon-callable function was created.
- No duplicate geometry export was started.
- No restore operation was attempted.
- The figures above came from read-only catalog inspection; no table-wide geometry query or heavy scan was run for the estimates.

## 8. Decision

Proceed with a **sequential, client-side, read-only metadata export**, grouped by district, in a repeatable-read snapshot. Grok supplies the village geometry and dissolved polygons. IWACU's database supplies the canonical names, scope codes, parent IDs/parent scope codes, hierarchy path, validity/version metadata and optional multilingual `place_names` records. Match by `scope_code`, verify all counts and checksums, and rehearse restore before using the files operationally.
