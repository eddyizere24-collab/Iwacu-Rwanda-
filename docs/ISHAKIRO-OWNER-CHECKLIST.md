# Ishakiro — Owner checklist (steps this branch cannot complete alone)

Branch: `feature/ishakiro-part-1-continuation-20261109`

This document lists **only** the steps that require the repository owner, secrets, a disposable database, hardware, or an explicit Production decision. Code on the feature branch is prepared; these steps are intentionally **not** executed from the agent session.

## 1. Live boundary geometry (area / distance / adjacency)

A read-only RPC migration is prepared at `sql/migrations/20261110_01_assistant_spatial_facts_readonly_rpc.sql`. It reads active `public.boundaries` rows only, calculates area and point-on-surface geodesic distance, and returns same-level polygons that touch. It grants execution only to `service_role`; the Next.js server calls it using the server-only service client. It performs no boundary writes or geometry ingestion. The migration must pass the disposable synthetic CI contract before it is applied to the intended Production project.

The output is derived from the geometry already stored in IWACU. It must not be described as a road route, driving distance, legal land survey, or independently verified official dataset unless that provenance is separately established.

## 1A. Disposable PostGIS (migration contract tests only)

1. Provision a **non-Production** Postgres with PostGIS (local Docker or a throwaway project).
2. Apply **only**:
   - `sql/migrations/20261109_02_assistant_spatial_facts_disposable.sql`
3. Confirm the migration header forbids Production use.
4. Point a **server-only** env var at that disposable DB (name reserved for later wiring; do not put Production URL here).
5. Re-run assistant tests against that environment.
6. Do **not** apply this migration to Production Supabase.

CI uses synthetic fixtures only to prove the RPC contract and permissions. The website must never use the synthetic fixture schema or its names.

## 2. Gap log (optional)

1. Review `sql/migrations/20261109_01_assistant_gap_log.sql`.
2. Apply only after an explicit database release decision to the **intended** project.
3. Confirm the RPC stores aggregate counts only (no free-text questions, no PII).

Until applied, `gap_logging.ready` remains `false` in the capability catalogue.

## 3. External research HTTP provider

1. Review provider contract (HTTPS only, no PII outbound).
2. Store API key in a **server-side** secret store (never in client or git).
3. The server-only Tavily adapter and source validation are implemented on this feature branch. It uses HTTPS POST, Bearer auth, a four-second timeout, a short in-memory cache, and source metadata only. It does not use Tavily's generated answer or raw page content.
4. Keep the feature disabled until the owner has reviewed the provider terms/contract and stored a key in the server-side secret store:
   - `IWACU_EXTERNAL_RESEARCH_ENABLED=true`
   - `IWACU_EXTERNAL_RESEARCH_PROVIDER=tavily`
   - `TAVILY_API_KEY` (server-only; never commit or share the value)
5. Use the mock-fetch tests for contract regression. A live provider request has not been made in this branch because no owner key was provided.

Until those owner-only steps are done, the adapter returns `disabled` / `unavailable` and invents no sources.

## 4. Language-model routing (optional)

After a Kinyarwanda benchmark, set **all** of:

- `IWACU_AI_PROVIDER`
- `IWACU_AI_MODEL`
- matching server-side API key
- `IWACU_AI_BENCHMARK_PASSED=true`
- `IWACU_AI_ROUTING_ENABLED=true`

The model may only help classify intent / extract phrases. It must not supply leader names, phone numbers, distances, or boundaries.

## 5. Human verification before any release

1. Green CI on the exact release SHA (tests + TypeScript + ESLint + production build).
2. Read-only checks against the intended Supabase project (public leaders only).
3. Confirm zero invented names, numbers, borders, distances, or signs on an evaluation set.
4. Manual test on a low-end Android phone and a weak network.
5. Explicit decision before merge to `main` or any Production deploy.

## API separation (important integration correction)

- The original `/api/ai-router` endpoint remains reserved for the existing place-name search contract (`search_places`).
- Ishakiro's conversational API is isolated at `/api/ishakiro`; the new chat component calls only that route.
- CI runs both the assistant suite and the existing location/UI contract suite so these APIs cannot accidentally be merged again.

## What the feature branch already does

- Deterministic multilingual intent routing (Kinyarwanda / English / French evaluation set).
- Place hierarchy facts from the offline administrative index (real codes such as `RW-P1-D12`).
- Leaders, places, emergency contacts from verified tools only.
- Area, straight-line distance and same-level adjacency read the live `public.boundaries` geometry through a service-role-only, read-only RPC after the migration is deployed; unavailable data still produces an honest partial response.
- External research: Tavily server adapter, query redaction, source URL checks, trust tiers, timeout/cache and mocked HTTP contract tests; **disabled by default** and not live-tested.
- Disposable PostGIS SQL fixtures and contract tests are prepared for a separate CI-only database; never for Production.
- No merge to `main`, no Production deploy, no Vercel env changes from this branch workstream.
