-- Rollback for 20261125_01_ikarita_search_rpc.sql
drop function if exists public.get_ikarita_search_v1(text, integer);
