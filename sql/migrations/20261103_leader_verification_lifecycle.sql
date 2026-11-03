begin;

alter table public.leaders
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_evidence_ref text,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists verified_at timestamptz;

alter table public.leaders
  drop constraint if exists leaders_verification_status_check;

alter table public.leaders
  add constraint leaders_verification_status_check
  check (
    verification_status in ('pending', 'approved', 'rejected')
    and (
      verification_status <> 'approved'
      or (
        verified_by is not null
        and verified_at is not null
        and nullif(btrim(verification_evidence_ref), '') is not null
      )
    )
  );

create index if not exists idx_leaders_active_verification_scope
  on public.leaders (scope_code, verification_status)
  where valid_to is null;

drop policy if exists leaders_public_read on public.leaders;
create policy leaders_public_read
  on public.leaders
  for select
  to anon, authenticated
  using (
    (valid_to is null and verification_status = 'approved')
    or (select private.is_current_user_super_admin())
    or (scope_code = (select private.current_user_admin_scope()))
    or (scope_code like ((select private.current_user_admin_scope()) || '-%'))
  );

revoke all privileges on table public.leaders from public, anon, authenticated;
grant select (
  id, scope_code, first_name, last_name, role, photo_url,
  valid_from, valid_to, version
) on table public.leaders to anon, authenticated;

commit;
