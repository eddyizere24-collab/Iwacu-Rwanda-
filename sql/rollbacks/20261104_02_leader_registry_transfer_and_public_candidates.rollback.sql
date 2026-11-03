-- Roll back L1 migration 02 before using its public RPCs/transfers.
-- Do not run after transfer RPCs have written appointment history.
begin;
revoke all on function public.transfer_leader_appointment_v2(uuid,uuid,uuid,date,text,text,text,text,date,date) from public,anon,authenticated;
drop function if exists public.transfer_leader_appointment_v2(uuid,uuid,uuid,date,text,text,text,text,date,date);
revoke all on function public.get_leader_candidates_v2(text[]) from public,anon,authenticated;
drop function if exists public.get_leader_candidates_v2(text[]);

drop view if exists public.leader_directory_public;
revoke select (public_photo_thumbnail_key) on public.leader_public_profiles from anon,authenticated;
alter table public.leader_public_profiles drop column if exists public_photo_thumbnail_key;

-- Restore the foundation migration's original public projection.
create view public.leader_directory_public
with (security_invoker = true)
as
select
  a.id as appointment_id,
  person.id as person_id,
  coalesce(nullif(btrim(profile.display_name), ''), concat_ws(' ', person.first_name, person.last_name)) as display_name,
  pos.code as position_code,
  pos.title_kiny,
  pos.title_eng,
  pos.title_fra,
  b.id as administrative_unit_id,
  b.scope_code,
  b.name_kiny as administrative_unit_name_kiny,
  b.name_eng as administrative_unit_name_eng,
  b.level::text as administrative_unit_level,
  a.effective_from,
  a.effective_to,
  profile.biography,
  profile.office_hours,
  profile.service_priorities,
  profile.public_photo_object_key,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'type',c.contact_type,'label',c.label,'value',c.contact_value
    ) order by c.sort_order,c.contact_type)
    from public.leader_contacts c
    where c.appointment_id=a.id
      and c.visibility='public'
      and c.public_approved_at is not null
  ),'[]'::jsonb) as public_contacts
from public.leader_appointments a
join public.leader_people person on person.id=a.person_id
join public.leader_positions pos on pos.id=a.position_id
join public.boundaries b on b.id=a.administrative_unit_id
join public.leader_public_profiles profile on profile.appointment_id=a.id
join public.leader_verification_cases v on v.appointment_id=a.id
where a.appointment_status in ('approved','active')
  and a.effective_from<=current_date
  and (a.effective_to is null or a.effective_to>current_date)
  and v.verification_status='approved'
  and pos.position_status='approved'
  and profile.publication_status='published'
  and b.valid_to is null;
grant select on public.leader_directory_public to anon,authenticated;

-- Restore the original append-only appointment history trigger body.
create or replace function private.capture_appointment_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_event text;
begin
  if tg_op = 'INSERT' then
    v_event := case when new.appointment_status = 'pending' then 'submitted' else 'created' end;
    insert into public.leader_appointment_events(appointment_id,event_type,to_status,actor_id)
    values(new.id,v_event,new.appointment_status,coalesce(auth.uid(),new.recorded_by));
  elsif new.appointment_status is distinct from old.appointment_status then
    v_event := case new.appointment_status
      when 'approved' then 'approved' when 'active' then 'approved'
      when 'rejected' then 'rejected' when 'suspended' then 'suspended'
      when 'ended' then 'ended' when 'archived' then 'archived'
      else 'corrected' end;
    insert into public.leader_appointment_events(
      appointment_id,event_type,from_status,to_status,
      before_effective_from,after_effective_from,before_effective_to,after_effective_to,
      reason,actor_id
    ) values(
      new.id,v_event,old.appointment_status,new.appointment_status,
      old.effective_from,new.effective_from,old.effective_to,new.effective_to,
      nullif(current_setting('app.leader_change_reason', true), ''),
      coalesce(auth.uid(),new.updated_by)
    );
  end if;
  return new;
end $$;

drop index if exists public.idx_leader_appointments_public_scope_status_dates;
drop index if exists public.idx_leader_appointments_person_scope_status;
drop index if exists public.idx_boundaries_parent_active;
commit;
