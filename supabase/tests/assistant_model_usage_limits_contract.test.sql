-- Run only in disposable CI DB after 20261110_03_assistant_model_usage_limits.sql.
do $$
declare
  result jsonb;
  global_count integer;
  client_count integer;
  client_a text := repeat('a', 64);
  client_b text := repeat('b', 64);
begin
  result := public.reserve_assistant_model_usage_v1('not-a-hash', 2, 1);
  if result ->> 'allowed' <> 'false' or result ->> 'reason' <> 'invalid_configuration' then
    raise exception 'invalid client hashes must fail closed: %', result;
  end if;

  result := public.reserve_assistant_model_usage_v1(client_a, 0, 1);
  if result ->> 'allowed' <> 'false' or result ->> 'reason' <> 'invalid_configuration' then
    raise exception 'invalid usage limits must fail closed: %', result;
  end if;

  result := public.reserve_assistant_model_usage_v1(client_a, 2, 1);
  if result ->> 'allowed' <> 'true' then
    raise exception 'first global/client reservation should pass: %', result;
  end if;

  result := public.reserve_assistant_model_usage_v1(client_a, 2, 1);
  if result ->> 'allowed' <> 'false' or result ->> 'reason' <> 'daily_client_limit' then
    raise exception 'same client must be limited without consuming another global slot: %', result;
  end if;

  result := public.reserve_assistant_model_usage_v1(client_b, 2, 1);
  if result ->> 'allowed' <> 'true' then
    raise exception 'second client should use the second global slot: %', result;
  end if;

  result := public.reserve_assistant_model_usage_v1(repeat('c', 64), 2, 1);
  if result ->> 'allowed' <> 'false' or result ->> 'reason' <> 'daily_global_limit' then
    raise exception 'global daily limit must stop further clients: %', result;
  end if;
  if exists (
    select 1 from public.assistant_model_usage_daily
    where usage_day = (now() at time zone 'UTC')::date
      and bucket_type = 'client'
      and bucket_hash = repeat('c', 64)
  ) then
    raise exception 'global-denied requests must not create per-client rows';
  end if;

  select request_count into global_count
  from public.assistant_model_usage_daily
  where usage_day = (now() at time zone 'UTC')::date
    and bucket_type = 'global'
    and bucket_hash = '';
  if global_count <> 2 then
    raise exception 'expected exactly two global reservations, got %', global_count;
  end if;

  select request_count into client_count
  from public.assistant_model_usage_daily
  where usage_day = (now() at time zone 'UTC')::date
    and bucket_type = 'client'
    and bucket_hash = client_a;
  if client_count <> 1 then
    raise exception 'denied requests must not increment a client counter, got %', client_count;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assistant_model_usage_daily'
      and column_name in ('ip_address', 'ip', 'question', 'query', 'prompt', 'phone', 'name', 'user_id', 'email')
  ) then
    raise exception 'usage table must not store raw visitor or prompt fields';
  end if;

  insert into public.assistant_model_usage_daily (
    usage_day, bucket_type, bucket_hash, request_count
  ) values (
    (now() at time zone 'UTC')::date - 36, 'global', '', 1
  );

  result := public.reserve_assistant_model_usage_v1(repeat('d', 64), 2, 1);
  if result ->> 'reason' <> 'daily_global_limit' then
    raise exception 'global cap remains active while retention is executed: %', result;
  end if;
  if exists (
    select 1 from public.assistant_model_usage_daily
    where usage_day < (now() at time zone 'UTC')::date - 35
  ) then
    raise exception 'usage counters older than 35 days must be removed';
  end if;
end
$$;

do $$
begin
  if has_table_privilege('anon', 'public.assistant_model_usage_daily', 'SELECT')
     or has_table_privilege('authenticated', 'public.assistant_model_usage_daily', 'SELECT')
     or has_table_privilege('service_role', 'public.assistant_model_usage_daily', 'SELECT') then
    raise exception 'usage table must not be directly readable by API roles';
  end if;
  if has_function_privilege('anon', 'public.reserve_assistant_model_usage_v1(text,integer,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.reserve_assistant_model_usage_v1(text,integer,integer)', 'EXECUTE') then
    raise exception 'only service_role may reserve the model budget';
  end if;
  if not has_function_privilege('service_role', 'public.reserve_assistant_model_usage_v1(text,integer,integer)', 'EXECUTE') then
    raise exception 'service_role must execute the usage reservation function';
  end if;
end
$$;
