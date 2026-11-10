-- M7: place keys — the level directly above creates / resets the key of each place below it (national: any place). Fabricated fixtures only.
-- Run after 20261110_03 and the M3 + M4 + M6 contract tests (fixture users 11 national, 22 district A, 33 sector A, 44 cell A, 55 cell B).
\set ON_ERROR_STOP on

insert into auth.users(id,email) values
 ('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8','new-cell-a2@iwacu.invalid')
on conflict do nothing;

begin;
set local role authenticated;
do $m7$
declare v_n integer; v_rec record; v_user uuid;
begin
  -- ===== Sector A lists the cells under it =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','33333333-3333-4333-8333-333333333333','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333', true);
  select count(*) into v_n from public.list_office_keys_v1('RW-01-01-01');
  if v_n <> 2 then raise exception 'sector A should list 2 cells, got %', v_n; end if;
  if not (select has_key from public.list_office_keys_v1('RW-01-01-01') where scope_code = 'RW-01-01-01-01') then raise exception 'cell A already has an account'; end if;
  if (select has_key from public.list_office_keys_v1('RW-01-01-01') where scope_code = 'RW-01-01-01-02') then raise exception 'cell A2 has no key yet'; end if;
  -- National lists the districts (provinces are skipped).
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  select count(*) into v_n from public.list_office_keys_v1('RW');
  if v_n <> 2 then raise exception 'national should list 2 districts, got %', v_n; end if;
  if exists (select 1 from public.list_office_keys_v1('RW') where level <> 'district') then raise exception 'national lists districts only'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub','33333333-3333-4333-8333-333333333333','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333', true);
  -- Not another district's place; not its own parent list.
  perform public.m3_expect($q$select * from public.list_office_keys_v1('RW-02-01')$q$,'42501');
  perform public.m3_expect($q$select * from public.list_office_keys_v1('nonsense')$q$,'22023');

  -- Create the key account of cell A2; second time it must say "reset instead".
  perform public.create_office_key_account_v1('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8', 'akagari.a2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12');
  if not (select has_key from public.list_office_keys_v1('RW-01-01-01') where scope_code = 'RW-01-01-01-02') then raise exception 'cell A2 must now have a key'; end if;
  if (select last_action from public.list_office_keys_v1('RW-01-01-01') where scope_code = 'RW-01-01-01-02') <> 'issued' then raise exception 'event must be recorded'; end if;
  perform public.m3_expect($q$select public.create_office_key_account_v1('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8','akagari.dup','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12')$q$,'23505');
  -- Villages and the national place never hold a key; another place is out of reach.
  perform public.m3_expect($q$select public.create_office_key_account_v1('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8','x.v','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13')$q$,'22023');
  perform public.m3_expect($q$select public.create_office_key_account_v1('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8','x.o','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10')$q$,'42501');
  -- Reset: returns the account to change, no key is ever returned or stored here.
  v_user := public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12');
  if v_user <> 'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8' then raise exception 'reset returned the wrong account'; end if;
  if (select last_action from public.list_office_keys_v1('RW-01-01-01') where scope_code = 'RW-01-01-01-02') <> 'reset' then raise exception 'reset must be recorded'; end if;
  -- A place without an account cannot be reset.
  perform public.m3_expect($q$select public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10')$q$,'42501');

  -- ===== Cell A (below) can neither create nor reset keys, nor list =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','44444444-4444-4444-8444-444444444444','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444', true);
  select count(*) into v_n from public.list_office_keys_v1('RW-01-01-01-01');
  if v_n <> 0 then raise exception 'a cell has no places with keys below it, got %', v_n; end if;
  perform public.m3_expect($q$select public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12')$q$,'42501');
  -- ... nor reset its own key (only the level above may).
  perform public.m3_expect($q$select public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5')$q$,'42501');

  -- ===== District A controls its sectors, not the cells two levels down; National controls all =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  perform public.m3_expect($q$select public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12')$q$,'42501');
  if public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4') <> '33333333-3333-4333-8333-333333333333' then raise exception 'district must reset its sector key'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  if public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12') <> 'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8' then raise exception 'national must reset any place key'; end if;
  -- District B (no relation) cannot.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6', true);
  perform public.m3_expect($q$select public.reset_office_key_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12')$q$,'42501');

  -- ===== Audit shows the key events to the places above =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  if not exists (select 1 from public.list_office_audit_v1(100, 0) where kind = 'key_issued') then raise exception 'audit must show key_issued'; end if;
  if not exists (select 1 from public.list_office_audit_v1(100, 0) where kind = 'key_reset') then raise exception 'audit must show key_reset'; end if;
end $m7$;
reset role;

-- Nobody can read or write the events directly.
set local role authenticated;
do $deny$ begin
  perform public.m3_expect($q$select * from public.office_key_events$q$,'42501');
end $deny$;
reset role;
set local role anon;
do $deny2$ begin
  perform public.m3_expect($q$select * from public.list_office_keys_v1('RW-01-01')$q$,'42501');
end $deny2$;
reset role;
rollback;

select 'PASS: place keys — list children, create once, reset by the level above (national: any), nothing for itself/below/other districts, audit, no direct table access' as result;
