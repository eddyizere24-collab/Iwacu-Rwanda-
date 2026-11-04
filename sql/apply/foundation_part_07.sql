create or replace function private.sync_appointment_from_verification()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_status text;
begin
  if tg_op = 'INSERT' then
    v_status := case when new.verification_status = 'pending' then 'pending' else 'draft' end;
    update public.leader_appointments
    set appointment_status = v_status, updated_at = now(), updated_by = auth.uid()
    where id = new.appointment_id
      and appointment_status not in ('ended','archived');

    insert into public.leader_verification_decisions(
      verification_case_id, appointment_id, decision, actor_id, reason, evidence_count
    ) values (
      new.id, new.appointment_id, 'submitted',
      coalesce(auth.uid(), new.submitted_by), null,
      (select count(*) from public.leader_appointment_evidence e where e.verification_case_id = new.id)
    );
  elsif new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'approved' then
      select case
        when a.effective_from <= current_date and (a.effective_to is null or a.effective_to > current_date) then 'active'
        else 'approved'
      end into v_status
      from public.leader_appointments a where a.id = new.appointment_id;
    elsif new.verification_status in ('suspended','disputed') then v_status := 'suspended';
    elsif new.verification_status = 'rejected' then v_status := 'rejected';
    else v_status := 'pending';
    end if;

    update public.leader_appointments
    set appointment_status = v_status, updated_at = now(), updated_by = auth.uid()
    where id = new.appointment_id
      and appointment_status not in ('ended','archived');
    
    insert into public.leader_verification_decisions(
      verification_case_id, appointment_id, decision, actor_id, reason, evidence_count
    )
    select new.id, new.appointment_id,
      case new.verification_status
        when 'approved' then 'approved'
        when 'rejected' then 'rejected'
        when 'suspended' then 'suspended'
        when 'disputed' then 'disputed'
        when 'under_review' then 'under_review'
        else 'returned'
      end,
      coalesce(auth.uid(), new.decision_by, new.submitted_by),
      new.decision_reason,
      (select count(*) from public.leader_appointment_evidence e where e.verification_case_id = new.id);
  end if;
  return new;
end $fn$;
drop trigger if exists leader_verification_sync_appointment on public.leader_verification_cases;
create trigger leader_verification_sync_appointment after insert or update on public.leader_verification_cases
for each row execute function private.sync_appointment_from_verification();

create or replace function private.guard_public_profile()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_unit uuid; v_old_status text;
begin
  if tg_op = 'UPDATE' then v_old_status := old.publication_status; end if;
  if tg_op = 'DELETE' then raise exception 'Public profiles are archived/unpublished, not deleted'; end if;
  if tg_op = 'UPDATE' and new.appointment_id is distinct from old.appointment_id then
    raise exception 'Public profile appointment is immutable';
  end if;
  select a.administrative_unit_id into v_unit
  from public.leader_appointments a where a.id = new.appointment_id;
  if tg_op = 'UPDATE' and (
       (new.published_by is distinct from old.published_by and new.publication_status is not distinct from old.publication_status)
       or (new.published_at is distinct from old.published_at and new.publication_status is not distinct from old.publication_status)
     ) then
    raise exception 'Publication metadata is system-attributed';
  end if;
  if tg_op = 'UPDATE' and old.publication_status = 'published'
     and (new.display_name is distinct from old.display_name
       or new.biography is distinct from old.biography
       or new.office_hours is distinct from old.office_hours
       or new.service_priorities is distinct from old.service_priorities
       or new.public_photo_object_key is distinct from old.public_photo_object_key) then
    new.publication_status := 'draft';
    new.published_by := null;
    new.published_at := null;
  end if;
  if new.publication_status = 'published'
     and v_old_status is distinct from 'published' then
    if not private.leader_actor_can('approve', v_unit)
       or not exists (
         select 1 from public.leader_appointments a
         join public.leader_verification_cases v on v.appointment_id = a.id
         join public.leader_positions pos on pos.id = a.position_id
         join public.boundaries b on b.id = a.administrative_unit_id
         where a.id = new.appointment_id
           and a.appointment_status in ('approved','active')
           and a.effective_from <= current_date
           and (a.effective_to is null or a.effective_to > current_date)
           and v.verification_status = 'approved'
           and pos.position_status = 'approved'
           and b.valid_to is null
       ) then
      raise exception 'Publishing requires an approved current appointment and authorised publisher';
    end if;
    new.published_by := auth.uid();
    new.published_at := now();
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $fn$;
drop trigger if exists leader_public_profile_guard on public.leader_public_profiles;
create trigger leader_public_profile_guard before insert or update or delete on public.leader_public_profiles
for each row execute function private.guard_public_profile();

create or replace function private.guard_leader_contact()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare
  v_unit uuid;
  v_old_visibility text;
  v_old_value text;
  v_old_type text;
  v_old_label text;
begin
  if tg_op = 'UPDATE' then
    v_old_visibility := old.visibility;
    v_old_value := old.contact_value;
    v_old_type := old.contact_type;
    v_old_label := old.label;
  end if;
  if tg_op = 'DELETE' then raise exception 'Contacts are archived/retired, not deleted'; end if;
  select a.administrative_unit_id into v_unit from public.leader_appointments a where a.id = new.appointment_id;
  if tg_op = 'UPDATE' and (
      new.id is distinct from old.id
      or new.appointment_id is distinct from old.appointment_id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
    ) then
    raise exception 'Contact identity, creator and creation timestamp are immutable';
  end if;
  if tg_op = 'UPDATE' and (
      new.public_approved_by is distinct from old.public_approved_by
      or new.public_approved_at is distinct from old.public_approved_at
    ) then
    raise exception 'Public contact approval metadata is system-attributed';
  end if;
  -- Every public-facing field is part of the approval decision. A same-scope
  -- editor may correct a private contact, but cannot silently rewrite the
  -- label/type/value of an already-published contact and retain old approval.
  if new.visibility = 'public' and (v_old_visibility is distinct from 'public'
      or new.contact_value is distinct from v_old_value
      or new.contact_type is distinct from v_old_type
      or new.label is distinct from v_old_label) then
    if not private.leader_actor_can('approve', v_unit)
       or not private.leader_appointment_is_public(new.appointment_id) then
      raise exception 'Public contact requires an authorised approver and a published appointment';
    end if;
    new.public_approved_by := auth.uid();
    new.public_approved_at := now();
  elsif new.visibility = 'private' then
    new.public_approved_by := null;
    new.public_approved_at := null;
  end if;
  new.updated_at := now();
  return new;
end $fn$;
drop trigger if exists leader_contact_guard on public.leader_contacts;
create trigger leader_contact_guard before insert or update or delete on public.leader_contacts
for each row execute function private.guard_leader_contact();

-- Confidential dossier edits are versioned, scoped and archived rather than deleted.
create or replace function private.guard_leader_dossier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $dossier$
begin
  if tg_op = 'DELETE' then
    raise exception 'Confidential dossiers are retained and archived, not deleted';
  elsif tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Authenticated administrator is required' using errcode = '42501';
    end if;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.version := 1;
    new.created_at := now();
    new.updated_at := now();
  else
    if new.person_id is distinct from old.person_id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Dossier identity and origin are immutable';
    end if;
    if auth.uid() is null then
      raise exception 'Authenticated administrator is required' using errcode = '42501';
    end if;
    new.version := old.version + 1;
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end
$dossier$;
drop trigger if exists leader_dossier_guard on public.leader_dossiers;
create trigger leader_dossier_guard
before insert or update or delete on public.leader_dossiers
for each row execute function private.guard_leader_dossier();
