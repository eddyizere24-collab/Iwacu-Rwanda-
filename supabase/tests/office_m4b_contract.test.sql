-- M4b: office oversight — unit dossiers, search, accounts & access, cases, tasks, audit. Fabricated fixtures only.
-- Run after 20261109_01 + 20261109_02 and the M3 contract test (which leaves m3_expect and the fixture users behind).
\set ON_ERROR_STOP on

begin;
select set_config('request.jwt.claims','{}', true), set_config('request.jwt.claim.sub','', true);
-- Two citizen cases: one about sector A (district A), one about sector B (district B).
insert into public.leader_public_feedback(administrative_unit_id, category, message)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','wrong_phone','Telefone si yo'),
       ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9','wrong_leader','Umuyobozi si we');

set local role authenticated;
do $m4b$
declare v jsonb; v_n integer; v_task uuid; v_task2 uuid; v_case uuid; v_other uuid;
begin
  -- ===== National =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  perform public.create_office_account_v1('a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6','akarere.b','Mukamana Alice','Meya','+250788000001','district_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8');

  v := public.get_office_unit_v1(null);
  if v->'unit'->>'scope_code' <> 'RW' then raise exception 'national dossier must be RW'; end if;
  if (v->'levels'->'district'->>'total')::int <> 2 then raise exception 'two districts expected'; end if;
  if (v->'levels'->'district'->>'with_leader')::int <> 1 then raise exception 'one district card expected'; end if;
  if jsonb_array_length(v->'children') <> 2 then raise exception 'two provinces expected'; end if;
  if jsonb_array_length(v->'ancestors') <> 0 then raise exception 'national has no ancestors'; end if;
  if (v->'attention'->>'vacant_units')::int <> 1 then raise exception 'one vacant district expected'; end if;
  if v->'attention'->>'vacant_level' <> 'district' then raise exception 'national vacancy level is district'; end if;
  if v->'messages' is null or jsonb_typeof(v->'messages') <> 'object' then raise exception 'national messages block expected'; end if;
  if (v->'case_counts'->>'new')::int <> 2 then raise exception 'two new cases expected, got %', v->'case_counts'; end if;
  v := public.get_office_unit_v1('RW-01-01-01');
  if jsonb_array_length(v->'ancestors') <> 3 then raise exception 'sector A should have 3 ancestors for national, got %', jsonb_array_length(v->'ancestors'); end if;
  if v->'children'->0->>'name' <> 'Akagari A' and v->'children'->0->>'name' <> 'Akagari A2' then raise exception 'cells expected'; end if;
  perform public.m3_expect($q$select public.get_office_unit_v1('RW-99')$q$,'42501');

  -- search
  select count(*) into v_n from public.search_office_units_v1(null,'district',null,50,0);
  if v_n <> 2 then raise exception 'search districts expected 2, got %', v_n; end if;
  select count(*) into v_n from public.search_office_units_v1(null,'district',true,50,0);
  if v_n <> 1 then raise exception 'vacant districts expected 1, got %', v_n; end if;
  if not exists (select 1 from public.search_office_units_v1('mukamana',null,null,50,0)) then raise exception 'search by leader name'; end if;
  if (select total from public.search_office_units_v1(null,'village',null,1,0) limit 1) <> 3 then raise exception 'village total expected 3'; end if;
  perform public.m3_expect($q$select * from public.search_office_units_v1(null,'planet',null,10,0)$q$,'22023');

  -- accounts: sector A created by district A below
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  perform public.create_office_account_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','umurenge.a','Uwase Jeanne','Umunyamabanga','+250788000002','sector_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4');
  -- district A view
  v := public.get_office_unit_v1(null);
  if jsonb_array_length(v->'ancestors') <> 0 then raise exception 'district admin must not see ancestors above scope'; end if;
  if (v->'case_counts'->>'new')::int <> 1 then raise exception 'district A sees only its own case'; end if;
  perform public.m3_expect($q$select public.get_office_unit_v1('RW-02-01')$q$,'42501');
  perform public.m3_expect($q$select public.get_office_unit_v1('RW')$q$,'42501');
  -- cases
  select count(*) into v_n from public.list_office_cases_v1(null,null,30,0);
  if v_n <> 1 then raise exception 'district A cases expected 1, got %', v_n; end if;
  select id into v_case from public.list_office_cases_v1('open',null,30,0) limit 1;
  if public.set_office_case_status_v1(v_case,'resolved') <> 'resolved' then raise exception 'case status'; end if;
  if (select count(*) from public.list_office_cases_v1('open',null,30,0)) <> 0 then raise exception 'resolved case leaves open list'; end if;
  perform public.m3_expect($q$select * from public.list_office_cases_v1(null,'RW-02-01',30,0)$q$,'42501');
  -- tasks: district A -> its sector A; not district B's sector, not past deadline
  v_task2 := public.create_office_task_v1('Raporo y''umurenge','Mutange raporo.','high', now() + interval '3 days', array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4']::uuid[]);
  perform public.m3_expect($q$select public.create_office_task_v1('Ibindi','x','normal', now() + interval '3 days', array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9']::uuid[])$q$,'42501');
  perform public.m3_expect($q$select public.create_office_task_v1('Ibindi','x','normal', now() - interval '1 day', array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4']::uuid[])$q$,'22023');
  perform public.m3_expect($q$select public.create_office_task_v1('Ibindi','x','normal', now() + interval '3 days', array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3']::uuid[])$q$,'42501');
  perform public.m3_expect($q$select public.create_office_task_v1('Ibindi','x','urgent', now() + interval '3 days', array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4']::uuid[])$q$,'23514');

  -- ===== National issues a task to both districts =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  v_task := public.create_office_task_v1('Ibarura ry''abaturage','Mutange imibare.','critical', now() + interval '2 days',
            array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8']::uuid[]);
  select count(*) into v_n from public.list_office_tasks_v1('issued',50,0);
  if v_n <> 2 then raise exception 'national issued tasks expected 2 (own + district A cascade), got %', v_n; end if;
  if (select targets from public.list_office_tasks_v1('issued',50,0) where id = v_task) <> 2 then raise exception 'two targets expected'; end if;
  perform public.m3_expect($q$select public.create_office_task_v1('X','y','normal', now() + interval '1 day', array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1']::uuid[])$q$,'42501');

  -- ===== District A handles its target =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  select count(*) into v_n from public.list_office_tasks_v1('assigned',50,0);
  if v_n <> 1 then raise exception 'district A assigned tasks expected 1, got %', v_n; end if;
  v := public.get_office_task_v1(v_task);
  if jsonb_array_length(v->'targets') <> 1 then raise exception 'district A sees only its target, saw %', jsonb_array_length(v->'targets'); end if;
  perform public.update_office_task_target_v1(v_task,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','acknowledged',null);
  perform public.m3_expect(format($q$select public.update_office_task_target_v1(%L,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','acknowledged',null)$q$, v_task),'22023');
  perform public.m3_expect(format($q$select public.update_office_task_target_v1(%L,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','submitted','x')$q$, v_task),'42501');
  perform public.m3_expect(format($q$select public.update_office_task_target_v1(%L,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','approved','x')$q$, v_task),'42501');
  perform public.update_office_task_target_v1(v_task,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','submitted','Imibare yoherejwe.');
  perform public.m3_expect(format($q$select public.cancel_office_task_v1(%L)$q$, v_task),'42501');

  -- ===== National reviews =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  perform public.m3_expect(format($q$select public.update_office_task_target_v1(%L,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','approved','x')$q$, v_task),'22023');
  perform public.m3_expect(format($q$select public.update_office_task_target_v1(%L,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','submitted','x')$q$, v_task),'42501');
  if public.update_office_task_target_v1(v_task,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','approved','Murakoze') <> 'approved' then raise exception 'approve'; end if;
  v := public.get_office_unit_v1(null);
  if (v->'tasks'->>'open_targets')::int < 1 then raise exception 'open targets must show on dossier, got %', v->'tasks'; end if;
  v := public.get_office_task_v1(v_task);
  if jsonb_array_length(v->'targets') <> 2 then raise exception 'national sees both targets'; end if;
  if not public.cancel_office_task_v1(v_task) then raise exception 'cancel'; end if;
  perform public.m3_expect(format($q$select public.update_office_task_target_v1(%L,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','acknowledged',null)$q$, v_task),'22023');

  -- accounts & access (national)
  select count(*) into v_n from public.list_office_accounts_v1(null,null,50,0);
  if v_n <> 2 then raise exception 'national should list 2 accounts below, got %', v_n; end if;
  if public.set_office_account_active_v1('a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6', false) <> 'suspended' then raise exception 'suspend'; end if;
  if (select count(*) from public.list_office_accounts_v1(null,'suspended',50,0)) <> 1 then raise exception 'suspended filter'; end if;
  perform public.m3_expect($q$select public.set_office_account_active_v1('11111111-1111-4111-8111-111111111111', false)$q$,'22023');
  if not public.prepare_office_reset_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7') then raise exception 'reset'; end if;
  -- the suspended district B admin has no scope at all
  perform set_config('request.jwt.claims', jsonb_build_object('sub','a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6', true);
  perform public.m3_expect($q$select public.get_office_unit_v1(null)$q$,'42501');
  -- district A may not touch district B's account, nor national
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  perform public.m3_expect($q$select public.set_office_account_active_v1('a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6', true)$q$,'42501');
  perform public.m3_expect($q$select public.prepare_office_reset_v1('11111111-1111-4111-8111-111111111111')$q$,'42501');
  if (select count(*) from public.list_office_accounts_v1(null,null,50,0)) <> 1 then raise exception 'district A lists only sector A account'; end if;
  -- audit: district A never sees district B events
  if exists (select 1 from public.list_office_audit_v1(50,0) where scope_code like 'RW-02%') then raise exception 'audit leaks another district'; end if;
  if not exists (select 1 from public.list_office_audit_v1(50,0) where kind = 'account_created') then raise exception 'audit should show the account creation'; end if;
  -- national reactivates and sees everything
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  if public.set_office_account_active_v1('a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6', true) <> 'invited' then raise exception 'reactivate'; end if;
  if not exists (select 1 from public.list_office_audit_v1(50,0) where scope_code like 'RW-02%') then raise exception 'national audit should include district B'; end if;
end
$m4b$;
reset role;
do $anon$
begin
  if has_function_privilege('anon','public.get_office_unit_v1(text)','execute')
     or has_function_privilege('anon','public.create_office_task_v1(text,text,text,timestamptz,uuid[])','execute')
     or has_function_privilege('anon','public.list_office_cases_v1(text,text,integer,integer)','execute')
     or has_function_privilege('anon','public.list_office_accounts_v1(text,text,integer,integer)','execute') then
    raise exception 'anon must not execute oversight functions';
  end if;
  if has_table_privilege('authenticated','public.office_tasks','select') or has_table_privilege('authenticated','public.office_task_targets','select') then
    raise exception 'task tables must have no client grants';
  end if;
end $anon$;
rollback;

select 'PASS: office oversight — dossiers, search, accounts & access, cases, tasks (issue/ack/submit/review), audit, scope isolation' as result;
