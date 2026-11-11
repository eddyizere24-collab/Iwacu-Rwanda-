-- Optional rollback for 20261110_03_assistant_model_usage_limits.sql.
-- Removes only the aggregate daily model-usage counters and reservation RPC.
-- Do not run while general-answer generation is enabled.
begin;
revoke all on function public.reserve_assistant_model_usage_v1(text, integer, integer) from public, anon, authenticated, service_role;
drop function if exists public.reserve_assistant_model_usage_v1(text, integer, integer);
drop table if exists public.assistant_model_usage_daily;
commit;
