-- L1 acceptance contracts. All data-mutating exercises run in disposable PostgreSQL and roll back.
\set ON_ERROR_STOP on

do $contracts$
begin
  if to_regclass('public.leader_employment_history') is null then raise exception 'missing employment history'; end if;
  if to_regclass('public.leader_certifications') is null then raise exception 'missing certifications'; end if;
  if to_regprocedure('public.transfer_leader_appointment_v2(uuid,uuid,uuid,date,text,text,text,text,date,date)') is null then
    raise exception 'missing atomic transfer RPC';
  end if;
  if to_regprocedure('public.change_leader_appointment_state_v2(uuid,text,date,text)') is null then
    raise exception 'missing retained appointment end/archive RPC';
  end if;
  if to_regprocedure('public.get_leader_candidates_v2(text[])') is null then
    raise exception 'missing bounded candidate RPC';
  end if;
  if (select count(*) from public.leader_positions where confirmation_required is true and position_status='draft') < 6 then
    raise exception 'official enum-derived positions must be draft pending confirmation';
  end if;
  if (select count(*) from public.admin_role_assignments where role_code='national_super_admin' and assignment_status='active') <> 1 then
    raise exception 'initial National Super Admin mapping missing or duplicated';
  end if;
  if to_regprocedure('private.leader_actor_can_manage_assignment(text,uuid)') is null then
    raise exception 'missing database-enforced assignment hierarchy helper';
  end if;
  if (select count(*) from pg_policies
      where schemaname='public' and tablename='admin_role_assignments'
        and policyname in ('admin_role_assignments_l1_hierarchy_insert','admin_role_assignments_l1_hierarchy_update')
        and permissive='RESTRICTIVE') <> 2 then
    raise exception 'restrictive assignment hierarchy RLS policies are missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='leader_photos_upload_scoped'
      and with_check like '%leader_appointment_is_public%'
  ) then
    raise exception 'photo uploads are not tied to an approved and published appointment';
  end if;
  if has_table_privilege('anon','public.leader_employment_history','select')
     or has_table_privilege('anon','public.leader_certifications','select') then
    raise exception 'anon can read private employment/certification records';
  end if;
  if not exists(select 1 from storage.buckets where id='leader-photos' and public is true and file_size_limit=153600) then
    raise exception 'public photo bucket settings incorrect';
  end if;
  if not exists(select 1 from storage.buckets where id='leader-dossier' and public is false and file_size_limit=5242880) then
    raise exception 'private dossier bucket settings incorrect';
  end if;
  if (select count(*) from pg_policies where schemaname='storage' and tablename='objects'
      and policyname in ('leader_photos_upload_scoped','leader_photos_delete_scoped','leader_evidence_upload_scoped','leader_dossier_upload_scoped','leader_dossier_read_scoped','leader_dossier_update_scoped','leader_dossier_delete_scoped')) <> 7 then
    raise exception 'one or more L1 Storage object policies are missing';
  end if;
end
$contracts$;

-- Exercise a transfer; old appointment, new appointment, evidence, timeline and audit
-- are asserted before ROLLBACK restores the original appointment.
begin;
set local role authenticated;
set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","aal":"aal2"}';
do $transfer_test$
declare
  v_old uuid;
  v_position uuid;
  v_result jsonb;
  v_new uuid;
