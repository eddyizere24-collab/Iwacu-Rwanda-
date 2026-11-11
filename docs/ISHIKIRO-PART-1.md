# Ishakiro ry'Ubuhanga — igice cya mbere

## Icyo iki gice cyubaka

Iyi branch yubaka urufatiro rw'ishakiro riganira n'umuntu, rigakoresha amakuru yemewe ari muri IWACU aho kwishingikiriza ku byo model yaba yibuka.

Ibice by'ingenzi:
- Interface y'ikiganiro: ubutumwa bukurikirana, ibibazo by'ibanze, ibisubizo, leader cards, nimero zo guhamagara, inkomoko y'amakuru n'icyizere.
- API orchestrator: igenzura input, rate limit, igashyira ikibazo mu bwoko bukwiye, igahamagara ibikoresho byemewe.
- Tools z'ububiko: search_places na get_leader_candidates_v2; leader details zigaragazwa gusa iyo zemejwe kandi zashyizwe ku mugaragaro.
- Ibisubizo bigengwa na tools: izina ry'ahantu, umuyobozi, umwanya n'imibare ntibihimbwa na model.
- Session context: ijambo rikurikiraho nka “nimero ye?” rishobora gukoresha ahantu havuzwe mu gisubizo kibanje.
- Gap log: aggregate-only RPC yamaze gushyirwa muri Production Supabase, ikoreshwa na service_role gusa.
- Place hierarchy facts: parent + umubare w'ibice byo hasi uva ku offline administrative index (kode nk'iyi RW-P1-D12).

## Imipaka y'ukuri

Ibikurikira birashobora gukora gusa igihe amakuru yemewe aboneka:
- Gushaka ahantu no gukemura amazina asubiramo.
- Gushaka abayobozi b'ahantu no kuzamuka ku rwego rukurikiyeho iyo umuyobozi cyangwa nimero ibuze.
- Gutanga nimero z'ubutabazi ziri mu rutonde rwashyizwe muri code, ariko itariki yo kuzasuzuma urwo rutonde bwa nyuma ntiyanditswe.
- Kubara umubare w'ibice byo hasi (imirenge/utugari/imidugudu) uva ku offline index — si official census.

Ibikurikira ntibirahuzwa n'amakuru cyangwa ibikoresho byabyo muri iki gice:
- Area, intera yo mu murongo ugororotse n'ahantu hihana imbibi byamaze guhuzwa na geometry iri muri Production `public.boundaries` binyuze muri read-only service-role RPC.
- Ibyapa biri hafi: amategeko yemewe aratangwa nk'inkomoko, ariko nta dataset y'ibyapa n'aho biherereye yagenzuwe irahuzwa.
- Ubushakashatsi bwo hanze (external research) — code iriho ariko irahagaritswe by default.
- Voice input/output.

Iyo umuntu abajije ibyapa, assistant itanga gusa aho amategeko abivuga kandi ikavuga ko idafite urutonde rw'ibyapa n'aho biherereye. Ntabwo itanga amazina, ibisobanuro cyangwa imyanya y'ibyapa itagenzuwe.

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

It never stores the visitor's question, name, phone, account ID or IP. The migration was applied to the intended Production Supabase project on 10 November 2026. The RPC is executable only by the server-side service_role; the table is protected by RLS and direct client-role access is denied.

## Disposable PostGIS (not Production)

File: `sql/migrations/20261109_02_assistant_spatial_facts_disposable.sql`

Synthetic fixtures only. Schema `assistant_spatial_fixture`. Must never be applied to Production Supabase. They test the SQL contract in GitHub Actions. The application instead reads the already-present Production `public.boundaries` geometry through `assistant_spatial_facts_v1`; it does not use fixture rows.

## Safety and release boundary

- Work continues on `feature/ishakiro-part-1-continuation-20261109` only.
- No Production website deploy, Vercel environment change, or merge to `main` was performed.
- Two additive server-side Supabase migrations were applied: the read-only spatial facts RPC and the aggregate-only gap-log RPC. No boundary data was inserted, updated or deleted.
- No secret values were read or committed.
- Preview deployments from this feature branch are disabled in `vercel.json` to preserve build/deployment credits.
- The Production web UI has not received the Ishakiro changes. They remain isolated on this feature branch until all release checks pass.

## Verification still required

Before release:
1. GitHub Actions is green on this verified feature SHA: `d741e2d0b0bc34b8f3d92c2f672762525f59fb5f` (intent tests, legacy location/UI tests, TypeScript, ESLint, production build and disposable PostGIS/gap-log checks).
2. Production read-only spatial smoke tests passed for Gasabo, Kacyiru, and Gasabo–Kicukiro.
3. The public leader directory view correctly returns only approved, effective, published records and approved public contacts. At the time of verification it returned **zero** rows; the leader tables also contained zero people and appointments. Therefore leader answers must honestly report that the database has no public leader records yet.
4. Confirm zero invented names, numbers, boundaries, distances or signs in the evaluation set.
5. Manual test on a low-end Android phone and weak network remains outstanding.
6. Benchmark Gemini/Groq or another permitted provider on Kinyarwanda questions before selecting a model; no provider key has been supplied or activated.
7. Verify the feature on a Preview build when build credits can be used, then explicitly authorize merge and Production web release. The current feature branch preview build is disabled.

