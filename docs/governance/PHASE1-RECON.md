# PHASE1-RECON — Leaders / Governance (read-only)

**Branch:** `feature/leaders` from main `3796f09165f4661e857a3c7850e3168f8189be25`  
**Date:** 2026-11-03  
**Scope:** Inventory only. No app-code changes in this step.  
**Spec defaults (release 1):** roles = Ministry/Super Admin, District, Sector, Cell; Village is DATA only (no village login); internal messaging only; one-time activation/reset credentials (passwords never readable); rw/en/fr from the start; additive migrations only. Administrative units from OUR `boundaries` table at runtime (never NISR at runtime).

Live DB schema details are reported separately by ChatGPT; this file marks what exists **in the repository** vs what PR #1 documents as live.

---

## R1 — Inventory (main @ 3796f091)

### Leaders API / routes
| Path | Role |
|------|------|
| `src/app/api/leaders/route.ts` | GET / PATCH / POST / DELETE leaders |
| `src/app/api/administrative-units/route.ts` | Cascading unit list from `boundaries` |
| `src/app/api/report-number/route.ts` | Citizen inactive-number reports |
| `src/app/api/emergency/route.ts` | Emergency contacts API |
| `src/app/api/health/route.ts` | Health check |
| `src/app/api/locate/route.ts` | Citizen locate (not admin) |
| `src/app/api/location-map/route.ts` | Village overlay GeoJSON |
| `src/app/api/location-context/route.ts` | Location context |
| `src/app/api/location-feedback/route.ts` | Feedback |
| `src/app/api/ai-router/route.ts` | Place search assistant |

### Forms / admin UI
| Path | Role |
|------|------|
| `src/app/admin/login/page.tsx` | Multi-step “login”: tier + cascading scope, then email/code; stores session in **localStorage** |
| `src/app/admin/dashboard/page.tsx` | Admin dashboard (large client page) |
| `src/app/admin/layout.tsx` | Admin layout shell |
| `src/components/AddLeaderModal.tsx` | Create-leader form |
| `src/components/admin/LeaderEditForm.tsx` | Edit leader |
| `src/components/admin/AdminDossierModal.tsx` | HR dossier UI |
| `src/components/BulkImportModal.tsx` | Bulk import UI |
| `src/components/LeaderCard.tsx` | Public leader card |
| `src/components/VillagePicker.tsx` | Cascading place picker (citizen) |

### Auth / session / middleware
| Path | Role |
|------|------|
| `src/lib/security/admin-gate.ts` | **Token gate** on main: header `x-iwacu-admin-token` must equal env `ADMIN_WRITE_TOKEN` |
| `src/lib/security/mask.ts` | `maskPhone` for public responses |
| **No `middleware.ts`** found under `src/` on main | No Next.js middleware session guard on main |
| Admin login | Writes `localStorage.iwacu_admin_session` (tier, scope_code, email) — not Supabase Auth |

### Supabase clients
| Path | Role |
|------|------|
| `src/lib/supabase/server.ts` | `createSupabaseServerClient` (cookie/SSR), `createSupabaseServiceClient` (service role), `createSupabasePublicClient` (anon), `isSupabaseConfigured` / `isSupabasePublicConfigured` |
| `src/lib/supabase/client.ts` | Browser client |

### Mock / in-memory data
| Path | Role |
|------|------|
| `src/lib/mock-data.ts` | `initialMockLeaders`, `getMockLeaders`, `addMockLeader`, `deleteMockLeader`, inactive-report mocks |
| `src/types/leader.ts` | `LeaderRole`, `LeaderPublic`, dossier types |

### Hierarchy / admin-units
| Path | Role |
|------|------|
| `src/app/api/administrative-units/route.ts` | Reads `boundaries` via public client; filters by `level` + `parent_id` |
| `src/lib/rwanda-geo.ts` | Geo helpers / types used by UI |
| `src/lib/location-hierarchy.ts` | Hierarchy helpers for locate |

### Exact lines: mock used **when Supabase IS configured**

**`src/app/api/leaders/route.ts` — POST (create)** always calls mock after `isSupabaseConfigured()` is true:

```ts
if (!isSupabaseConfigured()) {
  return NextResponse.json({ status: "error", ... }, { status: 503 });
}
// ...parsed success...
const created = addMockLeader({ ... });  // still mock write
return NextResponse.json({ status: "success", leader: toPublicLeader(created, true) });
```

