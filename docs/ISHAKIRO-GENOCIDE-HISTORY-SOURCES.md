# Ishakiro: Rwanda history knowledge — Phase 1 source audit

**Date:** 20 November 2026  
**Repository:** `eddyizere24-collab/Iwacu-Rwanda-`  
**Base commit:** `6e3a221ccd1d221aa0db067c42d62276008a4812`  
**Working branch:** `feature/ishakiro-genocide-history-phase1-20261120`  
**Scope:** source inventory and editorial safety rules only. No public answers, Production data, migrations, secrets, environment settings, or deployment are changed in this phase.

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

## Phase 1 completion boundary

Completed in this phase:
- added the typed source registry at `src/lib/assistant/history-sources.ts`;
- recorded source hierarchy, coverage and source-specific cautions;
- recorded editorial and legal-sensitivity rules;
- defined the trilingual requirement and the Phase 2 topic map.

Not done yet:
- no user-facing historical knowledge entries have been written;
- no intent routing, typo handling, fuzzy matching or general conversation code has been changed;
- no new package or provider has been enabled;
- no Supabase migration, Production SQL, environment variable, Vercel setting, merge to `main`, or Production deploy has been performed.

**Next phase:** produce a small, carefully cited trilingual corpus with page-level references and tests that prove each answer has evidence in all three languages.
