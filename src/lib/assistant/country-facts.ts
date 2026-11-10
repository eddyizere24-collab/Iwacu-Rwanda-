export type CountryFactLanguage = "rw" | "en" | "fr";

export interface RwandaCountryFactAnswer {
  answer: string;
  source: { label: string; data_date: string | null; url: string; trust_tier: "official_government" };
  dataDateLabel: string;
  confidenceLabel: string;
  suggestions: string[];
}

const SOURCES = {
  overview: {
    label: "Government of Rwanda — Overview",
    data_date: null,
    url: "https://www.gov.rw/overview",
    trust_tier: "official_government" as const,
  },
  country: {
    label: "Government of Rwanda — About",
    data_date: null,
    url: "https://www.gov.rw/about",
    trust_tier: "official_government" as const,
  },
  parliament: {
    label: "Government of Rwanda — Parliament",
    data_date: null,
    url: "https://www.gov.rw/government/legislature/chamber-of-deputies",
    trust_tier: "official_government" as const,
  },
  population: {
    label: "NISR — Key Figures (2026 population projection)",
    data_date: "2026",
    url: "https://statistics.gov.rw/key-figures",
    trust_tier: "official_government" as const,
  },
} as const;

const COUNTS = { provinces: 4, districts: 30, sectors: 416, cells: 2148, villages: 14837 } as const;

type RwandaFactTopic =
  | keyof typeof COUNTS
  | "administration"
  | "capital"
  | "location"
  | "borders"
  | "area"
  | "currency"
  | "timezone"
  | "government"
  | "parliament"
  | "overview"
  | "population"
  | "languages";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

function languageOf(query: string): CountryFactLanguage {
  const text = normalize(query);
  if (/\b(combien|districts? du rwanda|le rwanda|provinces? du rwanda|secteurs?|cellules?|villages?|capitale|frontieres?|frontaliers?|superficie|monnaie|parlement|langues?|ou se trouve|population du rwanda|habitants?|et\s+(?:les?\s+)?(?:districts?|secteurs?|cellules?|villages?|provinces?|capitales?|frontieres?))\b/.test(text)) return "fr";
  if (/\b(how many|how much|in rwanda|rwanda has|rwanda have|districts? in|provinces? in|sectors? in|cells? in|villages?|capital|where is rwanda|located|border|borders|neighbors?|neighbours?|area|currency|timezone|time zone|government|parliament|population|languages?|what languages|tell me about rwanda|about rwanda|what is rwanda|and\s+(?:the\s+)?(?:districts?|sectors?|cells?|villages?|provinces?|capital|borders)|what about)\b/.test(text)) return "en";
  return "rw";
}

