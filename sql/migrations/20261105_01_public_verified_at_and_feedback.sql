-- CHANGED 2026-11-05 CLAUDE: public verification date and citizen feedback table; see docs/HANDOFF.md
-- 1) leader_directory_public gets ONE new last column verified_at (date the verification was approved). Anon gets column SELECT on
--    leader_verification_cases.decision_at only; decision_by, decision_reason, submitted_by and every other column stay unreadable, and the
--    existing row policy still limits anon to approved, published, current appointments.
-- 2) get_leader_candidates_v2 returns it as appointment.verified_at for exact-place leaders and shared leaders (no other change).
-- 3) public.leader_public_feedback: anon/authenticated may INSERT four columns only; nobody public can read it back; only the National
--    Super Admin reads and triages it for now (scoped admins get access in a later milestone). Rate limiting is an API-layer job.
begin;

grant select (decision_at) on public.leader_verification_cases to anon;

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
    select jsonb_agg(jsonb_build_object('type',c.contact_type,'label',c.label,'value',c.contact_value)
      order by c.sort_order,c.contact_type)
    from public.leader_contacts c
    where c.appointment_id=a.id and c.visibility='public' and c.public_approved_at is not null
  ),'[]'::jsonb) as public_contacts,
  profile.public_photo_thumbnail_key,
  v.decision_at as verified_at
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

revoke all on public.leader_directory_public from public,authenticated,anon;
grant select on public.leader_directory_public to anon,authenticated;

create or replace function public.get_leader_candidates_v2(p_scope_codes text[])
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $candidates$
begin
  if coalesce(cardinality(p_scope_codes),0)>3 then
    raise exception 'At most three candidate scopes may be queried in one request';
  end if;
  if (
    select count(distinct b.level::text)>1
    from public.boundaries b
    where b.scope_code = any(coalesce(p_scope_codes,array[]::text[]))
      and b.valid_to is null
  ) then
    raise exception 'Candidate scopes in one request must be at the same administrative level';
  end if;
  return (
    with recursive
    requested_raw as (
      select scope_code,min(ordinality) as ordinality
      from unnest(coalesce(p_scope_codes,array[]::text[])) with ordinality as r(scope_code,ordinality)
      where scope_code ~ '^RW(-[A-Z0-9]{1,12}){0,5}$'
      group by scope_code
    ),
    requested as (
      select b.id,b.scope_code,b.name_kiny,b.name_eng,b.level::text as level,r.ordinality
      from requested_raw r
      join public.boundaries b on b.scope_code=r.scope_code and b.valid_to is null
      order by r.ordinality limit 3
    ),
    lineage as (
      select r.id as candidate_id,r.id as unit_id,0 as depth from requested r
      union all
      select l.candidate_id,parent.id,l.depth+1
      from lineage l
      join public.boundaries child on child.id=l.unit_id and child.valid_to is null
      join public.boundaries parent on parent.id=child.parent_id and parent.valid_to is null
      where l.depth<5
    ),
    matching_leaders as materialized (
      select
        l.candidate_id,l.depth,
        v.appointment_id,v.person_id,v.display_name,v.position_code,
        v.title_kiny,v.title_eng,v.title_fra,
        v.administrative_unit_id,v.scope_code,
        v.administrative_unit_name_kiny,v.administrative_unit_name_eng,
        v.administrative_unit_level,v.effective_from,v.effective_to,
        v.biography,v.office_hours,v.service_priorities,
        v.public_photo_object_key,v.public_photo_thumbnail_key,v.public_contacts,v.verified_at
      from lineage l
      join public.leader_directory_public v on v.administrative_unit_id=l.unit_id
      order by l.depth,v.appointment_id,v.scope_code
      limit 900
    ),
    candidate_payload as (
      select r.ordinality,
        jsonb_build_object(
          'place',jsonb_build_object('id',r.id,'scope_code',r.scope_code,'name_kiny',r.name_kiny,'name_eng',r.name_eng,'level',r.level),
          'confidence','Gicye',
          'leaders',coalesce((
            select jsonb_agg(jsonb_build_object(
              'appointment_id',v.appointment_id,'person_id',v.person_id,'display_name',v.display_name,
              'position',jsonb_build_object('code',v.position_code,'title_kiny',v.title_kiny,'title_eng',v.title_eng,'title_fra',v.title_fra),
              'appointment',jsonb_build_object('effective_from',v.effective_from,'effective_to',v.effective_to,'status','approved','verified_at',v.verified_at),
              'profile',jsonb_build_object('biography',v.biography,'office_hours',v.office_hours,'service_priorities',v.service_priorities,
                'photo_key',v.public_photo_object_key,'thumbnail_key',v.public_photo_thumbnail_key),
              'public_contacts',v.public_contacts
            ) order by v.title_kiny,v.display_name)
            from matching_leaders v
            where v.candidate_id=r.id and v.depth=0
          ),'[]'::jsonb)
        ) as payload
      from requested r
    ),
    shared_rows as (
      -- CHANGED 2026-11-04 GROK: depth comes from matching_leaders alias v (not l); see docs/HANDOFF.md
      select distinct on (v.appointment_id)
        v.appointment_id,v.person_id,v.display_name,v.position_code,v.title_kiny,v.title_eng,v.title_fra,
        v.administrative_unit_id,v.scope_code,v.administrative_unit_name_kiny,v.administrative_unit_name_eng,
        v.administrative_unit_level,v.effective_from,v.effective_to,v.biography,v.office_hours,v.service_priorities,
        v.public_photo_object_key,v.public_photo_thumbnail_key,v.public_contacts,v.verified_at,v.depth
      from matching_leaders v
      where v.depth>0
        and not exists (
          select 1 from matching_leaders exact_scope
          where exact_scope.appointment_id=v.appointment_id and exact_scope.depth=0
        )
      order by v.appointment_id,v.depth,v.scope_code
      limit 300
    ),
    shared_payload as (
      select coalesce(jsonb_agg(jsonb_build_object(
        'appointment_id',s.appointment_id,'person_id',s.person_id,'display_name',s.display_name,
        'position',jsonb_build_object('code',s.position_code,'title_kiny',s.title_kiny,'title_eng',s.title_eng,'title_fra',s.title_fra),
        'place',jsonb_build_object('id',s.administrative_unit_id,'scope_code',s.scope_code,
          'name_kiny',s.administrative_unit_name_kiny,'name_eng',s.administrative_unit_name_eng,'level',s.administrative_unit_level),
        'appointment',jsonb_build_object('effective_from',s.effective_from,'effective_to',s.effective_to,'status','approved','verified_at',s.verified_at),
        'profile',jsonb_build_object('biography',s.biography,'office_hours',s.office_hours,'service_priorities',s.service_priorities,
          'photo_key',s.public_photo_object_key,'thumbnail_key',s.public_photo_thumbnail_key),
        'public_contacts',s.public_contacts
      ) order by s.depth,s.administrative_unit_level desc,s.display_name),'[]'::jsonb) as leaders
      from shared_rows s
    )
    select jsonb_build_object(
      'candidates',coalesce((select jsonb_agg(payload order by ordinality) from candidate_payload),'[]'::jsonb),
      'shared_leaders',(select leaders from shared_payload)
    )
  );
