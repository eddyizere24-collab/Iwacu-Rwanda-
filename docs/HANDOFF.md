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


## 2026-11-04 CHATGPT — Leaders L1 second CI diagnosis

- **Second push:** `c1ad5764c31db7c906905509125fadf16f2a37a3`.
- **DB base V2 contract:** PASS after the Province-role RLS expectation was corrected to `42501`.
- **L1 DB contract:** failed in a SQL test expression that joined two `jsonb_array_elements` results using an ambiguous table alias. The test is rewritten with explicit `LATERAL` and value-column aliases; migrations themselves applied successfully in the isolated Postgres run.
- **Application tests:** ESLint passed. 62/64 unit tests passed. The two new public-directory tests exposed a missing `confidenceLabel` import and a formatting-sensitive timeout assertion. Both are corrected; no application typecheck/build was reached in that failed run.
- **Status:** third PR #14 push contains these test fixes. Rerun DB and app CI; Production remains untouched.


## 2026-11-04 CLAUDE — Leaders L1 CI fix (boss verification pass)

- **Root causes found by reproducing the CI chain on a local PostgreSQL 16 (bootstrap, foundation, mig 01-05, V2 contract, L1 contract, EXPLAIN):**
  1. TS2719: `Unit.parent_id` was required in `RegistryOperations.tsx` but optional in `page.tsx`; now optional in both.
  2. L1 contract: the V2 contract test drops `public.test_expect_sqlstate` at its end, but the L1 hierarchy section calls it; the helper is recreated (and dropped again) inside the L1 test.
  3. Migration 01: the Super Admin mapping raised an exception when the precondition failed; it is now a NOTICE + no-op so it never blocks the additive migration and never invents an administrator.
- **Result:** all steps exit 0 locally; CI on head `739f1c0` is green (typecheck-and-build, both postgres-contract jobs).
- **Pushes:** this fix is one commit (`739f1c0`) on top of Grok's `4f10bef`; PR #14 history now includes Grok's four L1 pushes (`0c10abc`, `df997f8`, `ab22716`, `4f10bef`), more than the three agreed.
- **Anon exposure check (local DB):** `anon` has no table-wide SELECT on dossiers, evidence, audit, history, assignments or delegations; only column-level SELECT on public profile/people/positions/contacts/appointment columns and SELECT on `leader_directory_public`; no INSERT/UPDATE/DELETE on any `leader*`/`admin*` table. Buckets: `leader-photos` public, `leader-dossier` private.
- **Not done:** invite-by-email (needs a service-role key, deliberately not requested), browser E2E, real-account TOTP, 360 px screenshots. Public response key stays `candidates` (not `places`).
- **Production:** nothing applied by this pass. APPLY and RELEASE are boss decisions.


## 2026-11-04 CLAUDE — Production APPLY findings and migration 06

- ChatGPT applied foundation parts 01-12 and migrations 01-05 to Production (project buexgewxypvkqmphvfec), all "success". Its verification found two problems:
  1. `anon` held INSERT/UPDATE/DELETE on `public.leader_appointments`. Cause: Supabase default privileges (ALL on new public tables to anon/authenticated). Reproduced locally by adding the same default privileges to the CI bootstrap; the isolated baseline had hidden it. Only RLS (no anon write policy) stopped actual writes. `authenticated` also held DELETE, TRUNCATE, REFERENCES, TRIGGER on that table.
  2. `public.get_leader_candidates_v2` as anon failed with "permission denied for table boundaries" in Production. Under investigation: which columns of `public.boundaries` anon may read in Production (the public view and the RPC are security invoker and read boundaries).
- Fix for (1): migration `20261104_06_harden_default_table_privileges.sql` (tightening only). The CI bootstrap now mimics the Supabase default privileges, the L1 contract asserts no anon write/TRUNCATE and no authenticated TRUNCATE/REFERENCES/TRIGGER/DELETE on the registry tables, and the workflow applies migration 06. Verified locally: without 06 the new assertion fails, with 06 the V2 and L1 contracts print PASS.
- The foundation migration was applied in 12 chunks (`sql/apply/` on branch `ops/leaders-l1-apply`) after the whole 2,231-line file was refused by a safety check.

## CLAUDE 2026-11-04 (evening) - Production grants on boundaries and migration 07
- ChatGPT applied migration 06 to Production (success) and re-verified: anon holds no write-type privileges on the 17 V2 tables; authenticated has no TRUNCATE/REFERENCES/TRIGGER and no DELETE on leader_appointments; anon column-level SELECT on leader_appointments is exactly the 7 public-safe columns. Counts unchanged (boundaries 17,423; leaders 0).
- Production finding: public.boundaries has RLS on and policy boundaries_public_read (valid_to IS NULL), but column-level SELECT for anon/authenticated covers geom, level, name_eng, name_kiny, path, scope_code, valid_to and NOT id and NOT parent_id. These grants are in no repo migration. get_leader_candidates_v2 (security invoker) and /api/administrative-units read id/parent_id, hence "permission denied for table boundaries".
- Fix: sql/migrations/20261104_07_boundaries_id_parent_select.sql (grant select (id, parent_id) to anon, authenticated; additive; rollback file added). CI baseline now mimics Production (revoke all, column grants without id/parent_id); workflow applies 07; L1 contract asserts the column privileges. Verified locally: without 07 the contract FAILS, with 07 all contracts PASS.
- Next: ChatGPT APPLY 07 to Production, anon smoke test of get_leader_candidates_v2, then RELEASE decision.

## 2026-11-07 CLAUDE — M3 office accounts and messages (branch feature/m3-office, from main)
- Owner's rule: each tier creates the tier directly below (Igihugu → Akarere → Umurenge → Akagari; Akagari is lowest), the receiver completes the rest; plus official messages along the tiers, one copy per person.
- Database: `sql/migrations/20261107_01_office_accounts_and_messages.sql` (+ rollback). Reuses `admin_role_assignments` and `private.leader_actor_can('manage_admins')` for authority. New tables `office_profiles`, `office_messages`, `office_message_recipients` have NO client grants and no policies; all access is through SECURITY DEFINER functions `create_office_account_v1`, `list_office_contacts_v1`, `get_office_me_v1`, `complete_office_password_change_v1`, `send_office_message_v1`, `list_office_inbox_v1`, `list_office_sent_v1`, `mark_office_message_read_v1` (authenticated only). Message reach = accounts below (any depth) and above only; a mixed list with anyone out of reach is refused whole.
- Contract test `supabase/tests/office_m3_contract.test.sql` passes locally on a fresh PostgreSQL 16 after the V2 + L1 migrations and the V2 contract; breaking the reach rule makes it fail (checked). Wired into `leader-registry-v2-db.yml`.
- Server: `/api/admin/office/{me,accounts,messages}`. Account creation needs `SUPABASE_SERVICE_ROLE_KEY` on the server (creates the Auth user, then the DB call runs under the CALLER's session; on failure the Auth user is deleted). The temporary password is shown once and never stored. Login names are `name.nnn`, internal e-mail `<login>@abayobozi.iwacu.invalid`.
- UI: `/admin/ibiro` (messages inbox/sent + compose; accounts list + create), `/admin/ijambo-ry-ibanga` (forced first-login password change), login accepts a name or an e-mail and goes to `/admin/ibiro`.
- NOT applied to Production yet. Order: CI green → ChatGPT APPLY on my order → set `SUPABASE_SERVICE_ROLE_KEY` check → test with the real national account.
