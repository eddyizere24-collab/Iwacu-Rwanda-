/**
 * Verified source registry for Ishakiro's Rwanda-history knowledge.
 *
 * History iteration 1 (2026-11-20): source inventory and editorial guardrails.
 * History iteration 2 adds a reviewed trilingual knowledge corpus that cites these source
 * IDs and exact page/section locators. New entries must follow the same rules.
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
    url: "https://www.minubumwe.gov.rw/fileadmin/user_upload/MINUBUMWE/Publications/BOOKS_ON_GENOCIDE_AGAINST_TUTSI/PREPARATION_AND_EXECUTION_OF_THE_GENOCIDE_PERPETRATED_AGAINST_TUTSI_IN_RWANDA.pdf",
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
    id: "un-genocide-convention-1948",
    title: "Convention on the Prevention and Punishment of the Crime of Genocide",
    publisher: "United Nations",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: "1948-12-09",
    url: "https://www.un.org/en/genocide-prevention/1948-convention",
    coverage: [
      "international legal definition of genocide in Article II",
      "the obligation to prevent and punish genocide under Article I",
      "punishable acts listed in Article III",
    ],
    editorialCautions: [
      "Explain the legal definition accurately, including the specific intent to destroy a protected group in whole or in part.",
      "Do not treat every mass killing or grave human-rights violation as genocide without the legal elements.",
      "This is the treaty text; case-specific legal conclusions require relevant judgments and applicable law.",
    ],
  },
  {
    id: "un-genocide-definition",
    title: "Definitions of Genocide and Related Crimes",
    publisher: "United Nations Office on Genocide Prevention and the Responsibility to Protect",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://www.un.org/en/genocide-prevention/definition",
    coverage: [
      "the legal elements of genocide under Article II of the Genocide Convention",
      "the distinction between special intent and the prohibited acts",
      "the difference between genocide and other crimes under international law",
    ],
    editorialCautions: [
      "Present the Convention's legal test, not a simplified political slogan.",
      "A legal finding in a particular case must be attributed to the competent court and its judgment.",
    ],
  },
  {
    id: "un-peacemaker-arusha-1993",
    title: "Peace Agreement between the Government of the Republic of Rwanda and the Rwandese Patriotic Front",
    publisher: "United Nations Peacemaker",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: "1993-08-04",
    url: "https://peacemaker.un.org/sites/default/files/document/files/2024/05/rw930804peaceagreementrwanda-rwandesepatrioticfront.pdf",
    coverage: [
      "the Peace Agreement signed at Arusha on 4 August 1993",
      "the parties' stated purpose of ending the war through a negotiated settlement",
      "the ceasefire, rule-of-law, power-sharing, refugee-return and armed-forces integration protocols incorporated into the Agreement",
      "the transition institutions and implementation provisions in the signed text",
    ],
    editorialCautions: [
      "Use the signed agreement for what its text says; do not portray it as a guarantee that the genocide would not occur or as a finding about genocide crimes.",
      "Keep the Arusha peace process and the later Genocide against the Tutsi analytically distinct while explaining their historical chronology.",
      "Cite the relevant article or protocol rather than treating the entire agreement as support for every claim.",
    ],
  },
  {
    id: "un-unamir-mandate-history",
    title: "United Nations Assistance Mission for Rwanda (UNAMIR) — Mission, mandate and timeline",
    publisher: "United Nations Department of Peacekeeping Operations",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://peacekeeping.un.org/sites/default/files/past/unamirM.htm",
    coverage: [
      "UNAMIR's establishment under Security Council resolution 872 (1993) on 5 October 1993",
      "the original tasks related to security in Kigali, monitoring the ceasefire, the transitional-government period, mine clearance and humanitarian coordination",
      "Security Council resolutions 912 (1994) and 918 (1994) and the changes to the mission's mandate after renewed fighting",
    ],
    editorialCautions: [
      "Distinguish the mission's original mandate from the mandates later adjusted during 1994.",
      "Do not imply that UNAMIR had an unlimited mandate or capacity to prevent or stop every act of violence.",
      "Use this as the UN's institutional record of its peacekeeping mission.",
    ],
  },
  {
    id: "un-unamir-mandate-and-crash",
    title: "United Nations Assistance Mission for Rwanda (UNAMIR) — Background and mandate",
    publisher: "United Nations Department of Peacekeeping Operations",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://peacekeeping.un.org/sites/default/files/past/unamirFT.htm",
    coverage: [
      "UNAMIR established by Security Council resolution 872 (1993) on 5 October 1993",
      "the mission's original mandate to support implementation of the Arusha Peace Agreement",
      "the 6 April 1994 aircraft crash carrying the Presidents of Rwanda and Burundi",
      "the UN record that the cause of the crash remained unknown because a full investigation was not possible",
      "changes to UNAMIR's mandate during April and May 1994",
    ],
    editorialCautions: [
      "The UN page says a full investigation of the crash cause was not possible and that the cause remained unknown. Do not speculate or attribute responsibility without a specific reliable judicial finding.",
      "Use this as the UN's institutional record of its mission and mandate; it does not replace national or independent historical research.",
      "The page includes historical casualty estimates that differ from later official figures; do not silently merge them.",
    ],
  },
  {
    id: "ictr-key-figures-2019",
    title: "Key Figures of Cases — International Criminal Tribunal for Rwanda",
    publisher: "United Nations International Criminal Tribunal for Rwanda / International Residual Mechanism for Criminal Tribunals",
    role: "international_judicial_record",
    sourceLanguage: "en",
    publishedDate: "2019-10",
    url: "https://unictr.irmct.org/en/cases/key-figures-cases",
    coverage: [
      "ICTR case statistics as last updated in October 2019",
      "93 individuals indicted by the Tribunal",
      "the recorded status of concluded proceedings, acquittals and referrals",
    ],
    editorialCautions: [
      "Statistics are explicitly time-stamped to the page's October 2019 update; do not describe them as current case statistics.",
      "An indictment is an accusation, not proof of guilt. Preserve acquittals and other case outcomes accurately.",
    ],
  },
  {
    id: "ictr-akayesu-first-genocide-judgment",
    title: "Historic judgement finds Akayesu guilty of genocide",
    publisher: "United Nations International Criminal Tribunal for Rwanda",
    role: "international_judicial_record",
    sourceLanguage: "en",
    publishedDate: "1998-09-02",
    url: "https://unictr.irmct.org/en/news/historic-judgement-finds-akayesu-guilty-genocide",
    coverage: [
      "the ICTR Trial Chamber I judgment of 2 September 1998",
      "Jean-Paul Akayesu's conviction for genocide and crimes against humanity",
      "the court's findings on sexual violence in the case",
    ],
    editorialCautions: [
      "Attribute findings only to the Akayesu case and the Trial Chamber.",
      "Do not generalize facts found in one case to every locality, individual or victim.",
      "For exact legal holdings, use the full judgment and paragraph numbers rather than this press release alone.",
    ],
  },
  {
    id: "un-rwanda-genocide-programme",
    title: "Outreach Programme on the Rwanda Genocide and the United Nations",
    publisher: "United Nations",
    role: "un_intergovernmental_record",
    sourceLanguage: "en",
    publishedDate: null,
    url: "https://www.un.org/en/preventgenocide/rwanda/index.shtml",
    coverage: [
      "7 April as the start of the 1994 Genocide against the Tutsi and the UN International Day of Reflection",
      "annual United Nations remembrance and education about the genocide",
      "recognition of victims and survivors",
    ],
    editorialCautions: [
      "Use for the UN's remembrance date and public educational programme; it is not a detailed event-by-event chronology.",
      "Where the page states casualty figures, show the source and date and do not merge historical estimates with Rwanda's current official wording.",
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
