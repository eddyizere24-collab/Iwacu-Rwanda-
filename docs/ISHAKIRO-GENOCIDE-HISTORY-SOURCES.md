# Ishakiro: Rwanda history knowledge — source audit and trilingual corpus

**Date:** 20 November 2026  
**Repository:** `eddyizere24-collab/Iwacu-Rwanda-`  
**Base commit:** `6e3a221ccd1d221aa0db067c42d62276008a4812`  
**Working branch:** `feature/ishakiro-genocide-history-phase1-20261120`  
**Scope:** source audit, reviewed trilingual history entries, bounded query normalization and tests. This is branch-only work; no Production data, migrations, secrets, environment settings or deployment are changed.

## Roadmap naming note

The numbered history-content iterations in this document are **not** the numbered product phases in *Ishakiro Build Plan v1.0*. Completing a history-content iteration does not complete overall product Phase 1, 2, 3 or 4. The product roadmap counts progress only when every acceptance criterion for that phase has passed on the live website, with question-by-question evidence. Code on a feature branch and passing CI alone do not qualify as a live-site release.

## Goal

Prepare Ishakiro to explain the 1994 Genocide against the Tutsi in Rwanda in Kinyarwanda, English, and French. Its answers must be understandable to Rwandans and visitors, conversational, respectful, traceable to evidence, and careful with legal and historical claims.

This is not a project to generate an unreviewed narrative or scrape the internet indiscriminately. Official records and original documents must be gathered, cited, reviewed, and then turned into short, connected knowledge entries.

## Sources located and reviewed for Phase 1

The machine-readable registry is `src/lib/assistant/history-sources.ts`. It records source language separately from future answer languages, the publisher, publication date where known, coverage, and cautions.

| Registry ID | Publisher / document | Primary use |
|---|---|---|
| `gov-rw-about-genocide` | Government of Rwanda, About | Official public terminology, commemoration dates, national public account and official victim count wording |
| `minubumwe-cnlg-preparation-execution-2021` | CNLG, archived by MINUBUMWE, *Rwanda 1991–1994: Preparation and Execution of the Genocide Perpetrated Against Tutsi in Rwanda* (January 2021) | Detailed institutional history of preparations and execution, with sections and page-level references |
| `minubumwe-cnlg-survivor-testimonies-2017` | CNLG with The Ohio State University and University of Minnesota, *Testimonies and Needs of Genocide Survivors* (May 2017) | Survivor experiences, consequences, Gacaca, needs and research method |
| `un-rwanda-historical-background` | UN Outreach Programme, *Rwanda: A Brief History of the Country* | Historical background, 1990 war, Arusha and UNAMIR context |
| `un-rwanda-genocide-backgrounders` | UN Outreach Programme, *Rwanda Genocide — Backgrounders* | Historical account of the international response and UN peacekeeping mandate |
| `un-s1994-1125-independent-commission-interim` | UN Independent Commission of Experts, preliminary report S/1994/1125 (4 October 1994) | Interim investigative record on the 6 April–15 July 1994 period, including Kigali, places of refuge and reported massacres in other prefectures |
| `un-2024-kwibuka-30` | United Nations, 30th anniversary remembrance (1 April 2024) | UN commemoration, remembrance of victims and survivors |
| `rwanda-un-2025-kwibuka31-statement` | Permanent Mission of Rwanda to the UN, Kwibuka 31 statement (7 April 2025) | Official national statement on remembrance, unity, renewal and prevention |
| `ictr-irmct-genocide-overview` | ICTR legacy website / IRMCT | Tribunal overview and pathway to judicial case records |

### Source verification notes

- The Government of Rwanda's public page identifies the event as the **1994 Genocide Against the Tutsi**, describes the 100-day period and says more than one million Rwandans were killed. It identifies 7 April as the commemoration start and 4 July as the end of the genocide / liberation.
- The MINUBUMWE archive hosts the January 2021 CNLG publication *Rwanda 1991–1994: Preparation and Execution of the Genocide Perpetrated Against Tutsi in Rwanda*. Its table of contents includes planning in 1991, 1992 and 1993 and implementation in 1994.
- The MINUBUMWE archive hosts the May 2017 CNLG report *Testimonies and Needs of Genocide Survivors*. Its front matter describes collaboration with The Ohio State University and the University of Minnesota, and the report sets limits on how the interviewed sample can be generalized.
- UN material is useful for the United Nations' historical record and international response. Some older UN pages state older casualty estimates (for example, more than 800,000); current official Rwanda material and later UN commemoration material use more than one million. These numbers must never be silently combined or presented without source/date attribution.
- The ICTR/IRMCT overview is a starting point. Any claim that a named person was convicted, acquitted, or judicially found responsible must link to the specific case record or judgment.

