-- M8: bulk leader import (server-only, additive, never overwrites). Fabricated fixtures only.
-- Run after 20261112_01 and the M3 + M4 contract tests.
\set ON_ERROR_STOP on

begin;
set local role anon;
do $a$ begin perform public.m3_expect($q$select public.office_import_leaders_v1('[]'::jsonb)$q$,'42501'); end $a$;
reset role;
set local role authenticated;
do $b$ begin perform public.m3_expect($q$select public.office_import_leaders_v1('[]'::jsonb)$q$,'42501'); end $b$;
reset role;

set local role service_role;
do $s$
declare r jsonb;
begin
  perform public.m3_expect($q$select public.office_import_leaders_v1('{}'::jsonb)$q$,'22023');
  -- Cell A2 and sector A2-less fixtures: cell A2 (RW-01-01-01-02) has no card yet in this transaction.
  r := public.office_import_leaders_v1(jsonb_build_array(
    jsonb_build_object('scope_code','RW-01-01-01-02','display_name','Kamari Test','job_title','Umunyamabanga Nshingwabikorwa w''Akagari','phone','0788000011'),
    jsonb_build_object('scope_code','RW-01-01-01-02','display_name','Other Person','phone','call me'),
    jsonb_build_object('scope_code','RW-NOPE-1','display_name','Nobody Here'),
    jsonb_build_object('scope_code','RW-01-01-01-01-01','display_name','A Village Person'),
    jsonb_build_object('scope_code','RW-01-01-01','display_name','X'),
    jsonb_build_object('scope_code','RW-01-01','display_name','District Test','phone','+250788000013')
  ));
  -- 'call me' is not a phone number: it is dropped, the row itself is still handled.
  if (r->>'inserted')::int <> 2 then raise exception 'two cards inserted expected: %', r; end if;
  if (r->>'skipped_existing')::int <> 1 then raise exception 'second card for the same place must be skipped: %', r; end if;
  if (r->>'unknown_place')::int <> 2 then raise exception 'unknown place and village must be refused: %', r; end if;
  if (r->>'invalid')::int <> 1 then raise exception 'one-letter name must be refused: %', r; end if;
  if (r->>'phone_dropped')::int <> 1 then raise exception 'bad phone text must be dropped, not break the row: %', r; end if;
  if (select verified_at from public.office_unit_leaders where unit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12') is not null then
    raise exception 'imported cards must start unconfirmed';
  end if;
  if (select display_name from public.office_unit_leaders where unit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12') <> 'Kamari Test' then
    raise exception 'first row wins';
  end if;
  -- Running it again changes nothing (never overwrites).
  r := public.office_import_leaders_v1(jsonb_build_array(jsonb_build_object('scope_code','RW-01-01-01-02','display_name','Replacement Name')));
  if (r->>'inserted')::int <> 0 or (r->>'skipped_existing')::int <> 1 then raise exception 'must not overwrite: %', r; end if;
  if (select display_name from public.office_unit_leaders where unit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12') <> 'Kamari Test' then raise exception 'name overwritten'; end if;
end $s$;
reset role;
rollback;

select 'PASS: leader import — server-only, never overwrites, starts unconfirmed, bad rows skipped and counted' as result;
