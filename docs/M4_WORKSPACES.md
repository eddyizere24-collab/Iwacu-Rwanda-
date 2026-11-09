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