## Mandatory editorial and safety rules

1. Use the official name **“Jenoside yakorewe Abatutsi mu 1994”** / **“1994 Genocide against the Tutsi in Rwanda”** / **“Génocide perpétré contre les Tutsi au Rwanda en 1994”**. Keep the targeted group explicit.
2. Explain accurately that moderate Hutu and others who opposed the genocide were also murdered, without using that fact to blur the genocide against the Tutsi or create false equivalence.
3. Never assign collective guilt to all Hutu, Tutsi or any population group.
4. Do not speculate about who shot down the plane on 6 April 1994. Describe only what a cited source establishes; do not imply that a court finding exists unless a specific judgment supports it.
5. Separate documented facts, official positions, source interpretations, survivor testimony, allegations and judicial findings.
6. Every factual answer needs source IDs and exact webpage section, PDF page or case paragraph references. A source's existence alone does not support every claim in it.
7. Attribute casualty figures to the specific publisher and date. Do not merge figures from sources with different dates, scopes or methods.
8. Do not invent names, dates, quotes, locations, statistics, legal outcomes or links. When evidence is missing or sources conflict, say so clearly.
9. Use respectful, trauma-aware language. Do not lead with graphic detail or sensationalism. Give visitors a clear explanation and allow deeper detail when it is relevant to their question.
10. Keep source language distinct from answer language. Kinyarwanda, English and French explanations must be reviewed translations; do not call them official translations unless the publisher provides them.
11. Search-result snippets are discovery leads, not evidence. Live web research is not a substitute for a reviewed knowledge bank.
12. Sensitive or disputed entries require human historical and legal review before they are made available on the public website.

## Three-language requirement

Every public knowledge entry in Phase 2 must have:
- a Kinyarwanda explanation;
- an English explanation;
- a French explanation;
- the same historical meaning and evidence in all three;
- a shared source list and page / section references;
- matching follow-up questions and topic labels where practical.

If a source is available only in English, the answer may be translated by IWACU after review, but the UI must not imply that the English source itself was published in Kinyarwanda or French.

## Proposed knowledge coverage for Phase 2

The first reviewed content set should be split into small, linked topics rather than one long essay:

1. Meaning and naming of the Genocide against the Tutsi.
2. Historical background and discriminatory policies, with careful chronology and source distinctions.
3. Preparation before 1994: propaganda, organisation, incitement, militia and documented warning signs.
4. The Arusha Peace Agreement, UNAMIR and the context before April 1994.
5. 6 April and the beginning of the genocide on 7 April 1994.
6. How the genocide was carried out across the country, including attacks at places of refuge.
7. Victims, survivors, testimonies and consequences, presented with dignity.
8. Rescuers and acts of resistance, only where supported by reviewed records.
9. How the genocide was stopped and the events of July 1994.
10. Justice after the genocide: national courts, Gacaca and ICTR, with judicial sources.
11. Kwibuka, memorials, preservation of evidence, unity and prevention.
12. Frequently asked questions from visitors, with conversational follow-ups.

This list is a coverage plan, not a set of published or approved historical answers.

## Phase 1 and Phase 2 implementation status

### History iteration 1 — source audit

Completed:
- Added `src/lib/assistant/history-sources.ts`.
- Registered Government of Rwanda, CNLG/MINUBUMWE, UN and ICTR/IRMCT material.
- Added source-specific cautions, a source-language field and the editorial rules above.

### History iteration 2 — first reviewed trilingual corpus

Added:
- `src/lib/assistant/history-knowledge.ts`: eight deterministic history topics, each with Kinyarwanda, English and French answers, matching follow-up prompts, source IDs and visible page/section locators.
- `src/lib/assistant/history-knowledge.test.ts`: tests for the language variants, topic routing, source resolution, source locators, the 6 April crash uncertainty, indictment-versus-conviction wording, limited survivor-study scope and natural follow-ups.
- Updated `src/lib/assistant/knowledge.ts` and `src/lib/assistant/contracts.ts` so the existing Ishakiro knowledge route recognises and carries the eight new history topics through conversation context.
- Updated `src/lib/assistant/intent.test.ts` to cover Kinyarwanda, English and French history routing.
- Updated `package.json` so `npm run test:assistant` includes the new history tests.

The first eight topics are:
1. What the 1994 Genocide against the Tutsi was.
2. The legal definition of genocide under the 1948 UN Convention.
3. Historical background before 1994.
4. Preparation and warning signs, with claims attributed to the CNLG publication.
5. The events of 6 and 7 April 1994, explicitly preserving the UN record that the plane-crash cause remained unknown.
6. Justice after the genocide, including Gacaca and the ICTR.
7. Survivors, testimonies and consequences, with the CNLG study's sample limits stated.
8. Kwibuka and the commemoration period.

