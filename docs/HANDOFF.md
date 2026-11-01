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

## 2026-11-01 — National validation preflight failure and runner correction

- **Agent:** CHATGPT
- **Branch:** `wip/r2`; prior runner/workflow source commit `6a538d9d72634d5ee5fd05ee368238490f864929`.
- **Workflow run:** [R2 V2 national low-load validation](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/actions/runs/41323355777), run ID `41323355777`.
- **What happened:** CI passed all checks (validator syntax, ESLint, location/protection tests, both accuracy checks, TypeScript and Next.js production build). All five matrix jobs then failed at their truth-row precondition before starting the local `/api/locate` request loop. Each batch completed 0 of 600 planned classifier requests; the error count was 0 because the failure happened while reading test truth data. The Kivu/outside step was skipped because the matrix did not pass. The aggregate job saved all five failure records and its report to `wip/p3-results`, commit `c48423c4bd3bcdcf576fe4a3de22dd9880ae2362`.
- **Verified raw failure counts:** batch 1: 0/600, setup error `Nyarugenge does not have exactly 25 truth points`; batch 2: 0/600, `Huye does not have exactly 25 truth points`; batch 3: 0/600, `Rutsiro does not have exactly 25 truth points`; batch 4: 0/600, `Rulindo does not have exactly 25 truth points`; batch 5: 0/600, `Nyagatare does not have exactly 25 truth points`. All recorded `total_errors=0`, no minimum request gap measured, and no raw location observations. Therefore no accuracy/latency conclusion can be drawn from this run.
- **Root cause:** The runner requested up to 150 truth rows for six districts in one PostgREST REST response. The project's Data API row cap truncated this response below 150 rows. This contradicted the verified SQL count (500 seed rows per district, of which 400 are `interior`); the database did not lack the required truth rows.
- **What changed in the correction:** The runner now fetches exactly 25 `interior` records per district in six separate REST requests, validates district/seed/kind and paces these reads at least 2,100 ms apart. Its request pacing state carries through to the first local locate request. It treats a valid `status=outside` classification as a non-empty, non-API-error response; an outside classification on an inside truth point remains incorrect and is explicitly counted as a false outside flag. The Kivu sampler-to-first-locate interval is also paced to at least 2,100 ms. Added offline self-tests for exact inside, valid outside, false outside, outside false-negative, confidence null handling and transport error semantics. The updated workflow invokes those self-tests in the CI gate before any DB measurements.
- **Files changed:** `scripts/r2-national-validation.mjs`; `.github/workflows/r2-national-validation.yml`; this append-only handoff entry.
- **Current verification:** The failed run is complete. All five raw batch artifacts were fetched from `wip/p3-results` and independently inspected; all contain zero locate requests. The full CI success belongs to the preceding runner commit, not the corrected code. The corrected runner and offline self-tests have been committed in the source change associated with this handoff; their CI and API results are pending the next Actions run.
- **Safety / impact:** No `/api/locate` request was issued by the failed run. Only the intended allow-listed project's bounded truth REST preflight reads occurred. No database data, functions, permissions, Vercel settings, environment variables, integrations, or Production deployment were modified. No production promotion or merge was performed.
- **Open risks:** The corrected per-district REST page size (25) still needs confirmation in the next workflow run. National accuracy, informativeness, error rate, empty rate, confidence coverage, latency, Kivu behaviour and outside flagging remain completely unmeasured. The prior gate report is a failed preflight record, not an accuracy report.
- **Rollback:** Revert this correction commit on `wip/r2` or delete that branch. The failed workflow only wrote diagnostic files to `wip/p3-results`; those can be reverted independently. `main` and Production are unchanged.
- **Next step:** Run the corrected workflow only after this failed run has completed (it has). First require the new CI gate and offline self-tests to pass, then inspect all five batch outputs and the special-point output. Never describe this first run as national validation success.

## 2026-11-01 — Offline self-test fixture correction

- **Agent:** CHATGPT
- **Previous source commit:**  e846b80c3b376e90675fc339f62c0dc9d03b607e.
- **Workflow run:** Corrected R2 validation attempt — https://github.com/eddyizere24-collab/Iwacu-rwanda-2/actions/runs/41324193032 (run ID 41324193032).
- **What happened:** The new CI-only offline semantic test caught a fixture mismatch before the national matrix began. The runner correctly uses the context property 'outsideExpected', while two test fixtures mistakenly supplied 'expectedOutside'. The CI job failed at the offline self-test. The five national batches and special-point job were skipped; no local /api/locate requests were made.
- **What changed:** Corrected the two synthetic outside-test contexts to use 'outsideExpected', matching the production runner contract. Updated the workflow's own-path comment so the corrected commit starts a fresh CI-gated run. No classifier/API/database logic was changed in this correction.
- **Files:** scripts/r2-national-validation.mjs; .github/workflows/r2-national-validation.yml; this append-only handoff entry.
- **Verified vs not:** The preceding workflow's CI failed only at the added offline semantic test, with exact message 'self-test failed: correctly flagged outside point'. This is a fixture naming defect, not a failed /api/locate result. The corrected commit is recorded in Git history and requires a fresh CI run. National accuracy, latency and all special-point measurements remain untested.
- **Safety / impact:** No national or special validation API requests ran during run 41324193032. No Supabase data/functions/grants, Vercel configuration or environment, Supabase integration, Preview or Production release were changed.
- **Open risks:** The corrected offline test still needs to pass in CI. Once it does, the next unverified step is the first real truth REST page read per district; the PostgREST cap fix remains unproven until the 25-row checks pass.
- **Rollback:** Revert this fixture correction on wip/r2; all prior commits and the main branch remain untouched.
- **Next step:** Let the new workflow's CI and offline self-test finish first. Proceed to the serial district batches only on a green CI result. Inspect each raw file; a preflight failure is not accuracy evidence.

