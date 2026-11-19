import { SITE_PAGES, SITE_PAGE_LABELS, SITE_PAGE_PATHS, type SitePageKey } from "../site-pages";
import type { AssistantSource } from "./contracts";

/**
 * Ishakiro explains the website itself to ANY visitor: how it knows where a person is, where
 * leaders' information comes from, what it does with personal data, how accurate it is.
 *
 * Nothing here is written for one organisation or one reader. Every answer is assembled from
 * the site's own published pages (src/lib/site-pages.ts) so the assistant can never say more,
 * or something different, than the website already says publicly in Kinyarwanda, English and French.
 */
export type SiteExplainerTopic =
  | "site_location"
  | "site_privacy"
  | "site_leaders"
  | "site_sources"
  | "site_accuracy"
  | "site_scope"
  | "site_ai";

type Language = "rw" | "en" | "fr";

const TOPICS: readonly SiteExplainerTopic[] = [
  "site_location", "site_privacy", "site_leaders", "site_sources", "site_accuracy", "site_scope", "site_ai",
];

export function isSiteExplainerTopic(value: unknown): value is SiteExplainerTopic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

interface SectionRef {
  page: SitePageKey;
  /** Index into the page's sections (same order in all three languages; checked by tests). */
  section: number;
  /** Also include the bullet items of the section. */
  items?: boolean;
}

interface TopicPlan {
  sections: SectionRef[];
  /** Pages whose "notice" box is added at the end. */
  notices?: SitePageKey[];
  suggestions: Record<Language, string[]>;
}