### Important coverage limits

This is an initial corpus increment, not the complete history of the genocide. It still does not provide a day-by-day explanation of every region and memorial site, a complete list of rescuers, a comprehensive July 1994 timeline, or the full story of post-genocide national justice. The Arusha/UNAMIR and 4 July entries added in history iteration 4 are short, source-bound explanations, not a comprehensive chronology. More detail needs its own page-level sources and review before being added.

The source documents located for this increment are primarily in English. IWACU's Kinyarwanda and French answers are explanatory translations, not official translations of those documents.

### Verification and release boundary

- History-content iterations 1–4 are recorded on `feature/ishakiro-genocide-history-phase1-20261120`.
- Latest fully tested commit: `05837322c63ea873d3d79d814b247ef9bd67d8a8`.
- Ishakiro assistant checks: **SUCCESS** — [run 44759624658](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/44759624658), including the 100+ question evaluation, location/UI contracts, TypeScript, ESLint and production build (no deploy).
- Accessibility and inclusion: **SUCCESS** — [run 44759624680](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/44759624680), including accessibility, offline service-worker, assistant regression, TypeScript, ESLint and production build (no deployment).
- Location engine: **SUCCESS** — [run 44759624662](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/44759624662), including location and locate-protection tests, accuracy guards, TypeScript, ESLint and production build.
- These checks validate code on the feature branch only. They do not mean this branch is live on the public website.
- No changes were made to Supabase schema/data, Production SQL, Vercel environment settings, model-provider keys or provider enablement.
- No merge to `main` or Production deployment has been performed. The Vercel Preview deployment remains disabled for this branch.

**Next step:** exercise the newly added Arusha/UNAMIR and 4 July topics through the complete intent-classification path, then continue with further source-checked history only where precise primary sources and human review are available.

### History iteration 3 — typo tolerance and conversational question forms

Added:
- `src/lib/assistant/query-normalization.ts`: accent folding, common joined-word handling, and a small reviewed set of common Kinyarwanda, English and French spelling corrections.
- The shared normalizer is used by history topic resolution and the general Ishakiro intent classifier, so it helps with place, leader and history questions rather than only the genocide corpus.
- One-character corrections are restricted to a reviewed vocabulary. Place names are not changed by this generic word corrector.
- `src/lib/assistant/place-facts.ts`: a separate bounded edit-distance lookup against the official offline administrative index. It corrects only a close name match and returns every equally close candidate. It does not select among duplicates.
- The engine uses that fallback when the live place search has no usable match, while preserving requested administrative levels and refusing ambiguous results.
- History routing recognises varied sentence structures and implicit follow-ups in Kinyarwanda, English and French, while requiring a Rwanda-history anchor before broad terms such as “history”, “planning” or “justice” can route to this sensitive topic.
- Tests were added for spelling mistakes, joined words, natural questions, follow-up context, unrelated-question isolation, place-name typos, adjacent-letter transpositions and ambiguous place names.

The correction layer is intentionally bounded. It does not freely rewrite sentences or infer a person/place from an uncertain match. When an administrative name is not uniquely close to an official indexed name, Ishakiro must ask for clarification or report that no verified match was found.


### History iteration 4 — Arusha, UNAMIR and the end of the genocide

Added:
- A source entry for the signed 4 August 1993 Arusha Peace Agreement from the UN Peacemaker archive.
- A separate UNAMIR mission-history source describing the original mission tasks and later Security Council mandate changes.
- A deterministic trilingual topic explaining the agreement's stated peace-process provisions and UNAMIR's role, without treating the agreement as a guarantee against genocide or as a court finding.
- A deterministic trilingual topic reporting the Government of Rwanda's account that the Genocide against the Tutsi was stopped and the country liberated on 4 July 1994.
- Tests for Kinyarwanda, English and French routing, answer wording, source attribution, source locators and contextual follow-ups.

These entries are limited explanations, not a complete account of the Arusha process, UNAMIR, the international response or every military event in 1994. Human historical review remains required before public release.


### History iteration 5 — spread of the genocide and places of refuge

Added:
- The UN Independent Commission of Experts' preliminary report S/1994/1125, dated 4 October 1994, with its stated 6 April–15 July 1994 mandate period.
- A deterministic trilingual topic that describes the Commission's account of the systematic targeting of Tutsi civilians in Kigali, roadblocks and identity checks, the attacks on people seeking refuge, and reports from other prefectures.
- Precise references to paragraphs 55–58 (Kigali and places of refuge) and 59–78 (reports from other prefectures), with the PDF page range included.
- Tests for Kinyarwanda, English and French question forms, source attribution, source locator presence and context-aware follow-ups.

