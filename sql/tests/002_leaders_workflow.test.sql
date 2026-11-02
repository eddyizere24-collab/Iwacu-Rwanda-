-- Run on a DISPOSABLE PostGIS database after 001 and 002 (see docs/TESTING_DATABASE.md).
-- Requires a stub auth schema when not on Supabase: sql/tests/00_supabase_stub.sql
-- Every check RAISEs on failure; the script ends with a NOTICE only if all pass. Wrapped in a rolled-back transaction.
\set ON_ERROR_STOP on
BEGIN;
DO $t$
DECLARE v_id UUID; v_ver INT; v_u UUID := gen_random_uuid(); v_v UUID := gen_random_uuid(); v_ok BOOLEAN;
BEGIN
  INSERT INTO public.boundaries(scope_code, name_kiny, level, parent_id, verification_status)
    VALUES ('RW','Rwanda','country',NULL,'pending');
  INSERT INTO public.boundaries(scope_code, name_kiny, level, parent_id, verification_status)
    SELECT 'RW-01','Test Province','province', id, 'pending' FROM public.boundaries WHERE scope_code='RW';

  INSERT INTO public.leaders(scope_code,first_name,last_name,role,status,version,created_by,updated_by)
    VALUES ('RW-01','A','B','Other','pending',99,v_u,v_u) RETURNING id, version INTO v_id, v_ver;
  IF v_ver <> 1 THEN RAISE EXCEPTION 'version not forced to 1 (%)', v_ver; END IF;
  BEGIN
    INSERT INTO public.leaders(scope_code,first_name,last_name,role,status) VALUES ('RW-01','C','D','Other','verified');
    RAISE EXCEPTION 'verified insert without verifier was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  UPDATE public.leaders SET first_name='A2', version=500, updated_by=v_u WHERE id=v_id RETURNING version INTO v_ver;
  IF v_ver <> 2 THEN RAISE EXCEPTION 'version not bumped by trigger (%)', v_ver; END IF;

  UPDATE public.leaders SET status='verified', verified_by=v_v, verified_at=now(), updated_by=v_v WHERE id=v_id;
  UPDATE public.leaders SET last_name='B2', updated_by=v_v WHERE id=v_id;
  IF (SELECT status FROM public.leaders WHERE id=v_id) <> 'pending' OR (SELECT verified_by FROM public.leaders WHERE id=v_id) IS NOT NULL THEN
    RAISE EXCEPTION 'edit of verified record did not return it to pending'; END IF;

  BEGIN UPDATE public.leaders SET scope_code='RW' WHERE id=v_id; RAISE EXCEPTION 'scope change accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN INSERT INTO public.leaders(scope_code,first_name,last_name,role) VALUES ('RW-01','a2','b2','Other');
    RAISE EXCEPTION 'duplicate person accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  INSERT INTO public.leaders(scope_code,first_name,last_name,role) VALUES ('RW-01','M','One','Mayor');
  BEGIN INSERT INTO public.leaders(scope_code,first_name,last_name,role) VALUES ('RW-01','M','Two','Mayor');
    RAISE EXCEPTION 'second Mayor accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;

  UPDATE public.leaders SET status='archived' WHERE id=v_id;
  IF (SELECT valid_to FROM public.leaders WHERE id=v_id) IS NULL THEN RAISE EXCEPTION 'valid_to not set on archive'; END IF;
  BEGIN UPDATE public.leaders SET status='pending' WHERE id=v_id; RAISE EXCEPTION 'archived reopened';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN DELETE FROM public.leaders WHERE id=v_id; RAISE EXCEPTION 'delete accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  UPDATE public.leaders SET phone_number='+250788123456' WHERE scope_code='RW-01' AND role='Mayor';
  IF EXISTS (SELECT 1 FROM public.audit_logs WHERE new_data::text LIKE '%788123456%' OR old_data::text LIKE '%788123456%') THEN
    RAISE EXCEPTION 'phone number leaked into audit_logs'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE actor_id = v_v) THEN RAISE EXCEPTION 'audit actor not recorded'; END IF;
  BEGIN UPDATE public.audit_logs SET action='x'; RAISE EXCEPTION 'audit update accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  FOR v_ok IN SELECT has_table_privilege('authenticated', t, p)
    FROM unnest(ARRAY['public.leaders','public.admin_profiles','public.audit_logs']) t, unnest(ARRAY['INSERT','UPDATE','DELETE']) p LOOP
    IF v_ok THEN RAISE EXCEPTION 'authenticated has a write privilege it must not have'; END IF;
  END LOOP;
  IF has_column_privilege('authenticated','public.leaders','phone_number','SELECT') THEN RAISE EXCEPTION 'phone_number selectable by authenticated'; END IF;

  RAISE NOTICE 'ALL 002 CHECKS PASSED';
END $t$;
ROLLBACK;
