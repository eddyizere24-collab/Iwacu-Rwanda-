-- Rolls back M5. Record rows and their files are removed; verification marks are dropped.
begin;
drop function if exists public.verify_office_unit_leader_v1(uuid, boolean);
drop function if exists public.get_office_unit_verification_v1(text);
drop function if exists public.list_office_verification_v1(text, text, text, integer, integer);
drop function if exists public.create_office_record_v1(uuid, text, text, text, text, integer, text);
drop function if exists public.list_office_records_v1(text, text, text, integer, integer);
drop function if exists public.get_office_record_file_v1(uuid);
drop function if exists public.archive_office_record_v1(uuid);
drop function if exists public.list_office_report_v1(text);
drop trigger if exists office_unit_leaders_verify_reset_trg on public.office_unit_leaders;
drop function if exists private.office_leader_verify_reset();
drop table if exists public.office_records;
alter table public.office_unit_leaders drop column if exists verified_by, drop column if exists verified_at;
-- Restore the M4b audit function (without record events).
create or replace function public.list_office_audit_v1(p_limit integer default 50, p_offset integer default 0)
returns table(at timestamptz, kind text, who text, unit_name text, level text, scope_code text, detail text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query
  with ev as (
    select a.changed_at as at, ('card_' || a.action)::text as kind, a.changed_by as actor, a.unit_id,
           coalesce(a.new_row ->> 'display_name', a.old_row ->> 'display_name') as detail
    from public.office_unit_leader_audit a
    union all
    select t.created_at, 'task_issued', t.issued_by, t.issuer_unit_id, t.reference || ' · ' || t.title from public.office_tasks t
    union all
    select p.created_at, 'account_created', p.created_by, l.unit_id, p.display_name
    from public.office_profiles p join public.office_unit_leaders l on l.user_id = p.user_id
  )
  select e.at, e.kind, coalesce(ap.display_name, 'Sisitemu'), coalesce(b.name_kiny, b.name_eng), b.level::text, b.scope_code, e.detail,
         count(*) over()
  from ev e
  join public.boundaries b on b.id = e.unit_id
  left join public.office_profiles ap on ap.user_id = e.actor
  where private.office_in_scope(auth.uid(), b.scope_code, false)
  order by e.at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end $$;
-- The storage bucket "office-records" is left in place on purpose (remove it in the Storage dashboard if wanted).
commit;
