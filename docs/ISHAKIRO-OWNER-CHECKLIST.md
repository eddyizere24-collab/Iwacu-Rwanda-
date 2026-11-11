## 2026-11-11 core Rwanda knowledge continuation

- Added `src/lib/assistant/rwanda-knowledge.ts` as a deterministic answer layer for introductory questions about Rwanda, Kigali, Nyamasheke, administrative-unit concepts, and IWACU's own published purpose and service descriptions.
- Supported examples include “U Rwanda ni iki?”, “Kigali ni iki?”, “Nyamasheke ni iki?”, “IWACU igamije iki?”, and the matching English/French definitions where a reviewed answer exists.
- Answers cite the Government of Rwanda, City of Kigali, Nyamasheke District, or IWACU's own published information pages. Exact administrative names can also use the offline IWACU hierarchy index. Ambiguous and unknown names do not get guessed.
- Nyamasheke's current official pages show inconsistent village totals (the district's English About page shows 588 while its homepage shows 586). The new answer deliberately avoids stating a village total until the District resolves that discrepancy. The consistent 15-sector fact is retained.
- Updated the Ishakiro chat's empty-state starter questions and added a light Imigongo-inspired CSS line pattern to the answer canvas and assistant answer cards; user messages and data cards retain their existing readable styles.
- Added the new knowledge module to the assistant test suite and added engine-level checks for the requested example questions.
- **External web search is still disabled by default.** The existing server-side Tavily adapter is ready for a controlled request but still needs owner acceptance of provider terms and a server-only `TAVILY_API_KEY`, then a live source-quality check. No API key is committed or exposed here.
- This branch has not been merged to `main` and has not been deployed to the public site. Production behavior must be verified after the owner-approved release.

## 2026-11-10 continuation note

- Assistant product name: **Iwacu AI**.
- Its dedicated mark is a multicolour sun with 24 coloured rays, separate from IWACU RWANDA's main site logo.
- Direct administrative-parent questions retain the requested administrative level and resolve through the exact-name offline hierarchy index before live place search.
- Kigali City has its own first-level code and must be named “Umujyi wa Kigali”, not “Intara ya Umujyi wa Kigali”.
- If the leaders data service fails, the assistant reports that verification failed; it does not claim that no leader exists.
- Automatic Vercel Preview deployment is paused on this branch to conserve deployment credits. GitHub CI remains enabled. This change does not merge to main or deploy Production.

# Ishakiro — Owner checklist (steps this branch cannot complete alone)

Branch: `feature/ishakiro-part-1-continuation-20261109`

This document lists the remaining steps that require owner-supplied credentials, authoritative source data, a physical device, or a final release decision. Two additive server-side migrations have already been applied to the intended Production Supabase project; the Production website UI has not been deployed.

## 1. Live boundary geometry (area / distance / adjacency)

The read-only RPC migration `sql/migrations/20261110_01_assistant_spatial_facts_readonly_rpc.sql` was applied to the intended Production Supabase project on 10 November 2026 after the disposable PostGIS CI contract passed. It reads active `public.boundaries` rows only, calculates area and point-on-surface geodesic distance, and returns same-level polygons that touch. It grants execution only to `service_role`; the Next.js server calls it using the server-only service client. It performs no boundary-record writes, geometry ingestion, or client-side access.

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

## 2. Gap log (aggregate-only)

The migration `sql/migrations/20261109_01_assistant_gap_log.sql` has been applied to the intended Production Supabase project. It stores only the gap category, validated public scope code, aggregate occurrence count and timestamps. It stores no free-text question, name, phone, IP address or user/account identifier. Direct table access is denied to client roles; only the server-side `service_role` can execute the RPC. The Next.js server calls it after the request has passed its API validation and rate limit.

## 3. Road-sign dataset

