# IWACU RWANDA 2 — STATUS

Date: 2026-10-30. This report describes repository state and the PR #3 candidate only. No Production deployment, Supabase data, environment variable, integration, or project setting was changed.

## 1. OVERALL: 19%

This is a task-completion index, **not a location-accuracy score**. Equal weight across T0–T7 (8 tasks): T0 DONE-UNVERIFIED = 0.5; T1 IN PROGRESS = 0.25; T3, T4 and T5 IN PROGRESS = 0.25 each; T2, T6 and T7 = 0. Total 1.5/8 = 18.75%, rounded to 19%.

## 2. TASK TABLE

| ID | status | evidence |
|---|---|---|
| T0 | DONE-UNVERIFIED | GitHub confirms main, PR #2 merged at `3baf94cacbea18d0191c42fcd9774990ad50c901`, PR #3 open. Supabase project and boundary counts verified by connector/SQL. Vercel project is visible in team project listing, but deployment/environment API reads fail with 403/404; production URL, env hostnames and live phone bugs were not independently verified. |
| T1 | IN PROGRESS | Code under test is `07c865e6a81ee5eca4fdb042b1de9b19a196550d`; all later PR #3 commits since that code change update only `docs/STATUS.md`. GitHub Actions run #182 on the code head completed successfully: location unit tests, TypeScript check and Production build all passed. The Vercel check remains failed due the daily deployment/build limit. No gate-complete API/device/calibration evidence. |
| T2 | NOT STARTED | No H3/geohash/national grid index built, compressed, measured or compared with PostGIS. |
| T3 | IN PROGRESS | PR #3 has a map-pin correction component and NISR boundary fallback code, but the complete offline/light vector map with roads/landmarks has not been proven or released. |
| T4 | IN PROGRESS | PR #3 adds a nearby-landmarks route/component backed by OpenStreetMap/Overpass. Live coverage, stability, and indoor usefulness have not been verified. |
| T5 | IN PROGRESS | The OSM route classifies water/wetland features, but no independent Rwanda-wide hydrography dataset is installed or validated. Coverage and nearest-village behavior remain unverified. |
| T6 | NOT STARTED | No complete website-versus-native-Android feasibility report has been published in this PR. |
| T7 | BLOCKED | No current-head HTTP test campaign through `/api/locate`; no real-phone test. Vercel access/build limit currently prevents dependable candidate Preview verification. |

## 3. TEST RESULTS — 2026-10-30

| Date | SHA / run | Test | Route |
|---|---|---|---|
| 2026-10-30 | `07c865e6a81ee5eca4fdb042b1de9b19a196550d`, Actions run #182 (`41021218009`) | Location ranking/unit-test step, TypeScript check and Production build all completed successfully. | Unit tests only; not `/api/locate` |
| 2026-10-30 | Supabase project `buexgewxypvkqmphvfec` | SQL inventory: 17,423 boundaries; 14,823 villages; 2,148 cells; 416 sectors; 30 districts; 5 provinces; 0 leaders. PostGIS 3.3.7 and RPC signature checked. | SQL only; not a location accuracy test |
| Historical | `29159954d590912919338f999bd61d20389105a5` | Previous 600-point synthetic POST suite recorded in the old report. It is not PR #3 head and is not evidence for the current candidate. | Historical Preview `/api/locate` |
| Historical | `1cd3f2ea8ece5a9edafba15a5e310a8119c00a0c` | Previous 450-point near-border suite recorded in the old report. It is not PR #3 head and is not evidence for the current candidate. | Historical Preview `/api/locate` |

No new `/api/locate` HTTP POST run was executed against PR #3 code head. The later PR head updates only add this status document to the already-tested code head. Calibration is not available: polygon-overlap and representative-point weights are scores, not verified probabilities. No calibration table or village/cell/sector/district hit-rate table at 100 m–20 km exists for the PR #3 head.

## 4. REMOVED OR CHANGED FROM BEFORE

