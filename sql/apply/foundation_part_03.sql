-- ---------------------------------------------------------------------------
-- Private helpers: SECURITY DEFINER only in the unexposed private schema,
-- with an empty search_path and all relations explicitly schema-qualified.
-- ---------------------------------------------------------------------------
create or replace function private.leader_actor_can(p_action text, p_unit_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target_code text;
  v_target_level text;
  v_target_depth integer;
  v_capability text;
begin
  if v_user is null then return false; end if;

  -- National Super Admin authority is never available from an AAL1 session.
  -- Missing aal claims are treated as AAL1, not as an implicit MFA success.
  if exists (
    select 1 from public.admin_role_assignments a
    where a.user_id = v_user
      and a.role_code = 'national_super_admin'
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
  ) and coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2' then
    return false;
  end if;

  if p_action = 'manage_positions' or (p_action = 'manage_admins' and p_unit_id is null) then
    return exists (
      select 1
      from public.admin_role_assignments a
      join public.boundaries u on u.id = a.administrative_unit_id
      where a.user_id = v_user
        and a.role_code = 'national_super_admin'
        and a.assignment_status = 'active'
        and a.valid_from <= now()
        and (a.valid_until is null or a.valid_until > now())
        and u.level::text = 'country'
        and u.scope_code = 'RW'
        and u.valid_to is null
    );
  end if;

  if p_action = 'create_person' then
    return exists (
      select 1 from public.admin_role_assignments a
      where a.user_id = v_user
        and a.assignment_status = 'active'
        and a.valid_from <= now()
        and (a.valid_until is null or a.valid_until > now())
    );
  end if;

  if p_unit_id is null then return false; end if;

  select b.scope_code, b.level::text,
    case b.level::text
      when 'country' then 0 when 'province' then 1 when 'district' then 2
      when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
  into v_target_code, v_target_level, v_target_depth
  from public.boundaries b
  where b.id = p_unit_id and b.valid_to is null;

  if v_target_code is null then return false; end if;

  if p_action = 'manage_admins' then
    return exists (
      select 1
      from public.admin_role_assignments a
      join public.boundaries au on au.id = a.administrative_unit_id
      where a.user_id = v_user
        and a.assignment_status = 'active'
        and a.valid_from <= now()
        and (a.valid_until is null or a.valid_until > now())
        and (v_target_code = au.scope_code or v_target_code like au.scope_code || '-%')
        and (
          a.role_code = 'national_super_admin'
          or (a.role_code = 'district_admin' and v_target_level = 'sector')
          or (a.role_code = 'sector_admin' and v_target_level = 'cell')
        )
    );
  end if;

  if p_action = 'approve' then v_capability := 'leader_review';
  elsif p_action = 'edit' then v_capability := 'leader_edit';
  elsif p_action = 'read' then v_capability := 'leader_read';
  elsif p_action = 'view_dossier' then v_capability := 'leader_dossier_read';
  elsif p_action = 'edit_dossier' then v_capability := 'leader_dossier_write';
  elsif p_action = 'audit' then v_capability := 'leader_audit_read';
  else return false;
  end if;

  if exists (
    select 1
    from public.admin_role_assignments a
    join public.boundaries au on au.id = a.administrative_unit_id
    where a.user_id = v_user
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
      and (
        a.role_code = 'national_super_admin'
        or (
          v_target_code = au.scope_code or v_target_code like au.scope_code || '-%'
        )
      )
      and (
        a.role_code = 'national_super_admin'
        or (
          case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
          <= v_target_depth
          and (
            p_action <> 'approve'
            or case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
               < v_target_depth
          )
        )
      )
      and (
        p_action <> 'view_dossier' and p_action <> 'edit_dossier'
        or a.role_code in ('national_super_admin','district_admin')
      )
      and (
        p_action <> 'audit'
        or a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin')
      )
  ) then
    return true;
  end if;

  -- Delegation is explicit, scoped, time-bounded and only applies to a user
  -- who still has an active base assignment.
  return exists (
    select 1
    from public.admin_delegations d
    join public.boundaries du on du.id = d.administrative_unit_id
    join public.admin_role_assignments base_role on base_role.user_id = d.grantee_user_id
    join public.admin_role_assignments grantor_role on grantor_role.user_id = d.grantor_user_id
    join public.boundaries grantor_unit on grantor_unit.id = grantor_role.administrative_unit_id
    where d.grantee_user_id = v_user
      and d.capability = v_capability
      and d.delegation_status = 'active'
      and d.valid_from <= now() and d.valid_until > now()
      and base_role.assignment_status = 'active'
      and base_role.valid_from <= now()
      and (base_role.valid_until is null or base_role.valid_until > now())
      and grantor_role.assignment_status = 'active'
      and grantor_role.valid_from <= now()
      and (grantor_role.valid_until is null or grantor_role.valid_until > now())
      and (v_target_code = du.scope_code or v_target_code like du.scope_code || '-%')
      and (du.scope_code = grantor_unit.scope_code or du.scope_code like grantor_unit.scope_code || '-%')
      and (
        grantor_role.role_code = 'national_super_admin'
        or (
          case grantor_unit.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
          <= case du.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
          and (
            d.capability <> 'leader_review'
            or case grantor_unit.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
               < case du.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
          )
          and (
            d.capability not in ('leader_dossier_read','leader_dossier_write')
            or grantor_role.role_code = 'district_admin'
          )
        )
      )
  );
end;
$$;
