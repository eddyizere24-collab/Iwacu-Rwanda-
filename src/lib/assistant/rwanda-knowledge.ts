import { getSitePage, SITE_PAGE_PATHS, type SitePageKey } from "@/lib/site-pages";
import type { Locale } from "@/lib/i18n";
import { findAdministrativeScopeCodesByName, getPlaceHierarchyFact } from "./place-facts";

export interface RwandaKnowledgeAnswer {
  answer: string;
  status: "success" | "partial";
  confidence: "high" | "medium";
  confidenceLabel: string;
  source: { label: string; dataDate: string | null; url: string; trustTier: "official_government" | "other" };
  suggestions: string[];
  capability: string;
}

const VERIFIED_ON = "Yagenzuwe ku wa 11/11/2026.";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[!?.,;:()[\]{}]/g, " ").replace(/\s+/g, " ").trim();
}

function localeOf(query: string): Locale {
  const value = normalize(query);
  if (/\b(what is|who are|tell me|about|how does|purpose|website|city of|district of)\b/.test(value)) return "en";
  if (/\b(qu'est|quest ce|c'est quoi|presente|a propos|comment fonctionne|pourquoi|ville de)\b/.test(value)) return "fr";
  return "rw";
}

function subjectOf(query: string): string {
  return normalize(query)
    .replace(/^(?:ese|mbwira|nsobanurira|sobanurira|tell me about|explain|what is|what are|who is|about|c'est quoi|qu'est ce qu'un|qu'est ce qu'une|qu'est-ce qu'un|qu'est-ce qu'une|qu'est ce que|qu'est-ce que|presente moi|parle moi de)\s+/, "")
    .replace(/\s+(?:ni iki|niki|ni iki se|ni iki koko|iki|what is|what are|is what|are what|c'est quoi|qu'est ce que|qu'est-ce que)\s*$/, "")
    .replace(/^(?:akarere ka|district of|district de)\s+/, "")
    .replace(/^(?:intara ya|province of|province de)\s+/, "")
    .replace(/^(?:umurenge wa|secteur de|sector of)\s+/, "")
    .replace(/^(?:akagari ka|cellule de|cell of)\s+/, "")
    .replace(/^(?:umudugudu wa|village de|village of)\s+/, "")
    .replace(/^(?:umujyi wa|city of|ville de)\s+/, "")
    .replace(/^(?:u\s+rwanda|republic of rwanda|republique du rwanda)$/, "rwanda")
    .trim();
}

function sitePageFor(query: string): SitePageKey {
  const value = normalize(query);
  if (/\b(privacy|ibanga|amakuru bwite|confidentialite|donnees personnelles)\b/.test(value)) return "privacy";
  if (/\b(inkomoko|source|sources|data|amakuru aturuka|provenance)\b/.test(value)) return "data-sources";
  if (/\b(inzego z'u rwanda|administration|ubuyobozi bw'u rwanda)\b/.test(value)) return "rwanda-administration";
  if (/\b(uko|how|comment|location|gps|ikora|ikorwa|gukoresha|ishakiro)\b/.test(value)) return "how-it-works";
  if (/\b(contact|twandikire|email|telefone)\b/.test(value)) return "contact";
  if (/\b(terms|amabwiriza|conditions)\b/.test(value)) return "terms";
  return "about";
}

const STATIC_KNOWLEDGE: Record<string, {
  answer: Record<Locale, string>;
  label: string;
  url: string;
}> = {
  rwanda: {
    answer: {
      rw: "U Rwanda ni igihugu kigenga giherereye muri Afurika yo Hagati, mu karere k'Ibiyaga Bigari. Ntigira inkombe z'inyanja. Ruhana imbibi na Uganda mu majyaruguru, Tanzania mu burasirazuba, u Burundi mu majyepfo na Repubulika Iharanira Demokarasi ya Kongo mu burengerazuba. Umurwa mukuru ni Kigali. Izina ryemewe ni Repubulika y'u Rwanda.",
      en: "Rwanda is an independent, landlocked country in Central Africa, in the Great Lakes region. It borders Uganda to the north, Tanzania to the east, Burundi to the south and the Democratic Republic of the Congo to the west. Its capital is Kigali. Its official name is the Republic of Rwanda.",
      fr: "Le Rwanda est un pays indépendant enclavé d'Afrique centrale, dans la région des Grands Lacs. Il partage ses frontières avec l'Ouganda au nord, la Tanzanie à l'est, le Burundi au sud et la République démocratique du Congo à l'ouest. Sa capitale est Kigali. Son nom officiel est la République du Rwanda.",
    },
    label: "Government of Rwanda — About Rwanda",
    url: "https://www.gov.rw/about",
  },
  kigali: {
    answer: {
      rw: "Kigali ni umurwa mukuru w'u Rwanda. Mu nzego z'ubuyobozi, Kigali yitwa Umujyi wa Kigali kandi iri ku rwego rumwe n'Intara, ariko si Intara ya gatanu. Igizwe n'Uturere dutatu: Gasabo, Kicukiro na Nyarugenge.",
      en: "Kigali is the capital city of Rwanda. Administratively, it is the City of Kigali, a first-level entity alongside the four provinces, not a fifth province. It is made up of three districts: Gasabo, Kicukiro and Nyarugenge.",
      fr: "Kigali est la capitale du Rwanda. Sur le plan administratif, elle constitue la Ville de Kigali, une entité de premier niveau au même rang que les quatre provinces, mais elle n'est pas une cinquième province. Elle comprend trois districts : Gasabo, Kicukiro et Nyarugenge.",
    },
    label: "City of Kigali — Overview",
    url: "https://www.kigalicity.gov.rw/about/overview",
  },
  nyamasheke: {
    answer: {
      rw: "Nyamasheke ni Akarere ko mu Ntara y'Iburengerazuba bw'u Rwanda. Kagizwe n'Imirenge 15. Gahana imbibi na Rusizi mu majyepfo, Karongi mu majyaruguru, Nyamagabe mu burasirazuba na Repubulika Iharanira Demokarasi ya Kongo mu burengerazuba. Aka karere kazwi kandi kubera Pariki ya Nyungwe, Ikiyaga cya Kivu, ubuhinzi bw'icyayi n'ikawa.",
      en: "Nyamasheke is a district in Rwanda's Western Province. The district website lists 15 sectors. It borders Rusizi to the south, Karongi to the north, Nyamagabe to the east and the Democratic Republic of the Congo to the west. It is also known for Nyungwe National Park, Lake Kivu, and tea and coffee farming.",
      fr: "Nyamasheke est un district de la Province de l'Ouest du Rwanda. Le site du district indique 15 secteurs. Il est limitrophe de Rusizi au sud, Karongi au nord, Nyamagabe à l'est et de la République démocratique du Congo à l'ouest. Il est également connu pour le parc national de Nyungwe, le lac Kivu et la culture du thé et du café.",
    },
    label: "Nyamasheke District — About Nyamasheke District",
    url: "https://www.nyamasheke.gov.rw/en/district/about-nyamasheke",
  },
};

const ADMIN_LEVELS: Record<string, Record<Locale, string>> = {
  igihugu: {
    rw: "Igihugu ni urwego rw'ubuyobozi ruri hejuru y'Intara n'Umujyi wa Kigali.",
    en: "A country is the highest national level of government and territorial administration.",
    fr: "Le pays constitue le niveau national le plus élevé de l'administration territoriale.",
  },
  intara: {
    rw: "Intara ni urwego rw'ubuyobozi ruri munsi y'Igihugu, rukurikirwa n'Uturere. U Rwanda rufite Intara enye, hiyongereyeho Umujyi wa Kigali uri ku rwego rumwe na zo.",
    en: "A province is an administrative level below the country and above districts. Rwanda has four provinces, alongside the City of Kigali at the same level.",
    fr: "Une province est un niveau administratif situé sous le pays et au-dessus des districts. Le Rwanda compte quatre provinces, auxquelles s'ajoute la Ville de Kigali au même niveau.",
  },
  akarere: {
    rw: "Akarere ni urwego rw'ubuyobozi ruri munsi y'Intara cyangwa Umujyi wa Kigali, rugizwe n'Imirenge.",
    en: "A district is an administrative level below a province or the City of Kigali and is made up of sectors.",
    fr: "Un district est un niveau administratif situé sous une province ou la Ville de Kigali et composé de secteurs.",
  },
  umurenge: {
    rw: "Umurenge ni urwego rw'ubuyobozi ruri munsi y'Akarere, rugizwe n'Utugari.",
    en: "A sector is an administrative level below a district and is made up of cells.",
    fr: "Un secteur est un niveau administratif situé sous un district et composé de cellules.",
  },
  akagari: {
    rw: "Akagari ni urwego rw'ubuyobozi ruri munsi y'Umurenge, rugizwe n'Imidugudu.",
    en: "A cell is an administrative level below a sector and is made up of villages.",
    fr: "Une cellule est un niveau administratif situé sous un secteur et composée de villages.",
  },
  umudugudu: {
    rw: "Umudugudu ni urwego ruto ruri hasi mu nzego z'ubuyobozi z'ahantu zigaragazwa na IWACU.",
    en: "A village is the smallest local administrative unit shown in IWACU's administrative hierarchy.",
    fr: "Le village est la plus petite unité administrative locale présentée dans la hiérarchie administrative d'IWACU.",
  },
};

function source(label: string, url: string, official = true) {
  return {
    label,
    dataDate: VERIFIED_ON,
    url,
    trustTier: official ? "official_government" as const : "other" as const,
  };
}

export function answerRwandaKnowledge(question: string): RwandaKnowledgeAnswer | null {
  const locale = localeOf(question);
  const subject = subjectOf(question);
  const text = normalize(question);

  if (/\b(iwacu|ishakiro|urubuga|uru rubuga|urubuga rwanyu|platform|website|site web|objectif|intego|rugamije|ikora iki|what does .* do|purpose of|about iwacu)\b/.test(text)) {
    const pageKey = sitePageFor(question);
    const page = getSitePage(pageKey, locale);
    const relevant = page.sections.slice(0, pageKey === "about" ? 3 : 2)
      .map((section) => section.title + ": " + section.body + (section.items?.length ? " " + section.items.join("; ") : ""))
      .join(" ");
    const answer = [page.lead, relevant].filter(Boolean).join(" ");
    return {
      answer: answer.slice(0, 2200),
      status: "success",
      confidence: "high",
      confidenceLabel: "Iki gisubizo gishingiye ku bisobanuro IWACU ubwayo yashyize ku rubuga rwayo.",
      source: source("IWACU RWANDA — " + page.title, "https://iwacu-rwanda-2.vercel.app" + SITE_PAGE_PATHS[pageKey], false),
      suggestions: ["IWACU igamije iki?", "Ishakiro rikora rite?", "Amakuru ya IWACU aturuka he?"],
      capability: "site_knowledge",
    };
  }

  const direct = STATIC_KNOWLEDGE[subject] ??
    (subject === "umujyi wa kigali" ? STATIC_KNOWLEDGE.kigali : null);
  if (direct) {
    return {
      answer: direct.answer[locale],
      status: "success",
      confidence: "high",
      confidenceLabel: locale === "en"
        ? "Checked against the linked official government source on 11 November 2026."
        : locale === "fr"
          ? "Vérifié à partir de la source gouvernementale officielle indiquée le 11 novembre 2026."
          : "Byagenzuwe ku rubuga rw'inzego za Leta ruri mu nkomoko iri hasi ku wa 11/11/2026.",
      source: source(direct.label, direct.url),
      suggestions: subject === "rwanda"
        ? ["Kigali ni iki?", "Nyamasheke ni iki?", "Mu Rwanda hari uturere tungahe?"]
        : ["U Rwanda ni iki?", "Akarere ka Gasabo ni akahe?", "Imirenge y'ako ni ingahe?"],
      capability: "rwanda_knowledge",
    };
  }

  const levelAliases: Record<string, string> = {
    "a district": "akarere", "the district": "akarere", "un district": "akarere", "le district": "akarere",
    district: "akarere", "a province": "intara", "the province": "intara", "une province": "intara",
    province: "intara", "a sector": "umurenge", "the sector": "umurenge", "un secteur": "umurenge",
    sector: "umurenge", "a cell": "akagari", "the cell": "akagari", "une cellule": "akagari",
    cell: "akagari", village: "umudugudu", "a village": "umudugudu", "le village": "umudugudu",
    country: "igihugu", "the country": "igihugu", "le pays": "igihugu",
  };
  const levelKey = levelAliases[subject] ?? subject;
  if (ADMIN_LEVELS[levelKey]) {
    return {
      answer: ADMIN_LEVELS[levelKey][locale],
      status: "success",
      confidence: "high",
      confidenceLabel: "Ibisobanuro bishingiye ku miterere y'inzego z'ubuyobozi yatangajwe na Guverinoma y'u Rwanda.",
      source: source("Government of Rwanda — Overview", "https://www.gov.rw/overview"),
      suggestions: ["U Rwanda rufite Uturere tungahe?", "Akarere ni iki?", "Umurenge ni iki?"],
      capability: "rwanda_knowledge",
    };
  }

  // Any other exact administrative unit already in IWACU's offline index gets
  // a safe, source-labelled definition. Ambiguous names are never guessed.
  const requestedLevel = /^(?:akarere ka|district of|district de) /.test(text) ? "district"
    : /^(?:umurenge wa|sector of|secteur de) /.test(text) ? "sector"
      : /^(?:akagari ka|cell of|cellule de) /.test(text) ? "cell"
        : /^(?:umudugudu wa|village of|village de) /.test(text) ? "village"
          : undefined;
  const codes = findAdministrativeScopeCodesByName(subject, requestedLevel);
  if (codes.length === 1) {
    const result = getPlaceHierarchyFact(codes[0]);
    if (result.fact) {
      const fact = result.fact;
      const levelLabels: Record<string, string> = {
        province: "Intara",
        district: "Akarere",
        sector: "Umurenge",
        cell: "Akagari",
        village: "Umudugudu",
      };
      const parent = fact.parent ? " Aho gaherereye mu nzego: " + fact.parent.name_kiny + "." : "";
      const children = fact.child_level
        ? " Index ya IWACU ibariramo " + fact.child_count + " mu rwego rukurikiyeho."
        : "";
      return {
        answer: fact.name_kiny + " ni " + levelLabels[fact.level] + "." + parent + children,
        status: "success",
        confidence: "medium",
        confidenceLabel: fact.data_date_label + " Umubare w'abana ugaragaza gusa ibyanditse muri index ya IWACU, si imibare rusange y'igihugu.",
        source: source(fact.source_label, "https://iwacu-rwanda-2.vercel.app/data-sources", false),
        suggestions: ["Aho " + fact.name_kiny + " iherereye he?", "Ifite utugari/imidugudu ingahe?"],
        capability: "rwanda_place_knowledge",
      };
    }
  }
  if (codes.length > 1) {
    return {
      answer: "Hari ahantu henshi bihuje n'izina watanze. Ongeraho urwego rw'ubuyobozi cyangwa Akarere kugira ngo mpitemo ahantu nyaho.",
      status: "partial",
      confidence: "medium",
      confidenceLabel: "Izina rihuye n'ahantu harenze hamwe muri index; nta hantu nahisemo ntekereje.",
      source: source("IWACU offline administrative index", "https://iwacu-rwanda-2.vercel.app/data-sources", false),
      suggestions: ["Ongeraho Akarere", "Ongeraho Umurenge"],
      capability: "rwanda_place_knowledge",
    };
  }

  return null;
}