**`src/app/api/leaders/route.ts` — DELETE** always uses mock; never opens Supabase:

```ts
const removed = deleteMockLeader(id);
if (!removed) { return NextResponse.json({ status: "error", ... }, { status: 404 }); }
```

**POST defaults demo verification** (still in POST body mapping):

```ts
is_verified: parsed.data.is_verified ?? true,
verified_by: parsed.data.verified_by || "Urwego rw'Akarere",
```

**GET** when Supabase is configured: queries `leaders` joined to `boundaries` (no mock).  
**PATCH** when Supabase is configured: updates `leaders` with optimistic `version` (no mock). When **not** configured, PATCH mutates in-memory mock.

**Admin login session (not mock-data, but not real auth):** `src/app/admin/login/page.tsx` stores `localStorage.setItem("iwacu_admin_session", JSON.stringify(adminSession))` and navigates to dashboard without Supabase Auth.

**API vs login param mismatch:** `administrative-units` expects `parent_id` (UUID); login page sends `parent_code` in the query string. Cascading selectors on login will fail against the current API contract unless a code→id resolution layer exists elsewhere (not found on main for this route).

---

## R2 — Open PR #1 (`security/part-2-auth-hardening`) vs main

- **PR:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/1  
- **Head:** `94ff01f598356991e841e0cb43a05def0b5a6a5a` (`security/part-2-auth-hardening`)  
- **Base at open:** older main; **current main tip:** `3796f091…` (consolidation landed after PR open → **high merge conflict risk**).  
- **Do not merge** in this step.

### Files changed (34)
Added: `.github/workflows/security-checks.yml`, `SUPABASE_SUPPORT_REQUEST.md`, `src/app/privacy/page.tsx`, `src/lib/security/admin-gate.test.ts`, and SQL migrations under `sql/` (see R3).  
Modified: `DEPLOYMENT.md`, `README.md`, `SECURITY_AUDIT.md`, `next.config.ts`, `package.json`, `sql/schema.sql`, `src/app/admin/dashboard/page.tsx`, `src/app/admin/login/page.tsx`, `src/app/api/emergency/route.ts`, `src/app/api/health/route.ts`, `src/app/api/leaders/route.ts`, `src/app/api/report-number/route.ts`, `src/app/page.tsx`, `src/components/HelpModal.tsx`, `src/lib/rwanda-geo.ts`, `src/lib/security/admin-gate.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`.

### What it adds (auth / permission)
- Replaces header-token `requireAdminWrite` with **async Supabase Auth session** + `admin_profiles` lookup (`user_id`, `scope_code`, `is_super_admin`).
- Adds `adminCanManageScope` (segment-safe prefix checks; national `RW` only for super-admin).
- SQL migrations for grants, inactive-number report hardening, national-scope super-admin rule, PostGIS/ltree search_path, FK indexes.
- Security CI workflow + `test:security`.
- Docs: live checks (2026-10-29): 17,423 boundary rows; leaders table empty; one super-admin profile linked; phone_number not selectable by browser roles.

### Conflicts with `feature/leaders` work
- **Auth model:** main uses `ADMIN_WRITE_TOKEN` + localStorage login; PR #1 requires real Auth cookies + profiles. Leaders Phase 1 must choose one path (recommended: adopt PR #1 gate, not the token).
- **Base drift:** main has consolidation (`national-grid/`, grid workflows, MapLibre path, etc.) absent from PR #1 base → large textual conflicts on shared files (`leaders/route.ts`, admin login/dashboard, supabase server).
- **SQL folder:** `sql/` exists on PR branch; **missing on current main tree** (only under `legacy/…` copies). Importing PR SQL vs writing new additive migrations must be coordinated.
- **Scope codes:** live/PR schema uses production scope formats; main mock leaders still use Gasabo-style `RW-01-01-…` demo codes.

---

## R3 — SQL in the repository

### On current main (3796f091)
- **No top-level `sql/` directory.**
- Legacy copies only:
  - `legacy/iwacu-rwanda-original/main/schema.sql`
  - `legacy/iwacu-rwanda-original/stage1-clean/sql/migrations/001_core_schema.sql`

### On PR #1 branch (authoritative schema text for Phase 1 planning)
Top-level `sql/`:

