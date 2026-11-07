-- CHANGED 2026-11-04 CLAUDE: partial indexes so anon list queries on boundaries (level/parent + name order) do not scan all 17,423 rows; anon statement_timeout is 3s; see docs/HANDOFF.md
-- ALREADY APPLIED to Production by ChatGPT on 2026-11-04 (migration 20261104_08_boundaries_active_name_indexes); this file records the exact SQL.
create index if not exists idx_boundaries_active_level_name on public.boundaries (level, name_kiny) where valid_to is null;
create index if not exists idx_boundaries_active_parent_name on public.boundaries (parent_id, name_kiny) where valid_to is null;
analyze public.boundaries;
