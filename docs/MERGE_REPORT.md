# Merge report (stage1-v3 → stage1-clean)

## Goal

Align GitHub branch `stage1-clean` with the verified stage1-v3 source tree so Vercel builds READY and production can serve that code.

## What landed

- App Router `src/` pages, API routes, components, hooks, lib
- SQL migrations + `sql/apply_all.sql` + sql tests stubs
- Unit/security/gps tests + Playwright public shell test
- Docs: STATUS, ROADMAP, RELEASE_GATES, DATA_INGESTION, TESTING_DATABASE, NATIONWIDE_ROLLOUT, EXECUTION_LOG, MERGE_REPORT
- PWA: manifest, sw.js, emergency-national.json

## Deliberate divergences from raw zip

- Middleware: only gates `/admin/dashboard/*` and no-ops if Supabase env is missing (prevents MIDDLEWARE_INVOCATION_FAILED on production without env).
- Some admin/dashboard pages simplified earlier to clear TypeScript build errors; behaviour preserved for public paths.

## Still external to the repo

- Supabase project + extensions + applying SQL
- Vercel environment variables (secrets never committed)
- Optional PNG icons under `public/icons/` (binary; can be re-uploaded from the zip)

## Verification

- Vercel state READY on `stage1-clean`
- `https://iwacu-rwanda.vercel.app` → 200 HTML
- `/api/health` → JSON
