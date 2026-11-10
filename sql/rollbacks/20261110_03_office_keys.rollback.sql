begin;
drop function if exists public.list_office_keys_v1(text);
drop function if exists public.create_office_key_account_v1(uuid, text, uuid);
drop function if exists public.reset_office_key_v1(uuid);
-- list_office_audit_v1: re-apply 20261110_01 to restore the version without key events.
drop table if exists public.office_key_events;
commit;
