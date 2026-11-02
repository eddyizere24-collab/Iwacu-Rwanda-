# Testing the database

## Local / throwaway Supabase

1. Create a branch or free project.
2. Enable extensions:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;
```

3. Paste and run `sql/apply_all.sql` in the SQL editor.
4. Optional: run files under `sql/tests/` for regression checks.

## What to verify

- Tables: `admin_nodes`, `boundaries`, `leaders`, `contact_kinds`, `role_catalog`, `emergency_national`.
- RPC: `locate_sector(p_lat, p_lng)` returns a sector for a known Kigali point.
- RLS: anon can read verified leaders only; owners manage their rows.

## App checks after env is set

```bash
curl -s https://YOUR_APP/api/health
curl -s -X POST https://YOUR_APP/api/locate \
  -H 'Content-Type: application/json' \
  -d '{"lat":-1.9536,"lng":30.0605,"accuracy":20}'
```

Expect JSON (not HTML). Health should move from `degraded` to `ok` when env + DB are ready.
