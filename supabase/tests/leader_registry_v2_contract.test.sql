-- Run only in a disposable PostgreSQL instance after leader_registry_v2_bootstrap.sql
-- and sql/migrations/20261103_leader_registry_v2_foundation.sql.
-- All test people/appointments/documents are fabricated test fixtures and never enter Production.
\set ON_ERROR_STOP on

do $schema$
begin
  if to_regclass('public.admin_role_assignments') is null then raise exception 'missing admin_role_assignments'; end if;
  if to_regclass('public.admin_delegations') is null then raise exception 'missing admin_delegations'; end if;
  if to_regclass('public.leader_people') is null then raise exception 'missing leader_people'; end if;
  if to_regclass('public.leader_person_history') is null then raise exception 'missing leader_person_history'; end if;
  if to_regclass('public.leader_positions') is null then raise exception 'missing leader_positions'; end if;
  if to_regclass('public.leader_appointments') is null then raise exception 'missing leader_appointments'; end if;
  if to_regclass('public.leader_verification_cases') is null then raise exception 'missing leader_verification_cases'; end if;
  if to_regclass('public.leader_appointment_evidence') is null then raise exception 'missing leader_appointment_evidence'; end if;
  if to_regclass('public.leader_verification_decisions') is null then raise exception 'missing leader_verification_decisions'; end if;
  if to_regclass('public.leader_public_profiles') is null then raise exception 'missing leader_public_profiles'; end if;
  if to_regclass('public.leader_contacts') is null then raise exception 'missing leader_contacts'; end if;
  if to_regclass('public.leader_dossiers') is null then raise exception 'missing leader_dossiers'; end if;
  if to_regclass('public.leader_dossier_documents') is null then raise exception 'missing leader_dossier_documents'; end if;
  if to_regclass('public.leader_appointment_events') is null then raise exception 'missing leader_appointment_events'; end if;
  if to_regclass('public.leader_audit_events') is null then raise exception 'missing leader_audit_events'; end if;
  if to_regclass('public.leader_directory_public') is null then raise exception 'missing public directory view'; end if;
  if to_regprocedure('public.create_leader_appointment_v2(text,text,uuid,uuid,date,text,text,text,date,date,text)') is null then
    raise exception 'missing atomic leader submission RPC';
  end if;
  if to_regprocedure('public.decide_leader_verification_v2(uuid,text,text,integer)') is null then
    raise exception 'missing verification decision RPC';
  end if;
  if to_regprocedure('public.update_leader_person_identity_v2(uuid,integer,text,text,text)') is null then
    raise exception 'missing versioned identity correction RPC';
  end if;
  if to_regprocedure('private.leader_actor_requires_mfa()') is null then
    raise exception 'missing National Super Admin MFA RLS helper';
  end if;
  if (
    select count(*) from pg_policies
    where schemaname='public'
      and policyname like '%_national_mfa_required'
      and permissive='RESTRICTIVE'
  ) <> 15 then
    raise exception 'National Super Admin MFA restrictive policies are missing from one or more registry tables';
  end if;
  if (select count(*) from public.admin_role_assignments where role_code='national_super_admin') <> 1 then
    raise exception 'national super admin migration bootstrap did not create exactly one role';
  end if;
  if exists (
    select 1 from (values
      ('public.leader_people'),('public.leader_appointments'),('public.leader_dossiers'),
      ('public.leader_dossier_documents'),('public.leader_contacts'),('public.leader_verification_cases')
    ) x(rel) join pg_class c on c.oid=x.rel::regclass where c.relrowsecurity is not true
  ) then raise exception 'one or more protected tables have RLS disabled'; end if;
  if has_table_privilege('anon','public.leader_dossiers','select') then
    raise exception 'anon must not receive dossier SELECT';
  end if;
  if not has_table_privilege('anon','public.leader_directory_public','select') then
    raise exception 'anon cannot select the public directory view';
  end if;
  if has_table_privilege('authenticated','public.leader_audit_events','insert')
     or has_table_privilege('authenticated','public.leader_verification_decisions','insert')
     or has_table_privilege('authenticated','public.leader_appointment_events','insert') then
    raise exception 'append-only ledgers must not grant direct authenticated INSERT';
  end if;
end
$schema$;

