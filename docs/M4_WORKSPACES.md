# M4 — Office workspaces (branch feature/m4-workspaces)

Built from the Governance Specification (tier workspaces, leader cards, official comms). Status: DB tested in disposable PostgreSQL;
UI built and compiled on a Vercel preview; NOT yet applied to Production and NOT yet merged to main.

## What exists
- DB (`sql/migrations/20261109_01_office_workspaces.sql`, rollback in `sql/rollbacks/`, contract test `supabase/tests/office_m4_contract.test.sql`):
  `office_unit_leaders` (one current leader card per district/sector/cell/village, with or without a login),
  `office_unit_leader_audit` (who changed what), functions `get_office_workspace_v1`, `list_office_units_v1`,
  `list_office_leaders_v1`, `get_office_unit_leader_v1`, `save_office_unit_leader_v1`, `remove_office_unit_leader_v1`,
  `get_public_unit_leaders_v1` (only public read path; phone only if allowed). `create_office_account_v1` now also creates the card.
  Tables have RLS on and no client grants; authority is decided in the database by scope_code prefix.
- API: `/api/admin/office/{workspace,units,leaders,leaders/[unitId],leaders/[unitId]/photo}`.
- UI: `/admin/ibiro` (Ahabanza dashboard), `/inzego` (drill-down explorer + edit card + create account), `/abayobozi` (searchable table),
  `/ubutumwa`, `/konti`, `/umwirondoro` (own card). Languages rw/en/fr (`src/lib/office/i18n.ts`).
- Photos: shrunk to WebP ≤150 KB in the browser, uploaded by the server after the database confirms authority (bucket `leader-photos`, path `office/<unit>/<uuid>.webp`).

## Not done yet
- Public linkage: citizen result page showing these cards (use `get_public_unit_leaders_v1`).
- Login-by-tier entry points, tasks/reports/records modules, Village accounts, verification lifecycle for cards.

## Update 2026-11-10 — one template, four tiers (M4b + M5)

**Shape.** Igihugu, Akarere, Umurenge and Akagari are one shared workspace template (`src/components/office`, `src/app/admin/ibiro`),
scoped by the signed-in account's assignment. `src/lib/office/tier.ts` decides which doors a tier gets; the database decides what
data it may touch (`private.office_scopes` / `office_in_scope`). Province has no workspace. Villages have no login: their leaders are
records entered by the office above (cell, then sector, district, national).

**Migrations (not yet applied to Production — apply in this order, buex only):**
1. `20261109_01_office_workspaces.sql` — leader cards per unit, explorer, public read path.
2. `20261109_02_office_oversight.sql` — unit dossier, search, accounts/access, cases, tasks, audit.
3. `20261110_01_office_verification_records.sql` — leader verification queue, per-unit report, official records
   (private bucket `office-records`, created by the migration when the storage schema exists).
Each has a rollback in `sql/rollbacks/` and a contract test in `supabase/tests/` (run by `leader-registry-v2-db.yml`).

**Pages (all under `/admin/ibiro`):** Ahabanza (dossier of the office's own place), Raporo, Isuzuma, Inzego, Abayobozi, Imirimo (+detail),
Ibibazo, Inyandiko, Ubutumwa, Konti, Amateka, Umwirondoro, `ahantu/[scope]` (dossier of any place in scope).
Akagari has no Konti page and cannot issue tasks (nothing to issue to: villages have no login).

**Preview-only:** `src/app/demo-ibiro` (invented data; `?tier=country|district|sector|cell`). Remove before any merge to main.

**Needs a server key:** record files and leader photos are written by the server with the service role key; without it the pages
show a clear "key not set" message and nothing else breaks.

## 2026-11-10 — Entry (M6)

- `/admin/login` first asks the tier: Igihugu / Akarere / Umurenge / Akagari.
- Igihugu keeps the existing name + password + second step (unchanged).
- Akarere / Umurenge / Akagari: pick the place from a list (district, then sector, then cell), then type that place's key.
  The key is the Auth password of the account holding that place; the level above issues and resets it (existing account tools).
- DB: `20261110_02_office_entry.sql` (public place list, server-only lookup + temporary lock: 5 wrong tries/15 min per device+place, 20 per place). Test: `office_m6_contract.test.sql`.
- Server routes: `GET /api/admin/office/entry/places` (public names), `POST /api/admin/office/enter` (needs the service key on the server; one uniform failure message).
- Preview-only demo: `/demo-ibiro/ninjira` (invented places, key `demo`). Remove with `/demo-ibiro` before any merge.
