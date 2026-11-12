-- M7: entry keys — national sets them, the server reads the hash, a place gets its account on first entry. Fabricated fixtures only.
-- Run after 20261110_03 and the M3 + M4 + M6 contract tests (fixture users 11 national, 22 district A, 33 sector A, 44 cell A).
\set ON_ERROR_STOP on

insert into auth.users(id,email) values ('a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9','place-cell-a2@iwacu.invalid') on conflict do nothing;

begin;
-- Server-only functions: closed to everyone but service_role.
set local role anon;
do $a$ begin
  perform public.m3_expect($q$select * from public.office_entry_key_get_v1('district')$q$,'42501');
  perform public.m3_expect($q$select public.office_entry_key_set_v1('district','x','y',null)$q$,'42501');
  perform public.m3_expect($q$select * from public.office_entry_keys$q$,'42501');
  perform public.m3_expect($q$select public.authorize_office_entry_key_v1('district')$q$,'42501');
end $a$;
reset role;

set local role authenticated;
do $n$
declare v_n integer;
begin
  perform public.m3_expect($q$select * from public.office_entry_key_get_v1('district')$q$,'42501');
  perform public.m3_expect($q$select public.office_entry_create_account_v1('a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9','x','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12')$q$,'42501');
  -- Lower offices cannot set or read the entry keys.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  perform public.m3_expect($q$select public.authorize_office_entry_key_v1('sector')$q$,'42501');
  perform public.m3_expect($q$select * from public.get_office_entry_keys_status_v1()$q$,'42501');
  -- National without its second step cannot either; with it, it can.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  perform public.m3_expect($q$select public.authorize_office_entry_key_v1('sector')$q$,'42501');
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform public.m3_expect($q$select public.authorize_office_entry_key_v1('province')$q$,'22023');
  perform public.authorize_office_entry_key_v1('sector');
  select count(*) into v_n from public.get_office_entry_keys_status_v1();
  if v_n <> 3 then raise exception 'status must list the three levels, got %', v_n; end if;
  if (select is_set from public.get_office_entry_keys_status_v1() where level = 'sector') then raise exception 'nothing set yet'; end if;
end $n$;
reset role;

set local role service_role;
do $s$
declare r record;
begin
  if exists (select 1 from public.office_entry_key_get_v1('district')) then raise exception 'no key before it is set'; end if;
  perform public.office_entry_key_set_v1('district', 'salt-salt-salt-salt-1', repeat('a', 64), '11111111-1111-4111-8111-111111111111');
  select * into r from public.office_entry_key_get_v1('district');
  if r.salt <> 'salt-salt-salt-salt-1' or r.hash <> repeat('a', 64) then raise exception 'stored hash must come back as set'; end if;
  perform public.office_entry_key_set_v1('district', 'salt-salt-salt-salt-2', repeat('b', 64), '11111111-1111-4111-8111-111111111111');
  if (select count(*) from public.office_entry_keys where level = 'district') <> 1 then raise exception 'one row per level'; end if;
  if (select hash from public.office_entry_key_get_v1('district')) <> repeat('b', 64) then raise exception 'setting again replaces the hash'; end if;
  perform public.m3_expect($q$select public.office_entry_key_set_v1('village','a','b',null)$q$,'22023');

  -- First entry to cell A2 (no account) creates it; a second try says it exists; villages never get one.
  perform public.office_entry_create_account_v1('a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9', 'akagari.a2.101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12');
  select * into r from public.office_entry_lookup_v1('RW-01-01-01-02', 'h1');
  if r.user_id <> 'a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9' or r.role_code <> 'cell_admin' or r.level <> 'cell' then raise exception 'lookup must now find the new account: %', r; end if;
  perform public.m3_expect($q$select public.office_entry_create_account_v1('a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9','dup','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12')$q$,'23505');
  perform public.m3_expect($q$select public.office_entry_create_account_v1('a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9','v','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13')$q$,'22023');
  perform public.m3_expect($q$select public.office_entry_create_account_v1('a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9','n','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')$q$,'22023');
  -- A new place account never has to change a password; an older one is settled at entry.
  if (select must_change_password from public.office_profiles where user_id = 'a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9') then raise exception 'new place account must not force a password change'; end if;
  update public.office_profiles set must_change_password = true where user_id = 'a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9';
  perform public.office_entry_settle_v1('a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9');
  if (select must_change_password from public.office_profiles where user_id = 'a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9') then raise exception 'settle must clear the flag'; end if;
end $s$;
reset role;

-- National sees the change in the audit trail.
set local role authenticated;
do $au$ begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  if not exists (select 1 from public.list_office_audit_v1(100, 0) where kind = 'entry_key_set' and detail = 'sector') then raise exception 'audit must show entry_key_set'; end if;
end $au$;
reset role;
rollback;

select 'PASS: entry keys — national-only setting, server-only hash access, first entry creates the place account, audit, nothing readable by others' as result;