const PLANS: Record<SiteExplainerTopic, TopicPlan> = {
  site_location: {
    sections: [
      { page: "how-it-works", section: 0 },
      { page: "how-it-works", section: 1, items: true },
      { page: "privacy", section: 0 },
    ],
    suggestions: {
      rw: ["IWACU ibika ite amakuru yanjye bwite?", "Ukuri kw'ibisubizo bingana iki?"],
      en: ["What does IWACU do with my personal data?", "How accurate are the answers?"],
      fr: ["Que fait IWACU de mes données personnelles ?", "Les réponses sont-elles fiables ?"],
    },
  },
  site_privacy: {
    sections: [
      { page: "privacy", section: 0 },
      { page: "privacy", section: 3 },
    ],
    suggestions: {
      rw: ["IWACU imenya ite aho ndi?", "Amakuru y'abayobozi mukura he?"],
      en: ["How does IWACU know where I am?", "Where does the leaders' information come from?"],
      fr: ["Comment IWACU sait-il où je suis ?", "D'où viennent les informations sur les dirigeants ?"],
    },
  },
  site_leaders: {
    sections: [
      { page: "how-it-works", section: 2 },
      { page: "about", section: 2 },
      { page: "contact", section: 1 },
    ],
    notices: ["about"],
    suggestions: {
      rw: ["Inkomoko y'amakuru ya IWACU ni izihe?", "IWACU imenya ite aho ndi?"],
      en: ["What are IWACU's data sources?", "How does IWACU know where I am?"],
      fr: ["Quelles sont les sources de données d'IWACU ?", "Comment IWACU sait-il où je suis ?"],
    },
  },
  site_sources: {
    sections: [
      { page: "data-sources", section: 0 },
      { page: "data-sources", section: 1 },
      { page: "data-sources", section: 2 },
    ],
    suggestions: {
      rw: ["Amakuru y'abayobozi mukura he?", "Ukuri kw'ibisubizo bingana iki?"],
      en: ["Where does the leaders' information come from?", "How accurate are the answers?"],
      fr: ["D'où viennent les informations sur les dirigeants ?", "Les réponses sont-elles fiables ?"],
    },
  },
  site_accuracy: {
    sections: [
      { page: "how-it-works", section: 1, items: true },
      { page: "about", section: 1 },
    ],
    notices: ["about"],
    suggestions: {
      rw: ["IWACU imenya ite aho ndi?", "Inkomoko y'amakuru ya IWACU ni izihe?"],
      en: ["How does IWACU know where I am?", "What are IWACU's data sources?"],
      fr: ["Comment IWACU sait-il où je suis ?", "Quelles sont les sources de données d'IWACU ?"],
    },
  },
  site_scope: {
    sections: [
      { page: "about", section: 2 },
      { page: "about", section: 0, items: true },
    ],
    suggestions: {
      rw: ["IWACU imenya ite aho ndi?", "IWACU ibika ite amakuru yanjye bwite?"],
      en: ["How does IWACU know where I am?", "What does IWACU do with my personal data?"],
      fr: ["Comment IWACU sait-il où je suis ?", "Que fait IWACU de mes données personnelles ?"],
    },
  },
  site_ai: {
    sections: [
      { page: "how-it-works", section: 3 },
      { page: "privacy", section: 3 },
    ],
    suggestions: {
      rw: ["Amakuru y'abayobozi mukura he?", "IWACU ibika ite amakuru yanjye bwite?"],
      en: ["Where does the leaders' information come from?", "What does IWACU do with my personal data?"],
      fr: ["D'où viennent les informations sur les dirigeants ?", "Que fait IWACU de mes données personnelles ?"],
    },
  },
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[’‘]/g, "'").replace(/[!?.,;:()[\]{}"]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function detectLanguage(text: string): Language {
  if (/\b(comment|vous|votre|vos|est ce|donnees|ce site|pourquoi|quelles?|d'ou|fiable|dirigeants|sait il|mes)\b/.test(text)) return "fr";
  if (/\b(how|what|where|why|who|do you|does|is it|are you|your|the|my|about|accurate|leaders)\b/.test(text)) return "en";
  return "rw";
}

// Words that show the person is asking about the website/assistant itself, not about a place or a leader.
const ABOUT_SITE = /\b(iwacu|urubuga|ishakiro|website|site|platform|application|app|assistant|chatbot|you|your|vous|votre|mwe|mukoresha|mubika|mubibika|murinda|mumenya|mukura|mwakuye|mutanga|mubungabunga|mwizeza|mushingira|where does|data come from|d'ou viennent|inkomoko)\b/;

const HOW = /\b(ute|gute|mute|rute|how|comment|ikora|rukora|ikoresha|rukoresha|work|works|know|knows|determine|detect|trouve|savoir|sait|mumenya|rumenya|umenya|menya)\b/;

/** Which question about the site is this? null when it is not a question about the site. */
export function resolveSiteExplainerTopic(query: string): SiteExplainerTopic | null {
  const text = normalize(query);
  if (!ABOUT_SITE.test(text)) return null;

  const leaders = /\b(abayobozi|leaders?|dirigeants?)\b/.test(text);
  const leaderTrust = /\b(mubungabunga|mubika|mukura|mwakuye|muyakura|yaturutse|aturuka|inkomoko|yemejwe|bwizewe|ukuri|nyakuri|verified|verify|confirm|source|sources|accurate|reliable|trust|maintain|manage|keep|update|come from|get|obtenez|verifiez|fiable|mettez a jour|geres?|viennent|vient|d'ou)\b/.test(text);
  if (leaders && leaderTrust) return "site_leaders";

  const privacy = /\b(amakuru bwite|bwite|ibanga|ibika|ibitse|irinda|privacy|personal data|personal information|donnees personnelles|vie privee|confidentialite|data protection|mubika|mubibika|mukoresha amakuru|mugurisha|mutanga amakuru|stockez|conservez|collectez|partagez|vendez)\b/.test(text)
    || /\bdo you (?:store|keep|save|collect|share|sell) (?:my|your|any|personal|data|location|information)\b/.test(text);
  if (privacy) return "site_privacy";

  const aiTopic = /\b(ishakiro|iwacu ai|assistant|ubwenge bwa ai|ubwenge bw'ikoranabuhanga|intelligence artificielle|chatbot)\b/.test(text);
  const aiHow = /\b(ihimba|rihimba|rirahimba|irahimba|ihimbira|yihimbira|mwihimbira|make things up|makes things up|invent|inventez|invente|hallucin|rikora ite|rikora gute|ikora ite|ikora gute|how does|how do|how is|comment fonctionne|fiable|ukuri|accurate|reliable|trust)\b/.test(text);
  if (aiTopic && aiHow) return "site_ai";

  const scope = /\b(urubuga rwa leta|rwa leta|ni urwa leta|government site|government website|government owned|official government|is it official|ni ubuyobozi|site du gouvernement|site officiel|officiel|independent|rwigenga|who (?:made|owns|runs|created|built|is behind)|nyiri|rwubatswe na nde|rwakozwe na nde|uwarwubatse|qui a cree|qui est derriere|appartient)\b/.test(text);
  if (scope) return "site_scope";

  const sources = /\b(inkomoko|source|sources|amakuru ava he|amakuru aturuka he|mukura he|data come from|where does .{0,30} data|d'ou viennent)\b/.test(text);
  if (sources) return "site_sources";

  const accuracy = /\b(ukuri|nyakuri|bwizewe|ntibyibeshya|yibeshya|yibeshye|accurate|accuracy|reliable|precis|precision|fiable|trust|mu nzu|indoors|inside buildings)\b/.test(text);
  if (accuracy) return "site_accuracy";

  const whereAmI = /\b(aho ndi|aho uri|aho umuntu ari|aho telefone iri|my location|where i am|my position|where you are|ou je suis|ma position|ma localisation|ou vous etes|my phone)\b/.test(text);
  if (whereAmI && HOW.test(text)) return "site_location";

  return null;
}

/** True for "how does the site work" questions, so the UI never mistakes them for "find my village". */
export function isSiteExplanationQuestion(query: string): boolean {
  return resolveSiteExplainerTopic(query) !== null;
}

export interface SiteExplainerReply {
  topic: SiteExplainerTopic;
  answer: string;
  confidenceLabel: string;
  sources: AssistantSource[];
  suggestions: string[];
}

function pageUpdated(page: SitePageKey, language: Language): string | null {
  const updated = SITE_PAGES[language][page].updated;
  const match = updated.match(/(\d{1,2}) (\p{L}+) (\d{4})/u);
  if (!match) return null;
  const months: Record<string, string> = {
    Ugushyingo: "11", November: "11", novembre: "11",
  };
  const month = months[match[2]];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : null;
}

export function getSiteExplainerReply(topic: SiteExplainerTopic, query: string): SiteExplainerReply {
  const language = detectLanguage(normalize(query));
  const plan = PLANS[topic];
  const parts: string[] = [];
  const pages: SitePageKey[] = [];

  for (const ref of plan.sections) {
    const section = SITE_PAGES[language][ref.page].sections[ref.section];
    if (!section) continue;
    let text = section.body;
    if (ref.items && section.items?.length) text += "\n" + section.items.map((item) => "• " + item).join("\n");
    parts.push(text);
    if (!pages.includes(ref.page)) pages.push(ref.page);
  }
  for (const page of plan.notices ?? []) {
    const notice = SITE_PAGES[language][page].notice;
    if (notice) parts.push(notice.title + ": " + notice.body);
  }

  const sources: AssistantSource[] = pages.map((page) => ({
    label: "IWACU RWANDA — " + SITE_PAGE_LABELS[language][page],
    data_date: pageUpdated(page, language),
    url: "https://iwacu-rwanda-2.vercel.app" + SITE_PAGE_PATHS[page] + "?lang=" + language,
  }));

  const confidenceLabel = language === "en"
    ? "Taken from IWACU RWANDA's own published pages (listed below), so it says no more and no less than the website says publicly."
    : language === "fr"
      ? "Tiré des pages publiées d'IWACU RWANDA (listées ci-dessous) : la réponse ne dit ni plus ni moins que le site."
      : "Bikuwe ku mapaji IWACU RWANDA yasohoye (ari hasi), bityo nta kintu cyahimbwe cyangwa cyongewemo.";

  return { topic, answer: parts.join("\n\n"), confidenceLabel, sources, suggestions: plan.suggestions[language] };
}
