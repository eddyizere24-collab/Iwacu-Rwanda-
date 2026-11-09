-- M4: office workspaces (leader cards per unit, explorer, dashboard, public read path).
-- Run after the V2 foundation + L1 + M3 migrations + 20261109_01_office_workspaces.sql, and after the M3 contract test
-- (which creates the district-B and sector-A accounts). Fabricated fixtures only.
\set ON_ERROR_STOP on

begin;
set local role authenticated;
do $m4$
declare v_n integer; v_r record; v_u uuid;
begin
  -- No client may touch the tables directly.
  perform public.m3_expect($q$select * from public.office_unit_leaders$q$,'42501');
  perform public.m3_expect($q$select * from public.office_unit_leader_audit$q$,'42501');

  -- National: dashboard counts.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  perform public.create_office_account_v1('a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6','akarere.b','Mukamana Alice','Meya','+250788000001','district_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8');
  if (public.get_office_workspace_v1()->>'child_level') <> 'district' then raise exception 'national child level must be district'; end if;
  if (public.get_office_workspace_v1()->'counts'->>'district')::int <> 2 then raise exception 'national should see 2 districts'; end if;
  -- The two districts that got accounts in M3 already have a leader card.
  if (public.get_office_workspace_v1()->>'child_with_account')::int < 1 then raise exception 'district account must create a leader card'; end if;

  -- National explorer: provinces first (not editable), then districts below a province.
  select count(*) into v_n from public.list_office_units_v1(null);
  if v_n <> 2 then raise exception 'national root should list 2 provinces, got %', v_n; end if;
  if exists (select 1 from public.list_office_units_v1(null) where can_edit) then raise exception 'provinces must not be editable'; end if;
  select count(*) into v_n from public.list_office_units_v1('RW-02') where leader_name = 'Mukamana Alice' and status = 'invited';
  if v_n <> 1 then raise exception 'district B leader must show as invited, got %', v_n; end if;

  -- National can write a vacant village-level card down the tree, and edit a sector card.
  v_u := public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', 'Nshimiye Paul', 'Umukuru w''Umudugudu', '+250788111222', null, 'Yatowe 2024.', 'Buri munsi 08:00-10:00', true, true, null, false);
  perform public.m3_expect($q$select public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Province Person')$q$,'22023');
  perform public.m3_expect($q$select public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','x')$q$,'23514');
  perform public.m3_expect($q$select public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','Valid Name',null,'abc')$q$,'23514');
  -- A photo path must belong to the same unit.
  perform public.m3_expect($q$select public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','Valid Name',null,null,null,null,null,true,true,'office/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6/x.webp',false)$q$,'22023');
  perform public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','Nshimiye Paul','Umukuru w''Umudugudu','+250788111222',null,'Yatowe 2024.','Buri munsi 08:00-10:00',true,true,'office/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11/photo.webp',false);

  -- District A admin: sees only its own tree; cannot see or edit district B.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  if (public.get_office_workspace_v1()->>'child_level') <> 'sector' then raise exception 'district child level must be sector'; end if;
  perform public.create_office_account_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','umurenge.a','Uwase Jeanne','Umunyamabanga Nshingwabikorwa','+250788000002','sector_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4');
  perform public.m3_expect($q$select * from public.list_office_units_v1('RW-02-01')$q$,'42501');
  perform public.m3_expect($q$select public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','Hacker Name')$q$,'42501');
  perform public.m3_expect($q$select * from public.get_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11')$q$,'42501');
  select count(*) into v_n from public.list_office_units_v1('RW-01-01');
  if v_n <> 1 then raise exception 'district A should list 1 sector, got %', v_n; end if;
  if not exists (select 1 from public.list_office_units_v1('RW-01-01') where leader_name = 'Uwase Jeanne' and status = 'invited') then
    raise exception 'sector A leader card created with the account is missing';
  end if;
  -- Flat table is scoped too.
  if exists (select 1 from public.list_office_leaders_v1(null, null, 200) where leader_name = 'Nshimiye Paul') then
    raise exception 'district A must not see a village of district B';
  end if;
  -- District A may create a village card under its own tree and may remove it (no login behind it).
  perform public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','Kamanzi Eric','Umukuru w''Umudugudu','+250788333444');
  if not exists (select 1 from public.list_office_leaders_v1('kamanzi', 'village', 50)) then raise exception 'search by name must find the village leader'; end if;
  if not public.remove_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6') then raise exception 'card without login must be removable from above'; end if;
  -- A card with a login behind it is not removed this way.
  if public.remove_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4') then raise exception 'card with a login must stay'; end if;
  -- Cannot remove my own unit's card (strictly below only).
  perform public.m3_expect($q$select public.remove_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3')$q$,'42501');

  -- Sector A admin edits its own card (self-service) but not a sibling sector.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','33333333-3333-4333-8333-333333333333','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333', true);
  perform public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','Uwase Jeanne','Umunyamabanga Nshingwabikorwa','+250788000002','jeanne@example.rw','Ndi hano kugufasha.','Kuwa mbere-kuwa gatanu 08:00-17:00',true,false,null,false);
  perform public.m3_expect($q$select public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9','Other Person')$q$,'42501');
  -- Cell admin of A (44..) cannot edit the sector above.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','44444444-4444-4444-8444-444444444444','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444', true);
  perform public.m3_expect($q$select public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','Overwrite Boss')$q$,'42501');
end
$m4$;
reset role;
do $aud$
begin
  if not exists (select 1 from public.office_unit_leader_audit where action = 'insert') then raise exception 'audit trail missing'; end if;
  if not exists (select 1 from public.office_unit_leader_audit where action = 'update' and changed_by is not null) then raise exception 'audit update must record who'; end if;
end $aud$;
rollback;

-- Public read path: anon sees only public cards, only public fields, phone only if allowed.
begin;
set local role postgres;
select set_config('request.jwt.claims','{}', true), set_config('request.jwt.claim.sub','', true);
insert into public.office_unit_leaders(unit_id, display_name, job_title, phone, public_email, is_public, show_phone)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10','Hidden Person','Chef','+250788555666',null,false,true)
on conflict (unit_id) do update set display_name = excluded.display_name, is_public = false;
insert into public.office_unit_leaders(unit_id, display_name, job_title, phone, is_public, show_phone)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','Public Person','Umunyamabanga','+250788777888',true,false);
set local role anon;
do $pub$
declare v_n integer;
begin
  select count(*) into v_n from public.get_public_unit_leaders_v1(array['RW-01-01-01','RW-02-01-01-01','RW-01-01-01-01']);
  if v_n <> 1 then raise exception 'anon should see exactly the 1 public card, saw %', v_n; end if;
  if exists (select 1 from public.get_public_unit_leaders_v1(array['RW-01-01-01']) where phone is not null) then
    raise exception 'phone must be hidden when show_phone is false';
  end if;
  if exists (select 1 from public.get_public_unit_leaders_v1(array['RW-02-01-01-01']) ) then
    raise exception 'private card must not be public';
  end if;
  perform public.m3_expect($q$select * from public.office_unit_leaders$q$,'42501');
  perform public.m3_expect($q$select * from public.get_office_workspace_v1()$q$,'42501');
end
$pub$;
rollback;

select 'PASS: office workspaces — leader cards, scope-limited explorer, self-service edit, removal rules, public privacy, audit trail' as result;