The assistant cites the Official Gazette Law n° 014/2026 (10 March 2026), Article 5(1)(g) and 5(2). This establishes that road traffic signs form part of the road traffic rules and that an Order of the Minister sets out detailed rules. It does **not** provide IWACU with a verified map of installed signs. Do not invent sign types, positions, photos or nearby results. A geolocated inventory and the applicable implementing order must be checked before this capability can be marked ready.

## 4. External research HTTP provider

1. Review provider contract (HTTPS only, no PII outbound).
2. Store API key in a **server-side** secret store (never in client or git).
3. The server-only Tavily adapter and source validation are implemented on this feature branch. It uses HTTPS POST, Bearer auth, a four-second timeout, a short in-memory cache, and source metadata only. It does not use Tavily's generated answer or raw page content.
4. Keep the feature disabled until the owner has reviewed the provider terms/contract and stored a key in the server-side secret store:
   - `IWACU_EXTERNAL_RESEARCH_ENABLED=true`
   - `IWACU_EXTERNAL_RESEARCH_PROVIDER=tavily`
   - `TAVILY_API_KEY` (server-only; never commit or share the value)
5. Use the mock-fetch tests for contract regression. A live provider request has not been made in this branch because no owner key was provided.

Until those owner-only steps are done, the adapter returns `disabled` / `unavailable` and invents no sources.

## 5. Language-model routing (optional)

After a Kinyarwanda benchmark, set **all** of:

- `IWACU_AI_PROVIDER`
- `IWACU_AI_MODEL`
- matching server-side API key
- `IWACU_AI_BENCHMARK_PASSED=true`
- `IWACU_AI_ROUTING_ENABLED=true`

The model may only help classify intent / extract phrases. It must not supply leader names, phone numbers, distances, or boundaries.

## 6. Human verification before any release

1. Green CI on the exact release SHA (currently green on `d741e2d0b0bc34b8f3d92c2f672762525f59fb5f`; rerun if any code changes).
2. Production read-only spatial RPC checks passed. The public leader registry currently has zero people/appointments/public rows, so names/contacts cannot be shown yet.
3. Confirm zero invented names, numbers, borders, distances, or signs on an evaluation set.
4. Manual test on a low-end Android phone and a weak network remains outstanding.
5. Obtain a verified leader dataset and/or have authorized administrators complete the leader registry and public verification workflow.
6. Benchmark and activate an AI provider only after an appropriate Kinyarwanda evaluation and server-side credentials.
7. Explicit decision before merge to `main` or Production web deploy. Preview build is intentionally disabled on this branch to conserve credits.

## API separation (important integration correction)

- The original `/api/ai-router` endpoint remains reserved for the existing place-name search contract (`search_places`).
- Ishakiro's conversational API is isolated at `/api/ishakiro`; the new chat component calls only that route.
- CI runs both the assistant suite and the existing location/UI contract suite so these APIs cannot accidentally be merged again.

## What the feature branch already does

- Deterministic multilingual intent routing (Kinyarwanda / English / French evaluation set).
- Place hierarchy facts from the offline administrative index (real codes such as `RW-P1-D12`).
- Leaders, places, emergency contacts from verified tools only.
- Area, straight-line distance and same-level adjacency read live `public.boundaries` geometry through the deployed service-role-only, read-only RPC; unavailable or invalid data still produces an honest partial response.
- Road signs: official Law n° 014/2026 (Official Gazette, 10 March 2026, Article 5) is cited, but nearby signs remain unavailable until IWACU has a verified, geolocated inventory.
- External research: Tavily server adapter, query redaction, source URL checks, trust tiers, timeout/cache and mocked HTTP contract tests; **disabled by default** and not live-tested.
- Disposable PostGIS SQL fixtures and contract tests are prepared for a separate CI-only database; never for Production.
- No merge to `main`, no Production website deploy, and no Vercel env changes. Two additive server-side RPC migrations were applied to Production Supabase: spatial facts (read-only) and aggregate-only gap logging. No boundary data was changed.
