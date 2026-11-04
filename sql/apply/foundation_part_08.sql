-- Append-only, value-minimised audit. No phone, email, dossier text, file path or secrets.
create or replace function private.capture_leader_audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_actor uuid;
  v_target uuid;
  v_unit uuid;
  v_person uuid;
  v_role text;
  v_fields text[] := '{}';
  v_key text;
  v_action text;
  v_scope_count integer := 0;
begin
  if tg_op = 'DELETE' then raise exception 'Leader registry records cannot be hard deleted'; end if;
  v_new := to_jsonb(new);
  if tg_op = 'UPDATE' then v_old := to_jsonb(old); end if;
  v_actor := coalesce(auth.uid(), nullif(v_new->>'created_by','')::uuid,
    nullif(v_new->>'recorded_by','')::uuid, nullif(v_new->>'submitted_by','')::uuid);
  v_target := coalesce(nullif(v_new->>'id','')::uuid,
    nullif(v_new->>'appointment_id','')::uuid, nullif(v_new->>'person_id','')::uuid);
  v_unit := nullif(v_new->>'administrative_unit_id','')::uuid;
  if v_unit is null and v_new ? 'appointment_id' then
    select a.administrative_unit_id into v_unit from public.leader_appointments a
    where a.id = nullif(v_new->>'appointment_id','')::uuid;
  end if;
  if v_unit is null then
    v_person := case
      when tg_table_name = 'leader_people' then nullif(v_new->>'id','')::uuid
      else nullif(v_new->>'person_id','')::uuid
    end;
    -- The atomic appointment RPC sets this transaction-local scope before
    -- inserting a new person, because the appointment row does not exist yet
    -- when the person's INSERT audit trigger fires.
    if tg_table_name = 'leader_people' then
      v_unit := nullif(current_setting('app.leader_audit_unit_id', true), '')::uuid;
    end if;
  end if;
  if tg_op = 'INSERT' then
    select array_agg(keys.field order by keys.field) into v_fields from jsonb_object_keys(v_new) as keys(field);
    v_action := 'INSERT';
  else
    for v_key in select keys.field from jsonb_object_keys(v_new) as keys(field) loop
      if v_new->v_key is distinct from v_old->v_key
        and v_key not in ('updated_at','version','contact_value','private_storage_key','internal_notes','education_level','institution','field_of_study') then
        v_fields := array_append(v_fields, v_key);
      end if;
    end loop;
    v_action := case when 'appointment_status' = any(v_fields) or 'verification_status' = any(v_fields)
      or 'publication_status' = any(v_fields) then 'STATE_CHANGE' else 'UPDATE' end;
  end if;
  select a.role_code into v_role from public.admin_role_assignments a
    where a.user_id = v_actor and a.assignment_status = 'active'
      and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())
    order by case a.role_code when 'national_super_admin' then 0 when 'district_admin' then 1 when 'sector_admin' then 2 else 3 end
    limit 1;
  if v_unit is not null then
    insert into public.leader_audit_events(
      actor_id, actor_role, action, target_table, target_id,
      administrative_unit_id, changed_fields, reason
    ) values (
      v_actor, v_role, v_action, tg_table_name, v_target, v_unit, coalesce(v_fields,'{}'),
      nullif(current_setting('app.leader_change_reason', true), '')
    );
  elsif v_person is not null then
    -- Person-level identity and dossier changes can affect several offices.
    -- Emit one scoped audit event per linked administrative unit rather than
    -- assigning the event arbitrarily to whichever appointment sorts first.
    for v_unit in
      select distinct a.administrative_unit_id
      from public.leader_appointments a
      where a.person_id = v_person
      order by a.administrative_unit_id
    loop
      v_scope_count := v_scope_count + 1;
      insert into public.leader_audit_events(
        actor_id, actor_role, action, target_table, target_id,
        administrative_unit_id, changed_fields, reason
      ) values (
        v_actor, v_role, v_action, tg_table_name, v_target, v_unit, coalesce(v_fields,'{}'),
        nullif(current_setting('app.leader_change_reason', true), '')
      );
    end loop;
    if v_scope_count = 0 then
      insert into public.leader_audit_events(
        actor_id, actor_role, action, target_table, target_id,
        administrative_unit_id, changed_fields, reason
      ) values (
        v_actor, v_role, v_action, tg_table_name, v_target, null, coalesce(v_fields,'{}'),
        nullif(current_setting('app.leader_change_reason', true), '')
      );
    end if;
  else
    insert into public.leader_audit_events(
      actor_id, actor_role, action, target_table, target_id,
      administrative_unit_id, changed_fields, reason
    ) values (
      v_actor, v_role, v_action, tg_table_name, v_target, null, coalesce(v_fields,'{}'),
      nullif(current_setting('app.leader_change_reason', true), '')
    );
  end if;
  return new;
