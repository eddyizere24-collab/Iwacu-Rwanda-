-- Run only in disposable CI DB after the gap-log and gap-alert migrations.
insert into auth.users(id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004')
on conflict do nothing;

insert into public.admin_role_assignments(user_id, role_code, administrative_unit_id)
select '00000000-0000-0000-0000-000000000001'::uuid, 'national_super_admin', id
from public.boundaries where scope_code = 'RW'
union all
select '00000000-0000-0000-0000-000000000002'::uuid, 'district_admin', id
from public.boundaries where scope_code = 'RW-TST-D2'
union all
select '00000000-0000-0000-0000-000000000003'::uuid, 'sector_admin', id
from public.boundaries where scope_code = 'RW-P1-D12-S1'
union all
select '00000000-0000-0000-0000-000000000004'::uuid, 'cell_admin', id
from public.boundaries where scope_code = 'RW-P1-D12-S1-C1';

set role service_role;
select public.record_assistant_gap_v1('leader_missing', 'RW-P1-D12-S1-C1-V1');
select public.record_assistant_gap_v1('leader_missing', 'RW-P1-D12-S1-C1-V1');
select public.record_assistant_gap_v1('leader_missing', 'RW-TST-D2');
select public.record_assistant_gap_v1('place_not_found', null);
reset role;

do $$
declare
  cell_alerts integer;
  national_alerts integer;
  sector_alerts integer;
  kamonyi_alerts integer;
  occurrence_count bigint;
begin
  select count(*) into cell_alerts
  from public.assistant_gap_alerts
  where scope_code = 'RW-P1-D12-S1-C1-V1'
    and recipient_user_id = '00000000-0000-0000-0000-000000000004';
  if cell_alerts <> 1 then raise exception 'nearest cell administration must receive one alert, got %', cell_alerts; end if;

  select count(*) into national_alerts
  from public.assistant_gap_alerts
  where scope_code = 'RW-P1-D12-S1-C1-V1'
    and recipient_user_id = '00000000-0000-0000-0000-000000000001';
  if national_alerts <> 1 then raise exception 'national authority must receive fallback alert when matching district office is missing'; end if;

  select count(*) into sector_alerts
  from public.assistant_gap_alerts
  where scope_code = 'RW-P1-D12-S1-C1-V1'
    and recipient_user_id = '00000000-0000-0000-0000-000000000003';
  if sector_alerts <> 0 then raise exception 'more distant sector account must not receive duplicate local alert'; end if;

  select count(*) into kamonyi_alerts
  from public.assistant_gap_alerts
  where scope_code = 'RW-TST-D2'
    and recipient_user_id = '00000000-0000-0000-0000-000000000002';
  if kamonyi_alerts <> 1 then raise exception 'matching district authority must receive the district alert'; end if;

  select occurrences into occurrence_count
  from public.assistant_gap_alerts
  where scope_code = 'RW-P1-D12-S1-C1-V1'
    and recipient_user_id = '00000000-0000-0000-0000-000000000004';
  if occurrence_count <> 2 then raise exception 'repeated gap must increment the routed aggregate to 2, got %', occurrence_count; end if;

  if has_table_privilege('authenticated', 'public.assistant_gap_alerts', 'SELECT') then
    raise exception 'authenticated users must not query the alert table directly';
  end if;
  if has_function_privilege('anon', 'public.list_assistant_gap_alerts_v1(integer)', 'EXECUTE') then
    raise exception 'anon must not execute the admin alert list';
  end if;
  if not has_function_privilege('authenticated', 'public.list_assistant_gap_alerts_v1(integer)', 'EXECUTE') then
    raise exception 'authenticated authority must execute the alert list';
  end if;
  if has_function_privilege('anon', 'public.update_assistant_gap_alert_v1(uuid,text)', 'EXECUTE') then
    raise exception 'anon must not update admin alerts';
  end if;
end
$$;

-- An authenticated cell authority sees and updates only alerts routed to its own account.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
do $$
declare
  visible_count integer;
  alert_id uuid;
  updated boolean;
begin
  select count(*)::int into visible_count
  from public.list_assistant_gap_alerts_v1(100) a
  where a.scope_code = 'RW-P1-D12-S1-C1-V1';

  select a.alert_id into alert_id
  from public.list_assistant_gap_alerts_v1(100) a
  where a.scope_code = 'RW-P1-D12-S1-C1-V1'
  limit 1;
  if visible_count <> 1 or alert_id is null then
    raise exception 'cell authority must see its own alert only; visible=%', visible_count;
  end if;
  updated := public.update_assistant_gap_alert_v1(alert_id, 'reviewing');
  if not updated then raise exception 'authority could not mark its own alert reviewing'; end if;
end
$$;
reset role;

-- Check the public surface still contains no raw questions or personal identifiers.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assistant_gap_alerts'
      and column_name in ('question','query','phone','name','ip_address','visitor_id')
  ) then raise exception 'alert rows must not store visitor content or identifiers'; end if;
end
$$;
