create or replace function private.guard_leader_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_required_level text; v_exclusive boolean; v_verification text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Leader appointments are archival records and cannot be deleted';
  end if;

  select pos.required_boundary_level, pos.is_exclusive
  into v_required_level, v_exclusive
  from public.leader_positions pos
  where pos.id = new.position_id
    and (pos.position_status = 'approved' or tg_op = 'UPDATE');
  if v_required_level is null then
    raise exception 'Only an approved position can be assigned';
  end if;
  if not exists (
    select 1 from public.boundaries b
    where b.id = new.administrative_unit_id
      and b.level::text = v_required_level
      and b.valid_to is null
  ) then
    raise exception 'Position does not match the selected canonical administrative unit';
  end if;
  new.exclusive_office := v_exclusive;

  if tg_op = 'INSERT' then
    if new.appointment_status not in ('draft','pending') or new.effective_to is not null then
      raise exception 'New appointments must begin as draft or pending with no end date';
    end if;
    new.recorded_by := coalesce(auth.uid(), new.recorded_by);
    if new.recorded_by is null then raise exception 'Appointment creator is required'; end if;
    new.version := 1;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.person_id is distinct from old.person_id
     or new.position_id is distinct from old.position_id
     or new.administrative_unit_id is distinct from old.administrative_unit_id
     or new.effective_from is distinct from old.effective_from
     or (new.effective_to is distinct from old.effective_to
         and not (old.effective_to is null and new.effective_to is not null
                  and new.appointment_status = 'ended'))
     or new.recorded_by is distinct from old.recorded_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Appointment identity/dates are immutable; create a new versioned appointment for a correction or transfer';
  end if;
  if old.appointment_status = 'archived' and new.appointment_status <> 'archived' then
    raise exception 'Archived appointments cannot be reopened';
  end if;
  if old.appointment_status in ('ended','archived')
     and (new.person_id is distinct from old.person_id
       or new.position_id is distinct from old.position_id
       or new.administrative_unit_id is distinct from old.administrative_unit_id
       or new.effective_from is distinct from old.effective_from
       or new.effective_to is distinct from old.effective_to) then
    raise exception 'Ended or archived appointment facts are immutable';
  end if;
  if new.appointment_status is distinct from old.appointment_status and not (
       (old.appointment_status = 'draft' and new.appointment_status = 'pending')
       or (old.appointment_status in ('pending','approved','active','suspended') and new.appointment_status = 'ended')
       or (old.appointment_status in ('ended','rejected') and new.appointment_status = 'archived')
       or (old.appointment_status in ('pending','rejected','suspended') and new.appointment_status in ('pending','approved','active','rejected','suspended'))
       or (old.appointment_status in ('approved','active') and new.appointment_status in ('approved','active','suspended'))
     ) then
    raise exception 'Invalid appointment state transition';
  end if;

  select v.verification_status into v_verification
  from public.leader_verification_cases v
  where v.appointment_id = new.id;

  if new.appointment_status in ('approved','active')
     and v_verification is distinct from 'approved' then
    raise exception 'An appointment cannot become public/active before verification approval';
  end if;
  if new.appointment_status = 'suspended'
     and v_verification not in ('suspended','disputed') then
    raise exception 'Suspended appointments require a suspended or disputed verification case';
  end if;
  if new.appointment_status = 'rejected' and v_verification is distinct from 'rejected' then
    raise exception 'Rejected appointments require a rejected verification case';
  end if;
  if new.appointment_status = 'ended' and (
       new.effective_to is null or new.effective_to > current_date
       or nullif(btrim(current_setting('app.leader_change_reason', true)), '') is null
     ) then
    raise exception 'Ending an appointment requires a past/current effective end date and a recorded reason';
  end if;
  if new.appointment_status = 'archived'
     and nullif(btrim(current_setting('app.leader_change_reason', true)), '') is null then
    raise exception 'Archiving an appointment requires a recorded reason';
  end if;
  if new.exclusive_office is true and new.appointment_status in ('approved','active','suspended') then
    perform pg_advisory_xact_lock(hashtextextended(new.position_id::text || ':' || new.administrative_unit_id::text, 0));
    if exists (
      select 1 from public.leader_appointments other
      where other.position_id = new.position_id
        and other.administrative_unit_id = new.administrative_unit_id
        and other.exclusive_office is true
        and other.appointment_status in ('approved','active','suspended')
        and other.id <> new.id
        and daterange(other.effective_from, other.effective_to, '[)')
            && daterange(new.effective_from, new.effective_to, '[)')
    ) then
      raise exception 'An overlapping approved appointment already holds this exclusive office in this area';
    end if;
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists leader_appointment_guard on public.leader_appointments;
create trigger leader_appointment_guard before insert or update or delete on public.leader_appointments
for each row execute function private.guard_leader_appointment();