-- Fixture authority assignments are created by the disposable test harness as postgres.
insert into public.admin_role_assignments(user_id,role_code,administrative_unit_id,assignment_status,valid_from,granted_by,grant_reason)
values
 ('22222222-2222-4222-8222-222222222222','district_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','active',now(),'11111111-1111-4111-8111-111111111111','isolated test fixture'),
 ('33333333-3333-4333-8333-333333333333','sector_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','active',now(),'11111111-1111-4111-8111-111111111111','isolated test fixture'),
 ('44444444-4444-4444-8444-444444444444','cell_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','active',now(),'11111111-1111-4111-8111-111111111111','isolated test fixture'),
 ('55555555-5555-4555-8555-555555555555','cell_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10','active',now(),'11111111-1111-4111-8111-111111111111','isolated test fixture');

create or replace function public.test_expect_sqlstate(p_statement text,p_expected text)
returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_actual text;
begin
  begin
    execute p_statement;
  exception when others then
    get stacked diagnostics v_actual = returned_sqlstate;
    if v_actual = p_expected then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE %, statement unexpectedly succeeded',p_expected;
end $$;
grant execute on function public.test_expect_sqlstate(text,text) to authenticated;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $workflow$
declare
  v_position uuid;
  v_sector_position uuid;
  v_sector_appointment uuid;
  v_sector_case uuid;
  v_sector_contact uuid;
  v_private_contact uuid;
  v_person uuid;
  v_appointment uuid;
  v_case uuid;
  v_person_duplicate uuid;
  v_appointment_duplicate uuid;
  v_case_duplicate uuid;
  v_person_no_evidence uuid;
  v_appointment_no_evidence uuid;
  v_case_no_evidence uuid;
  v_person_wrong_scope uuid;
  v_private_count integer;
  v_public_count integer;
  v_old_name_count integer;
  v_dossier_version integer;
  v_err text;