## Three-part delivery grouping

1. Part 1 — conversation shell, safe API, routing, database tools and honest fallback (this branch).
2. Part 2 — AI provider benchmark/integration, more complete language understanding, facts, boundaries, distance and signs tools using verified datasets.
3. Part 3 — learning loop and admin routing, richer site actions with explicit confirmation, then voice and supervised automation.


## Handoff update — 9 November 2026

The continuation branch is based on the latest `main`, not the older baseline used by the original Part 1 branch. The current live `main` keeps its later location-retention, notification and homepage changes.

A TypeScript syntax defect in the original assistant component was found during review: a literal backslash-n sequence had been inserted between two declarations. The continuation corrects this before running CI.

An optional Gemini/Groq intent-planning adapter is included in code. It is not active by default. Activation requires all of the following to be supplied by the owner after a Kinyarwanda benchmark: `IWACU_AI_PROVIDER`, `IWACU_AI_MODEL`, the matching server-side API key, `IWACU_AI_BENCHMARK_PASSED=true`, and `IWACU_AI_ROUTING_ENABLED=true`. The model may classify a request and extract a phrase; it cannot provide facts, people, numbers or final answers. The database and verified lists remain the only sources for those facts.

The aggregate-only gap-log migration is applied to Production Supabase. The private RPC accepts only a fixed gap category and a validated existing scope code; it stores aggregate counts and timestamps, never the visitor's text or identifiers. Only the server-side service_role can execute it. No Vercel environment settings, production website deployment or main-branch merge was performed.

### Continuation evidence — 9 November 2026 (evening)

Branch: `feature/ishakiro-part-1-continuation-20261109`

Verified on HEAD `2d3f92778dd347321fa46c048d282a5ad9ee871f`:

- GitHub Actions run `42700633182` (Ishakiro assistant checks): **success**
  - URL: https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/42700633182
- Place hierarchy uses real offline index codes (example: Gasabo `RW-P1-D12`, Kacyiru `RW-P1-D12-S1207`).
- External research adapter is present and **disabled by default**; unit tests cover URL safety and PII redaction.
- Spatial area/distance/adjacency use the live Production boundary geometry via a server-only read-only RPC; Gasabo, Kacyiru and Gasabo–Kicukiro smoke checks returned real database values.
- Disposable PostGIS SQL is present and labeled not for Production.

Still not done (honest list):

- End-to-end assistant API verification after a final production website release (preview builds from this feature branch are disabled to preserve deployment credits).
- External research HTTP provider after owner contract review and secrets.
- Gap-log data is enabled through a private aggregate-only RPC; no PII or free-text logging.
- Model provider benchmark and activation flags.
- Read-only production data verification.
- Low-end Android / weak-network manual test.
- Full multilingual answer surface beyond current Kinyarwanda-first replies.
- Merge to `main` or Production web release (not yet authorized as a final release).


### Verified road-sign legal source — 10 November 2026

- Official Gazette n° Special published 10 March 2026: Law n° 014/2026 of 6 March 2026 governing road traffic.
- Article 5(1)(g) includes road traffic signs within road traffic rules; Article 5(2) says detailed rules are set by a Ministerial Order.
- IWACU currently has no verified geolocated road-sign inventory. Ishakiro cites the Official Gazette but does not list a sign or claim one is near a user's location.
- Official Gazette PDF: https://www.minijust.gov.rw/fileadmin/user_upload/Minijust/Official_gazettes_2/____2026_Igazeti_ya_Leta/______WERURWE-March-Mars/OG_n___Special_of_10.03.2026__Ikoreshwa_ry_umuhanda.pdf


### Latest verified checkpoint — 10 November 2026

Branch HEAD: `d741e2d0b0bc34b8f3d92c2f672762525f59fb5f`

- Assistant CI: [run 42719294235 — success](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/42719294235).
- Disposable PostGIS and aggregate gap-log CI: [run 42719294274 — success](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/42719294274).
- Production migrations: `assistant_spatial_facts_v1` and `record_assistant_gap_v1` applied; both verified by role grants. Spatial RPC is read-only and server-role-only; gap log stores aggregates only and is server-role-only.
- Production boundary geometry smoke checks: Gasabo area `429,181,084.88 m²`; Kacyiru area `5,797,590.51 m²`; Gasabo–Kicukiro point-on-surface straight-line distance `14,862.13 m`. These are calculations over IWACU's stored geometry, not road travel distances or legal land surveys. Geometry record date shown by the RPC: `2026-10-29`.
- Production public leader registry: zero people, zero appointments, zero public directory rows at the time of the read-only check. No leader name or contact should be fabricated to fill this gap.
- Production website UI: unchanged. Feature branch Preview deployment is disabled to conserve deployment credits.
