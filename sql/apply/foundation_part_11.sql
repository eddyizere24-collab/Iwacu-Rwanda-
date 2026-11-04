-- ---------------------------------------------------------------------------
-- Transaction-safe application operations. SECURITY INVOKER keeps table RLS
-- and row triggers in force; the server routes call these through Supabase RPC.
-- ---------------------------------------------------------------------------
create or replace function public.create_leader_appointment_v2(
  p_first_name text,
  p_last_name text,
  p_position_id uuid,
  p_administrative_unit_id uuid,
  p_effective_from date,
  p_evidence_type text,
  p_reference_number text,
  p_issuer text,
  p_issued_on date default null,
  p_valid_until date default null,
  p_private_storage_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $create$
declare
  v_person_id uuid;
  v_appointment_id uuid;
  v_case_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if nullif(btrim(p_first_name), '') is null
     or nullif(btrim(p_last_name), '') is null
     or nullif(btrim(p_evidence_type), '') is null
     or nullif(btrim(p_reference_number), '') is null
     or nullif(btrim(p_issuer), '') is null then
    raise exception 'Identity and appointment evidence fields are required';
  end if;
  if p_valid_until is not null and p_issued_on is not null and p_valid_until < p_issued_on then
    raise exception 'Evidence validity date cannot precede issue date';
  end if;

  -- Attribute the person INSERT audit event to the scope supplied by this
  -- atomic submission. The entire RPC rolls back if appointment scope/RLS
  -- validation fails, so no unscoped orphan person is committed by this path.
  perform set_config('app.leader_audit_unit_id', p_administrative_unit_id::text, true);
  insert into public.leader_people(first_name, last_name, created_by)
  values (btrim(p_first_name), btrim(p_last_name), auth.uid())
  returning id into v_person_id;
  perform set_config('app.leader_audit_unit_id', '', true);

  insert into public.leader_appointments(
    person_id, position_id, administrative_unit_id, effective_from,
    appointment_status, recorded_by
  ) values (
    v_person_id, p_position_id, p_administrative_unit_id, p_effective_from,
    'pending', auth.uid()
  )
  returning id into v_appointment_id;

  insert into public.leader_verification_cases(
    appointment_id, verification_status, submitted_by
  ) values (
    v_appointment_id, 'pending', auth.uid()
  )
  returning id into v_case_id;

  insert into public.leader_appointment_evidence(
    appointment_id, verification_case_id, evidence_type, reference_number,
    issuer, issued_on, valid_until, private_storage_key, uploaded_by
  ) values (
    v_appointment_id, v_case_id, btrim(p_evidence_type), btrim(p_reference_number),
    btrim(p_issuer), p_issued_on, p_valid_until, p_private_storage_key, auth.uid()
  );

  return v_appointment_id;
end
$create$;

-- Add another appointment to an existing person without creating a duplicate
-- identity row. RLS controls both person visibility and the target appointment
-- scope; the transaction either records the entire workflow or nothing.
create or replace function public.create_leader_appointment_for_person_v2(
  p_person_id uuid,
  p_position_id uuid,
  p_administrative_unit_id uuid,
  p_effective_from date,
  p_evidence_type text,
  p_reference_number text,
  p_issuer text,
  p_issued_on date default null,
  p_valid_until date default null,
  p_private_storage_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $existing$
declare
  v_person_id uuid;
  v_appointment_id uuid;
  v_case_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_person_id is null or p_position_id is null
     or p_administrative_unit_id is null or p_effective_from is null
     or nullif(btrim(p_evidence_type), '') is null
     or nullif(btrim(p_reference_number), '') is null
     or nullif(btrim(p_issuer), '') is null then
    raise exception 'Existing person, appointment scope and evidence fields are required';
  end if;
  if p_valid_until is not null and p_issued_on is not null and p_valid_until < p_issued_on then
    raise exception 'Evidence validity date cannot precede issue date';
  end if;

  select person.id into v_person_id
  from public.leader_people person
  where person.id = p_person_id
    and person.archived_at is null
  for key share;
  if not found then
    raise exception 'Existing person identity not found or archived' using errcode = 'P0002';
  end if;

  insert into public.leader_appointments(
    person_id, position_id, administrative_unit_id, effective_from,
    appointment_status, recorded_by
  ) values (
    v_person_id, p_position_id, p_administrative_unit_id, p_effective_from,
    'pending', auth.uid()
  )
  returning id into v_appointment_id;

  insert into public.leader_verification_cases(
    appointment_id, verification_status, submitted_by
  ) values (
    v_appointment_id, 'pending', auth.uid()
  )
  returning id into v_case_id;

  insert into public.leader_appointment_evidence(
    appointment_id, verification_case_id, evidence_type, reference_number,
    issuer, issued_on, valid_until, private_storage_key, uploaded_by
  ) values (
    v_appointment_id, v_case_id, btrim(p_evidence_type), btrim(p_reference_number),
    btrim(p_issuer), p_issued_on, p_valid_until, p_private_storage_key, auth.uid()
  );

  return v_appointment_id;
end
$existing$;

-- Versioned identity correction: lock the row, compare the expected version,
-- record a required reason in transaction-local audit context, then preserve
-- the prior legal identity through the history trigger.
create or replace function public.update_leader_person_identity_v2(
  p_person_id uuid,
  p_expected_version integer,
  p_first_name text,
  p_last_name text,
  p_change_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $identity$
declare
  v_version integer;
  v_result record;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'Expected person version is required';
  end if;
  if nullif(btrim(p_first_name), '') is null
     or length(btrim(p_first_name)) > 80
     or nullif(btrim(p_last_name), '') is null
     or length(btrim(p_last_name)) > 100 then
    raise exception 'Person names are invalid';
  end if;
  if nullif(btrim(p_change_reason), '') is null
     or length(btrim(p_change_reason)) < 4
     or length(btrim(p_change_reason)) > 2000 then
    raise exception 'A clear identity correction reason is required';
  end if;

  select version into v_version
  from public.leader_people
  where id = p_person_id
  for update;
  if not found then
    raise exception 'Person identity not found' using errcode = 'P0002';
  end if;
  if v_version <> p_expected_version then
    raise exception 'Person identity version conflict' using errcode = '40001';
  end if;

  perform set_config('app.leader_change_reason', btrim(p_change_reason), true);
  update public.leader_people
  set first_name = btrim(p_first_name),
      last_name = btrim(p_last_name)
  where id = p_person_id
  returning id, first_name, last_name, version, updated_at into v_result;
  perform set_config('app.leader_change_reason', '', true);

  return jsonb_build_object(
    'id', v_result.id,
    'first_name', v_result.first_name,
    'last_name', v_result.last_name,
    'version', v_result.version,
    'updated_at', v_result.updated_at
  );
end
$identity$;