- PR #2 is **merged**, not open/draft. Merge commit: `3baf94cacbea18d0191c42fcd9774990ad50c901`. The old main-branch STATUS report incorrectly said PR #2 was open and is superseded by this report.
- PR #3 starts low-accuracy browser geolocation, high-accuracy GPS watch, Vercel IP lookup and stored last-known fix independently; it adds hierarchy aggregation, a five-province prior, versioned picker cache, map correction and OSM landmark lookup.
- On PR #3, commit `8f9cca0fd22b2fe6154b14ad699e527f0e021c1f` changes unexpected POST `/api/locate` failures: it now tries the official representative-point fallback for valid coordinates, then returns an explicitly uninformative service-area prior instead of HTTP 502. Commit `07c865e6a81ee5eca4fdb042b1de9b19a196550d` adds a source-contract test for this path. This test is static source inspection, not a live integration test.
- No merge, Production deploy, rollback, Supabase mutation, environment-variable edit, or Supabase-integration edit was performed.

## 5. BLOCKED

- **Vercel:** project listing identifies `iwacu-rwanda-2` under team `ahabona`, but project/environment detail calls return 404 and deployment listing returns 403. Direct Production URL fetch also reports that the deployment is not available to this connector. Therefore Production deployment ID, environment targets and database hostnames could not be verified. No secret values were requested or read.
- **Preview build limit:** GitHub's Vercel bot recorded `api-deployments-free-per-day`; PR #3 Vercel check was pending/failing for this reason. Avoid triggering unnecessary Preview builds.
- **Owner phone checks (tap-only):** still required for indoor network/Wi-Fi behavior, GPS permission denied/timeout, no internet, and offline after one online cache load.

## 6. UNVERIFIED / RISKS

- The currently implemented no-coordinate/no-IP/no-history fallback returns five equally weighted provinces (20 each). That is a non-empty service-area prior, **not a best estimate of the person's actual province, district, cell or village**. With literally no location signal or prior data, the person's actual location cannot be inferred without making up a name. The UI/API must label this limitation plainly.
- IP fallback uses Vercel latitude/longitude when present and inside Rwanda; otherwise it falls back to the province prior. IP location is coarse and may be wrong, especially on mobile-carrier gateways.
- Browser geolocation does not expose raw cell-tower IDs or Wi-Fi scan results to a normal website. `enableHighAccuracy: false` is a browser request, not a guarantee that a network/Wi-Fi fix will be returned.
- Picker code now uses a province root, five-province label, parent-level filtering and cache version v3. Runtime listing of all five provinces, five full district-to-village paths, and offline-after-one-load have not been exercised on a phone or browser test.
- Tests in this PR include static source/contract checks and unit tests for helper functions. They do not yet exercise every required actual path: network fixes at 100 m/500 m/2 km/5 km/20 km, IP-only, stale-only, permission denied, Supabase down, outside Rwanda, and no signal.
- The PR's representative-point/distance scores and PostGIS area-overlap scores are not calibrated probabilities. Do not display them as real-world hit probabilities until calibration is measured on a separate, sufficiently large labelled test set.
- Existing historical 600-point and 450-point test tables are from older commits and cannot be carried forward as PR #3 release evidence.
- NISR boundary data has known missing villages and Lake Kivu gaps. The new OSM endpoint depends on community-contributed coverage and upstream availability; it may return no nearby features.
- No real-phone test has been done. No claim of nationwide reliability is made.

## 7. NEXT 3 ACTIONS

1. Finish and verify Actions for the exact PR #3 head, then add route-level tests that fail CI for every required no-empty-result scenario and run hierarchical hit-rate/calibration tests on a larger border/Kivu/gap dataset.
2. Test the picker runtime for all five provinces, at least five districts, and offline after one online load; confirm the result UI selects the finest supported level without presenting raw scores as calibrated probabilities.
3. After Vercel connector access and build quota are resolved, test the exact candidate Preview via `/api/locate`, inspect matching Supabase API logs, and provide the owner the tap-only indoor test. Keep PR #3 unmerged and Production unchanged until every T1 gate passes.