end $$;

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
drop trigger if exists leader_appointment_history_event on public.leader_appointments;
create trigger leader_appointment_history_event after insert or update on public.leader_appointments
for each row execute function private.capture_appointment_event();

-- Capture all registry actions using only changed field names, never field values.
do $$
declare t text;
begin
  foreach t in array array[
    'admin_role_assignments','admin_delegations','leader_people','leader_positions',
    'leader_appointments','leader_verification_cases','leader_appointment_evidence',
    'leader_verification_decisions','leader_public_profiles','leader_contacts',
    'leader_dossiers','leader_dossier_documents'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit_event', t);
    execute format('create trigger %I after insert or update on public.%I for each row execute function private.capture_leader_audit_event()', t || '_audit_event', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Backfill only the existing country Super Admin. Province-scoped legacy
-- profiles intentionally do not become a new account tier.
-- ---------------------------------------------------------------------------
insert into public.admin_role_assignments(
  user_id, role_code, administrative_unit_id, assignment_status,
  valid_from, grant_reason
)
select ap.user_id, 'national_super_admin', b.id, 'active', now(),
       'Migration bootstrap from existing country-scoped Super Admin profile'
from public.admin_profiles ap
join public.boundaries b on b.scope_code = ap.scope_code
where ap.is_super_admin is true
  and ap.scope_code = 'RW'
  and b.level::text = 'country'
  and b.valid_to is null
  and not exists (
    select 1 from public.admin_role_assignments a
    where a.user_id = ap.user_id
      and a.role_code = 'national_super_admin'
      and a.administrative_unit_id = b.id
      and a.assignment_status = 'active'
  );

-- ---------------------------------------------------------------------------
-- RLS and least-privilege grants.
-- ---------------------------------------------------------------------------
alter table public.admin_role_assignments enable row level security;
alter table public.admin_delegations enable row level security;
alter table public.leader_people enable row level security;
alter table public.leader_person_history enable row level security;
alter table public.leader_positions enable row level security;
alter table public.leader_appointments enable row level security;
alter table public.leader_verification_cases enable row level security;
alter table public.leader_appointment_evidence enable row level security;
alter table public.leader_verification_decisions enable row level security;
alter table public.leader_public_profiles enable row level security;
alter table public.leader_contacts enable row level security;
alter table public.leader_dossiers enable row level security;
alter table public.leader_dossier_documents enable row level security;
alter table public.leader_appointment_events enable row level security;
alter table public.leader_audit_events enable row level security;

-- Start from zero client grants on every new table.
revoke all on table
  public.admin_role_assignments, public.admin_delegations,
  public.leader_people, public.leader_person_history, public.leader_positions,
  public.leader_verification_cases, public.leader_appointment_evidence,
  public.leader_verification_decisions, public.leader_public_profiles,
  public.leader_contacts, public.leader_dossiers, public.leader_dossier_documents,
  public.leader_appointment_events, public.leader_audit_events
from public, anon, authenticated;

-- Authenticated backend administration; RLS determines permitted rows/actions.
grant select, insert, update on table
  public.admin_role_assignments, public.admin_delegations,
  public.leader_people, public.leader_positions, public.leader_appointments,
  public.leader_verification_cases, public.leader_public_profiles,
  public.leader_contacts, public.leader_dossiers
to authenticated;
grant select on public.leader_person_history to authenticated;
grant insert on public.leader_appointment_evidence, public.leader_dossier_documents to authenticated;
grant select on public.leader_appointment_evidence, public.leader_dossier_documents,
  public.leader_verification_decisions, public.leader_appointment_events, public.leader_audit_events
to authenticated;
