# IWACU RWANDA — consolidated release inventory (12 November 2026)

## Purpose and release gate

This inventory records saved implementation work reviewed for the consolidated release. It separates included code from work held back because accuracy, security, or field evidence is still missing. A Git merge is not proof of Production deployment. Production is considered updated only after checking the Production commit SHA, deployment result, public URL, and live health/read-back.

- Base: `d92533319ba0fa2e149e7d0c2946c724acf623e5` on `main`
- Integration branch: `fix/location-map-overlay-rpc-timeout-releasebase-20261112`
- Production: https://iwacu-rwanda-2.vercel.app
- Sole Production Supabase project: `buexgewxypvkqmphvfec`

## Included in this integration candidate

- Existing merged foundations: Rwanda administrative hierarchy and boundaries; location engine and confidence safeguards; public leader-directory framework; emergency contacts; location-change notifications; Ishakiro tool-backed place, hierarchy and leader lookup; initial Rwanda knowledge; Imigongo and existing photo-led design; Offices/workspaces and scoped admin workflows from PR #38.
- PR #37 accessibility: text sizes 100/125/150/200%, high contrast, reduced motion, easier-use controls, keyboard/focus and screen-reader support, user-initiated speech input, editable transcripts with explicit Send, language-matched read-aloud, public accessibility guide, and compact offline location index.
- PR #37 low-data/offline safeguards: the setting reduces map tile/boundary traffic only, not photographs. Public pages/static assets can be cached; private/no-store data, authenticated/admin pages and live APIs remain network-only. Layout no longer clears all browser caches on each load; the versioned Service Worker owns cleanup. A regression test verifies that public photos remain available offline.
- PR #35 Ishakiro expansion: sourced Nyamasheke facts; Rwanda population, geography, languages, national symbols, governance, Parliament, basic facts and culture; English, French and Kinyarwanda; bounded follow-up conversation; source labels; privacy redaction and rate limiting for optional external research.
- Offices gap-alert test corrected to inspect the current `/admin/ibiro/amakuru-abura` page and translated UI keys instead of the old dossier landing page.
- Home headline and metadata use “Menya aho uri. Menya n’abayobozi baho.” and English/French translations; canonical metadata uses the current Production URL.

## Final candidate updates prepared on 12 November 2026

- Ishakiro's entry panel is now explicitly branded **“Ishakiro ry'Ubuhanga”**, with a stronger Rwanda-green / Imigongo header and four grouped starting paths: IWACU, places, Rwanda facts, and leaders/emergency assistance. English and French labels are included.
- The village-boundary overlay fix is additive: a new bounded get_location_map_overlay_v2 RPC uses a restricted SECURITY DEFINER search path, public village-only fields, GiST-friendly spatial filtering, geometry simplification and a 300-feature cap. It reports when a map viewport contains more boundaries than the visible batch. The old RPC is not removed.
- The /api/location-map route now uses the v2 RPC. **The new Production SQL migration must be applied and read back successfully before this route is deployed.** Its SQL contract has passed in an isolated PostGIS database; it has not yet been applied to Production.
- Sitemap and robots metadata now use https://iwacu-rwanda-2.vercel.app, not the legacy Vercel alias.
- The emergency answer's Kinyarwanda verification date is aligned with the official directory's 12 November 2026 review.

## Saved work reviewed but intentionally not imported wholesale

- PR #30 and #28: the core requested administrative-level handling, Gasabo hierarchy facts, national facts, usage limits and follow-up safeguards are already present in current `main`; duplicate or stale code was not copied.
- PR #13 and older leader-card branches: superseded by the newer leader registry and Offices workflow. No unverified people or phone numbers were seeded.
- Older indoor-location branch (#3): superseded by later merged location/confidence work. Real indoor/mobile-device tests are still required before claiming village-level accuracy everywhere.
- PMTiles branch (#7) and packaging research: held until asset size/licence and HTTP Range `206 Partial Content` behavior are verified on the live host, plus low-end Android/weak-network tests. No unverified ~45 MB map payload was added.
- P4/calibration branches (#10 and related `wip/p4-*` branches): retained as QA research, not production truth until reproducible calibration evidence and acceptance tests are reviewed.
- Ubwiza HTML prototype and historical design/audit ZIPs: research only; no prototype replaced production UI. Existing Rwanda colours, imagery and Imigongo treatment are preserved.
- Eastern Province leadership PDFs: candidate source material only. Incomplete or unverified names, roles and phone details were not published.
- RSL: the current library is explanatory text, not validated sign-language video. Actual RSL requires Deaf/RNUD review and recording; it is not marked complete.

## Production facts checked read-only

- Production API health returned `ok`.
- Active, non-empty boundaries: 17,423 total (country 1, provinces 5, districts 30, sectors 416, cells 2,148, villages 14,823).
- Loaded village geometries (14,823) differ from the published national count (14,837) by 14. Do not claim complete village coverage until reconciled against an authoritative source.
- Production leader table currently contains **0** rows. Office tools exist for authorised data entry, but the public leader directory is not populated or complete.
- The five Office migrations dated 9–10 November 2026 are already in Production. No new Production SQL is part of this candidate.
- Sensitive Office/internal assistant tables deny direct `anon` and `authenticated` SELECT; Office API routes use scoped admin authorization. Public SECURITY DEFINER RPCs still require ongoing review; no Production ACL changes were made.

## Activation dependencies and live verification

- External web research remains disabled by default. Runtime activation requires the owner to verify a server-side Tavily key and explicitly set `IWACU_EXTERNAL_RESEARCH_ENABLED=true` in the correct Vercel Production environment. No secrets are stored in source and no Vercel environment changes are part of this change.
- Verify exact Production commit SHA, Vercel Production target, public URL, `/api/health` and the public accessibility route after merge/deployment.
- Record real-phone checks for GPS indoors/outdoors, TalkBack, text reflow, weak network/offline behavior, image retention and admin-route privacy before calling the release fully field-validated.

## Emergency directory correction — verified 12 November 2026

A production read-back found stale category labels in the legacy `/api/emergency` endpoint (113 incorrectly shown as Fire, 114 as Traffic, and 3512 as Health; 111 was absent). The release branch now uses the same sourced directory for the API and legacy UI, with source URLs and last-verified dates. The official Government of Rwanda directory and Rwanda National Police emergency directory were checked before changing the labels. The regression test pins all eleven published service-number pairs. Sources: https://www.gov.rw/emergency and https://www.police.gov.rw/home/ (SAMU 912: https://rbc.gov.rw/t11/who-we-are/our-divisions-and-units/samu-services).