| File | Purpose |
|------|---------|
| `sql/schema.sql` | Core tables, RLS, location RPCs |
| `sql/security-hardening-migration.sql` | Hardening |
| `sql/security-hardening-followup-migration.sql` | RBAC helpers / view invoker |
| `sql/security-public-grants-migration.sql` | Public grants tightening |
| `sql/postgis-extensions-search-path-migration.sql` | PostGIS search_path |
| `sql/ltree-extensions-migration.sql` | ltree |
| `sql/persist-inactive-number-reports.sql` | Durable inactive reports |
| `sql/allow-dismissed-inactive-number-reports.sql` | `dismissed` status |
| `sql/deny-browser-access-to-inactive-reports.sql` | Deny browser role |
| `sql/inactive-number-report-fk-index.sql` | FK index |
| `sql/leader-audit-foreign-key-indexes.sql` | Audit FK indexes |
| `sql/retained-boundary-backup-privileges.sql` | Backup table privileges |
| `sql/admin-national-scope-requires-super-admin.sql` | National scope rule |

### Tables / columns (from `sql/schema.sql` on PR branch)
- **`boundaries`:** `id`, `scope_code` UNIQUE, `path` LTREE, `name_kiny`, `name_eng`, `level`, `parent_id`, `geom`, `area_m2`, `valid_from`/`valid_to`, `version`, …
- **`leaders`:** `id`, `scope_code` → boundaries, `first_name`, `last_name`, `role`, `phone_number`, email/photo, temporal validity, `version`, …
- **`admin_profiles`:** maps `auth.users` → `scope_code`, `is_super_admin`, …
- **`audit_logs`:** `actor_id`, `action`, `table_name`, `record_id`, `old_data`/`new_data`, …
- **`inactive_number_reports`:** citizen reports; browser deny policy

### RLS / functions (schema)
- RLS enabled on boundaries, leaders, admin_profiles, audit_logs, inactive_number_reports.
- Policies: public read on valid boundaries/leaders; scoped admin write; super-admin audit read; no direct audit insert.
- Helpers: `is_current_user_super_admin()`, `current_user_admin_scope()`, `check_version`, `calculate_location_confidence`, ingest RPCs.

### Live DB (from PR #1 body only — ChatGPT owns full live dump)
- Boundaries populated (~17,423 rows); **leaders empty**.
- One confirmed Auth user linked to national super-admin profile.
- PostGIS + ltree in `extensions`; phone_number not granted to browser roles.
- **Mark:** ChatGPT’s live schema report is source of truth for “already applied” migrations.

---

## R4 — Gap table (Phase 1 workstreams)

| Workstream | Status | One-line evidence |
|------------|--------|-------------------|
| Geographic foundation | **PARTIAL** | Live boundaries + `/api/administrative-units` from `boundaries`; login still passes `parent_code` vs API `parent_id`; no village login required (OK). |
| Identity / account lifecycle | **MISSING** | Main login = localStorage; no invite / one-time credential / reset / suspend flows in app code on main. |
| Authority model | **PARTIAL** | Token gate + optional PR #1 session+scope checks; no enforced tier workspace shell; Village login not present (aligned). |
| Data foundation (leaders) | **PARTIAL** | GET/PATCH hit Supabase when configured; **POST/DELETE still mock**; default `is_verified: true`; live leaders empty. |
| Trilingual foundation (rw/en/fr) | **MISSING** | UI strings mostly hard-coded Kinyarwanda/English mix; no owned dictionary module; no i18n package (and none should be added). |
| Design system | **PARTIAL** | Tailwind + shared components exist; no formal tier workspace shell / design tokens doc for governance. |
| Security baseline | **PARTIAL** | Phone mask + token write gate on main; PR #1 stronger Auth/RLS not on main; audit table exists in schema, not wired in main leaders write path. |

---

## R5 — Ordered small tasks (each = one PR)

### (1) Leaders write/read fix + Pending Verification default + remove demo defaults
- **Files:** `src/app/api/leaders/route.ts`, tests under `src/lib` or new route tests; stop importing write path from `mock-data` when Supabase configured.
- **Behaviour:** POST/DELETE insert/soft-delete (or temporal `valid_to`) in `leaders` via service client; default **Pending Verification** (`is_verified: false` or equivalent column if present); remove demo `verified_by: "Urwego rw'Akarere"` auto-fill.
- **SQL migration text (NOT applied here):** only if column missing, e.g. additive `verification_status TEXT NOT NULL DEFAULT 'pending_verification'` — confirm against live schema before drafting.
- **Tests:** POST/DELETE with configured client mocked; 401 without admin gate; no mock path when configured.
- **Risks:** Live leaders empty → safe; conflict with PR #1 leaders route rewrite.

