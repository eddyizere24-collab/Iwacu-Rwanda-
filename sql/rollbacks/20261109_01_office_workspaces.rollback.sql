begin;
drop function if exists public.get_public_unit_leaders_v1(text[]);
drop function if exists public.remove_office_unit_leader_v1(uuid);
drop function if exists public.save_office_unit_leader_v1(uuid,text,text,text,text,text,text,boolean,boolean,text,boolean);
drop function if exists public.get_office_unit_leader_v1(uuid);
drop function if exists public.list_office_leaders_v1(text,text,integer);
drop function if exists public.list_office_units_v1(text);
drop function if exists public.get_office_workspace_v1();
-- restore the M3 version of create_office_account_v1 (no leader card)
create or replace function public.create_office_account_v1(
  p_user_id uuid, p_login_name text, p_display_name text, p_job_title text, p_phone text, p_role_code text, p_unit_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_assignment uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_role_code not in ('district_admin','sector_admin','cell_admin') then
    raise exception 'Only district, sector and cell accounts can be created here' using errcode = '22023';
  end if;
  if not private.leader_actor_can('manage_admins', p_unit_id) then
    raise exception 'No authority to create this account at this place' using errcode = '42501';
  end if;
  insert into public.admin_role_assignments(user_id, role_code, administrative_unit_id, grant_reason)
  values (p_user_id, p_role_code, p_unit_id, 'Konti yaremwe n''urwego rwo hejuru (office)')
  returning id into v_assignment;
  insert into public.office_profiles(user_id, login_name, display_name, job_title, phone, created_by)
  values (p_user_id, lower(btrim(p_login_name)), btrim(p_display_name),
          nullif(btrim(coalesce(p_job_title,'')),''), nullif(btrim(coalesce(p_phone,'')),''), auth.uid());
  return v_assignment;
end $$;
drop function if exists private.office_child_level(text);
drop function if exists private.office_in_scope(uuid,text,boolean);
drop trigger if exists office_unit_leaders_audit_trg on public.office_unit_leaders;
drop function if exists private.office_unit_leaders_audit();
-- WARNING: this deletes all leader cards. Export them first if needed.
drop table if exists public.office_unit_leader_audit;
drop table if exists public.office_unit_leaders;
commit;
