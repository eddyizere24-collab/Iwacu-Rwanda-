create or replace function private.guard_leader_position()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_old_status text;
begin
  if tg_op = 'UPDATE' then v_old_status := old.position_status; end if;
  if tg_op = 'DELETE' then raise exception 'Position catalogue entries are retired, not deleted'; end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    if new.created_by is null then raise exception 'Position creator is required'; end if;
    new.approved_by := null;
    new.approved_at := null;
  else
    if new.id is distinct from old.id or new.code is distinct from old.code
       or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
      raise exception 'Position identity is immutable';
    end if;
    if new.position_status is not distinct from old.position_status
       and (new.approved_by is distinct from old.approved_by
         or new.approved_at is distinct from old.approved_at) then
      raise exception 'Position approval metadata is system-attributed';
    end if;
    if old.position_status = 'approved' and (
      new.code is distinct from old.code
      or new.title_kiny is distinct from old.title_kiny
      or new.title_eng is distinct from old.title_eng
      or new.title_fra is distinct from old.title_fra
      or new.required_boundary_level is distinct from old.required_boundary_level
      or new.is_exclusive is distinct from old.is_exclusive
    ) then
      raise exception 'Approved position identity/title/scope is immutable; retire and create a new position version';
    end if;
  end if;
  if new.position_status = 'approved' and v_old_status is distinct from 'approved' then
    if v_old_status = 'retired' then
      raise exception 'Retired position codes cannot be re-approved; create a new version';
    end if;
    if not private.leader_actor_can('manage_positions', null) then
      raise exception 'Only National Super Admin may approve a position catalogue entry';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  new.updated_at := now();
  return new;
end $fn$;
drop trigger if exists leader_position_guard on public.leader_positions;
create trigger leader_position_guard before insert or update or delete on public.leader_positions
for each row execute function private.guard_leader_position();

create or replace function private.guard_leader_evidence()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_case_appointment uuid;
begin
  if tg_op <> 'INSERT' then raise exception 'Appointment evidence is immutable; add a corrected evidence version'; end if;
  select c.appointment_id into v_case_appointment
  from public.leader_verification_cases c where c.id = new.verification_case_id;
  if v_case_appointment is null or v_case_appointment <> new.appointment_id then
    raise exception 'Evidence must reference the same appointment as its verification case';
  end if;
  new.uploaded_by := coalesce(auth.uid(), new.uploaded_by);
  return new;
end $fn$;
drop trigger if exists leader_evidence_guard on public.leader_appointment_evidence;
create trigger leader_evidence_guard before insert or update or delete on public.leader_appointment_evidence
for each row execute function private.guard_leader_evidence();

create or replace function private.guard_leader_person()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if tg_op = 'DELETE' then raise exception 'Leader identity records are archived, not deleted'; end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.version := 1;
  else
    if new.id is distinct from old.id or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Leader identity origin is immutable';
    end if;
    -- A shared person record can be linked to appointments in more than one
    -- territory. A scoped administrator may correct identity only when they
    -- hold edit authority in every linked administrative unit, otherwise one
    -- local edit could silently alter another territory's public record.
    if exists (
      select 1
      from public.leader_appointments a
      where a.person_id = old.id
        and not private.leader_actor_can('edit', a.administrative_unit_id)
    ) then
      raise exception 'Identity correction requires edit authority across all linked appointment scopes';
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
  end if;
  return new;
end $fn$;
drop trigger if exists leader_person_guard on public.leader_people;
create trigger leader_person_guard before insert or update or delete on public.leader_people
for each row execute function private.guard_leader_person();

-- Preserve the previous identity version before every identity/archive change.
create or replace function private.capture_leader_person_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $history$
begin
  if new.first_name is distinct from old.first_name
     or new.last_name is distinct from old.last_name
     or new.archived_at is distinct from old.archived_at then
    insert into public.leader_person_history(
      person_id, version, first_name, last_name, changed_by, change_reason
    ) values (
      old.id, old.version, old.first_name, old.last_name, auth.uid(),
      nullif(current_setting('app.leader_change_reason', true), '')
    );
  end if;
  return new;
end
$history$;
drop trigger if exists leader_person_history_capture on public.leader_people;
create trigger leader_person_history_capture
after update on public.leader_people
for each row execute function private.capture_leader_person_history();

create or replace function private.validate_admin_role_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_level text;
begin
  select b.level::text into v_level
  from public.boundaries b
  where b.id = new.administrative_unit_id and b.valid_to is null;
  if v_level is null then raise exception 'Administrative unit is not current'; end if;
  if (new.role_code = 'national_super_admin' and (v_level <> 'country' or
      (select b.scope_code from public.boundaries b where b.id = new.administrative_unit_id) <> 'RW')
      or new.role_code = 'district_admin' and v_level <> 'district'
      or new.role_code = 'sector_admin' and v_level <> 'sector'
      or new.role_code = 'cell_admin' and v_level <> 'cell') then
    raise exception 'Role code does not match the canonical administrative unit level';
  end if;
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.granted_by := auth.uid(); end if;
    if auth.uid() is not null and not private.leader_actor_can('manage_admins', new.administrative_unit_id) then
      raise exception 'Administrator does not have authority to assign this role at this scope';
    end if;
  else
    if new.user_id is distinct from old.user_id
       or new.role_code is distinct from old.role_code
       or new.administrative_unit_id is distinct from old.administrative_unit_id
       or new.granted_by is distinct from old.granted_by
       or new.grant_reason is distinct from old.grant_reason
       or new.valid_from is distinct from old.valid_from then
      raise exception 'Role assignment identity is immutable; revoke and issue a new assignment';
    end if;
    if old.assignment_status = 'revoked' and new.assignment_status <> 'revoked' then
      raise exception 'Revoked administrator assignments cannot be reactivated; issue a new assignment';
    elsif new.assignment_status = 'revoked' and old.assignment_status <> 'revoked' then
      new.revoked_by := auth.uid();
      new.revoked_at := now();
    elsif new.revoked_by is distinct from old.revoked_by or new.revoked_at is distinct from old.revoked_at then
      raise exception 'Revocation metadata is system-attributed';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists admin_role_assignment_validate on public.admin_role_assignments;
create trigger admin_role_assignment_validate before insert or update on public.admin_role_assignments
for each row execute function private.validate_admin_role_assignment();
