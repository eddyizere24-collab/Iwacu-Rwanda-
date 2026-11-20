/**
 * Verified source registry for Ishakiro's Rwanda-history knowledge.
 *
 * Phase 1 (2026-11-20): source inventory and editorial guardrails only.
 * These records do not yet create user-facing historical answers. Phase 2 will
 * add reviewed trilingual knowledge entries that cite these source IDs.
 *
 * Keep source language separate from answer language. A Kinyarwanda/French
 * answer translated by IWACU must never be presented as a quotation or as an
 * official translation unless the source itself supplies that translation.
 */

export type HistorySourceRole =
  | "rwanda_government_primary"
  | "rwanda_institutional_research"
  | "international_judicial_record"
  | "un_intergovernmental_record";

export type HistorySourceLanguage = "rw" | "en" | "fr";

export interface RwandaHistorySource {
  id: string;
  title: string;
  publisher: string;
  role: HistorySourceRole;
  sourceLanguage: HistorySourceLanguage;
  publishedDate: string | null;
  url: string;
  coverage: readonly string[];
  editorialCautions: readonly string[];
}

export const RWANDA_HISTORY_SOURCE_REGISTRY: readonly RwandaHistorySource[] = [
  {
    id: "gov-rw-about-genocide",
    title: "About the Government of Rwanda — Genocide and Kwibuka",
    publisher: "Government of Rwanda",
    role: "rwanda_government_primary",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://www.gov.rw/about",
    coverage: [
      "official public terminology for the 1994 Genocide against the Tutsi",
      "national commemoration beginning on 7 April",
      "the 100-day period and the official national account of more than one million victims",
      "the end of the genocide and liberation on 4 July",
      "the purpose of Kwibuka and preservation of historical evidence",
    ],
    editorialCautions: [
      "The page does not provide a complete academic chronology or full citations for every historical claim.",
      "Use it as the primary source for the Government of Rwanda's official public account, not as a substitute for court judgments or detailed archival research.",
    ],
  },
  {
    id: "minubumwe-cnlg-preparation-execution-2021",
    title: "Rwanda 1991–1994: Preparation and Execution of the Genocide Perpetrated Against Tutsi in Rwanda",
    publisher: "National Commission for the Fight against Genocide (CNLG), archived by MINUBUMWE",
    role: "rwanda_institutional_research",
    sourceLanguage: "en",
    publishedDate: "2021-01",
    url: "https://www.minubumwe.gov.rw/fileadmin/user_upload/MINUBUMWE/Archives/CNLG_Archives/CNLG_Publications/ENGLISH_final.pdf",
    coverage: [
      "documented preparations and execution described for 1991–1994",
      "extremist propaganda, militia organisation and weapons distribution",
      "events before 7 April 1994 and the implementation of the genocide",
      "regional and local case studies, with page-specific detail",
    ],
    editorialCautions: [
      "This is a detailed institutional publication. Any claim naming an individual, assigning a specific act, or describing a disputed event must be checked against the cited pages and, where relevant, judicial records.",
      "Do not turn a source author's allegation or historical interpretation into a court-established finding.",
      "Cite the exact page or section in each knowledge entry; do not cite the whole PDF as if it supported every detail.",
    ],
  },
  {
    id: "minubumwe-cnlg-survivor-testimonies-2017",
    title: "Testimonies and Needs of Genocide Survivors",
    publisher: "National Commission for the Fight against Genocide (CNLG), in collaboration with The Ohio State University and the University of Minnesota; archived by MINUBUMWE",
    role: "rwanda_institutional_research",
    sourceLanguage: "en",
    publishedDate: "2017-05",
    url: "https://www.minubumwe.gov.rw/fileadmin/user_upload/MINUBUMWE/Archives/CNLG_Archives/CNLG_Publications/Testimonies_and_Needs_of_Genocide_Survivors__2017.pdf",
    coverage: [
      "survivor testimony and documented experiences before, during and after the genocide",
      "consequences for survivors and their needs",
      "Gacaca experiences and justice after the genocide",
      "research method and ethical considerations described by the study",
    ],
    editorialCautions: [
      "The study interviewed a defined sample; its participants' views must not be represented as the views of every survivor.",
      "Treat survivor testimony with dignity. Do not expose personal details unnecessarily or use graphic descriptions as default chat content.",
      "Use page-level citations and preserve the context in which each testimony was collected.",
    ],
  },
  {
    id: "un-rwanda-historical-background",
    title: "Rwanda: A Brief History of the Country",
    publisher: "United Nations — Outreach Programme on the Rwanda Genocide",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://www.un.org/en/preventgenocide/rwanda/historical-background.shtml",
    coverage: [
      "historical background and colonial administration",
      "events in the late 1950s and the displacement of Rwandans",
      "the 1990 war, 1993 Arusha Peace Agreement and UNAMIR context",
      "historical context for the genocide and post-genocide justice mechanisms",
    ],
    editorialCautions: [
      "This is an older UN historical overview. Check its publication date and corroborate detailed or contested claims with current official records and judicial sources.",
      "Do not reuse the casualty estimate on this older page as a current official figure; explain the source and date when discussing estimates.",
    ],
  },
  {
    id: "un-rwanda-genocide-backgrounders",
    title: "Rwanda Genocide — Backgrounders",
    publisher: "United Nations — Outreach Programme on the Rwanda Genocide",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://www.un.org/en/preventgenocide/rwanda/backgrounders.shtml",
    coverage: [
      "international response and the events of 1994",
      "the United Nations peacekeeping mandate and failures described by the UN",
      "context for international prevention and remembrance",
    ],
    editorialCautions: [
      "The page contains an older casualty estimate. Do not silently combine it with a different estimate from another source.",
      "Use it for the historical account of the UN response, identifying it as the UN's account.",
    ],
  },
  {
    id: "un-2024-kwibuka-30",
    title: "United Nations remembers 1994 genocide against Tutsi in Rwanda",
    publisher: "United Nations",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: "2024-04-01",
    url: "https://www.un.org/en/node/215825",
    coverage: [
      "UN commemoration of the 30th anniversary",
      "official UN remembrance language and the start of the genocide on 7 April 1994",
      "recognition of victims and survivors",
    ],
    editorialCautions: [
      "Use for the UN's commemoration and public account; it is not a detailed event-by-event chronology.",
    ],
  },
  {
    id: "rwanda-un-2025-kwibuka31-statement",
    title: "The 31st Commemoration of the 1994 Genocide against the Tutsi in Rwanda at the United Nations General Assembly",
    publisher: "Permanent Mission of the Republic of Rwanda to the United Nations",
    role: "rwanda_government_primary",
    sourceLanguage: "en",
    publishedDate: "2025-04-07",
    url: "https://www.rwandainun.gov.rw/index.php?eID=dumpFile&f=124598&t=f&token=3df58030097ea0c45aedeae3ba349407b9ef1659",
    coverage: [
      "Rwanda's official statement at the UN for Kwibuka 31",
      "remembrance, unity, renewal and the continuing responsibility to prevent genocide",
      "the Government of Rwanda's account of planning, hatred and the international response",
    ],
    editorialCautions: [
      "This is an official national statement and should be attributed as Rwanda's position.",
      "Do not present statements from a commemorative address as an independent judicial finding.",
    ],
  },
  {
    id: "ictr-irmct-genocide-overview",
    title: "The Genocide — legacy website of the International Criminal Tribunal for Rwanda",
    publisher: "United Nations International Criminal Tribunal for Rwanda / International Residual Mechanism for Criminal Tribunals",
    role: "international_judicial_record",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://unictr.irmct.org/en/genocide",
    coverage: [
      "the ICTR's historical overview of the events beginning on 6–7 April 1994",
      "the Arusha Accords context",
      "the categories of crimes tried by the ICTR",
      "the Tribunal's legacy and related case materials",
    ],
    editorialCautions: [
      "For findings about a named person's criminal responsibility, cite the actual judgment or case record, not this overview page alone.",
      "The page gives an older range for the number killed; do not merge it with other estimates without explaining the source and date.",
    ],
  },
] as const;

