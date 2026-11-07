-- CHANGED 2026-11-04 CLAUDE: rollback of migration 08 (drops the two partial indexes; queries get slower, nothing breaks).
drop index if exists public.idx_boundaries_active_level_name;
drop index if exists public.idx_boundaries_active_parent_name;
