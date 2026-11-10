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
   - “Mu Rwanda hari uturere tungahe?” and equivalent English/French district-count questions use a source-stamped snapshot checked against the Government of Rwanda overview, rather than counting the incomplete bundled index.
   - The official Government page lists **4 Provinces and the City of Kigali**, **30 districts**, **416 sectors**, **2,148 cells** and **14,837 villages**. Kigali City is a first-level entity but must not be mislabeled as a fifth Province.
   - The bundled IWACU boundary index contains 14,823 village rows, which is 14 fewer than the current Government page. It must not be used to state the national village total. Local hierarchy lookups remain sourced from that index and should disclose its own limitations.
   - The official snapshot was checked on 10 November 2026. The source page does not give a publication/update date for each statistic, so the answer labels the verification date and requires a fresh source check before the snapshot is updated.

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
| Multilingual final answers | Locale-aware chat UI plus tested EN/FR translation for identity, greetings, help/capabilities, national totals, location/place results, leader roles/cards and missing-leader or phone notices, emergency labels, external-research disabled/error messages, road-sign law limitations, hierarchy counts, mapped area, straight-line distance, shared-boundary results, confidence labels, source/date labels and trust tiers. Proper names, source excerpts, some free-form suggestions and any unrecognized dynamic copy remain in their source language unless a verified translation exists. | Complete remaining answer and metadata coverage for every intent, formal glossary review by a Kinyarwanda/English/French reviewer, full tri-language question evaluation, and manual language-switch checks on phones. |
| Low-end Android / weak network | Automated tests and production build checks exist. | Physical-device verification of speed, layout, GPS interruption, retries and weak-network behavior. |
| Phase 3 site control | No complete assistant action layer with previews/confirmation is released. | Open verified place/leader/map pages and perform any permitted action only after preview and confirmation. |
| Phase 4 voice and supervised autonomy | Not implemented as a released user capability. | Voice input/output, safety boundaries, human confirmation and monitoring. |
| Public website release | The public homepage and chat panel load. A live browser test asked “Urinde?” and Production returned an out-of-scope answer instead of the identity answer; the selected English/French locale also left chat description, placeholder and AI reply in Kinyarwanda. This confirms the current public site does not yet contain the continuation's fixes. A direct GET probe to `/api/ishakiro` was unreachable; that is not treated as proof of a missing POST route because the live chat itself returned a response. | Correct Vercel project access, a Preview built from the exact branch SHA, public-site QA showing the identity answer and locale-aware chat, followed by the owner's explicit release gate. |

## Live public-site verification — 10 November 2026

A browser check was performed against `https://iwacu-rwanda-2-ahabona.vercel.app`.

- The live homepage and Ishakiro panel loaded.
- The public chat was asked **“Urinde?”**. Production replied: “Iki kibazo kiri hanze y'amakuru ya IWACU RWANDA nshobora kugenzura...” rather than identifying itself as Ishakiro. This is a reproduced live defect, not a hypothetical concern.
- The public language selector exposes Kinyarwanda, English and Français. When switching to English and French, the live chat description, question placeholder and the answer stayed in Kinyarwanda. The feature-branch continuation now includes translations for these elements and answer-level regression tests, but those changes have not yet reached the public deployment.
- A direct fetch of `/api/ishakiro` returned `target_unreachable`; because the chat request itself did return a response, this check does not establish whether the POST route exists or which route the deployed UI called.

### Deployment access finding

The connected Vercel account currently exposes only the Hobby team `ahabona`, with no linked projects. Its project list and deployment list are empty, and lookup of the remembered IWACU project ID `prj_tB8EY3aJ37ObcXpHea3o7jFLZbUt` and project name `iwacu-rwanda-2` returns 404 through this connection. GitHub's Vercel status on `main` points to the Vercel project page, but the connected Vercel tools cannot read the project or its deployment. Therefore no Preview deployment from the current branch can be created or read back through this connection. The branch also retains the deliberate Vercel Preview-disable setting so that pushes do not consume deployment credits unexpectedly.

## Test and release policy

- The PR is intentionally **Draft**: [PR #29 — Ishakiro session continuity and Rwanda-wide facts](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/29).
- Answer-level tests now call the assistant engine directly for “Urinde?”, the Rwanda district count and the province/Kigali distinction; intent-only tests are not treated as proof of a working answer.
- Locale regression tests now cover Ishakiro EN/FR identity/help copy, the national totals and separate City of Kigali, dynamic location/place/leader and phone fallback replies, hierarchy/area/distance/adjacency results, emergency contacts, external research and road-sign limitations, and visible chat/card labels.
- Latest verified CI on branch HEAD `05517ba17d98f18e595974081657b451d42d23f8`: assistant checks `42800220319` passed (100+ intent/evaluation, UI/location contracts, TypeScript, ESLint and production build without deploying); disposable PostGIS/gap-log checks `42800220365` passed.
- CI must pass on the exact latest branch SHA: assistant intent/evaluation tests, existing location/UI contracts, TypeScript, ESLint, production build (without deploy), and disposable PostGIS/gap-log/authority-alert tests.
- Disposable PostGIS tests use synthetic fixtures only and must never be applied to Production.
- No merge to `main`, no public Production website deployment and no Vercel environment change is performed by this readiness note.
- No leader names, telephone numbers, road signs, places or facts are to be fabricated to make a feature appear complete.

## Progress accounting

The build plan's formal progress counts a phase only after its exit criteria pass on the live website. The original baseline is 15%. The new work on this branch advances Phase 1 implementation, but the Phase 1 live-release gates are not yet satisfied. Therefore the formal live-site progress remains **15%**, not the percentage of code completed on this branch. A separate implementation estimate must never be presented as released-site progress.
