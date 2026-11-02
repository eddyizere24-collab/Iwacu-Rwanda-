-- 003_contacts_roles_emergency.sql
-- Roles labels, emergency national contacts seed support, extra contact kinds.

-- Extra contact kinds
INSERT INTO contact_kinds (code, label_kiny, label_eng, icon, is_phone, is_public, sort_order) VALUES
  ('telegram', 'Telegram', 'Telegram', 'send', false, true, 40),
  ('facebook', 'Facebook', 'Facebook', 'facebook', false, true, 50),
  ('office', 'Ibiro', 'Office phone', 'phone', true, true, 15)
ON CONFLICT (code) DO NOTHING;

-- Role catalog (for labels)
CREATE TABLE IF NOT EXISTS role_catalog (
  code text PRIMARY KEY,
  label_kiny text NOT NULL,
  label_eng text,
  rank int NOT NULL DEFAULT 100,
  level_hint text
);

INSERT INTO role_catalog (code, label_kiny, label_eng, rank, level_hint) VALUES
  ('executive_secretary', 'Umwanditsi mukuru', 'Executive Secretary', 10, 'sector'),
  ('cell_leader', 'Umukuru w''akagari', 'Cell Leader', 20, 'cell'),
  ('village_leader', 'Umukuru w''umudugudu', 'Village Leader', 30, 'village'),
  ('security', 'Umutekano', 'Security', 40, 'sector'),
  ('health', 'Ubuzima', 'Health', 50, 'sector'),
  ('education', 'Uburezi', 'Education', 60, 'sector')
ON CONFLICT (code) DO NOTHING;

-- National emergency numbers (static, not invented)
CREATE TABLE IF NOT EXISTS emergency_national (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  label_kiny text NOT NULL,
  label_eng text,
  phone text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO emergency_national (code, label_kiny, label_eng, phone, sort_order) VALUES
  ('police', 'Polisi', 'Police', '112', 10),
  ('health', 'Ubuzima / Ambulance', 'Health / Ambulance', '113', 20),
  ('fire', 'Abazimya umuriro', 'Fire brigade', '111', 30),
  ('traffic', 'Umutekano w''umuhanda', 'Traffic', '113', 40)
ON CONFLICT (code) DO UPDATE SET
  label_kiny = EXCLUDED.label_kiny,
  phone = EXCLUDED.phone,
  sort_order = EXCLUDED.sort_order;

-- Helper to keep role labels in sync when role changes
CREATE OR REPLACE FUNCTION leaders_set_role_labels()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT label_kiny, label_eng INTO NEW.role_label_kiny, NEW.role_label_eng
  FROM role_catalog WHERE code = NEW.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaders_role_labels ON leaders;
CREATE TRIGGER trg_leaders_role_labels
  BEFORE INSERT OR UPDATE OF role ON leaders
  FOR EACH ROW EXECUTE FUNCTION leaders_set_role_labels();