export const RWANDA_HISTORY_EDITORIAL_RULES = [
  "Use the official name: '1994 Genocide against the Tutsi in Rwanda' / 'Jenoside yakorewe Abatutsi mu 1994'.",
  "Keep the Tutsi as the principal targeted group explicit. Also accurately explain that moderate Hutu and others who opposed the genocide were murdered; never use that fact to blur or relativise the genocide against the Tutsi.",
  "Never assign collective guilt to all Hutu, Tutsi or any other population group.",
  "Do not speculate about responsibility for the 6 April 1994 plane crash. Describe only what a cited source establishes and state when responsibility has not been established by a cited judicial finding.",
  "Separate established historical facts, a source's interpretation, survivor testimony, allegations and court findings.",
  "For casualty figures, show the named source and date. Do not combine estimates from sources with different dates, scope or methods into one unsupported number.",
  "Every factual answer must carry the source IDs and precise page, section or official webpage used.",
  "Do not invent dates, names, quotations, places, statistics, court outcomes or source links. If evidence is absent or conflicting, say so.",
  "Use respectful, trauma-aware language. Do not lead with graphic detail; answer the question asked and offer further depth without sensationalism.",
  "Keep the source's original language separate from IWACU's reviewed Kinyarwanda, English and French explanation. Never label an IWACU translation as an official translation.",
  "Do not enable live web research as a substitute for reviewed historical knowledge. Search results are leads, not historical evidence.",
  "Require human historical and legal review before publishing sensitive or disputed entries to the public site.",
] as const;
