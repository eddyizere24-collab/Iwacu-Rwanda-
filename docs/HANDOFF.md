# HANDOFF

2026-11-01 CHATGPT: applied CLAUDE-PATCH (independence + hardening), base 96f4b1d; no merge; waiting for CI and for the project lead's RELEASE.

## 2026-11-02 GROK — P4 national daytime gate (owner-approved)

- **What:** `P4_ANYTIME=1` allows the national validation workflow and scripts to run outside 22:00–06:00 Kigali.
- **Why:** Owner decision 2 Nov 2026 — only 2 users on production; daytime load is acceptable.
- **Where:** `scripts/p4-national-runner.mjs`, `scripts/p4-fetch-truth.mjs` (gate checks `env.P4_ANYTIME`), `.github/workflows/p4-national.yml` (env + night-gate conditions).
- **Unchanged:** 2.2 s spacing, auto-stop rules, 30 districts, seeds 424242 / 20261030, 120 truth REST reads.
- **Restore night-only:** delete `P4_ANYTIME: "1"` from the workflow env (and leave script gates as-is; without the env var they still refuse daytime).
- **Next:** push workflow alone to start the run; report each job.

## 2026-11-02 GROK — ONE project (owner decision)

- **What:** Imported `iwacu-rwanda-grid` branch `wip/integrate3` under `national-grid/integrate3` (tree SHA `56dbf653954bd07f5438411f30859ca0b73a8287`, byte-identical to integrate3 head tree).
- **App build:** `legacy/`, `national-grid/`, `grid/` excluded from TypeScript and ESLint. App `src/` behaviour unchanged.
- **Heavy jobs:** root workflows `grid-*.yml` are **workflow_dispatch only** (no push/schedule). Working-directory: `national-grid/integrate3`.
- **Frozen:** from now on **ALL grid work happens ONLY in Iwacu-rwanda-2 under `national-grid/integrate3`**. Repo `iwacu-rwanda-grid` is **FROZEN** (no new commits).
- **Build fix:** branch `fix/consolidation-build` (do not merge without RELEASE).


## 2026-11-04 CHATGPT — Leaders Registry L1 build (PR #14 only)

- **Scope:** Leaders only. PR #14 is the base. PR #13 remains open and untouched; no merge, deploy, Production migration, Vercel setting change or Supabase integration change.
- **Owner decision checked:** read-only Production aggregate found one `admin_profiles` row, one with `is_super_admin=true`, and `scope_code='RW'`. Production counts remain `leaders=0`, `admin_profiles=1`, `audit_logs=0`. New SQL remains on the feature branch; it has not been applied.
- **Database additions prepared:** separate employment-history and certification tables with scoped RLS; position provenance + draft-only catalogue bootstrap; public-candidate RPC using canonical `boundaries.parent_id`; transfer RPC; appointment end/archive RPC; photo and private dossier/evidence Storage policies. Every new migration has its own rollback file.
- **Position catalogue:** six legacy enum positions are seeded as DRAFT with `confirmation_required=true` and source references. `Other` is not seeded as an official position. No position is approved by the migration; translations/statutory titles need Product Owner confirmation.
- **Backend additions prepared:** scoped admin assignment/delegation endpoints, canonical child-unit lookup, employment/certification APIs, image/document/evidence upload, 60-second signed URLs, transfer API, appointment end/archive API, and batched public-candidate endpoint. New restrictive RLS rules enforce the assignment ladder: National → District only, District → direct-child Sector, Sector → direct-child Cell.
- **Photo workflow:** Storage photo upload requires an already approved and published appointment. The DB publication guard resets the profile to Draft when the approved photo keys change; a higher-scope reviewer must approve/publish the updated profile again. The app resizes in-browser and validates WebP dimensions/size on the server.
- **Public API:** V2 RPC input is limited to three scope codes per call; exact-scope appointments are returned on candidates; ancestors are grouped in `shared_leaders` and deduplicated by appointment ID. Public projection allowlists public fields only. The location page passes the finest resolved administrative level and candidate list; no village is inferred from a cell-only result.
- **Confidence:** `src/lib/leaders/confidence.ts` uses words only and provisional thresholds: 0.80+ `Byizewe`, 0.50–0.79 `Giciriritse`, below 0.50 `Gicye`; comment says “provisional, to be recalibrated”.
- **Legacy:** legacy mock-data/API/components are being retired from the V2 path; the legacy `public.leaders` database table remains untouched. The old phone-report API returns 410 rather than accepting an in-memory mock report.
- **Admin invitations:** no service-role key was requested or exposed. The UI accepts an existing Supabase Auth User UUID. The invite-email step is blocked until the owner provisions users through the Supabase Dashboard or approves a safe invitation provider flow.
- **Storage caveat:** `leader-photos` is a public bucket as requested. Supabase public-bucket object GETs bypass object SELECT RLS; therefore the app only publishes random object keys in an approved/public profile, but an already-known public object URL cannot be revoked by a profile unpublish. Keep this limitation explicit. `leader-dossier` is private and the API issues 60-second signed URLs after RLS checks.
- **Verification pending:** L1 database contracts cover schema/policies, transfer/archive inside rollback transactions, candidate hierarchy/deduplication and public-field privacy. App contract tests cover confidence and API timeout/batching. Wait for the L1 commit's DB and application CI before considering this build accepted.
- **Release gate:** stop after CI and wait for the owner's `APPLY`; no Production DDL/DML or deployment is authorised by this note.


## 2026-11-04 CHATGPT — L1 first CI diagnosis and correction

- **First push:** `db8ebbd8046003c121a3dd88d70cc427a0f97f9c` on PR #14, still Draft.
- **DB CI:** the V2 base contract reached its Province-role negative test. The new restrictive assignment RLS correctly rejected `province_admin` with SQLSTATE `42501`, while the old test expected CHECK-constraint SQLSTATE `23514`. The test expectation is corrected to reflect the actual RLS enforcement; three L1 tier-skip checks are also set to expect `42501`.
- **Application CI:** ESLint reported one JSX parse error in `RegistryDetails.tsx`: the dossier form and file controls were siblings inside one conditional without a parent. They are now wrapped in a fragment.
- **Storage/photo hardening:** photo uploads require an approved, current appointment and already-published profile; changing the photo key moves the profile back to Draft for higher-scope review. Scoped photo/dossier delete policies support unpublish and failed-upload cleanup. The Storage contract now checks all seven policies.
- **Status:** first CI attempt was not green. These corrections are staged for the next PR #14 push; no Production SQL or data has been changed. Wait for the new DB and application CI result before asking for `APPLY`.