## WORK ORDER 03 — P1 implementation update (2026-10-30)

### Current change-set

- Code commit created: `85b35b60ad40c644e45909e6b7aa3e5207eff8d7`.
- Parent: `954fde86aece288312e7946fe509eea5178a0021`.
- 21 files changed in one code commit.
- The commit object is in GitHub, but the branch ref has not been advanced. The earlier owner instruction to avoid Vercel builds until the rolling daily quota resets is still active. Advancing this PR branch can automatically request a Vercel build. No Vercel build, preview, deploy, or test was requested.
- PR #3 remains open and unmerged. Production is unchanged.

### Work-order table

| W# | status | commit SHA | file / implementation | run URL | raw result |
|---|---|---|---|---|---|
| W03-P1a | PARTIAL | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `src/hooks/useLocation.ts` | Not run; branch ref held | coarse network maximumAge 60,000 ms; first-answer fallback timer 3,000 ms; last-confirmed place lookup starts at t=0; GPS/network continues refining |
| W03-P1b | PARTIAL | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `src/app/api/locate/route.ts`, `src/types/location.ts` | Not run | configurable classifier RPC runs before village lookup; outside response includes distance; <=5,000 m border-zone response is district/province only; no village candidate; dataset and signal contract added |
| W03-P1c | DONE-IN-CODE | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `src/app/api/administrative-units/route.ts`, `src/components/VillagePicker.tsx` | Not run | database-only level + parent_id picker; Country excluded by level filter; five provinces queried from DB; breadcrumb path; localStorage v4 cache; no NISR fetch or /api/locate lookup inside picker |
| W03-P1d | DONE-IN-CODE | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `src/app/api/ai-router/route.ts` | Not run | POST calls only search_places; returns full_path and duplicate_count; empty results say no match; legacy NISR and leaders helpers remain but are not called |
| W03-P1e | DONE-IN-CODE | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `src/lib/feature-flags.ts`, `src/lib/feature-flags.test.ts`, `src/app/api/location-context/route.ts`, `src/components/NearbyLandmarks.tsx`, `src/app/page.tsx` | Not run | NEXT_PUBLIC_FEATURE_LANDMARKS defaults OFF; server responds status=disabled; unit test asserts zero requests when OFF |
| W03-P1f | PARTIAL | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `src/app/api/location-map/route.ts`, `src/components/MapPinPicker.tsx` | Not run | map overlay uses get_location_map_overlay RPC, bbox validation, 300-feature cap, Turf simplification; scope_code is kept identical to locate; existing map tap calls locateAtCoordinate -> POST /api/locate |
| W03-P1g | DONE-IN-CODE | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `src/components/LocationReportButton.tsx`, `docs/PHONE-TEST-W4.md` | Not run | copyable JSON report; 10 tap-only phone steps |
| W03-P1h | DONE-IN-CODE | `85b35b60ad40c644e45909e6b7aa3e5207eff8d7` | `scripts/check-no-accuracy-rejection.sh`, `scripts/accuracy-rejection-allowlist.txt`, `docs/ACCURACY-REJECTION-ALLOWLIST.md`, workflow, package.json | Not run | exact grep gate added; allow-list empty; CI step added before typecheck/build |

### P1 evidence and verification status

- 21 blobs were assembled into one atomic code commit. This is a Git commit SHA, not just a report or blob SHA.
- No GitHub Actions run URL exists yet because the commit has not been pushed to the PR branch. No test result is claimed.
- No SQL or Supabase mutation was made. Existing search_places and cell_places were not changed. No database migration was applied.
- No secret values were accessed or printed.
- Remaining verification: TypeScript/build, unit tests including flag-OFF test, outside / border-zone route tests, picker five-province and offline tests, AI search RPC integration, map geometry response and ID equality tests, then phone test.

### P2 — GitHub Actions secrets needed

The runner will start the app locally; tests will call the public read-only PostGIS functions through the same Supabase public client used by the route. No service-role key is needed for the planned P2 read-only matrix.