end
$candidates$;

revoke all on function public.get_leader_candidates_v2(text[]) from public;
grant execute on function public.get_leader_candidates_v2(text[]) to anon,authenticated;

create table if not exists public.leader_public_feedback (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.leader_appointments(id) on delete restrict,
  administrative_unit_id uuid references public.boundaries(id) on delete restrict,
  category text not null check (category in ('wrong_leader','wrong_place','wrong_phone','other')),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  status text not null default 'new' check (status in ('new','reviewing','resolved','rejected')),
  created_at timestamptz not null default now(),
  constraint leader_public_feedback_target check (appointment_id is not null or administrative_unit_id is not null)
);
create index if not exists idx_leader_public_feedback_status_created
  on public.leader_public_feedback(status, created_at desc);

alter table public.leader_public_feedback enable row level security;

revoke all on public.leader_public_feedback from public, anon, authenticated;
grant insert (appointment_id, administrative_unit_id, category, message) on public.leader_public_feedback to anon, authenticated;
grant select, update (status) on public.leader_public_feedback to authenticated;

drop policy if exists leader_public_feedback_public_insert on public.leader_public_feedback;
create policy leader_public_feedback_public_insert on public.leader_public_feedback
  for insert to anon, authenticated with check (status = 'new');
drop policy if exists leader_public_feedback_admin_read on public.leader_public_feedback;
create policy leader_public_feedback_admin_read on public.leader_public_feedback
  for select to authenticated using ((select private.leader_actor_can('manage_positions', null)));
drop policy if exists leader_public_feedback_admin_triage on public.leader_public_feedback;
create policy leader_public_feedback_admin_triage on public.leader_public_feedback
  for update to authenticated using ((select private.leader_actor_can('manage_positions', null)))
  with check ((select private.leader_actor_can('manage_positions', null)));

commit;
