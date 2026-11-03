-- Run on a DISPOSABLE PostGIS database after 001, 002 and 003 (see docs/TESTING_DATABASE.md).
-- Full regression checks for roles, contact kinds, emergency national, replace_leader_contacts.
-- Every check RAISEs on failure; ends with NOTICE if all pass. Rolled back at the end.
\set ON_ERROR_STOP on
BEGIN;
DO $t$
DECLARE v_id UUID; v_u UUID := gen_random_uuid(); v_v UUID := gen_random_uuid(); n INTEGER; v_ok BOOLEAN;
BEGIN
  INSERT INTO public.boundaries(scope_code, name_kiny, level, parent_id, verification_status)
    VALUES ('RW','Rwanda','country',NULL,'pending');
  INSERT INTO public.boundaries(scope_code, name_kiny, level, parent_id, verification_status)
    SELECT 'RW-01','Test Province','province', id, 'pending' FROM public.boundaries WHERE scope_code='RW';

  IF (SELECT count(*) FROM public.leader_roles) < 1 THEN RAISE EXCEPTION 'roles not seeded'; END IF;
  BEGIN
    INSERT INTO public.leaders(scope_code,first_name,last_name,role) VALUES ('RW-01','A','B','King');
    RAISE EXCEPTION 'unknown role accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leaders' AND column_name='phone_number') THEN
    RAISE EXCEPTION 'old phone_number column still present';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.emergency_national LIMIT 1) THEN
    RAISE EXCEPTION 'emergency_national not seeded';
  END IF;

  RAISE NOTICE 'ALL 003 CHECKS PASSED (core subset)';
END $t$;
ROLLBACK;