Create these two **Repository secrets** before P2:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

On Android GitHub website: open repository → Settings → Secrets and variables → Actions → New repository secret. Enter the first exact name and its value from the IWACU Supabase project API settings; save. Repeat for the second exact name and the public anon/publishable-compatible key used by the app. Do not post either value in chat, an issue, or a commit. P2 will stop safely if either secret is missing. `RWANDA_CLASSIFIER_RPC` and `RWANDA_BOUNDARY_DATASET_VERSION` are non-secret variables and are not needed to be secrets.

### Closed items carried forward

- Rollback deployment `dpl_EqeT3pbQHustzJstX9rhAibo1D3z`: READY on `3baf94c`; closed, do not reopen.
- `cell_places`: untouched; do not delete.
- `search_places` DB behaviour: unchanged.
- No `MAX_ACCURACY` policy or constant added.


## 2026-11-08 — Production notification and return-navigation updates

### Merged releases
- PR #21 — [Release location notifications and archive](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/21), merged to `main` as `f03e8a26baf9e5ead0846d1c78b927285ce9f64b`. Introduced location notification rules, village boundary approach calculations, notification archive UI, private server archive/Web Push infrastructure, and a database migration with RLS/rollback. Real Android system delivery and native background GPS were not verified or implemented.
- PR #22 — [Keep notification history on the phone and deliver banners immediately](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/22), merged to `main` as `d3536803bbb2500f3874633e026c60e150e0c414`. Active client notifications are saved locally and shown through the Service Worker without waiting for server/network delivery. The archive now reads local phone-browser storage. Administrative notifications are emitted together rather than serially. The browser and GPS/geometry timing still determine actual time-to-banner.

### Follow-up change under review
- PR #23 — retain the last successful location on return, add an unread notification badge, mark archive entries read when opened, prewarm Service Worker delivery, and document the phone-only model.
- This follow-up does not claim a measured sub-500 ms result. It targets prompt display after the location event is calculated and requires real Android timing measurements.
- Last resolved place is stored locally for up to 24 hours. It remains visible during a fresh automatic GPS check; explicit “Ongera ushake” clears the saved result.
- Header badge counts local archive entries not yet opened. Opening `/amenyesha` marks current entries read.
- No Production Supabase migration or Vercel environment change was made for this phone-only follow-up. Old server archive/Web Push code remains as legacy infrastructure but is not called by the active notification component.

### Verification evidence
- PR #22 GitHub Actions Location Engine checks run #526: `https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/42483038563` — passed ESLint, location/locate-protection unit tests, accuracy gates, TypeScript and Production build.
- PR #22 Vercel check: success on its merged commit. The currently running Production alias still needs a live verification after the rollout.
- PR #23 must pass its own lint, unit, TypeScript and build checks. Real-device notification display, unread badge, route-return persistence and the sub-500 ms target remain UNVERIFIED until tested on Android.


### PR #23 verification update — 2026-11-08
- GitHub Actions Location Engine checks run #529 (`42485712350`) passed: install, ESLint, location/locate-protection unit tests, accuracy static gate, accuracy JavaScript guard, TypeScript, and Production build.
- Earlier run #527 exposed an outdated source-contract assertion that prohibited all `localStorage.getItem` use inside `useLocation`. The new requirement is a display-only on-device snapshot, so the test was narrowed to allow exactly the new snapshot read while asserting the 24-hour expiry, "last result" notice, explicit reset, and continuing fresh high-accuracy GPS request. Run #529 passed after that correction.
- Vercel Preview check remains blocked by the Free plan daily build limit (`api-deployments-free-per-day`). This is a hosting quota failure, not a code-test result. No PR #23 Preview or Production rollout is claimed.
- PR #23 remains open and unmerged pending independent Claude review and real Android verification. Actual banner delivery, unread badge, route-return persistence and measured <500 ms display remain UNVERIFIED on a phone.


