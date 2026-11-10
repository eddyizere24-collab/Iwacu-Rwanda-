-- M6: office entry — public place list, server-only key lookup, temporary lock. Fabricated fixtures only.
-- Run after 20261110_02 and the M3 contract test (fixture accounts: district A = unit ...a3, sector A = ...a4, cell A = ...a5).
\set ON_ERROR_STOP on

begin;
set local role anon;
do $pub$
declare v_n integer;
begin
  select count(*) into v_n from public.list_entry_places_v1('district');
  if v_n <> 2 then raise exception 'two districts expected, got %', v_n; end if;
  select count(*) into v_n from public.list_entry_places_v1('district', null, 'akarere a');
  if v_n <> 1 then raise exception 'district search expected 1, got %', v_n; end if;
  select count(*) into v_n from public.list_entry_places_v1('sector', 'RW-01-01');
  if v_n <> 1 then raise exception 'sectors under district A expected 1, got %', v_n; end if;
  select count(*) into v_n from public.list_entry_places_v1('cell', 'RW-01-01-01');
  if v_n <> 2 then raise exception 'cells under sector A expected 2, got %', v_n; end if;
  -- A sector list needs its district; a cell list needs its sector; nothing else is accepted.
  perform public.m3_expect($q$select * from public.list_entry_places_v1('sector')$q$,'22023');
  perform public.m3_expect($q$select * from public.list_entry_places_v1('sector','RW-01-01-01')$q$,'22023');
  perform public.m3_expect($q$select * from public.list_entry_places_v1('cell','RW-01-01')$q$,'22023');
  perform public.m3_expect($q$select * from public.list_entry_places_v1('village','RW-01-01-01-01')$q$,'22023');
  perform public.m3_expect($q$select * from public.list_entry_places_v1('province')$q$,'22023');
  -- Only names and codes come back.
  if exists (select 1 from public.list_entry_places_v1('district') where scope_code is null or name is null) then raise exception 'incomplete place row'; end if;
  -- Server-only functions are closed to the public.
  perform public.m3_expect($q$select * from public.office_entry_lookup_v1('RW-01-01','h1')$q$,'42501');
  perform public.m3_expect($q$select public.office_entry_fail_v1('RW-01-01','h1')$q$,'42501');
  perform public.m3_expect($q$select * from public.office_entry_failures$q$,'42501');
end $pub$;
reset role;

set local role authenticated;
do $auth$
begin
  perform public.m3_expect($q$select * from public.office_entry_lookup_v1('RW-01-01','h1')$q$,'42501');
  perform public.m3_expect($q$select public.office_entry_clear_v1('RW-01-01','h1')$q$,'42501');
end $auth$;
reset role;

set local role service_role;
do $srv$
declare r record;
begin
  -- Each place resolves to ITS OWN account only.
  select * into r from public.office_entry_lookup_v1('RW-01-01', 'h1');
  if r.email <> 'district-a-test@iwacu.invalid' or r.role_code <> 'district_admin' or r.locked then raise exception 'district A lookup wrong: %', r; end if;
  select * into r from public.office_entry_lookup_v1('RW-01-01-01', 'h1');
  if r.email <> 'sector-a-test@iwacu.invalid' or r.role_code <> 'sector_admin' then raise exception 'sector A lookup wrong: %', r; end if;
  select * into r from public.office_entry_lookup_v1('RW-01-01-01-01', 'h1');
  if r.email <> 'cell-a-test@iwacu.invalid' or r.role_code <> 'cell_admin' then raise exception 'cell A lookup wrong: %', r; end if;
  -- A place without an account, a village and the national unit give nothing to sign in with.
  select * into r from public.office_entry_lookup_v1('RW-02-01', 'h1');
  if r.email is not null then raise exception 'district B has no account here'; end if;
  select * into r from public.office_entry_lookup_v1('RW-01-01-01-01-01', 'h1');
  if r.email is not null then raise exception 'villages have no login'; end if;
  select * into r from public.office_entry_lookup_v1('RW-01', 'h1');
  if r.email is not null then raise exception 'provinces have no login'; end if;
  select * into r from public.office_entry_lookup_v1('RW', 'h1');
  if r.email is not null then raise exception 'national does not use place keys'; end if;
  perform public.m3_expect($q$select * from public.office_entry_lookup_v1('nonsense','h1')$q$,'22023');

  -- Lock: 5 wrong tries from one device lock that device for that place only.
  for i in 1..5 loop perform public.office_entry_fail_v1('RW-01-01', 'h1'); end loop;
  select * into r from public.office_entry_lookup_v1('RW-01-01', 'h1');
  if not r.locked then raise exception 'five failures must lock this device'; end if;
  select * into r from public.office_entry_lookup_v1('RW-01-01', 'h2');
  if r.locked then raise exception 'another device must not be locked by five tries'; end if;
  select * into r from public.office_entry_lookup_v1('RW-01-01-01', 'h1');
  if r.locked then raise exception 'another place must not be locked'; end if;
  -- Twenty tries from many devices lock the place for everyone (temporarily).
  for i in 1..15 loop perform public.office_entry_fail_v1('RW-01-01', 'x' || i); end loop;
  select * into r from public.office_entry_lookup_v1('RW-01-01', 'h9');
  if not r.locked then raise exception 'twenty failures must lock the place'; end if;
  -- A right key clears that device's tries.
  perform public.office_entry_clear_v1('RW-01-01', 'h1');
  select count(*) as n into r from public.office_entry_failures where scope_code = 'RW-01-01' and ip_hash = 'h1';
  if r.n <> 0 then raise exception 'clear must forget this device'; end if;
end $srv$;
reset role;
rollback;

select 'PASS: office entry — public place list, own-place key lookup only, no login for villages/provinces/national, temporary lock, server-only helpers' as result;
