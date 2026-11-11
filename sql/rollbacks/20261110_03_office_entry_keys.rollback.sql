begin;
drop function if exists public.authorize_office_entry_key_v1(text);
drop function if exists public.get_office_entry_keys_status_v1();
drop function if exists public.office_entry_key_get_v1(text);
drop function if exists public.office_entry_key_set_v1(text, text, text, uuid);
drop function if exists public.office_entry_create_account_v1(uuid, text, uuid);
drop function if exists public.office_entry_settle_v1(uuid);
-- list_office_audit_v1: re-apply 20261110_01 to restore the version without entry_key_set.
drop table if exists public.office_entry_key_log;
drop table if exists public.office_entry_keys;
commit;
