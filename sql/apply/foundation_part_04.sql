create or replace function private.leader_actor_can_direct(
  p_actor uuid, p_action text, p_unit_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $direct$
declare
  v_target_code text;
  v_target_level text;
  v_target_depth integer;
begin
  if p_actor is null or p_unit_id is null or p_actor is distinct from auth.uid() then
    return false;
  end if;

  -- Delegation grants must also be made by the currently authenticated
  -- National Super Admin at AAL2, never by a supplied actor id alone.
  if exists (
    select 1 from public.admin_role_assignments a
    where a.user_id = p_actor
      and a.role_code = 'national_super_admin'
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
  ) and coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2' then
    return false;
  end if;

  select b.scope_code, b.level::text,
    case b.level::text
      when 'country' then 0 when 'province' then 1 when 'district' then 2
      when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
  into v_target_code, v_target_level, v_target_depth
  from public.boundaries b
  where b.id = p_unit_id and b.valid_to is null;
  if v_target_code is null then return false; end if;

  return exists (
    select 1
    from public.admin_role_assignments a
    join public.boundaries au on au.id = a.administrative_unit_id
    where a.user_id = p_actor
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
      and (
        a.role_code = 'national_super_admin'
        or (v_target_code = au.scope_code or v_target_code like au.scope_code || '-%')
      )
      and (
        a.role_code = 'national_super_admin'
        or case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
           <= v_target_depth
      )
      and (
        p_action <> 'approve'
        or a.role_code = 'national_super_admin'
        or case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
           < v_target_depth
      )
      and (
        p_action not in ('view_dossier','edit_dossier')
        or a.role_code in ('national_super_admin','district_admin')
      )
      and (
        p_action <> 'audit'
        or a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin')
      )
      and (
        (p_action = 'read' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
        or (p_action = 'edit' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
        or (p_action = 'approve' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
        or (p_action in ('view_dossier','edit_dossier') and a.role_code in ('national_super_admin','district_admin'))
        or (p_action = 'audit' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
      )
  );
end;
$direct$;

revoke all on function private.leader_actor_can_direct(uuid,text,uuid) from public, anon, authenticated;

create or replace function private.leader_appointment_is_public(p_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.leader_appointments a
    join public.leader_verification_cases v on v.appointment_id = a.id
    join public.leader_public_profiles p on p.appointment_id = a.id
    join public.leader_positions pos on pos.id = a.position_id
    join public.boundaries b on b.id = a.administrative_unit_id
    where a.id = p_appointment_id
      and a.appointment_status in ('approved','active')
      and a.effective_from <= current_date
      and (a.effective_to is null or a.effective_to > current_date)
      and v.verification_status = 'approved'
      and p.publication_status = 'published'
      and pos.position_status = 'approved'
      and b.valid_to is null
  );
$$;

create or replace function private.leader_person_is_public(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leader_appointments a
    where a.person_id = p_person_id
      and private.leader_appointment_is_public(a.id)
  );
$$;

revoke all on function private.leader_actor_can(text,uuid) from public;
revoke all on function private.leader_appointment_is_public(uuid) from public;
revoke all on function private.leader_person_is_public(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.leader_actor_can(text,uuid) to authenticated;
grant execute on function private.leader_appointment_is_public(uuid) to anon, authenticated;
grant execute on function private.leader_person_is_public(uuid) to anon, authenticated;

-- National Super Admin requires an AAL2 session. This check runs as the
-- function owner so the role lookup remains reliable under RLS on assignments.
create or replace function private.leader_actor_requires_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $iwacu_leader_mfa$
  select exists (
    select 1
    from public.admin_role_assignments a
    where a.user_id = auth.uid()
      and a.role_code = 'national_super_admin'
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
  );
$iwacu_leader_mfa$;
revoke all on function private.leader_actor_requires_mfa() from public, anon, authenticated;
grant execute on function private.leader_actor_requires_mfa() to authenticated;

-- ---------------------------------------------------------------------------
-- Data integrity and state guards.
-- ---------------------------------------------------------------------------
-- Delegation metadata is immutable after issue; a grantor may only revoke it.
create or replace function private.guard_admin_delegation()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if tg_op = 'DELETE' then raise exception 'Delegations are revoked, not deleted'; end if;
  if tg_op = 'INSERT' then
    if new.grantor_user_id is distinct from auth.uid() then
      raise exception 'Delegation grantor must be the authenticated actor';
    end if;
    if new.delegation_status <> 'active' then
      raise exception 'A new delegation must begin active';
    end if;
    if not private.leader_actor_can_direct(
      new.grantor_user_id,
      case new.capability
        when 'leader_read' then 'read'
        when 'leader_edit' then 'edit'
        when 'leader_review' then 'approve'
        when 'leader_dossier_read' then 'view_dossier'
        when 'leader_dossier_write' then 'edit_dossier'
        when 'leader_audit_read' then 'audit'
        else 'invalid'
      end,
      new.administrative_unit_id
    ) then
      raise exception 'Grantor cannot delegate a capability they do not hold';
    end if;
  else
    if new.id is distinct from old.id
       or new.grantor_user_id is distinct from old.grantor_user_id
       or new.grantee_user_id is distinct from old.grantee_user_id
       or new.administrative_unit_id is distinct from old.administrative_unit_id
       or new.capability is distinct from old.capability
       or new.valid_from is distinct from old.valid_from
       or new.valid_until is distinct from old.valid_until
       or new.reason is distinct from old.reason
       or new.created_at is distinct from old.created_at then
      raise exception 'Delegation scope and capability are immutable; revoke and issue a new delegation';
    end if;
    if old.delegation_status = 'revoked' and new.delegation_status <> 'revoked' then
      raise exception 'Revoked delegations cannot be reactivated; issue a new delegation';
    elsif new.delegation_status = 'revoked' and old.delegation_status <> 'revoked' then
      new.revoked_by := auth.uid();
      new.revoked_at := now();
    elsif new.revoked_by is distinct from old.revoked_by or new.revoked_at is distinct from old.revoked_at then
      raise exception 'Delegation revocation metadata is system-attributed';
    end if;
  end if;
  return new;
end $fn$;
drop trigger if exists admin_delegation_guard on public.admin_delegations;
create trigger admin_delegation_guard before insert or update or delete on public.admin_delegations
for each row execute function private.guard_admin_delegation();
