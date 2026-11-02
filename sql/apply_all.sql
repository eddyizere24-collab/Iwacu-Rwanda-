-- apply_all.sql
-- Run this entire file in the Supabase SQL editor AFTER enabling extensions:
--   CREATE EXTENSION IF NOT EXISTS postgis;
--   CREATE EXTENSION IF NOT EXISTS ltree;
-- (Or run the two lines above first, then this file.)

\i sql/migrations/001_core_schema.sql
\i sql/migrations/002_leaders_workflow.sql
\i sql/migrations/003_contacts_roles_emergency.sql

-- Note: Supabase SQL editor does not support \i.
-- Prefer pasting the three migration files in order (001, 002, 003)
-- or concatenate them manually.

-- === BEGIN 001_core_schema (inline for convenience) ===
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE IF NOT EXISTS admin_nodes (
  code text PRIMARY KEY,
  name_kiny text NOT NULL,
  name_eng text,
  level text NOT NULL CHECK (level IN ('province','district','sector','cell','village')),
  path ltree NOT NULL,
  parent_code text REFERENCES admin_nodes(code),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_nodes_path_idx ON admin_nodes USING GIST (path);
CREATE INDEX IF NOT EXISTS admin_nodes_parent_idx ON admin_nodes(parent_code);
CREATE INDEX IF NOT EXISTS admin_nodes_level_idx ON admin_nodes(level);

CREATE TABLE IF NOT EXISTS boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_code text NOT NULL REFERENCES admin_nodes(code) ON DELETE CASCADE,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boundaries_geom_idx ON boundaries USING GIST (geom);
CREATE UNIQUE INDEX IF NOT EXISTS boundaries_node_code_uidx ON boundaries(node_code);

CREATE TABLE IF NOT EXISTS contact_kinds (
  code text PRIMARY KEY,
  label_kiny text NOT NULL,
  label_eng text,
  icon text,
  value_pattern text,
  is_phone boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100
);

INSERT INTO contact_kinds (code, label_kiny, label_eng, icon, is_phone, is_public, sort_order) VALUES
  ('phone', 'Telefoni', 'Phone', 'phone', true, true, 10),
  ('whatsapp', 'WhatsApp', 'WhatsApp', 'message-circle', true, true, 20),
  ('email', 'Imeyili', 'Email', 'mail', false, true, 30)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL,
  role_label_kiny text,
  role_label_eng text,
  scope_code text NOT NULL REFERENCES admin_nodes(code),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft','pending','verified','rejected','archived')),
  owner_id uuid REFERENCES auth.users(id),
  phone_raw_masked text,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaders_scope_idx ON leaders(scope_code);
CREATE INDEX IF NOT EXISTS leaders_status_idx ON leaders(status);
CREATE INDEX IF NOT EXISTS leaders_owner_idx ON leaders(owner_id);

CREATE OR REPLACE VIEW leaders_public_view AS
SELECT id, full_name, role, COALESCE(role_label_kiny, role) AS role_label_kiny,
  role_label_eng, scope_code, status, phone_raw_masked, contacts, updated_at
FROM leaders WHERE status = 'verified';

CREATE OR REPLACE FUNCTION locate_sector(p_lat double precision, p_lng double precision)
RETURNS TABLE (
  code text, name_kiny text, name_eng text, level text,
  cell_code text, cell_name_kiny text, cell_name_eng text
)
LANGUAGE sql STABLE AS $$
  SELECT s.code, s.name_kiny, s.name_eng, s.level,
    c.code, c.name_kiny, c.name_eng
  FROM boundaries b
  JOIN admin_nodes s ON s.code = b.node_code AND s.level = 'sector'
  LEFT JOIN admin_nodes c ON c.parent_code = s.code AND c.level = 'cell'
  WHERE ST_Contains(b.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  ORDER BY c.code NULLS LAST LIMIT 1;
$$;

ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leaders_public_read ON leaders;
CREATE POLICY leaders_public_read ON leaders FOR SELECT USING (status = 'verified');
DROP POLICY IF EXISTS leaders_owner_all ON leaders;
CREATE POLICY leaders_owner_all ON leaders FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- === 003 extras ===
INSERT INTO contact_kinds (code, label_kiny, label_eng, icon, is_phone, is_public, sort_order) VALUES
  ('telegram', 'Telegram', 'Telegram', 'send', false, true, 40),
  ('facebook', 'Facebook', 'Facebook', 'facebook', false, true, 50),
  ('office', 'Ibiro', 'Office phone', 'phone', true, true, 15)
ON CONFLICT (code) DO NOTHING;

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
  ('fire', 'Abazimya umuriro', 'Fire brigade', '111', 30)
ON CONFLICT (code) DO UPDATE SET label_kiny = EXCLUDED.label_kiny, phone = EXCLUDED.phone;
