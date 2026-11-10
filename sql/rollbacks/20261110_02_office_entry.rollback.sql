begin;
drop function if exists public.list_entry_places_v1(text, text, text, integer);
drop function if exists public.office_entry_lookup_v1(text, text);
drop function if exists public.office_entry_fail_v1(text, text);
drop function if exists public.office_entry_clear_v1(text, text);
drop table if exists public.office_entry_failures;
commit;
