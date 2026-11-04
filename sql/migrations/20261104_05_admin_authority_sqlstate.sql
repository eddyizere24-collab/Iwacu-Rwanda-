-- CHANGED 2026-11-04 GROK: permission denials use SQLSTATE 42501 so L1 hierarchy contract matches RLS; see docs/HANDOFF.md
-- Additive replace of private.validate_admin_role_assignment only.
begin;

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
      raise exception 'Administrator does not have authority to assign this role at this scope' using errcode = '42501';
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

commit;
