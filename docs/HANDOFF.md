# IWACU RWANDA 2 — Engineering handoff

This file is append-only. Add a new dated entry for every subsequent change; do not remove or rewrite earlier entries.

## 2026-11-01 — Release 2 starting checkpoint

- **Agent:** CHATGPT
- **Repository:** `eddyizere24-collab/Iwacu-rwanda-2`
- **Branch:** `wip/r2`, created directly from verified `main`.
- **What changed:** Created this handoff record as the first change on `wip/r2`. No application code, database objects, Vercel settings, environment variables, or integrations were changed.
- **Why:** Preserve the verified Release 1 baseline, guardrails, current evidence and next actions before beginning Release 2.
- **Files:** `docs/HANDOFF.md` (created).
- **Commit SHAs verified before this entry:**
  - Release 1 base / current `main`: `96f4b1d082784dec86b16f09a65059cb84123eb2`.
  - P3 validation source commit: `dd81e7f198339f8b815505ed7cc081e8e94840d0`.
  - P3 results commit: `724d9c2816456b348d91b0fd4ea80ffdd7a7306a`.
  - This entry is introduced by the commit that creates this file; its own SHA is available from the resulting GitHub commit/branch history and is reported separately. A Git commit cannot embed its own SHA in the file it commits.
- **Verified repository state:**
  - The repository default branch is `main`; immediately before branching, the newest commit returned for the repository was `96f4b1d082784dec86b16f09a65059cb84123eb2`. That commit was fetched and its message/diff inspected.
  - Release 1 records V2 as the production default classifier and confidence path. The confidence RPC may be explicitly switched to V1 with `LOCATE_CONFIDENCE_RPC=v1`.
  - Release 1 validation evidence is stored at `wip/p3-results:results/p3-low-load.json`; `RELEASE.md` records its source and results commits. The checked run covers only 3 districts and 75 truth points, not all Rwanda.
  - The recorded V2 correctness by radius is 100%, 97.33%, 93.33% and 96% at 0, 100, 500 and 2,000 m. V2 recorded zero errors, zero empty responses and zero degraded responses; V2 p95 latency was 658, 680, 686 and 938 ms respectively. V1/V2 agreement is informational, not a release gate.
  - The baseline combined commit status returned a successful Vercel status. This is not represented as proof that every GitHub Actions check passed.
  - `wip/p3-results` exists and contains the prior raw results file. `docs/HANDOFF.md` was absent from `main` when checked.
- **Not yet verified / not yet done:**
  - Nationwide performance and accuracy across all 30 districts.
  - Kivu lakeshore and outside-Rwanda classification results.
  - Confidence values recorded in every new raw response row.
  - Removal of the runtime dependency on `gis-server.statistics.gov.rw`.
  - Applicable NISR village-boundary terms and OpenStreetMap ODbL permissions/attribution for the exact datasets used.
  - A safe, measured export plan for all 17,423 boundary records and their geometries.
  - Production behaviour beyond the Release 1 evidence described above.
- **Standing safety and scope rules:**
  - Database access, if required, is restricted to Supabase project ref `buexgewxypvkqmphvfec` only. Never touch `agwfnpwootwsgsdeohcd`.
  - Do not change Vercel project settings, environment variables, or the Supabase integration.
  - Free plans only; do not incur spending.
  - Do not merge to `main`, create a Production deployment, or release without the project lead's explicit word `RELEASE`.
  - Use low-load validation only: one request at a time, at least 2,100 ms between request starts, bounded batches, hard stop on errors, no geometry over REST, and no accidental pushes that trigger database-heavy workflows.
  - Preview uses an empty database and must not be treated as production validation.
- **Open risks:**
  - Previous high-load tests exhausted the free Nano database I/O budget and caused prolonged downtime. The national test must not run concurrently or against Preview.
  - Existing evidence is limited to 3 districts. It cannot justify a nationwide accuracy claim.
  - Confidence percentages are not established as calibrated real-world probabilities yet.
  - External runtime GIS data remains an independence risk until removed and verified.
  - Dataset licences/redistribution rights must be resolved before copying or republishing source boundaries.