Editorial boundary:
- S/1994/1125 is an interim investigative report, not a final criminal-court judgment.
- It is limited to the period 6 April–15 July 1994. The topic does not claim to be a complete list of every location or person affected.
- Incident-specific estimates included in the report must remain attributed to their underlying source. The answer does not aggregate them into a new national total.
- The report also contains separate discussion of allegations concerning violations by different forces. Those passages must not be conflated with the Commission's preliminary conclusion about the Genocide against the Tutsi or used to assign collective guilt.
- No responsibility for the 6 April 1994 aircraft crash is inferred from this source.

The PDF text is available through the UN Digital Library. The PDF screenshot endpoint did not return a readable page during this verification, so the page locators above are tied to the report's printed page labels and paragraph numbers in the extracted document text. Human historical review remains required before public release.


Verification on code commit `deb5edbbf786c505a0190d9dd34267d5ab0e8b06`:
- **Ishakiro assistant checks: SUCCESS** — [run 44763246592](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/44763246592). The assistant evaluation reported **315 tests passed, 0 failed**; the workflow also passed location/UI contracts, TypeScript, ESLint and the no-deploy production build.
- **Accessibility and inclusion checks: SUCCESS** — [run 44763246598](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/44763246598). Accessibility, offline service-worker, location and assistant regression tests passed, followed by TypeScript, ESLint and a production build with no deployment.
- **Location engine checks: SUCCESS** — [run 44763246767](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/44763246767). Location/locate-protection tests, accuracy guards, TypeScript, ESLint and production build passed.

All three workflows completed successfully on the same code SHA. A later documentation-only commit may update the branch head without changing the tested application code. This is not live-site acceptance: the public website has not been deployed from this branch, and the broader Ishakiro roadmap phase is not marked complete.

## 21 November 2026 — Rwanda Government account is the primary national-history reference

The project owner supplied the current Republic of Rwanda — About page text and directed that Ishakiro follow the national account as published by the Government of Rwanda. The source has been reviewed directly at:

- https://www.gov.rw/about
- Page sections used: History, Genocide, Kwibuka, and the Kigali Genocide Memorial entry.

For national-history and genocide-overview answers, use this source hierarchy:

1. Government of Rwanda public account (gov-rw-about-genocide) is the first source for the country's official historical narrative, terminology, national chronology, the Government's account of the 1994 Genocide against the Tutsi, the 100-day period, Kwibuka and 4 July.
2. Rwandan public institutions such as MINUBUMWE/CNLG, NISR, district institutions and official memorial bodies are the next sources for additional Rwandan institutional detail, original publications and local information.
3. International or foreign institutional records are used only when the question is specifically about a record held by that institution, such as the signed Arusha Agreement, the UNAMIR mandate or an ICTR judgment. Such information is explicitly attributed to that institution and must not replace or be presented as the Government of Rwanda's account.
4. If the selected Government or Rwandan institutional source does not provide the requested detail, Ishakiro must say that the detail is not established in that source. It must not fill the gap with a foreign-media interpretation or an unsupported claim.

No BBC source is included in the history-source registry or the official Rwanda history answer. The public answer must not imply that an international source is the Government of Rwanda's view.

### New reviewed coverage

- Added the Government-attributed, trilingual rwanda_official_history topic for the RANU (1979), RPF-Inkotanyi (1987), 1 October 1990 liberation struggle, the Government's account of 4 July 1994 and Government of National Unity, and the presidency chronology published for 2000, 2003, 2010 and 2017.
- Reworked the historical-background answer to start with the Government's account of the centralized monarchy, colonial administrations, targeting of Tutsi from 1959 and discrimination under the First and Second Republics; CNLG is retained as supplementary Rwandan institutional research.
- Reworked the genocide overview and preparation topics so the Government's account leads. The CNLG publication is used for deeper local institutional detail.
- Reworked the 7 April beginning answer to follow the Government's stated date. The Government page supplied for this work does not explain the 6 April aircraft crash or identify a responsible party, so Ishakiro says that detail is not established in that source rather than importing an outside attribution.
- Reworked Kwibuka to follow the Government's published 7 April–4 July commemoration period without adding an international framing to the answer.
- For geographic details on the spread of the genocide, the Government's national account is presented first. A separate interim UN commission report is clearly labelled as that commission's report, not the Government's narrative.
- Added source-priority and trilingual answer tests.

### Editorial safeguard

This is a source-attribution and product-content correction, not a legal opinion or a guarantee about how any particular statement may be treated under law. Sensitive, disputed or person-specific allegations still require an exact supporting document and appropriate human historical/legal review before publication.
