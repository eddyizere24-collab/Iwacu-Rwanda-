-- CHANGED 2026-11-04 CLAUDE: rollback of migration 07 (removes column-level SELECT on boundaries.id/parent_id from anon/authenticated).
-- WARNING: after this, get_leader_candidates_v2 and /api/administrative-units fail again for anon (state seen before 07 in Production).
begin;
revoke select (id, parent_id) on public.boundaries from anon, authenticated;
commit;
