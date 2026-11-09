-- Run only in disposable CI DB after assistant_gap_counts migration.
do $$
declare
  result jsonb;
  occurrence_count bigint;
begin
  result := public.record_assistant_gap_v1('invalid_type', 'RW-P1-D12');
  if result ->> 'recorded' <> 'false' or result ->> 'reason' <> 'invalid_gap_type' then
    raise exception 'invalid gap category must be rejected: %', result;
  end if;
  result := public.record_assistant_gap_v1('leader_missing', 'RW-NOT-REAL');
  if result ->> 'recorded' <> 'false' or result ->> 'reason' <> 'unknown_scope' then
    raise exception 'unknown scope must be rejected: %', result;
  end if;
  result := public.record_assistant_gap_v1('leader_missing', 'RW-P1-D12');
  if result ->> 'recorded' <> 'true' then raise exception 'valid counter write failed: %', result; end if;
  result := public.record_assistant_gap_v1('leader_missing', 'RW-P1-D12');
  if result ->> 'recorded' <> 'true' then raise exception 'valid counter increment failed: %', result; end if;

  select occurrences into occurrence_count
  from public.assistant_gap_counts
  where gap_type = 'leader_missing' and scope_code = 'RW-P1-D12';
  if occurrence_count <> 2 then raise exception 'expected aggregate count 2, got %', occurrence_count; end if;

  if has_table_privilege('anon', 'public.assistant_gap_counts', 'SELECT') then
    raise exception 'anon must not have direct SELECT access';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assistant_gap_counts'
      and column_name in ('question', 'query', 'phone', 'name', 'ip_address', 'user_id')
  ) then raise exception 'gap table must not store raw questions or visitor identifiers'; end if;
end
$$;

set role anon;
select public.record_assistant_gap_v1('contact_missing', 'RW-P1-D12');
reset role;

do $$
begin
  if not exists (
    select 1 from public.assistant_gap_counts
    where gap_type = 'contact_missing' and scope_code = 'RW-P1-D12' and occurrences = 1
  ) then raise exception 'anon execution of aggregate-only RPC failed'; end if;
end
$$;
