-- M3: office accounts + official messages. Run in a disposable PostgreSQL after the V2 foundation + L1 migrations
-- and sql/migrations/20261107_01_office_accounts_and_messages.sql. Fabricated fixtures only.
\set ON_ERROR_STOP on

insert into auth.users(id,email) values
 ('a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6','new-district-b@iwacu.invalid'),
 ('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','new-sector-a@iwacu.invalid');

-- Authority fixtures (idempotent: earlier contract tests may already have created them).
insert into public.admin_role_assignments(user_id,role_code,administrative_unit_id,assignment_status,valid_from,granted_by,grant_reason)
select v.u::uuid, v.r, v.b::uuid, 'active', now(), '11111111-1111-4111-8111-111111111111', 'isolated test fixture'
from (values
 ('22222222-2222-4222-8222-222222222222','district_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),
 ('33333333-3333-4333-8333-333333333333','sector_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'),
 ('44444444-4444-4444-8444-444444444444','cell_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'),
 ('55555555-5555-4555-8555-555555555555','cell_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10')
) v(u,r,b)
where not exists (select 1 from public.admin_role_assignments a
  where a.user_id=v.u::uuid and a.role_code=v.r and a.administrative_unit_id=v.b::uuid and a.assignment_status='active');

create or replace function public.m3_expect(p_statement text,p_expected text)
returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_actual text;
begin
  begin execute p_statement;
  exception when others then
    get stacked diagnostics v_actual = returned_sqlstate;
    if v_actual = p_expected then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE %, statement unexpectedly succeeded',p_expected;
end $$;
grant execute on function public.m3_expect(text,text) to authenticated;

begin;
set local role authenticated;
do $m3$
declare v_n integer; v_cnt integer; v_msg uuid;
begin
  -- National (AAL2) creates the district B account.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  perform public.create_office_account_v1('a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6','akarere.b','Mukamana Alice','Meya','+250788000001','district_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8');
  -- National cannot make another national from this door.
  perform public.m3_expect($q$select public.create_office_account_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','x.one','Test Person',null,null,'national_super_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')$q$,'22023');
  -- Login names are unique.
  perform public.m3_expect($q$select public.create_office_account_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','akarere.b','Test Person',null,null,'sector_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4')$q$,'23505');

  -- District A admin: may create a sector admin in its own district, not elsewhere, not another district admin.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  perform public.m3_expect($q$select public.create_office_account_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','umurenge.a','Test Person',null,null,'sector_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9')$q$,'42501');
  perform public.m3_expect($q$select public.create_office_account_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','umurenge.a','Test Person',null,null,'district_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3')$q$,'42501');
  perform public.create_office_account_v1('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','umurenge.a','Uwase Jeanne','Umunyamabanga Nshingwabikorwa','+250788000002','sector_admin','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4');

  -- Contacts: below = sector A (+ new one) and cells under it; above = national. Never district B or cell B.
  select count(*) into v_n from public.list_office_contacts_v1() where relation='below';
  if v_n <> 3 then raise exception 'district A should see 3 accounts below, saw %', v_n; end if;
  select count(*) into v_n from public.list_office_contacts_v1() where relation='above';
  if v_n <> 1 then raise exception 'district A should see 1 account above, saw %', v_n; end if;
  if exists (select 1 from public.list_office_contacts_v1() where user_id in ('55555555-5555-4555-8555-555555555555','a6a6a6a6-a6a6-4a6a-8a6a-a6a6a6a6a6a6')) then
    raise exception 'district A must not see other districts';
  end if;

  -- Broadcast to everyone below: one copy each.
  v_cnt := public.send_office_message_v1('Inama y''ejo','Turahurira ejo saa tatu.','below',null);
  if v_cnt <> 3 then raise exception 'broadcast should reach 3, reached %', v_cnt; end if;
  -- Person-to-person outside reach is refused; mixed list is refused as a whole.
  perform public.m3_expect($q$select public.send_office_message_v1('x','y','person',array['55555555-5555-4555-8555-555555555555']::uuid[])$q$,'22023');
  perform public.m3_expect($q$select public.send_office_message_v1('x','y','person',array['33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555']::uuid[])$q$,'42501');
  -- Empty message rejected by constraint.
  perform public.m3_expect($q$select public.send_office_message_v1('   ','y','below',null)$q$,'23514');
  -- Upward message to national.
  if public.send_office_message_v1('Raporo','Raporo y''icyumweru.','above',null) <> 1 then raise exception 'above should reach exactly national'; end if;

  -- Sector A sees exactly its own copy, unread, with the sender's name; marks it read.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','33333333-3333-4333-8333-333333333333','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333', true);
  select count(*) into v_n from public.list_office_inbox_v1(50);
  if v_n <> 1 then raise exception 'sector A inbox should have 1 message, has %', v_n; end if;
  select message_id into v_msg from public.list_office_inbox_v1(50) where read_at is null limit 1;
  if v_msg is null then raise exception 'message should be unread'; end if;
  perform public.mark_office_message_read_v1(v_msg);
  if exists (select 1 from public.list_office_inbox_v1(50) where read_at is null) then raise exception 'mark read failed'; end if;

  -- Cell B and district B receive nothing.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','55555555-5555-4555-8555-555555555555','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555', true);
  select count(*) into v_n from public.list_office_inbox_v1(50);
  if v_n <> 0 then raise exception 'cell B must not receive district A messages'; end if;

  -- Sender sees delivery counts.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  select recipients into v_n from public.list_office_sent_v1(50) where audience='below';
  if v_n <> 3 then raise exception 'sent list should show 3 recipients'; end if;
  select read_count into v_n from public.list_office_sent_v1(50) where audience='below';
  if v_n <> 1 then raise exception 'sent list should show 1 read'; end if;

  -- The new account must change its password on first use, once.
  perform set_config('request.jwt.claims', jsonb_build_object('sub','a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7', true);
  if not (select must_change_password from public.get_office_me_v1()) then raise exception 'new account must be flagged'; end if;
  perform public.complete_office_password_change_v1();
  if (select must_change_password from public.get_office_me_v1()) then raise exception 'flag should clear'; end if;

  -- Tables are not readable or writable directly.
  perform public.m3_expect('select count(*) from public.office_messages','42501');
  perform public.m3_expect('select count(*) from public.office_profiles','42501');
  perform public.m3_expect($q$insert into public.office_message_recipients(message_id,recipient_id) values (gen_random_uuid(),'33333333-3333-4333-8333-333333333333')$q$,'42501');
end
$m3$;
rollback;

-- Anonymous callers cannot run any of the functions.
do $anon$
begin
  if has_function_privilege('anon','public.send_office_message_v1(text,text,text,uuid[])','execute')
     or has_function_privilege('anon','public.create_office_account_v1(uuid,text,text,text,text,text,uuid)','execute')
     or has_function_privilege('anon','public.list_office_inbox_v1(integer)','execute') then
    raise exception 'anon must not execute office functions';
  end if;
end $anon$;

select 'PASS: office accounts hierarchy, reach limits, per-recipient messages, read receipts, no direct table access' as result;
