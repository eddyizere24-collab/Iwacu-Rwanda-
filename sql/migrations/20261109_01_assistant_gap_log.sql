-- IWACU RWANDA: server-only assistant data-gap counters.
-- Additive only. Only gap category, public administrative scope and aggregate counts are stored.
-- Visitor text, phone numbers, names, IP addresses and account identifiers are not stored.

begin;

create table if not exists public.assistant_gap_counts (
  gap_type text not null check (gap_type in (
    'leader_missing',
    'contact_missing',
    'place_not_found',
    'capability_data_missing'
  )),
  scope_code text not null default '',
  occurrences bigint not null default 1 check (occurrences > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (gap_type, scope_code),
  constraint assistant_gap_scope_format check (
    scope_code = '' or scope_code ~ '^RW(-[A-Z0-9]{1,12}){1,5}$'
  )
);

alter table public.assistant_gap_counts enable row level security;
revoke all on table public.assistant_gap_counts from public, anon, authenticated;

create or replace function public.record_assistant_gap_v1(
  p_gap_type text,
  p_scope_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $assistant_gap$
declare
  v_scope_code text := coalesce(nullif(btrim(p_scope_code), ''), '');
begin
  if p_gap_type not in (
    'leader_missing',
    'contact_missing',
    'place_not_found',
    'capability_data_missing'
  ) then
    return jsonb_build_object('recorded', false, 'reason', 'invalid_gap_type');
  end if;

  if v_scope_code <> '' and not exists (
    select 1
    from public.boundaries b
    where b.scope_code = v_scope_code
      and b.valid_to is null
  ) then
    return jsonb_build_object('recorded', false, 'reason', 'unknown_scope');
  end if;

  insert into public.assistant_gap_counts (
    gap_type,
    scope_code,
    occurrences,
    first_seen_at,
    last_seen_at
  )
  values (
    p_gap_type,
    v_scope_code,
    1,
    now(),
    now()
  )
  on conflict (gap_type, scope_code)
  do update set
    occurrences = public.assistant_gap_counts.occurrences + 1,
    last_seen_at = now();

  return jsonb_build_object('recorded', true);
end;
$assistant_gap$;

revoke all on function public.record_assistant_gap_v1(text, text) from public;
revoke execute on function public.record_assistant_gap_v1(text, text) from anon, authenticated;
grant execute on function public.record_assistant_gap_v1(text, text) to service_role;

commit;
