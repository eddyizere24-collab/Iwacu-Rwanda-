# Ishakiro ry'Ubuhanga — igice cya mbere

## Icyo iki gice cyubaka

Iyi branch yubaka urufatiro rw'ishakiro riganira n'umuntu, rigakoresha amakuru yemewe ari muri IWACU aho kwishingikiriza ku byo model yaba yibuka.

Ibice by'ingenzi:
- Interface y'ikiganiro: ubutumwa bukurikirana, ibibazo by'ibanze, ibisubizo, leader cards, nimero zo guhamagara, inkomoko y'amakuru n'icyizere.
- API orchestrator: igenzura input, rate limit, igashyira ikibazo mu bwoko bukwiye, igahamagara ibikoresho byemewe.
- Tools z'ububiko: search_places na get_leader_candidates_v2; leader details zigaragazwa gusa iyo zemejwe kandi zashyizwe ku mugaragaro.
- Ibisubizo bigengwa na tools: izina ry'ahantu, umuyobozi, umwanya n'imibare ntibihimbwa na model.
- Session context: ijambo rikurikiraho nka “nimero ye?” rishobora gukoresha ahantu havuzwe mu gisubizo kibanje.
- Gap log: migration y'inyongera irateguwe, ariko ntabwo yashyizwe muri Supabase.
- Place hierarchy facts: parent + umubare w'ibice byo hasi uva ku offline administrative index (kode nk'iyi RW-P1-D12).

## Imipaka y'ukuri

Ibikurikira birashobora gukora gusa igihe amakuru yemewe aboneka:
- Gushaka ahantu no gukemura amazina asubiramo.
- Gushaka abayobozi b'ahantu no kuzamuka ku rwego rukurikiyeho iyo umuyobozi cyangwa nimero ibuze.
- Gutanga nimero z'ubutabazi ziri mu rutonde rwashyizwe muri code, ariko itariki yo kuzasuzuma urwo rutonde bwa nyuma ntiyanditswe.
- Kubara umubare w'ibice byo hasi (imirenge/utugari/imidugudu) uva ku offline index — si official census.

Ibikurikira ntibirahuzwa n'amakuru cyangwa ibikoresho byabyo muri iki gice:
- Gupima no gusobanura imbibi z'ahantu (PostGIS live).
- Kubara intera nyayo muri metero (PostGIS live).
- Kumenya ibyapa n'ibimenyetso biri hafi.
- Kubara ubuso mu m² (PostGIS live).
- Ubushakashatsi bwo hanze (external research) — code iriho ariko irahagaritswe by default.
- Voice input/output.

Iyo umuntu abajije kimwe muri ibyo, assistant ivuga ko igikoresho/amakuru bitarahuzwa. Ntabwo itanga imibare cyangwa ibisobanuro by'impimbano.

## AI model provider

PDF y'ibanze isaba guhitamo AI provider nyuma yo kugereranya ubuziranenge bwa Kinyarwanda. Ntabwo provider cyangwa API key byatoranyijwe muri iyi branch. Hari interface ituma provider izahindurwa bitagoranye; nta secret yashyizwe muri code cyangwa muri browser.

Until a provider has passed the benchmark, the foundation uses deterministic intent routing for the known IWACU question types. This is not represented as a fully benchmarked conversational language model.

## Gap log migration

File: `sql/migrations/20261109_01_assistant_gap_log.sql`

It stores only:
- gap category;
- known administrative scope code, if available;
- aggregate occurrence count;
- first and last seen timestamps.

It never stores the visitor's question, name, phone, account ID or IP. The migration is prepared only. It must be reviewed and deliberately applied to the correct Supabase project before the gap-recorded badge can be considered operational.

## Disposable PostGIS (not Production)

File: `sql/migrations/20261109_02_assistant_spatial_facts_disposable.sql`

Synthetic fixtures only. Schema `assistant_spatial_fixture`. Must never be applied to Production Supabase. Area, geodesic distance and adjacency functions exist in SQL; TypeScript returns `not_ready` until a disposable database is deliberately connected.

## Safety and release boundary

- Work continues on `feature/ishakiro-part-1-continuation-20261109` only.
- No Production deploy, Vercel setting, Supabase migration or database write was performed.
- No secret values were read or committed.
- No merge to `main` was performed.
- This branch is a code candidate, not a claim that the live site has changed.

## Verification still required

Before release:
1. Run ESLint, TypeScript, unit tests and production build on this exact branch.
2. Run read-only integration cases against the intended Supabase project, including the two existing visible examples.
3. Verify public directory returns only approved appointments, published profiles and public-approved contacts.
4. Confirm zero invented names, numbers, boundaries, distances or signs in the evaluation set.
5. Test on a low-end Android phone and weak network.
6. Benchmark Gemini/Groq or other permitted provider on Kinyarwanda questions before selecting a model.
7. Review and apply the gap migration only after an explicit database release decision.

## Three-part delivery grouping

1. Part 1 — conversation shell, safe API, routing, database tools and honest fallback (this branch).
2. Part 2 — AI provider benchmark/integration, more complete language understanding, facts, boundaries, distance and signs tools using verified datasets.
3. Part 3 — learning loop and admin routing, richer site actions with explicit confirmation, then voice and supervised automation.


## Handoff update — 9 November 2026

The continuation branch is based on the latest `main`, not the older baseline used by the original Part 1 branch. The current live `main` keeps its later location-retention, notification and homepage changes.

A TypeScript syntax defect in the original assistant component was found during review: a literal backslash-n sequence had been inserted between two declarations. The continuation corrects this before running CI.

An optional Gemini/Groq intent-planning adapter is included in code. It is not active by default. Activation requires all of the following to be supplied by the owner after a Kinyarwanda benchmark: `IWACU_AI_PROVIDER`, `IWACU_AI_MODEL`, the matching server-side API key, `IWACU_AI_BENCHMARK_PASSED=true`, and `IWACU_AI_ROUTING_ENABLED=true`. The model may classify a request and extract a phrase; it cannot provide facts, people, numbers or final answers. The database and verified lists remain the only sources for those facts.

The gap-log SQL remains a prepared migration only. It has not been run against Supabase. No Vercel environment settings, production deployment, main-branch merge or database write is part of this continuation.

### Continuation evidence — 9 November 2026 (evening)

Branch: `feature/ishakiro-part-1-continuation-20261109`

Verified on HEAD `2d3f92778dd347321fa46c048d282a5ad9ee871f`:

- GitHub Actions run `42700633182` (Ishakiro assistant checks): **success**
  - URL: https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/42700633182
- Place hierarchy uses real offline index codes (example: Gasabo `RW-P1-D12`, Kacyiru `RW-P1-D12-S1207`).
- External research adapter is present and **disabled by default**; unit tests cover URL safety and PII redaction.
- Spatial area/distance/adjacency TypeScript paths return `not_ready` and do not invent numbers.
- Disposable PostGIS SQL is present and labeled not for Production.

Still not done (honest list):

- Live disposable PostGIS connection for real area/distance/adjacency numbers.
- External research HTTP provider after owner contract review and secrets.
- Gap-log migration applied to a database (owner decision only).
- Model provider benchmark and activation flags.
- Read-only production data verification.
- Low-end Android / weak-network manual test.
- Full multilingual answer surface beyond current Kinyarwanda-first replies.
- Merge to `main` or any Production change (not requested).