## 2026-11-01 — Confirm and commit the offline fixture fix

- **Agent:** CHATGPT
- **Previous branch head:** ec2cd0ca7e395431034a9e441cbc628fd2ff825a.
- **Correction to the prior entry:** A follow-up inspection of the committed Git tree showed that ec2cd0ca7e395431034a9e441cbc628fd2ff825a reused the previous runner/workflow blobs. It did not actually include the already-created outsideExpected fixture patch; the committed runner still used the mismatched expectedOutside name in its two offline fixture objects. The preceding entry's statement that the fixture correction was committed was therefore premature. This entry corrects that record without deleting earlier handoff history.
- **What changed now:** This commit includes the correct runner blob with both offline fixture contexts using outsideExpected, matching the runner implementation. It also includes the workflow blob with the own-file trigger comment updated, so this push starts a new Actions run.
- **Files:** scripts/r2-national-validation.mjs; .github/workflows/r2-national-validation.yml; this append-only handoff entry.
- **Why:** Make the outside-result self-test executable and ensure CI can gate national database requests with the actual corrected script.
- **Verified vs not:** Before this commit, the branch tree was inspected and the runner fixture mismatch confirmed. The corrected source blob was inspected and contains three outsideExpected occurrences (two self-test fixtures plus the real outside sample context), with no expectedOutside:true test fixture. The workflow's CI includes the offline self-test. This commit's CI and the real national truth query remain to be run.
- **Safety / impact:** No database or application endpoint was called for this correction. No Vercel or Supabase configuration, integration, production release or branch merge was changed.
- **Open risks:** CI may reveal further self-test issues; REST page reads and real locate measurements remain pending.
- **Rollback:** Revert this code/test/workflow change on wip/r2; main and Production remain unchanged.
- **Next step:** Verify the new Actions run starts, require CI and offline self-tests to pass, then review the first truth-page preflight and proceed with the low-load matrix only after green CI.

## 2026-11-01 — Item 3: remove all runtime dependence on NISR GIS servers

- **Agent:** CHATGPT
- **What changed:** Replaced coordinate fallback HTTP calls with the repository's bundled offline location index; changed the `/api/locate?index=1` fallback to the same checked-in index after the owned Supabase `boundaries` query; removed dormant NISR lookup code from `/api/ai-router`, which now contains only the existing `search_places` RPC path; deleted the no-longer-used `src/lib/national-boundaries.ts` module.
- **Why:** Runtime location, search and fallback must work from data owned by IWACU RWANDA 2, with no live request to `gis-server.statistics.gov.rw` or any other NISR GIS endpoint. The main locate path continues using our own Supabase database; a failure uses the committed offline index, and the last-resort answer remains the honest Rwanda province prior.
- **Files:** `src/app/api/locate/route.ts`; `src/app/api/ai-router/route.ts`; `src/lib/national-boundaries.ts` (deleted); `.github/workflows/location-engine-checks.yml` (adds a CI-only `wip/r2` push trigger for the edited runtime paths).
- **Tests:** The CI-only location-engine workflow runs lint, mocked location/protection tests, accuracy-rejection guards, TypeScript and Next.js build with placeholder Supabase configuration; it does not connect to the live database. Results are pending at commit time and will be appended in the next handoff entry if this job finishes.
- **Verified vs not:** Static source review confirms the active route no longer imports or calls the NISR boundary module and the AI search endpoint no longer contains its unused NISR `fetch` logic. The repository's boundary downloader remains a manual ingestion script; it is not imported by or called from runtime routes. CI has not yet been reported green for this commit.
- **Open risks:** The bundled offline index is representative-point metadata, not full polygon geometry; offline estimates must remain labelled estimates, not exact polygon classifications. Runtime accuracy still depends primarily on our Supabase PostGIS tables/RPCs. The checked-in index may need a controlled regeneration when the owned boundary dataset is updated.
- **Rollback:** Revert this commit on `wip/r2`; no main merge or Production deployment was made. The previous NISR implementation remains in the parent commit for exact restoration.
- **Next step:** Verify that CI is green and search all runtime source paths for remaining `gis-server.statistics.gov.rw` or `statistics.gov.rw/server/rest` URLs. Then record the licence findings and the boundary-export handoff design independently.
