# Execution log (stage1)

Chronological notes for IWACU RWANDA stage1 work. Full historical detail lives in the stage1-v3 release bundle; this file tracks live repo state.

## 2026-10 — stage1-clean on Vercel

- Migrated to App Router under `src/`.
- Fixed build blockers: ErrorDisplay props, Supabase cookie typing, middleware scope, SSG without env.
- First **READY** deployment on branch `stage1-clean`.
- Production alias `https://iwacu-rwanda.vercel.app` pointed at green deployment.
- `/api/health` returns JSON (`degraded` until env + DB).
- Unit tests and docs pushed from `iwacu-rwanda-stage1-v3.zip`.

## Owner ops still required

1. Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional Upstash, `NEXT_PUBLIC_APP_URL`.
2. Supabase: enable `postgis` + `ltree`, run `sql/apply_all.sql`.
3. Ingest verified boundaries; register leaders via admin only.

## Rules

- No invented leaders or phone numbers.
- No force-push to `main`.
- Promote only green builds.