create or replace function private.guard_verification_case()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_unit uuid; v_evidence_count integer;
begin
  select a.administrative_unit_id into v_unit
  from public.leader_appointments a where a.id = new.appointment_id;
  if v_unit is null then raise exception 'Appointment not found'; end if;

  if tg_op = 'INSERT' then
    if new.verification_status not in ('draft','pending') then
      raise exception 'Verification starts as draft or pending';
    end if;
    new.submitted_by := coalesce(auth.uid(), new.submitted_by);
    if new.submitted_by is null then raise exception 'Submitter is required'; end if;
    new.version := 1;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.appointment_id is distinct from old.appointment_id
     or new.submitted_by is distinct from old.submitted_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Verification case identity is immutable';
  end if;

  if new.verification_status is not distinct from old.verification_status
     and (new.decision_by is distinct from old.decision_by
       or new.decision_at is distinct from old.decision_at
       or new.decision_reason is distinct from old.decision_reason) then
    raise exception 'Decision metadata is immutable unless a new workflow decision is recorded';
  end if;

  if new.verification_status is distinct from old.verification_status then
    if not (
      (old.verification_status = 'draft' and new.verification_status = 'pending')
      or (old.verification_status = 'pending' and new.verification_status = 'under_review')
      or (old.verification_status = 'under_review' and new.verification_status in ('approved','rejected','suspended','disputed'))
      or (old.verification_status = 'rejected' and new.verification_status = 'pending')
      or (old.verification_status in ('suspended','disputed') and new.verification_status = 'under_review')
      or (old.verification_status = 'approved' and new.verification_status in ('suspended','disputed'))
    ) then
      raise exception 'Invalid verification state transition';
    end if;

    if new.verification_status in ('pending','under_review') then
      new.decision_by := null;
      new.decision_at := null;
      new.decision_reason := null;
      new.assigned_reviewer := null;
    end if;

    if new.verification_status = 'under_review' then
      if not private.leader_actor_can('approve', v_unit)
         or auth.uid() is not distinct from old.submitted_by then
        raise exception 'Only a higher-scope reviewer other than the submitter may begin review';
      end if;
      new.assigned_reviewer := auth.uid();
    elsif new.verification_status in ('approved','rejected','suspended','disputed') then
      if not private.leader_actor_can('approve', v_unit)
         or auth.uid() is not distinct from old.submitted_by then
        raise exception 'Only a higher-scope reviewer other than the submitter may decide this case';
      end if;
      if nullif(btrim(new.decision_reason), '') is null then
        raise exception 'A decision reason is required';
      end if;
      if new.verification_status = 'approved' then
        select count(*) into v_evidence_count
        from public.leader_appointment_evidence e
        where e.verification_case_id = new.id and e.appointment_id = new.appointment_id;
        if v_evidence_count = 0 then raise exception 'Approval requires at least one evidence record'; end if;
      end if;
      new.decision_by := auth.uid();
      new.decision_at := now();
    end if;
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $fn$;
drop trigger if exists leader_verification_case_guard on public.leader_verification_cases;
create trigger leader_verification_case_guard before insert or update on public.leader_verification_cases
for each row execute function private.guard_verification_case();