begin
  select a.id,a.position_id into v_old,v_position
  from public.leader_appointments a
  join public.leader_positions p on p.id=a.position_id
  where p.code='test_sector_officer' and a.appointment_status='active'
  order by a.created_at desc limit 1;
  if v_old is null then raise exception 'active sector transfer fixture missing'; end if;

  v_result:=public.transfer_leader_appointment_v2(
    v_old,v_position,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9',
    current_date,'Transfer contract test reason','appointment_letter',
    'L1-TRANSFER-TEST','Isolated test issuer',current_date,null
  );
  v_new:=(v_result->>'new_appointment_id')::uuid;
  if v_new is null then raise exception 'transfer RPC returned no new appointment'; end if;
  if not exists(select 1 from public.leader_appointments where id=v_old and appointment_status='ended' and effective_to=current_date) then
    raise exception 'old appointment was not ended on effective date';
  end if;
  if not exists(select 1 from public.leader_appointments where id=v_new and appointment_status='pending' and person_id=(select person_id from public.leader_appointments where id=v_old)) then
    raise exception 'new appointment was not created as pending for the same person';
  end if;
  if (select count(*) from public.leader_appointment_evidence where appointment_id=v_new)<>1 then
    raise exception 'new appointment evidence metadata missing';
  end if;
  if not exists(select 1 from public.leader_appointment_events where appointment_id=v_old and event_type='transferred') then
    raise exception 'transfer history event missing';
  end if;
  if not exists(select 1 from public.leader_audit_events where target_table='leader_appointments' and target_id=v_old) then
    raise exception 'transfer audit event missing';
  end if;
end
$transfer_test$;
rollback;

-- Appointment termination/archive must create versioned history/audit, not delete.
begin;
set local role authenticated;
set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","aal":"aal2"}';
do $archive_test$
declare
  v_old uuid;
  v_result jsonb;
begin
  select a.id into v_old
  from public.leader_appointments a
  join public.leader_positions p on p.id=a.position_id
  where p.code='test_sector_officer' and a.appointment_status='active'
  order by a.created_at desc limit 1;
  if v_old is null then raise exception 'active sector archive fixture missing'; end if;
  v_result:=public.change_leader_appointment_state_v2(v_old,'end',current_date,'L1 termination contract test reason');
  if v_result->>'appointment_status'<>'ended' then raise exception 'appointment did not transition to ended'; end if;
  v_result:=public.change_leader_appointment_state_v2(v_old,'archive',null,'L1 archive contract test reason');
  if v_result->>'appointment_status'<>'archived' then raise exception 'appointment did not transition to archived'; end if;
  if not exists(select 1 from public.leader_appointment_events where appointment_id=v_old and event_type='ended') then
    raise exception 'end history event missing';
  end if;
  if not exists(select 1 from public.leader_appointment_events where appointment_id=v_old and event_type='archived') then
    raise exception 'archive history event missing';
  end if;
  if (select count(*) from public.leader_audit_events where target_table='leader_appointments' and target_id=v_old)<2 then
    raise exception 'end/archive audit events missing';
  end if;
end
$archive_test$;
rollback;

-- One cell candidate returns its own exact-level place and parent leaders separately.
begin;
set local role anon;
set local request.jwt.claim.sub='';
do $public_test$
declare
  v_one jsonb;
  v_multi jsonb;
  v_candidates jsonb;
  v_shared jsonb;
  v_sector_ids text[];
begin
  v_one:=public.get_leader_candidates_v2(array['RW-01-01-01-01']);
  v_candidates:=v_one->'candidates';
  v_shared:=v_one->'shared_leaders';
  if jsonb_array_length(v_candidates)<>1 then raise exception 'single cell query did not return one candidate'; end if;
  if v_candidates->0->'place'->>'level'<>'cell' then raise exception 'cell candidate did not keep exact cell level'; end if;
  if exists(select 1 from jsonb_array_elements(v_candidates) c where c->'place'->>'level'='village') then
    raise exception 'cell-only lookup inferred a village candidate';
  end if;
  if exists(select 1 from jsonb_array_elements(v_shared) s where s->'place'->>'level'='village') then
    raise exception 'cell-only lookup returned a village as an ancestor';
  end if;
  if not exists(select 1 from jsonb_array_elements(v_shared) s where s->'place'->>'level'='sector') then
    raise exception 'cell-only lookup did not include the sector ancestor leader when published';
  end if;

  -- Two villages inside one Sector share the published Sector appointment once.
  v_multi:=public.get_leader_candidates_v2(array[
    'RW-01-01-01-01-01','RW-01-01-01-02-01'
  ]);
  v_candidates:=v_multi->'candidates';
  v_shared:=v_multi->'shared_leaders';
  if jsonb_array_length(v_candidates)<>2 then raise exception 'two-village query did not return two candidate places'; end if;
  select array_agg(s->>'appointment_id') into v_sector_ids
  from jsonb_array_elements(v_shared) s
  where s->'place'->>'level'='sector'
    and s->'place'->>'scope_code'='RW-01-01-01';
  if coalesce(array_length(v_sector_ids,1),0)<>1 then
    raise exception 'shared Sector appointment must appear exactly once for multiple villages';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(v_candidates) as candidate(value)
    cross join lateral jsonb_array_elements(candidate.value->'leaders') as exact_leader(value)
    where exact_leader.value->>'appointment_id' in (
      select shared_leader.value->>'appointment_id'
      from jsonb_array_elements(v_shared) as shared_leader(value)
    )
  ) then raise exception 'appointment duplicated between exact candidate leaders and shared_leaders'; end if;
  if (v_multi::text ~* 'phone_raw|admin_dossier|internal_notes|private_storage_key|decision_by|verified_by|"email"') then
    raise exception 'private field leaked into the public candidate response';
  end if;
