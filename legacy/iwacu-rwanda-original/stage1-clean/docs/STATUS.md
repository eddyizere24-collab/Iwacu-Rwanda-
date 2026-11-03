# Project status (stage1 / Claude v3)

## Live

- App: https://iwacu-rwanda.vercel.app
- Branch: `stage1-clean`
- Build: Vercel READY
- Production serves stage1 App Router (home, health JSON, admin login shell)

## Claude stage1-v3 parity

| Area | Status |
|------|--------|
| App shell (`src/app`, components, public JSON) | Present |
| Admin login page | Present |
| Tests + docs tree | Present (some docs shorter than zip) |
| SQL migrations full Claude text | **Partial** — restore full files from zip if needed |
| PNG icons | Missing (upload from zip) |
| Supabase env + apply SQL | **Not done** (needs project keys) |

## To finish Claude zip 100% on GitHub

1. Unzip `iwacu-rwanda-stage1-v3.zip` locally
2. GitHub → `Iwacu-rwanda-` → branch `stage1-clean` → **Add file → Upload files**
3. Upload folders: `sql/`, `src/`, `tests/`, `docs/`, `public/icons/`
4. Commit → wait for Vercel READY

## Next after keys

1. Vercel env: Supabase URL + anon + service_role
2. Supabase: postgis + ltree + paste `sql/apply_all.sql`
3. Create admin user in Auth; open `/admin/login`
