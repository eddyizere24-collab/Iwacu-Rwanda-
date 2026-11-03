-- 002_leaders_workflow.sql
-- Leader verification workflow, DB-enforced optimistic versioning, audit-actor attribution.
-- NOT YET EXECUTED against PostgreSQL (see docs/RELEASE_GATES.md). Run sql/tests/002_leaders_workflow.test.sql
-- on a disposable database before applying anywhere real.
BEGIN;

ALTER TABLE public.leaders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.leaders ADD COLUMN IF NOT EXISTS review_note TEXT;

-- 'rejected' = submission reviewed and refused (kept for history, never public).
ALTER TABLE public.leaders DROP CONSTRAINT IF EXISTS leaders_status_check;
ALTER TABLE public.leaders ADD CONSTRAINT leaders_status_check
  CHECK (status IN ('pending','verified','rejected','archived'));

-- Uniqueness only applies to live records (not archived / rejected).
DROP INDEX IF EXISTS public.uq_leaders_current_single_role;
DROP INDEX IF EXISTS public.uq_leaders_current_person;
CREATE UNIQUE INDEX uq_leaders_current_single_role ON public.leaders (scope_code, role)
  WHERE valid_to IS NULL AND status IN ('pending','verified')
    AND role IN ('Village Leader','Cell Executive Secretary','Sector Executive Secretary','Mayor','District Executive Secretary');
CREATE UNIQUE INDEX uq_leaders_current_person ON public.leaders (scope_code, role, lower(first_name), lower(last_name))
  WHERE valid_to IS NULL AND status IN ('pending','verified');
-- A phone number identifies one live record (names alone never identify a person).
CREATE UNIQUE INDEX IF NOT EXISTS uq_leaders_current_phone ON public.leaders (phone_number)
  WHERE phone_number IS NOT NULL AND valid_to IS NULL AND status IN ('pending','verified');

-- Single guard trigger: version, immutability, status machine, re-verification on edit, no hard delete.
CREATE OR REPLACE FUNCTION public.leaders_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'leaders rows are never deleted; set status = archived' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
    IF NEW.status = 'verified' AND (NEW.verified_by IS NULL OR NEW.verified_at IS NULL) THEN
      RAISE EXCEPTION 'verified leaders require verified_by and verified_at' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  NEW.version    := OLD.version + 1;
  NEW.id         := OLD.id;
  NEW.created_at := OLD.created_at;
  NEW.created_by := OLD.created_by;
  IF NEW.scope_code IS DISTINCT FROM OLD.scope_code THEN
    RAISE EXCEPTION 'scope_code is immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'archived' AND NEW.status <> 'archived' THEN
    RAISE EXCEPTION 'archived leaders cannot be reopened' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'verified' AND OLD.status NOT IN ('verified','pending') THEN
    RAISE EXCEPTION 'only pending leaders can be verified' USING ERRCODE = '23514';
  END IF;

  -- Editing identity/contact fields of a verified record sends it back to review.
  IF OLD.status = 'verified' AND NEW.status = 'verified' AND (
       NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name
    OR NEW.role IS DISTINCT FROM OLD.role OR NEW.phone_number IS DISTINCT FROM OLD.phone_number
    OR NEW.email IS DISTINCT FROM OLD.email OR NEW.photo_url IS DISTINCT FROM OLD.photo_url) THEN
    NEW.status := 'pending';
  END IF;

  IF NEW.status = 'verified' THEN
    IF NEW.verified_by IS NULL OR NEW.verified_at IS NULL THEN
      RAISE EXCEPTION 'verified leaders require verified_by and verified_at' USING ERRCODE = '23514';
    END IF;
  ELSE
    NEW.verified_by := NULL; NEW.verified_at := NULL;
  END IF;

  IF NEW.status = 'archived' AND NEW.valid_to IS NULL THEN NEW.valid_to := now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_leaders_guard ON public.leaders;
CREATE TRIGGER trg_leaders_guard BEFORE INSERT OR UPDATE OR DELETE ON public.leaders
  FOR EACH ROW EXECUTE FUNCTION public.leaders_guard();

-- Audit actor: session user, else the row's updated_by/created_by (service-role writes), else app.actor_id.
CREATE OR REPLACE FUNCTION public.leaders_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_actor UUID := COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by, NEW.created_by,
                           NULLIF(current_setting('app.actor_id', true), '')::uuid);
  v_old JSONB; v_new JSONB;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN v_old := to_jsonb(OLD) - 'phone_number'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN v_new := to_jsonb(NEW) - 'phone_number'; END IF;
  IF TG_OP = 'UPDATE' THEN
    v_new := v_new || jsonb_build_object('phone_changed', OLD.phone_number IS DISTINCT FROM NEW.phone_number);
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (v_actor, TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END $$;

-- Extra columns visible to scoped admins (phone_number stays ungranted).
GRANT SELECT (created_by, review_note) ON public.leaders TO authenticated;

COMMIT;