end
$public_test$;
rollback;


-- Prove the three-step assignment ladder is enforced by RLS as well as the API.
-- No Province account role is permitted.
insert into auth.users(id,email)
values ('66666666-6666-4666-8666-666666666666','l1-hierarchy-test@iwacu.invalid')
on conflict (id) do nothing;

begin;
set local role authenticated;

-- National Super Admin (AAL2) may create a District Admin only.
set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","aal":"aal2"}';
insert into public.admin_role_assignments(
  user_id,role_code,administrative_unit_id,assignment_status,valid_from,grant_reason
) values (
  '66666666-6666-4666-8666-666666666666','district_admin',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','active',now(),'L1 hierarchy contract test'
);

-- National Super Admin cannot skip tiers and create a Sector Admin.
select public.test_expect_sqlstate(
  'insert into public.admin_role_assignments(user_id,role_code,administrative_unit_id,assignment_status,valid_from,grant_reason) ' ||
  'values (''66666666-6666-4666-8666-666666666666'',''sector_admin'',''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'',''active'',now(),''L1 invalid tier skip'')',
  '42501'
);

-- District Admin can create a Sector Admin only in a direct child Sector.
set local request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
set local request.jwt.claims='{"sub":"22222222-2222-4222-8222-222222222222","aal":"aal1"}';
insert into public.admin_role_assignments(
  user_id,role_code,administrative_unit_id,assignment_status,valid_from,grant_reason
) values (
  '66666666-6666-4666-8666-666666666666','sector_admin',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','active',now(),'L1 hierarchy contract test'
);

-- District Admin cannot skip the Cell creation step.
select public.test_expect_sqlstate(
  'insert into public.admin_role_assignments(user_id,role_code,administrative_unit_id,assignment_status,valid_from,grant_reason) ' ||
  'values (''66666666-6666-4666-8666-666666666666'',''cell_admin'',''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'',''active'',now(),''L1 invalid tier skip'')',
  '42501'
);

-- Sector Admin can create a Cell Admin only for a direct child Cell.
set local request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
set local request.jwt.claims='{"sub":"33333333-3333-4333-8333-333333333333","aal":"aal1"}';
insert into public.admin_role_assignments(
  user_id,role_code,administrative_unit_id,assignment_status,valid_from,grant_reason
) values (
  '66666666-6666-4666-8666-666666666666','cell_admin',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','active',now(),'L1 hierarchy contract test'
);

-- Sector Admin cannot grant a role at District level.
select public.test_expect_sqlstate(
  'insert into public.admin_role_assignments(user_id,role_code,administrative_unit_id,assignment_status,valid_from,grant_reason) ' ||
  'values (''66666666-6666-4666-8666-666666666666'',''district_admin'',''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'',''active'',now(),''L1 invalid upward grant'')',
  '42501'
);

rollback;

select 'PASS: L1 owner mapping, draft position catalogue, dossier extensions/RLS, Storage policies, transfer+archive rollback, candidate hierarchy/shared dedupe and public response privacy' as result;
