-- Rollback for 20261122_01_assistant_answer_store.sql (removes the stored answers).
begin;
drop function if exists public.lookup_assistant_answer_v1(text, text, real);
drop function if exists public.store_assistant_answer_v1(text, text, text, text, text);
drop table if exists public.assistant_answer_store;
commit;