function topicOf(query: string): RwandaFactTopic | null {
  const text = normalize(query);
  if (/\b(uturere|akarere|districts?|district)\b/.test(text)) return "districts";
  if (/\b(intara|provinces?|province)\b/.test(text)) return "provinces";
  if (/\b(imirenge|umurenge|sectors?|sector)\b/.test(text)) return "sectors";
  if (/\b(utugari|akagari|cells?|cell)\b/.test(text)) return "cells";
  if (/\b(imidugudu|umudugudu|villages?|village)\b/.test(text)) return "villages";
  if (/\b(population|abaturage|habitants?|inhabitants?|how many people|nombre d'habitants)\b/.test(text)) return "population";
  if (/\b(indimi|ururimi|languages?|langues?)\b/.test(text)) return "languages";
  if (/\b(ubuyobozi bw'?ibanze|inzego z'?ubuyobozi|administrative|administration|administrative structure|ubuyobozi)\b/.test(text)) return "administration";
  if (/\b(umurwa mukuru|capital city|capital of rwanda|capitale|capitale du rwanda)\b/.test(text)) return "capital";
  if (/\b(ruherereye|iherereye|situated|located|location of rwanda|where is rwanda|where.*rwanda|ou se trouve le rwanda|central africa|afrique centrale|afurika yo hagati)\b/.test(text)) return "location";
  if (/\b(imbibi|ihana imbibi|borders?|bordering|neighbou?rs?|countries bordering|frontieres?|frontaliers?|voisins?|limitrophe)\b/.test(text)) return "borders";
  if (/\b(ubuso|area|surface area|superficie|square kilometers?|km2|km²)\b/.test(text)) return "area";
  if (/\b(ifaranga|currency|monnaie|devise|franc rwandais|rwandan franc)\b/.test(text)) return "currency";
  if (/\b(igihe|time zone|timezone|utc\s*\+?2|heure locale|fuseau horaire)\b/.test(text)) return "timezone";
  if (/\b(inzego za leta|inzego z'ubutegetsi|government branches|branches of government|branches du gouvernement|ubutegetsi nshingamategeko|ubutegetsi nyubahirizategeko|ubucamanza)\b/.test(text)) return "government";
  if (/\b(inteko|sena|abadepite|parliament|parlement|chambers of parliament|chambres du parlement)\b/.test(text)) return "parliament";
  if (/\b(ubuyobozi|administrative|administration|inzego|structure|structures)\b/.test(text)) return "administration";
  if (/\b(tell me about rwanda|about rwanda|what is rwanda|sobanurira u rwanda|mbwira u rwanda|amakuru y'u rwanda|amakuru ku rwanda)\b/.test(text)) return "overview";
  return null;
}

/** Answers only facts published by official Government of Rwanda pages. */
export function getRwandaAdministrativeFact(query: string): RwandaCountryFactAnswer | null {
  const topic = topicOf(query);
  if (!topic) return null;

  const language = languageOf(query);
  let answer: string;
  let source: RwandaCountryFactAnswer["source"] = SOURCES.overview;
  let suggestions: string[];

  const suggestionsFor = (rw: string[], en: string[], fr: string[]) =>
    language === "en" ? en : language === "fr" ? fr : rw;

  if (topic === "administration") {
    answer = language === "en"
      ? "Rwanda has 4 provinces and the City of Kigali, 30 districts, 416 sectors, 2,148 cells and 14,837 villages."
      : language === "fr"
        ? "Le Rwanda compte 4 provinces et la Ville de Kigali, 30 districts, 416 secteurs, 2 148 cellules et 14 837 villages."
        : "U Rwanda rufite Intara 4 n'Umujyi wa Kigali, uturere 30, imirenge 416, utugari 2,148 n'imidugudu 14,837.";
    suggestions = suggestionsFor(["U Rwanda rugizwe n'uturere tungahe?", "U Rwanda rufite imirenge ingahe?"], ["How many districts are in Rwanda?", "How many sectors are in Rwanda?"], ["Combien de districts compte le Rwanda ?", "Combien de secteurs compte le Rwanda ?"]);
  } else if (topic === "districts") {
    answer = language === "en" ? "Rwanda has 30 districts."
      : language === "fr" ? "Le Rwanda compte 30 districts."
        : "U Rwanda rugizwe n'uturere 30.";
    suggestions = suggestionsFor(["U Rwanda rufite imirenge ingahe?", "U Rwanda rufite intara zingahe?"], ["How many sectors are in Rwanda?", "What are Rwanda's provinces?"], ["Combien de secteurs compte le Rwanda ?", "Quelles sont les provinces du Rwanda ?"]);
  } else if (topic === "provinces") {
    answer = language === "en" ? "Rwanda has 4 provinces. The City of Kigali is listed separately alongside the provinces."
      : language === "fr" ? "Le Rwanda compte 4 provinces. La Ville de Kigali est indiquée séparément des provinces."
        : "U Rwanda rufite Intara 4. Umujyi wa Kigali ugaragazwa ukwawo, utabarirwa muri izo Ntara 4.";
    suggestions = suggestionsFor(["U Rwanda rugizwe n'uturere tungahe?", "U Rwanda rufite imirenge ingahe?"], ["How many districts are in Rwanda?", "How many sectors are in Rwanda?"], ["Combien de districts compte le Rwanda ?", "Combien de secteurs compte le Rwanda ?"]);
  } else if (topic === "sectors" || topic === "cells" || topic === "villages") {
    const values = {
      sectors: { rw: "imirenge 416", en: "416 sectors", fr: "416 secteurs" },
      cells: { rw: "utugari 2,148", en: "2,148 cells", fr: "2 148 cellules" },
      villages: { rw: "imidugudu 14,837", en: "14,837 villages", fr: "14 837 villages" },
    } as const;
    const value = values[topic][language];
    answer = language === "en" ? `Rwanda has ${value}.`
      : language === "fr" ? `Le Rwanda compte ${value}.`
        : `U Rwanda rufite ${value}.`;
    suggestions = suggestionsFor(["U Rwanda rugizwe n'uturere tungahe?", "U Rwanda rufite utugari tungahe?"], ["How many districts are in Rwanda?", "How many cells are in Rwanda?"], ["Combien de districts compte le Rwanda ?", "Combien de cellules compte le Rwanda ?"]);
  } else if (topic === "population") {
    source = SOURCES.population;
    answer = language === "en"
      ? "NISR's 2026 population projection for Rwanda is 14,418,145 people. This is a projection based on the 2022 census, not a new headcount carried out in 2026."
      : language === "fr"
        ? "La projection démographique du NISR pour le Rwanda en 2026 est de 14 418 145 habitants. Il s'agit d'une projection fondée sur le recensement de 2022, et non d'un nouveau dénombrement effectué en 2026."
        : "Iteganyamibare rya NISR rigaragaza ko abaturage b'u Rwanda bateganyijwe kugera kuri 14,418,145 mu 2026. Iyi ni projection ishingiye ku Ibarura rusange ry'Abaturage ryo mu 2022, si ibarura rishya ryakozwe mu 2026.";
    suggestions = suggestionsFor(["U Rwanda rugizwe n'uturere tungahe?", "Indimi zemewe mu Rwanda ni izihe?"], ["How many districts are in Rwanda?", "What are Rwanda's official languages?"], ["Combien de districts compte le Rwanda ?", "Quelles sont les langues officielles du Rwanda ?"]);
  } else if (topic === "languages") {
    source = SOURCES.country;
    answer = language === "en"
      ? "Rwanda has four official languages: Kinyarwanda, English, French and Kiswahili. Kinyarwanda is the national language."
      : language === "fr"
        ? "Le Rwanda compte quatre langues officielles : le kinyarwanda, l'anglais, le français et le kiswahili. Le kinyarwanda est la langue nationale."
        : "Mu Rwanda hari indimi enye zemewe mu butegetsi: Ikinyarwanda, Icyongereza, Igifaransa n'Igiswahili. Ikinyarwanda ni rwo rurimi rw'igihugu.";
    suggestions = suggestionsFor(["U Rwanda rugizwe n'uturere tungahe?", "Umurwa mukuru w'u Rwanda ni uwuhe?"], ["How many districts are in Rwanda?", "What is the capital of Rwanda?"], ["Combien de districts compte le Rwanda ?", "Quelle est la capitale du Rwanda ?"]);
  } else if (topic === "capital") {
    source = SOURCES.country;
    answer = language === "en" ? "The capital city of Rwanda is Kigali."
      : language === "fr" ? "La capitale du Rwanda est Kigali."
        : "Umurwa mukuru w'u Rwanda ni Kigali.";
    suggestions = suggestionsFor(["U Rwanda ruherereye he?", "U Rwanda ruhana imbibi n'ibihugu bihe?"], ["Where is Rwanda located?", "Which countries border Rwanda?"], ["Où se trouve le Rwanda ?", "Quels pays sont frontaliers du Rwanda ?"]);
  } else if (topic === "location") {
    source = SOURCES.country;
    answer = language === "en" ? "Rwanda is located in Central Africa."
      : language === "fr" ? "Le Rwanda se situe en Afrique centrale."
        : "U Rwanda ruherereye muri Afurika yo Hagati.";
    suggestions = suggestionsFor(["Umurwa mukuru w'u Rwanda ni uwuhe?", "U Rwanda ruhana imbibi n'ibihugu bihe?"], ["What is Rwanda's capital?", "Which countries border Rwanda?"], ["Quelle est la capitale du Rwanda ?", "Quels pays sont frontaliers du Rwanda ?"]);
  } else if (topic === "borders") {
    source = SOURCES.country;
    answer = language === "en"
      ? "Rwanda borders Uganda to the north, Tanzania to the east, Burundi to the south, and the Democratic Republic of the Congo to the west."
      : language === "fr"
        ? "Le Rwanda est limitrophe de l'Ouganda au nord, de la Tanzanie à l'est, du Burundi au sud et de la République démocratique du Congo à l'ouest."
        : "U Rwanda ruhana imbibi na Uganda mu majyaruguru, Tanzania mu burasirazuba, Burundi mu majyepfo, na Repubulika Iharanira Demokarasi ya Congo (RDC) mu burengerazuba.";
    suggestions = suggestionsFor(["Umurwa mukuru w'u Rwanda ni uwuhe?", "U Rwanda ruherereye he?"], ["What is Rwanda's capital?", "Where is Rwanda located?"], ["Quelle est la capitale du Rwanda ?", "Où se trouve le Rwanda ?"]);
  } else if (topic === "area") {
    source = SOURCES.country;
    answer = language === "en" ? "Rwanda's total area is 26,338 square kilometres (km²)."
      : language === "fr" ? "La superficie totale du Rwanda est de 26 338 kilomètres carrés (km²)."
        : "Ubuso bw'u Rwanda ni kilometero kare 26,338 (km²).";
    suggestions = suggestionsFor(["U Rwanda ruherereye he?", "U Rwanda ruhana imbibi n'ibihugu bihe?"], ["Where is Rwanda located?", "Which countries border Rwanda?"], ["Où se trouve le Rwanda ?", "Quels pays sont frontaliers du Rwanda ?"]);
  } else if (topic === "currency") {
    source = SOURCES.country;
    answer = language === "en" ? "The currency used in Rwanda is the Rwandan franc (FRW)."
      : language === "fr" ? "La monnaie utilisée au Rwanda est le franc rwandais (FRW)."
        : "Ifaranga rikoreshwa mu Rwanda ni Ifaranga ry'u Rwanda (FRW).";
    suggestions = suggestionsFor(["Umurwa mukuru w'u Rwanda ni uwuhe?", "U Rwanda ruherereye he?"], ["What is Rwanda's capital?", "Where is Rwanda located?"], ["Quelle est la capitale du Rwanda ?", "Où se trouve le Rwanda ?"]);
  } else if (topic === "timezone") {
    source = SOURCES.country;
    answer = language === "en" ? "Rwanda uses Central Africa Time (CAT), UTC+2."
      : language === "fr" ? "Le Rwanda utilise l'heure d'Afrique centrale (CAT), UTC+2."
        : "U Rwanda rukoresha isaha yo muri Afurika yo Hagati (CAT), UTC+2.";
    suggestions = suggestionsFor(["Umurwa mukuru w'u Rwanda ni uwuhe?", "U Rwanda rufite uturere tungahe?"], ["What is Rwanda's capital?", "How many districts are in Rwanda?"], ["Quelle est la capitale du Rwanda ?", "Combien de districts compte le Rwanda ?"]);
  } else if (topic === "government") {
    source = SOURCES.overview;
    answer = language === "en"
      ? "Rwanda's Government has three branches: the Executive, the Legislature and the Judiciary. They are separate and independent, but complementary."
      : language === "fr"
        ? "Le Gouvernement du Rwanda comporte trois pouvoirs : l'Exécutif, le Législatif et le Judiciaire. Ils sont séparés et indépendants, mais complémentaires."
        : "Leta y'u Rwanda ifite inzego eshatu: Ubutegetsi Nyubahirizategeko, Ubutegetsi Nshingamategeko n'Ubucamanza. Ziratandukanye kandi zirigenga, ariko ziruzuzanya.";
    suggestions = suggestionsFor(["Inteko Ishinga Amategeko igizwe n'imitwe ingahe?", "U Rwanda rugizwe n'uturere tungahe?"], ["How many chambers does Rwanda's Parliament have?", "How many districts are in Rwanda?"], ["Combien de chambres compte le Parlement du Rwanda ?", "Combien de districts compte le Rwanda ?"]);
  } else if (topic === "parliament") {
    source = SOURCES.parliament;
    answer = language === "en"
      ? "Rwanda's Parliament has two chambers: the Senate and the Chamber of Deputies."
      : language === "fr"
        ? "Le Parlement du Rwanda comprend deux chambres : le Sénat et la Chambre des députés."
        : "Inteko Ishinga Amategeko y'u Rwanda igizwe n'imitwe ibiri: Sena n'Umutwe w'Abadepite.";
    suggestions = suggestionsFor(["Leta y'u Rwanda ifite inzego zingahe?", "U Rwanda rugizwe n'uturere tungahe?"], ["What are Rwanda's three branches of Government?", "How many districts are in Rwanda?"], ["Quels sont les trois pouvoirs de l'État au Rwanda ?", "Combien de districts compte le Rwanda ?"]);
  } else {
    source = SOURCES.country;
    answer = language === "en"
      ? "Rwanda is a country in Central Africa. Its capital is Kigali. It has an area of 26,338 km² and borders Uganda, Tanzania, Burundi and the Democratic Republic of the Congo."
      : language === "fr"
        ? "Le Rwanda est un pays d'Afrique centrale. Sa capitale est Kigali. Sa superficie est de 26 338 km² et il partage des frontières avec l'Ouganda, la Tanzanie, le Burundi et la République démocratique du Congo."
        : "U Rwanda ni igihugu cyo muri Afurika yo Hagati. Umurwa mukuru ni Kigali. Gifite ubuso bwa km² 26,338 kandi gihana imbibi na Uganda, Tanzania, Burundi na Repubulika Iharanira Demokarasi ya Congo.";
    suggestions = suggestionsFor(["U Rwanda rugizwe n'uturere tungahe?", "Leta y'u Rwanda ifite inzego zingahe?"], ["How many districts are in Rwanda?", "What are Rwanda's three branches of Government?"], ["Combien de districts compte le Rwanda ?", "Quels sont les trois pouvoirs de l'État au Rwanda ?"]);
  }

  return {
    answer,
    source,
    dataDateLabel: source.data_date
      ? `Umwaka w'amakuru: ${source.data_date}. Umubare ni projection, si ibarura rishya.`
      : "Urupapuro rwa Leta rwatanzwe nk'inkomoko ntirugaragaza neza itariki aya makuru yavuguriweho.",
    confidenceLabel: topic === "population"
      ? "Iyi ni projection ya NISR y'umwaka wa 2026; ntuyifate nk'umubare w'abaturage babaruwe bushya mu 2026."
      : "Iki gisubizo gishingiye ku makuru yatangajwe n'urubuga rwa Leta y'u Rwanda; itariki y'ivugurura ntigaragajwe ku rupapuro rw'inkomoko.",
    suggestions,
  };
}

export function getRwandaAdministrativeCounts() {
  return { ...COUNTS };
}
