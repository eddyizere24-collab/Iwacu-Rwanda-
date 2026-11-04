create or replace function public.decide_leader_verification_v2(
  p_verification_case_id uuid,
  p_decision text,
  p_reason text default null,
  p_expected_version integer default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $decide$
declare
  v_status text;
  v_version integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_decision not in ('under_review','approved','rejected','suspended','disputed') then
    raise exception 'Unsupported verification decision';
  end if;
  if p_decision <> 'under_review' and nullif(btrim(p_reason), '') is null then
    raise exception 'A decision reason is required';
  end if;

  select verification_status, version into v_status, v_version
  from public.leader_verification_cases
  where id = p_verification_case_id
  for update;
  if not found then
    raise exception 'Verification case not found' using errcode = 'P0002';
  end if;
  if p_expected_version is not null and p_expected_version <> v_version then
    raise exception 'Verification case version conflict' using errcode = '40001';
  end if;

  if p_decision = 'under_review' then
    update public.leader_verification_cases
    set verification_status = 'under_review'
    where id = p_verification_case_id;
  else
    if v_status = 'pending' then
      update public.leader_verification_cases
      set verification_status = 'under_review'
      where id = p_verification_case_id;
    elsif v_status <> 'under_review' then
      raise exception 'Verification case must be pending or under review';
    end if;

    update public.leader_verification_cases
    set verification_status = p_decision,
        decision_reason = btrim(p_reason)
    where id = p_verification_case_id;
  end if;

  return p_decision;
end
$decide$;

revoke all on function public.create_leader_appointment_v2(
  text,text,uuid,uuid,date,text,text,text,date,date,text
) from public, anon;
grant execute on function public.create_leader_appointment_v2(
  text,text,uuid,uuid,date,text,text,text,date,date,text
) to authenticated;
revoke all on function public.update_leader_person_identity_v2(uuid,integer,text,text,text) from public, anon;
grant execute on function public.update_leader_person_identity_v2(uuid,integer,text,text,text) to authenticated;
revoke all on function public.create_leader_appointment_for_person_v2(uuid,uuid,uuid,date,text,text,text,date,date,text) from public, anon;
grant execute on function public.create_leader_appointment_for_person_v2(uuid,uuid,uuid,date,text,text,text,date,date,text) to authenticated;
revoke all on function public.decide_leader_verification_v2(uuid,text,text,integer) from public, anon;
grant execute on function public.decide_leader_verification_v2(uuid,text,text,integer) to authenticated;

-- Public directory is a security-invoker view, so underlying-table RLS still applies.
create or replace view public.leader_directory_public
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
      'type', c.contact_type, 'label', c.label, 'value', c.contact_value
    ) order by c.sort_order, c.contact_type)
    from public.leader_contacts c
    where c.appointment_id = a.id
      and c.visibility = 'public'
      and c.public_approved_at is not null
  ), '[]'::jsonb) as public_contacts
from public.leader_appointments a
join public.leader_people person on person.id = a.person_id
join public.leader_positions pos on pos.id = a.position_id
join public.boundaries b on b.id = a.administrative_unit_id
join public.leader_public_profiles profile on profile.appointment_id = a.id
join public.leader_verification_cases v on v.appointment_id = a.id
where a.appointment_status in ('approved','active')
  and a.effective_from <= current_date
  and (a.effective_to is null or a.effective_to > current_date)
  and v.verification_status = 'approved'
  and pos.position_status = 'approved'
  and profile.publication_status = 'published'
  and b.valid_to is null;

revoke all on public.leader_directory_public from public, authenticated, anon;
grant select on public.leader_directory_public to anon, authenticated;