begin
  -- National Super Admin database access is blocked while the JWT is AAL1.
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal1'
    )::text,
    true
  );
  perform public.test_expect_sqlstate(
    'insert into public.leader_positions(code,title_kiny,title_eng,title_fra,required_boundary_level,is_exclusive,created_by) ' ||
    'values (''test_mfa_denied'',''Denied'',''Denied'',''Denied'',''village'',false,''11111111-1111-4111-8111-111111111111'')',
    '42501'
  );

  -- Once Supabase verifies TOTP and the JWT carries AAL2, National work is enabled.
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal2'
    )::text,
    true
  );

  -- National administrator approves a position catalogue entry. No titles are seeded by migration.
  insert into public.leader_positions(code,title_kiny,title_eng,title_fra,required_boundary_level,is_exclusive,created_by)
  values ('test_village_head','Umukuru w''Umudugudu','Village leader','Chef de village','village',true,auth.uid())
  returning id into v_position;
  update public.leader_positions set position_status='approved' where id=v_position;

  -- AAL1 National sessions may read only their own role assignment for MFA
  -- routing; they cannot read or alter registry data through the Data API.
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal1'
    )::text,
    true
  );
  select count(*) into v_private_count
  from public.admin_role_assignments
  where user_id=auth.uid();
  if v_private_count <> 1 then
    raise exception 'National Super Admin cannot read own role assignment to complete MFA routing';
  end if;
  select count(*) into v_public_count
  from public.leader_positions where id=v_position;
  if v_public_count <> 0 then
    raise exception 'AAL1 National Super Admin can read protected registry rows directly';
  end if;
  -- UPDATE with a restrictive USING predicate may safely affect zero rows;
  -- verify afterwards that the AAL1 session did not change the record.
  update public.leader_positions set position_status = 'retired' where id=v_position;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal2'
    )::text,
    true
  );
  if not exists (
    select 1 from public.leader_positions
    where id=v_position and position_status='approved'
  ) then
    raise exception 'AAL1 National Super Admin changed a protected registry row';
  end if;

  -- Cell administrator creates the actual test person, appointment and pending evidence case.
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','44444444-4444-4444-8444-444444444444',
      'aal','aal1'
    )::text,
    true
  );
  if auth.uid() is distinct from '44444444-4444-4444-8444-444444444444'::uuid then
    raise exception 'TEST DIAGNOSTIC: auth.uid did not switch to the Cell administrator';
  end if;
  if not exists (
    select 1 from public.admin_role_assignments a
    where a.user_id = auth.uid() and a.role_code = 'cell_admin'
      and a.assignment_status = 'active'
      and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())
  ) then
    raise exception 'TEST DIAGNOSTIC: Cell administrator active assignment is not visible';
  end if;
  if not private.leader_actor_can('create_person', null) then
    raise exception 'TEST DIAGNOSTIC: create_person capability helper returned false';
  end if;
  v_appointment := public.create_leader_appointment_v2(
    'Alice','Test',v_position,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    current_date - 10,
    'appointment_letter','TEST/APPT/001','Isolated Test Authority',
    current_date - 10,null,null
  );
  select id into v_person from public.leader_people where first_name='Alice' and last_name='Test';
  if not exists (
    select 1 from public.leader_audit_events
    where target_table='leader_people'
      and target_id=v_person
      and administrative_unit_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'
      and actor_id=auth.uid()
      and action='INSERT'
  ) then
    raise exception 'initial person INSERT audit event did not retain its submitted village scope';
  end if;
  select id into v_case from public.leader_verification_cases where appointment_id=v_appointment;
  select count(*) into v_private_count from public.leader_appointment_evidence
    where verification_case_id=v_case and uploaded_by=auth.uid();
  if v_private_count <> 1 then raise exception 'submitter cannot read their own scoped evidence metadata'; end if;

  -- Submitter cannot review/approve their own appointment, even with scope access.
  perform public.test_expect_sqlstate(
    format('update public.leader_verification_cases set verification_status = %L where id = %L',
      'under_review',v_case),'P0001');

  -- Higher-level Sector administrator reviews and approves with evidence.
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  perform public.decide_leader_verification_v2(
    v_case,'approved','Fixture evidence inspected'
  );

  if not exists (select 1 from public.leader_appointments where id=v_appointment and appointment_status='active') then
    raise exception 'approved case did not activate the appointment';
  end if;

  -- A second appointment in another District makes the person identity
  -- cross-scope. The Cell administrator may not change the shared name and
  -- thereby alter another District's public record.
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal2'
    )::text,
    true
  );
  insert into public.leader_appointments(
    person_id,position_id,administrative_unit_id,effective_from,
    appointment_status,recorded_by
  ) values (
    v_person,v_position,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11',
    current_date,'pending',auth.uid()
  );
  select count(*), string_agg(b.scope_code, ',' order by b.scope_code)
  into v_private_count, v_err
  from public.leader_appointments a
  join public.boundaries b on b.id=a.administrative_unit_id
  where a.person_id=v_person;
  if v_private_count <> 2 or v_err not like '%RW-02-01-01-01-01%' then
    raise exception 'Cross-scope fixture missing: appointments %, scopes %',v_private_count,v_err;
  end if;

  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','44444444-4444-4444-8444-444444444444',
      'aal','aal1'
    )::text,
    true
  );
  perform public.test_expect_sqlstate(
    format('update public.leader_people set first_name = %L where id = %L',
      'Alice Cross Scope Edit',v_person),
    'P0001'
  );

  -- National authority may make a correction spanning both territories, and
  -- the old identity remains in the permanent person-history table.
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal2'
    )::text,
    true
  );
  select (public.update_leader_person_identity_v2(
    v_person,1,'Alice Updated','Test','Correction confirmed by official appointment record'
  )->>'version')::integer into v_dossier_version;
  if v_dossier_version <> 2 then raise exception 'versioned identity correction did not return version 2'; end if;

  select count(*) into v_old_name_count from public.leader_person_history
    where person_id=v_person and first_name='Alice'
      and change_reason='Correction confirmed by official appointment record';
  if v_old_name_count <> 1 then
    raise exception 'person identity history did not preserve old identity and correction reason';
  end if;

  perform public.test_expect_sqlstate(
    format('select public.update_leader_person_identity_v2(%L,%L,%L,%L,%L)',
      v_person,1,'Stale Name','Test','Stale concurrent correction'),
    '40001'
  );

  if not exists (
    select 1 from public.leader_audit_events
    where target_table='leader_people'
      and target_id=v_person
      and action='UPDATE'
      and reason='Correction confirmed by official appointment record'
  ) then
    raise exception 'identity correction reason was not recorded in the audit ledger';
  end if;

  -- Public profile starts as draft; higher-level reviewer explicitly publishes.
  insert into public.leader_public_profiles(appointment_id,publication_status)
  values (v_appointment,'draft');
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  update public.leader_public_profiles set publication_status='published' where appointment_id=v_appointment;

  -- Private contact must stay private; public contact needs separate approval.
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
  insert into public.leader_contacts(appointment_id,contact_type,contact_value,visibility,created_by)
  values (v_appointment,'mobile_phone','+250700000001','private',auth.uid())
  returning id into v_private_contact;
  perform public.test_expect_sqlstate(
    format('update public.leader_contacts set created_by = %L where id = %L',
      '33333333-3333-4333-8333-333333333333',v_private_contact),
    'P0001'
  );
  perform public.test_expect_sqlstate(
    format('update public.leader_contacts set created_at = now() + interval ''1 day'' where id = %L',
      v_private_contact),
    'P0001'
  );
  select count(*) into v_private_count from public.leader_contacts
    where appointment_id=v_appointment and visibility='private' and contact_value='+250700000001';
  if v_private_count <> 1 then raise exception 'scoped Cell editor cannot read private contact they created'; end if;
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  insert into public.leader_contacts(appointment_id,contact_type,contact_value,visibility,public_approved_by,public_approved_at,created_by)
  values (v_appointment,'office_phone','+250700000002','public',auth.uid(),now(),auth.uid());

  -- A same-scope Sector editor must not change public-contact fields while
  -- retaining an approval granted by the higher-level District reviewer.
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal2'
    )::text,
    true
  );
  insert into public.leader_positions(code,title_kiny,title_eng,title_fra,required_boundary_level,is_exclusive,created_by)
  values ('test_sector_officer','Ushinzwe Umurenge','Sector Officer','Responsable de secteur','sector',false,auth.uid())
  returning id into v_sector_position;
  update public.leader_positions set position_status='approved' where id=v_sector_position;

  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  v_sector_appointment := public.create_leader_appointment_v2(
    'Bob','Sector Test',v_sector_position,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    current_date - 2,
    'appointment_letter','TEST/SECTOR/001','Isolated Test Authority',
    current_date - 2,null,null
  );
  select id into v_sector_case from public.leader_verification_cases
    where appointment_id=v_sector_appointment;

  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  perform public.decide_leader_verification_v2(
    v_sector_case,'approved','Sector appointment evidence inspected'
  );
  insert into public.leader_public_profiles(appointment_id,publication_status)
  values (v_sector_appointment,'draft');
  update public.leader_public_profiles
    set publication_status='published'
    where appointment_id=v_sector_appointment;
  insert into public.leader_contacts(
    appointment_id,contact_type,contact_value,label,visibility,created_by
  ) values (
    v_sector_appointment,'office_phone','+250700000003','Official office','public',auth.uid()
  ) returning id into v_sector_contact;

  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  perform public.test_expect_sqlstate(
    format('update public.leader_contacts set label = %L where id = %L',
      'Unreviewed new label',v_sector_contact),
    'P0001'
  );
  perform public.test_expect_sqlstate(
    format('update public.leader_contacts set contact_type = %L where id = %L',
      'whatsapp',v_sector_contact),
    'P0001'
  );

  -- The higher-level reviewer may edit the public data and becomes the
  -- attributed approver for the changed public-facing fields.
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  update public.leader_contacts
    set label='Reviewed office', contact_type='whatsapp'
    where id=v_sector_contact;
  if not exists (
    select 1 from public.leader_contacts
    where id=v_sector_contact
      and label='Reviewed office'
      and contact_type='whatsapp'
      and public_approved_by=auth.uid()
      and public_approved_at is not null
  ) then
    raise exception 'public contact edits were not attributed to the higher-level approver';
  end if;

  -- Dossier access is District/National only; Cell cannot read it.
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  insert into public.leader_dossiers(person_id,education_level,field_of_study,institution,internal_notes,created_by)
  values (v_person,'Confidential test qualification','Test field','Test institution','Private test note',auth.uid());
  update public.leader_dossiers set education_level='Updated test qualification' where person_id=v_person;
  select version into v_dossier_version from public.leader_dossiers where person_id=v_person;
  if v_dossier_version <> 2 then raise exception 'confidential dossier version did not increment on update'; end if;
  insert into public.leader_dossier_documents(person_id,document_type,reference_number,private_storage_key,mime_type,byte_size,uploaded_by)
  values (v_person,'appointment','PRIVATE-001','leaders/dossiers/test/private-001.pdf','application/pdf',1024,auth.uid());
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
  select count(*) into v_private_count from public.leader_dossiers where person_id=v_person;
  if v_private_count <> 0 then raise exception 'Cell administrator accessed confidential dossier'; end if;
  select count(*) into v_private_count from public.leader_dossier_documents where person_id=v_person;
  if v_private_count <> 0 then raise exception 'Cell administrator accessed confidential dossier documents'; end if;

  -- Audit events for scoped dossier operations must resolve to the leader's
  -- canonical administrative unit and remain visible to in-scope auditors.
  select count(*) into v_private_count
  from public.leader_audit_events
  where target_table='leader_dossiers'
    and target_id=v_person
    and administrative_unit_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
  if v_private_count <> 2 then
    raise exception 'Dossier insert/update audit events did not retain District A scope for in-scope audit access';
  end if;
  -- District A's auditor must not be able to read District B's audit rows.
  select count(*) into v_private_count
  from public.leader_audit_events
  where target_table='leader_dossiers'
    and target_id=v_person
    and administrative_unit_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11';
  if v_private_count <> 0 then
    raise exception 'District A administrator can read District B audit events';
  end if;

  -- Switch to National Super Admin (AAL2) for the cross-scope fanout assertion.
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub','11111111-1111-4111-8111-111111111111',
      'aal','aal2'
    )::text,
    true
  );
  select count(*) into v_private_count
  from public.leader_audit_events
  where target_table='leader_dossiers'
    and target_id=v_person
    and administrative_unit_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11';
  if v_private_count <> 2 then
    raise exception 'Dossier insert/update audit events did not retain District B scope for National audit access';
  end if;

  -- No Province workspace/role tier exists. Use National authority so the
  -- role-code CHECK constraint, not a lower-scope permission denial, is tested.
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform public.test_expect_sqlstate(
    'insert into public.admin_role_assignments(user_id,role_code,administrative_unit_id,grant_reason) values ' ||
    '(''55555555-5555-4555-8555-555555555555'',''province_admin'',''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'',''invalid test role'')',
    '23514');
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);

  -- Cell cannot create an appointment in another District.
  insert into public.leader_people(first_name,last_name,created_by)
  values ('Scope','Test',auth.uid()) returning id into v_person_wrong_scope;
  perform public.test_expect_sqlstate(
    format('insert into public.leader_appointments(person_id,position_id,administrative_unit_id,effective_from,appointment_status,recorded_by) values (%L,%L,%L,current_date,%L,%L)',
      v_person_wrong_scope,v_position,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','pending',auth.uid()),
    '42501');

  -- Wrong geographical level cannot be selected for a Village position.
  perform public.test_expect_sqlstate(
    format('insert into public.leader_appointments(person_id,position_id,administrative_unit_id,effective_from,appointment_status,recorded_by) values (%L,%L,%L,current_date,%L,%L)',
      v_person_wrong_scope,v_position,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','pending',auth.uid()),
    'P0001');

  -- A second active exclusive appointment in the same village must be rejected.
  insert into public.leader_people(first_name,last_name,created_by)
  values ('Duplicate','Test',auth.uid()) returning id into v_person_duplicate;
  insert into public.leader_appointments(person_id,position_id,administrative_unit_id,effective_from,appointment_status,recorded_by)
  values (v_person_duplicate,v_position,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',current_date - 5,'pending',auth.uid())
  returning id into v_appointment_duplicate;
  insert into public.leader_verification_cases(appointment_id,verification_status,submitted_by)
  values (v_appointment_duplicate,'pending',auth.uid()) returning id into v_case_duplicate;
  insert into public.leader_appointment_evidence(appointment_id,verification_case_id,evidence_type,reference_number,issuer,uploaded_by)
  values (v_appointment_duplicate,v_case_duplicate,'appointment_letter','TEST/APPT/002','Isolated Test Authority',auth.uid());
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  update public.leader_verification_cases set verification_status='under_review' where id=v_case_duplicate;
  perform public.test_expect_sqlstate(
    format('update public.leader_verification_cases set verification_status=%L,decision_reason=%L where id=%L',
      'approved','Duplicate active office test',v_case_duplicate),'P0001');

  -- Approval without evidence is forbidden.
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
  insert into public.leader_people(first_name,last_name,created_by)
  values ('NoEvidence','Test',auth.uid()) returning id into v_person_no_evidence;
  insert into public.leader_appointments(person_id,position_id,administrative_unit_id,effective_from,appointment_status,recorded_by)
  values (v_person_no_evidence,v_position,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',current_date,'pending',auth.uid())
  returning id into v_appointment_no_evidence;
  insert into public.leader_verification_cases(appointment_id,verification_status,submitted_by)
  values (v_appointment_no_evidence,'pending',auth.uid()) returning id into v_case_no_evidence;
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  update public.leader_verification_cases set verification_status='under_review' where id=v_case_no_evidence;
  perform public.test_expect_sqlstate(
    format('update public.leader_verification_cases set verification_status=%L,decision_reason=%L where id=%L',
      'approved','No evidence test',v_case_no_evidence),'P0001');

end
$workflow$;
commit;

-- Public anonymous read checks are separate so the query executes as anon, with real RLS.
set role anon;
set request.jwt.claim.sub = '';
do $public$
declare v_count integer; v_contacts integer; v_json jsonb;
begin
  select count(*) into v_count from public.leader_directory_public
  where position_code='test_village_head' and scope_code='RW-01-01-01-01-01';
  if v_count <> 1 then raise exception 'anonymous directory should show exactly one verified published active appointment'; end if;
  select public_contacts into v_json from public.leader_directory_public
  where position_code='test_village_head' and scope_code='RW-01-01-01-01-01';
  if jsonb_array_length(v_json) <> 1 then raise exception 'public projection did not filter private contacts'; end if;
  if v_json::text like '%+250700000001%' then raise exception 'private contact leaked into public directory'; end if;
  select count(contact_type) into v_contacts from public.leader_contacts;
  if v_contacts <> 2 then
    raise exception 'anonymous SELECT must return only the two explicitly approved public contacts';
  end if;
  if exists (
    select 1 from public.leader_contacts
    where contact_value in ('+250700000001')
  ) then
    raise exception 'anonymous SELECT exposed a private contact';
  end if;
  if has_table_privilege('anon','public.leader_dossiers','select') then
    raise exception 'anonymous users have dossier table privileges';
  end if;
end
$public$;
reset role;

-- Close and archive the appointment with an explicit reason, retaining its temporal history.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
do $archive$
declare v_appointment uuid;
begin
  select a.id into v_appointment
  from public.leader_appointments a
  join public.leader_people p on p.id=a.person_id
  where p.first_name='Alice Updated' and a.appointment_status='active'
  order by a.created_at desc limit 1;
  if v_appointment is null then raise exception 'active fixture appointment not found for archival test'; end if;
  perform set_config('app.leader_change_reason','Term ended in isolated lifecycle test',true);
  update public.leader_appointments set appointment_status='ended',effective_to=current_date
    where id=v_appointment;
  if not exists (select 1 from public.leader_appointment_events
      where appointment_id=v_appointment and event_type='ended'
        and after_effective_to=current_date and reason='Term ended in isolated lifecycle test') then
    raise exception 'appointment end history did not retain its effective date/reason';
  end if;
  perform set_config('app.leader_change_reason','Archive after end in isolated lifecycle test',true);
  update public.leader_appointments set appointment_status='archived' where id=v_appointment;
end
$archive$;
commit;

set role anon;
set request.jwt.claim.sub = '';
do $archived_public$
declare v_count integer;
begin
  select count(*) into v_count from public.leader_directory_public
  where position_code='test_village_head' and scope_code='RW-01-01-01-01-01';
  if v_count <> 0 then raise exception 'ended/archived appointment remains publicly visible'; end if;
  if (select count(contact_type) from public.leader_contacts) <> 1
     or not exists (
       select 1 from public.leader_contacts
       where contact_value='+250700000003'
         and visibility='public' and public_approved_at is not null
     ) then
    raise exception 'ending one appointment must hide its public contact but retain another active appointment contact';
  end if;
end
$archived_public$;
reset role;
drop function public.test_expect_sqlstate(text,text);
select 'PASS: schema, RBAC, scope, identity history, verification, exclusivity, dossier isolation, public filtering and archival contract tests' as result;