### (2) Canonical hierarchy API from `boundaries` + cascading selectors
- **Files:** `src/app/api/administrative-units/route.ts`, `src/app/admin/login/page.tsx`, `src/components/VillagePicker.tsx` / AddLeader selectors as needed.
- **Behaviour:** Single contract: filter by `parent_id` **or** resolve `parent_scope_code` → id server-side; never call NISR at runtime.
- **SQL:** none if `boundaries.parent_id` already live.
- **Tests:** province→district→sector→cell chain; empty parent rejects non-province.
- **Risks:** Login currently broken against `parent_id` API.

### (3) i18n foundation (own dictionary, **NO new npm packages**)
- **Files:** e.g. `src/lib/i18n/messages/{rw,en,fr}.ts`, thin `t(key)` helper; replace critical admin/public strings gradually.
- **Env:** none.
- **Packages:** **none** (explicitly no `next-intl` / `react-i18next`).
- **Risks:** Large string surface; keep PR small (shell + leaders API messages only).

### (4) Accounts / roles / scope tables + server-side scope checks
- **Prefer landing PR #1 gate** (or re-implement equivalent on main): `admin_profiles` + session `requireAdminWrite` + `adminCanManageScope` on leaders writes.
- **SQL:** additive only if live missing columns; else none.
- **Env:** existing Supabase URL/anon/service; **no new npm packages**.
- **Risks:** Merge conflicts with PR #1; must not keep localStorage as authority.

### (5) Account lifecycle (invite, one-time credential, reset, suspend)
- **Files:** new admin APIs + minimal UI; Supabase Auth admin APIs via service role.
- **SQL:** additive status columns on `admin_profiles` if needed (`status`, `invited_at`, …).
- **Env:** may need Auth email templates configured in Supabase (ops, not repo secret).
- **Risks:** Email delivery; Free-plan Auth limits.

### (6) Audit events
- **Files:** leaders POST/PATCH/DELETE write `audit_logs`; optional read UI for super-admin.
- **SQL:** table exists in schema; confirm live.
- **Risks:** Service-role insert must not open table to anon.

### (7) Workspace shell per tier
- **Files:** admin layout/nav filtered by `scope_code` / role; remove ability to “pick” a higher tier than profile allows.
- **Risks:** Depends on (4).

**Steps needing new npm package:** none in (1)–(7) if PR #1 patterns are reused.  
**Steps needing new env vars:** (1) uses existing `ADMIN_WRITE_TOKEN` **or** (4) drops it after Auth gate; no net new vars required for (1)–(3).

---

## R6 — Decisions that block steps 1–3 (max 5)

1. **Admin write authority on main until Auth lands:** keep `ADMIN_WRITE_TOKEN` header gate for step (1) API tests, or require PR #1 Auth first?  
   **Default:** keep token gate for step (1) only; do not treat localStorage as proof of admin.

2. **Verification field shape:** does live `leaders` already have `is_verified` / status column, or only implied by absence of data?  
   **Default:** if no column, additive `verification_status TEXT NOT NULL DEFAULT 'pending_verification'`; never auto-`true`.

3. **Hierarchy request contract:** `parent_id` (UUID) vs `parent_scope_code` (text)?  
   **Default:** accept both; prefer `parent_scope_code` for UI; resolve to `parent_id` server-side from `boundaries`.

4. **Scope code format in app vs live:** mock/demo `RW-01-…` vs production codes used in boundaries (e.g. `RW-P1-D11-…` style seen in location stack).  
   **Default:** only codes present in `boundaries.scope_code`; delete demo Gasabo mock codes from write path.

5. **PR #1 merge timing relative to steps 1–3:** merge/rebase before hierarchy/i18n, or parallel?  
   **Default:** do **not** merge PR #1 in steps 1–3; rebase or cherry-pick `admin-gate` Auth only when starting step (4); avoid dual auth systems.

---

## Background note (location work, not part of this file’s deliverable)

- Dissolve real job **PASS** with counts (villages 14823 → cells 2148 / sectors 416 / districts 30 / provinces 5 / country 1).
- map-e2e on `fix/map-e2e` run 41615059286 **FAILED** at script step after build succeeded (SwiftShader path still under investigation).
- exact_build still running / queued on `fix/grid-real-jobs`.
