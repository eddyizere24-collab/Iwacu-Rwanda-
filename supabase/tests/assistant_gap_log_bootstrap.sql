-- DISPOSABLE CI TEST DATABASE ONLY. Never run this bootstrap on any shared or Production database.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;
grant usage on schema public to anon, authenticated;
create table if not exists public.boundaries (scope_code text primary key, valid_to date null);
insert into public.boundaries (scope_code, valid_to)
values ('RW-P1-D12', null)
on conflict (scope_code) do update set valid_to = excluded.valid_to;
