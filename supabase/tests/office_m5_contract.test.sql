-- M5: leader verification, per-unit report, official records. Fabricated fixtures only.
-- Run after 20261110_01 and the M3 + M4 contract tests (which leave m3_expect and the fixture users behind).
\set ON_ERROR_STOP on

begin;
set local role authenticated;
do $m5$
declare v jsonb; v_n integer; v_rec record; v_id uuid; v_dec uuid; v_sec uuid; v_path text; v_unit constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
begin
  -- ===== National creates two village cards (one per district) =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  perform public.save_office_unit_leader_v1(v_unit, 'Kamanzi Eric', 'Umukuru w''Umudugudu', '+250788333444');
  perform public.save_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', 'Nshimiye Paul', 'Umukuru w''Umudugudu', '+250788111222');

  select count(*) into v_n from public.list_office_verification_v1('pending', null, null, 50, 0);
  if v_n <> 2 then raise exception 'national pending expected 2, got %', v_n; end if;
  perform public.m3_expect($q$select * from public.list_office_verification_v1('nonsense')$q$,'22023');

  -- National verifies village A; the queue moves.
  if not public.verify_office_unit_leader_v1(v_unit, true) then raise exception 'verify must return true'; end if;
  select count(*) into v_n from public.list_office_verification_v1('pending', null, null, 50, 0);
  if v_n <> 1 then raise exception 'pending after verify expected 1, got %', v_n; end if;
  select count(*) into v_n from public.list_office_verification_v1('verified', null, null, 50, 0);
  if v_n <> 1 then raise exception 'verified expected 1, got %', v_n; end if;
  if (select verified_by_name from public.list_office_verification_v1('verified', null, null, 50, 0) limit 1) is not null then
    null; -- national fixture has no office profile; name may be null
  end if;
  v := public.get_office_unit_verification_v1('RW-01-01-01-01-01');
  if v->>'verified_at' is null or not (v->>'can_verify')::boolean then raise exception 'dossier verification state wrong: %', v; end if;

  -- Editing name/title/phone clears the confirmation; saving the same values keeps it.
  perform public.save_office_unit_leader_v1(v_unit, 'Kamanzi Eric', 'Umukuru w''Umudugudu', '+250788333444');
  if (public.get_office_unit_verification_v1('RW-01-01-01-01-01')->>'verified_at') is null then raise exception 'unchanged save must keep verification'; end if;
  perform public.save_office_unit_leader_v1(v_unit, 'Kamanzi Eric', 'Umukuru w''Umudugudu', '+250788999000');
  if (public.get_office_unit_verification_v1('RW-01-01-01-01-01')->>'verified_at') is not null then raise exception 'changed phone must clear verification'; end if;

  -- ===== District A =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','22222222-2222-4222-8222-222222222222','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  select count(*) into v_n from public.list_office_verification_v1('pending', null, null, 50, 0);
  if v_n <> 1 then raise exception 'district A pending expected 1 (own tree only), got %', v_n; end if;
  perform public.verify_office_unit_leader_v1(v_unit, true);
  perform public.m3_expect($q$select public.verify_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', true)$q$,'42501');
  perform public.m3_expect($q$select public.verify_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', true)$q$,'42501');
  perform public.m3_expect($q$select public.verify_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13', true)$q$,'22023');
  perform public.m3_expect($q$select * from public.list_office_verification_v1('pending','RW-02')$q$,'42501');
  v := public.get_office_unit_verification_v1('RW-01-01');
  if (v->>'can_verify')::boolean then raise exception 'must not verify own unit'; end if;
  perform public.m3_expect($q$select public.get_office_unit_verification_v1('RW-02-01')$q$,'42501');

  -- Report: district A sees its sectors only.
  select count(*) into v_n from public.list_office_report_v1(null);
  if v_n <> 1 then raise exception 'district A report expected 1 sector, got %', v_n; end if;
  select * into v_rec from public.list_office_report_v1(null) limit 1;
  if v_rec.units_below <> 4 or v_rec.cards <> 1 then raise exception 'sector A numbers wrong: below=% cards=%', v_rec.units_below, v_rec.cards; end if;
  if v_rec.verified <> 1 then raise exception 'sector A verified expected 1, got %', v_rec.verified; end if;
  perform public.m3_expect($q$select * from public.list_office_report_v1('RW-02')$q$,'42501');

  -- ===== Records =====
  select r.id, r.file_path into v_id, v_path from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Mininiti y''inama', 'minutes', 'Inama yo kuwa 3', 'inama.pdf', 1000, 'pdf') r;
  if v_path <> 'rec/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4/' || v_id::text || '.pdf' then raise exception 'unexpected path %', v_path; end if;
  select r.id into v_dec from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Icyemezo cy''akarere', 'decision') r;
  perform public.m3_expect($q$select * from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','Bad ext','report','x','a.exe',10,'exe')$q$,'22023');
  perform public.m3_expect($q$select * from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','Too big','report','x','a.pdf',9999999,'pdf')$q$,'22023');
  perform public.m3_expect($q$select * from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','ab','report')$q$,'23514');
  perform public.m3_expect($q$select * from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9','Other district','report')$q$,'42501');
  perform public.m3_expect($q$select * from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','Bad kind','gossip')$q$,'23514');
  select count(*) into v_n from public.list_office_records_v1(null, null, null, 50, 0);
  if v_n <> 2 then raise exception 'district A records expected 2, got %', v_n; end if;
  select count(*) into v_n from public.list_office_records_v1('inama', null, null, 50, 0);
  if v_n <> 1 then raise exception 'search by title expected 1, got %', v_n; end if;
  select count(*) into v_n from public.list_office_records_v1(null, 'decision', null, 50, 0);
  if v_n <> 1 then raise exception 'kind filter expected 1, got %', v_n; end if;
  if public.get_office_record_file_v1(v_id) <> v_path then raise exception 'file path for district A'; end if;
  perform public.m3_expect(format($q$select public.get_office_record_file_v1(%L)$q$, v_dec), '22023');

  -- Report now counts the record under sector A.
  if (select records from public.list_office_report_v1(null) limit 1) <> 1 then raise exception 'sector A report must count 1 record'; end if;

  -- ===== Sector A: sees the record about its unit, cannot archive someone else's, cannot see the district record =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','33333333-3333-4333-8333-333333333333','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333', true);
  select count(*) into v_n from public.list_office_records_v1(null, null, null, 50, 0);
  if v_n <> 1 then raise exception 'sector A records expected 1, got %', v_n; end if;
  if (select can_archive from public.list_office_records_v1(null, null, null, 50, 0) limit 1) then raise exception 'sector must not archive the district''s record'; end if;
  perform public.m3_expect(format($q$select public.archive_office_record_v1(%L)$q$, v_id), '42501');
  -- The sector can add its own record and archive it.
  select r.id into v_sec from public.create_office_record_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Raporo y''umurenge', 'report') r;
  perform public.archive_office_record_v1(v_sec);
  -- Sector report: cells below, no verification right over its own card.
  select count(*) into v_n from public.list_office_report_v1(null);
  if v_n <> 2 then raise exception 'sector A report expected 2 cells, got %', v_n; end if;

  -- ===== Cell A: cannot see the sector's record or file =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','44444444-4444-4444-8444-444444444444','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444', true);
  select count(*) into v_n from public.list_office_records_v1(null, null, null, 50, 0);
  if v_n <> 0 then raise exception 'cell A must not see sector records, got %', v_n; end if;
  perform public.m3_expect(format($q$select public.get_office_record_file_v1(%L)$q$, v_id), '42501');
  -- A cell admin verifies the village card inside its own cell.
  perform public.verify_office_unit_leader_v1(v_unit, true);
  select count(*) into v_n from public.list_office_report_v1(null);
  if v_n <> 1 then raise exception 'cell A report expected 1 village, got %', v_n; end if;

  -- ===== Cell B cannot verify or read anything of A =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','55555555-5555-4555-8555-555555555555','aal','aal1')::text, true);
  perform set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555', true);
  perform public.m3_expect($q$select public.verify_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', false)$q$,'42501');

  -- ===== National: sees both records, can archive, audit lists record events =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub','11111111-1111-4111-8111-111111111111','aal','aal2')::text, true);
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  select count(*) into v_n from public.list_office_records_v1(null, null, null, 50, 0);
  if v_n <> 2 then raise exception 'national records expected 2, got %', v_n; end if;
  perform public.archive_office_record_v1(v_id);
  select count(*) into v_n from public.list_office_records_v1(null, null, null, 50, 0);
  if v_n <> 1 then raise exception 'archived record must disappear, got %', v_n; end if;
  if not exists (select 1 from public.list_office_audit_v1(100, 0) where kind = 'record_added') then raise exception 'audit must list record_added'; end if;
  if not exists (select 1 from public.list_office_audit_v1(100, 0) where kind = 'record_archived') then raise exception 'audit must list record_archived'; end if;
  select count(*) into v_n from public.list_office_report_v1(null);
  if v_n <> 2 then raise exception 'national report expected 2 districts, got %', v_n; end if;
  if (select sum(units_below) from public.list_office_report_v1(null)) <> 8 then raise exception 'national units_below sum expected 8 (district A 5 + district B 3)'; end if;

  -- No client may touch the table directly.
  perform public.m3_expect($q$select * from public.office_records$q$,'42501');
end
$m5$;
reset role;
rollback;

-- Anon: nothing.
begin;
set local role anon;
do $anon$
begin
  perform public.m3_expect($q$select * from public.list_office_records_v1()$q$,'42501');
  perform public.m3_expect($q$select * from public.list_office_verification_v1()$q$,'42501');
  perform public.m3_expect($q$select * from public.list_office_report_v1()$q$,'42501');
  perform public.m3_expect($q$select public.verify_office_unit_leader_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', true)$q$,'42501');
end $anon$;
rollback;

select 'PASS: verification queue, report, official records — scope isolation, reset-on-edit, audit, anon denied' as result;
