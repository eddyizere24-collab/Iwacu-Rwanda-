# Ishakiro readiness review — 10 November 2026

## Purpose

This note records the latest review against **Ishakiro Build Plan v1.0**. It separates verified branch implementation from features that are actually live, and it lists the remaining release gates. A feature on this branch is not described as live on the public site.

## Fixed in this continuation branch

1. **Conversation continuity**
   - The chat UI sends up to the last eight messages with the current request.
   - The API validates a bounded transcript (up to 12 turns; each turn up to 1,200 characters).
   - The assistant also passes up to eight previous turns to the optional model planner when that provider has been explicitly benchmarked and enabled.
   - The UI updates or clears the active place context after each reply, so an old place does not silently override a new question.
   - Deterministic follow-ups now include examples such as “Ninde uyobora aka karere?”, “Muri akahe karere?”, “Ni nde?”, “Ni izihe?”, “Kandi nimero ye?”, and “Naho Kicukiro?”.
   - The transcript remains in the current browser session; this patch does not persist free-text conversation history in Supabase.

2. **Assistant identity and capability disclosure**
   - “Urinde?”, “Uri nde?”, “Who are you?” and supported French identity phrases route to an explicit answer explaining that Ishakiro is IWACU RWANDA's assistant, what it is designed to do, and that it will not invent missing information.
   - The “Wamfasha iki?” response now lists the tools currently implemented and states that nearby road-sign lookup and external web research are not available yet.

3. **Rwanda-wide administrative counts**
   - “Mu Rwanda hari uturere tungahe?” and equivalent English/French district-count questions now use the same bundled administrative index as local hierarchy answers.
   - The summary counts provinces, districts, sectors, cells and villages, and refuses to return national totals if any non-province unit lacks a valid immediate parent.
   - Tests assert the current index contains: 5 provinces, 30 districts, 416 sectors, 2,148 cells and 14,823 villages.
   - These are counts in IWACU's bundled index built from `public.boundaries`. They are not population census counts, and the index does not expose one authoritative update date for every source row. Responses must retain that limitation.

4. **Regression coverage**
   - The assistant suite covers 100+ intent/evaluation questions.
   - New tests cover identity, Rwanda-wide totals, conversation follow-ups, switching to a newly named place, child-name requests and contact follow-ups.
   - The assistant and legacy location endpoints remain separate: `/api/ishakiro` is the conversation API; `/api/ai-router` remains the existing place-search API.

## Already available on the intended Production database

- The spatial facts RPC reads stored `public.boundaries` geometry only and is restricted to the server-side `service_role`. It supports area, straight-line point-on-surface distance and same-level polygon adjacency. These calculations are not road travel distances or legal land surveys.
- The aggregate-only gap log records a fixed gap category, validated administrative scope code, counts and timestamps. It does not store free-text visitor questions, names, phones, IP addresses or user IDs.
- The new assistant website code is **not** live merely because these database RPCs exist.

## Remaining release blockers and planned work

| Capability / requirement | Current verified state | What is still required |
| --- | --- | --- |
| Public leader directory | At the last read-only Production check, the people table, appointments table and public directory returned zero records. | Authorized, verified leader records and public-contact approvals. Do not create placeholder people or phone numbers. |
| Nearby road signs | No verified geolocated road-sign inventory is connected. The assistant can cite the road-traffic law only. | Approved inventory with location, sign type, evidence/photo, source and verification date. |
| External web research | Tavily server adapter and mocked tests exist; it is disabled by default and no live provider request has been made. | Owner review of provider terms and a server-side key, then a controlled source-quality test. |
| General language-model routing | Gemini/Groq adapter exists but is disabled. | Kinyarwanda benchmark, selected model, server-side key, benchmark approval and routing flag. The model may plan tool calls; it must not invent final facts. |
| Shared API rate limits | Current API limiter is process-local in-memory state. | A shared server-side limiter must be designed/tested before describing this requirement as complete across serverless instances. |
| Daily model cost cap | Model is disabled, so no model spend is incurred by the current deterministic path. A shared daily spend/request cap is not yet implemented. | Agree a budget and add server-side shared accounting before enabling a paid provider. |
| Multilingual final answers | Intent recognition tests cover Kinyarwanda, English and French; current response copy is primarily Kinyarwanda. | Complete English and French answer copy/language selection, then evaluate all three languages. |
| Low-end Android / weak network | Automated tests and production build checks exist. | Physical-device verification of speed, layout, GPS interruption, retries and weak-network behavior. |
| Phase 3 site control | No complete assistant action layer with previews/confirmation is released. | Open verified place/leader/map pages and perform any permitted action only after preview and confirmation. |
| Phase 4 voice and supervised autonomy | Not implemented as a released user capability. | Voice input/output, safety boundaries, human confirmation and monitoring. |
| Public website release | New `/api/ishakiro` branch code has not been confirmed live; the last Production probe found the route absent. | Correct Vercel project access, successful Preview QA, exact-SHA checks and an explicit release gate. |

## Test and release policy

- The PR is intentionally **Draft**: [PR #29 — Ishakiro session continuity and Rwanda-wide facts](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/29).
- CI must pass on the exact latest branch SHA: assistant intent/evaluation tests, existing location/UI contracts, TypeScript, ESLint, production build (without deploy), and disposable PostGIS/gap-log/authority-alert tests.
- Disposable PostGIS tests use synthetic fixtures only and must never be applied to Production.
- No merge to `main`, no public Production website deployment and no Vercel environment change is performed by this readiness note.
- No leader names, telephone numbers, road signs, places or facts are to be fabricated to make a feature appear complete.

## Progress accounting

The build plan's formal progress counts a phase only after its exit criteria pass on the live website. The original baseline is 15%. The new work on this branch advances Phase 1 implementation, but the Phase 1 live-release gates are not yet satisfied. Therefore the formal live-site progress remains **15%**, not the percentage of code completed on this branch. A separate implementation estimate must never be presented as released-site progress.
