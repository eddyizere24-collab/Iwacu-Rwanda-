-- Index the new verification foreign key to preserve efficient auth-user joins/deletes.
create index if not exists idx_leaders_verified_by
  on public.leaders (verified_by)
  where verified_by is not null;