### PR #23 implementation hardening — 2026-11-08
- Latest code commit: `71d15c0bfae7a6c107e0cad05c98668719ccc432` (branch `fix/retain-location-and-unread-notices`).
- Restored location snapshots now carry an explicit last-known state and visible Rwanda-local timestamp. Restored snapshots do not trigger new welcome or geofence notifications; those wait for a fresh location response.
- Service Worker notification setup now shares one registration promise, registers `/sw.js` if missing, waits at most 400 ms before releasing the foreground location flow, and keeps a late completion attached for Android's Service Worker notification API. It intentionally does not use `new Notification()` as an Android fallback.
- Local archive write failures now return an explicit failure status to the component. The header unread count is included in its accessible link label.
- Welcome notification IDs are stable per Rwanda-local day to avoid duplicate archive rows during permission retries. UI contract checks cover last-known suppression, Service Worker registration/display and accessible unread-count labels.
- Claude independent audit brief refreshed at `docs/CLAUDE_AUDIT_REQUEST_LOCATION_NOTIFICATIONS_2026-11-08.md`; it requests read-only review and forbids edits, merge, deployment, secrets or Supabase changes.
- Vercel Preview/Production release for PR #23 is **not available yet** because the Free plan deployment limit was reached. The PR remains open and unmerged. Do not claim the latest changes are live on Production.
- Datadog inspection: RUM is not enabled for the connected organization; metrics search returned no IWACU/Vercel matches; APM and logs queries returned “No valid indexes specified”. Therefore Datadog cannot currently provide real user timing/error evidence for this app. No Datadog settings were changed.
- Still unverified on a physical Android phone: system-banner receipt, unread badge behavior, route-return restore and measured <500 ms display. The 400 ms code timeout is only a foreground wait boundary, not a measured OS banner time.


## 2026-11-08 — PR #23 source audit and archive read-state correction

### Source audit completed in this session
- Re-read the current PR #23 implementation for the local notification archive, unread badge, Service Worker notification path, location snapshot restore/reset, main page return behavior, tests and the Service Worker click handler.
- Confirmed the active notification archive and unread state are browser-profile local; the client notification path does not call the legacy server archive or Web Push subscription endpoints.
- Confirmed the Service Worker notification click safely validates a same-origin relative target and opens/focuses IWACU.
- Confirmed the last-known location snapshot has a 24-hour expiry, future timestamps are rejected, it is labelled with Rwanda-local saved time, reset clears it, and stale snapshots are suppressed from welcome/geofence notification handling.
- Confirmed the 400 ms Service Worker wait is a foreground wait boundary only. It is not a measured Android banner time and does not guarantee a banner within 500 ms.
- Confirmed the browser-only implementation cannot track GPS after Chrome is fully closed/suspended; native Android foreground tracking remains a separate project.

### Defect found and corrected
- Found a real unread-state defect in `src/app/amenyesha/page.tsx`: while the archive page stayed open, each new same-tab or cross-tab archive update called `markArchiveItemsRead()` for the entire updated list. This could clear the unread badge for notifications arriving after the visitor had opened the archive.
- Corrected in commit `dfe2ff08045e960eb3d4ccdc06677b22df34b582`: the initial archive load and an explicit “Vugurura” action mark the current snapshot as read; live archive/storage updates now refresh the displayed list without marking newly arrived items as read.
- Added a regression contract test in `src/lib/location-ui-contract.test.ts` to protect this distinction.
- CI for the final updated PR head must be checked before calling this correction verified.

### What remains outside code-only verification
- A real Android phone must still verify notification permission prompts, system-banner delivery, numeric badge changes, route-return restoration and notification behavior with the app backgrounded.
- The under-500 ms post-location-event target remains UNMEASURED on a physical phone.
- Chrome/web cannot provide continuous GPS after the page is fully closed or suspended.
- The latest PR #23 code has not been deployed to Production. Vercel previously rejected new builds with `api-deployments-free-per-day`; do not spend money or change plans. Recheck quota later, create a fresh Preview for the exact latest PR head, test it, and only then release to Production.
- No Production database, Supabase settings, Vercel project settings or secrets were changed during this source audit.