- **Rollback:** This work is isolated on `wip/r2`; do not merge or deploy it. To undo this handoff-only change, delete `wip/r2` or revert its handoff commit. Neither action affects `main` or Production.
- **Next step:** Inspect and adapt the existing low-load local-app validation harness for V2-only national testing. Then run 5 sequential batches of 6 districts (25 truth points per district × 4 radii), recording the chosen-level confidence per raw row, and separately test 50 Kivu lakeshore and 50 outside-Rwanda points. Save each batch's raw results on `wip/p3-results`; report district/province metrics and enforce the stated gates. Do not use Preview or alter Production.


## 2026-11-01 — Release 2 national validation harness prepared

- **Agent:** CHATGPT
- **Branch:** `wip/r2`; parent checkpoint commit: `f9bb868809a988e5744295f3ab7de38eb466ca13`.
- **What changed:** Added `scripts/r2-national-validation.mjs` and a dedicated V2-only workflow that triggers only when its own workflow file is pushed to `wip/r2`. It runs a CI gate before any database measurements, followed by five matrix batches with `max-parallel: 1` and `fail-fast: false`. Each batch selects exactly 25 `interior` truth rows per district for seed `20261030`, runs radii 0/100/500/2000 m serially with at least 2,100 ms between API request starts, records the chosen-level confidence plus raw/calibrated values in each raw row, and stops that batch on its first API/runtime error. The special job calls the Kivu truth RPC once and tests 50 Kivu points plus 50 fixed outside points at radius 0. The aggregate job calculates national, province and district metrics and saves available raw batch JSON/report files to workflow-free `wip/p3-results`.
- **Why:** Expand Release 1's three-district evidence without repeating the earlier high-concurrency database overload.
- **Files:** `scripts/r2-national-validation.mjs` (new); `.github/workflows/r2-national-validation.yml` (new); this append-only handoff entry.
- **Read-only database verification (exact project only):**
  - Project ref `buexgewxypvkqmphvfec` is ACTIVE_HEALTHY, Postgres 17.11.
  - `public.w2_truth_samples` contains 500 rows in each of the 30 districts for seed `20261030`: 400 `interior` and 100 `shared_boundary_50m`. The runner takes 25 interior points per district: 750 points × 4 radii = 3,000 requests.
  - `w2_sample_kivu_lakeshore_truth(integer)` exists and is executable by `anon`. Its function definition was read; the runner calls it once with seed `20261030`, takes 50 returned points and does not request geometry.
  - A single read-only SQL check against `public.rwanda_national_geom` verified 50 fixed outside coordinates with `ST_Covers` and `ST_Distance`: 50 outside, 0 inside, minimum boundary distance 28,427 m. The points are distributed across DRC, Burundi, Tanzania and Uganda.
  - No database rows, functions, grants, migrations, Supabase integration, Vercel settings or environment variables were changed.
- **Safety controls:** Exact URL allow-list for `buexgewxypvkqmphvfec`; public anon credential only; explicit `LOCATE_CONFIDENCE_RPC=v2`; no geometry selected over REST; the Next.js app binds to `127.0.0.1`; serial requests; at least 2,100 ms between request starts; immediate stop on an API/runtime error inside a batch; five sequential matrix workers; no Preview or Production validation.
- **Verified vs not:** Truth-table counts, Kivu helper ACL/definition and outside-coordinate truth precheck are verified. The runner and workflow have been committed, but no national `/api/locate` measurements have yet run. CI, the 3,000 national requests, Kivu/outside requests, confidence coverage, metrics and gates are unverified until the Actions run completes. Special points are skipped if any national batch fails; aggregation still saves available partial artifacts.
- **Open risks:** The Kivu helper computes a PostGIS union and may be relatively expensive even though it is called only once. Each 6-district batch requires about 21 minutes of request spacing, plus build overhead. If a batch hits an error, it stops early while later matrix batches continue; the special-point job is skipped unless all five national batches succeed. Confidence fields are captured as returned by the API; they must not be presented as calibrated real-world probabilities without calibration evidence.
- **Rollback:** Revert this source/workflow commit on `wip/r2`, or delete `wip/r2`. It is not merged and this workflow does not deploy Production. The only automated result push is to workflow-free `wip/p3-results`; any result commit can be reverted separately. No rollback has been performed.
- **Next step:** CI must pass first. Then inspect the five batch artifacts and the aggregate gates on `wip/p3-results`. If any batch is incomplete, report its first failure and do not claim nationwide validation passed. Start the independence review only after item 2 has real measured results.
