-- Shared daily request budgets for optional Iwacu AI model calls.
-- Stores only a UTC day, a daily HMAC client bucket and aggregate counts.
-- Raw IP addresses, prompts, names, phone numbers and account IDs are never stored.
-- Additive migration. Applied only after the disposable Postgres contract passes.

begin;

create table if not exists public.assistant_model_usage_daily (
  usage_day date not null,
  bucket_type text not null check (bucket_type in ('global', 'client')),
  bucket_hash text not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (usage_day, bucket_type, bucket_hash),
  constraint assistant_model_usage_hash_format check (
    (bucket_type = 'global' and bucket_hash = '')
    or
    (bucket_type = 'client' and bucket_hash ~ '^[0-9a-f]{64}$')
  )
);

alter table public.assistant_model_usage_daily enable row level security;
revoke all on table public.assistant_model_usage_daily from public, anon, authenticated, service_role;

create or replace function public.reserve_assistant_model_usage_v1(
  p_client_hash text,
  p_daily_global_limit integer,
  p_daily_client_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $assistant_usage$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_global_count integer;
  v_client_count integer;
begin
  if p_client_hash is null or p_client_hash !~ '^[0-9a-f]{64}$'
     or p_daily_global_limit is null or p_daily_global_limit < 1 or p_daily_global_limit > 100
     or p_daily_client_limit is null or p_daily_client_limit < 1 or p_daily_client_limit > 20 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_configuration');
  end if;

  -- Retain only 35 days of aggregate counters. The primary key starts with
  -- usage_day, making this a bounded range delete without any per-request data.
  delete from public.assistant_model_usage_daily
  where usage_day < v_day - 35;

  -- Lock the global row first. All reservations serialize here, so site-wide
  -- quotas remain atomic across simultaneous Vercel/serverless instances.
  insert into public.assistant_model_usage_daily (
    usage_day, bucket_type, bucket_hash, request_count, updated_at
  )
  values (v_day, 'global', '', 0, now())
  on conflict (usage_day, bucket_type, bucket_hash) do nothing;

  select u.request_count
    into v_global_count
  from public.assistant_model_usage_daily u
  where u.usage_day = v_day
    and u.bucket_type = 'global'
    and u.bucket_hash = ''
  for update;

  if v_global_count >= p_daily_global_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_global_limit',
      'global_used', v_global_count
    );
  end if;

  insert into public.assistant_model_usage_daily (
    usage_day, bucket_type, bucket_hash, request_count, updated_at
  )
  values (v_day, 'client', p_client_hash, 0, now())
  on conflict (usage_day, bucket_type, bucket_hash) do nothing;

  select u.request_count
    into v_client_count
  from public.assistant_model_usage_daily u
  where u.usage_day = v_day
    and u.bucket_type = 'client'
    and u.bucket_hash = p_client_hash
  for update;

  if v_client_count >= p_daily_client_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_client_limit',
      'global_used', v_global_count,
      'client_used', v_client_count
    );
  end if;

  update public.assistant_model_usage_daily
  set request_count = request_count + 1, updated_at = now()
  where usage_day = v_day and bucket_type = 'global' and bucket_hash = '';

  update public.assistant_model_usage_daily
  set request_count = request_count + 1, updated_at = now()
  where usage_day = v_day and bucket_type = 'client' and bucket_hash = p_client_hash;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'reserved',
    'global_used', v_global_count + 1,
    'client_used', v_client_count + 1
  );
end;
$assistant_usage$;

revoke all on function public.reserve_assistant_model_usage_v1(text, integer, integer) from public, anon, authenticated, service_role;
grant execute on function public.reserve_assistant_model_usage_v1(text, integer, integer) to service_role;

commit;
