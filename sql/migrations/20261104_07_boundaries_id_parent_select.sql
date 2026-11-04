-- CHANGED 2026-11-04 CLAUDE: give anon/authenticated column-level SELECT on boundaries.id and boundaries.parent_id; see docs/HANDOFF.md
-- WHY: Production had column grants on public.boundaries WITHOUT id and parent_id (found by read-only diagnosis, grants not in any repo migration).
--      get_leader_candidates_v2 (security invoker) and /api/administrative-units both read id and parent_id, so anon got "permission denied for table boundaries".
-- SAFE: id and parent_id are public administrative hierarchy identifiers. The existing RLS policy boundaries_public_read still limits rows to valid_to IS NULL (or Super Admin).
-- ADDITIVE: grants only; no table, policy, data or other privilege is changed.
begin;
grant select (id, parent_id) on public.boundaries to anon, authenticated;
commit;
