import type { AssistantSource } from "./contracts";

export type KnowledgeTopic = "iwacu_rwanda" | "rwanda" | "kigali" | "nyamasheke" | "rwanda_population" | "rwanda_geography" | "rwanda_languages" | "rwanda_symbols" | "rwanda_governance" | "rwanda_parliament" | "rwanda_basics" | "rwanda_culture";
export type KnowledgeLanguage = "rw" | "en" | "fr";

export interface CuratedKnowledgeReply {
  topic: KnowledgeTopic;
  answer: string;
  confidenceLabel: string;
  sources: AssistantSource[];
  suggestions: string[];
}

const siteSources: AssistantSource[] = [
  { label: "IWACU RWANDA — Abo turi bo", data_date: "2026-11-11", url: "https://iwacu-rwanda-2.vercel.app/about?lang=rw" },
  { label: "IWACU RWANDA — Uko ikora", data_date: "2026-11-11", url: "https://iwacu-rwanda-2.vercel.app/how-it-works?lang=rw" },
  { label: "IWACU RWANDA — Inkomoko y'amakuru", data_date: "2026-11-11", url: "https://iwacu-rwanda-2.vercel.app/data-sources?lang=rw" },
];
const rwandaSource: AssistantSource = {
  label: "Government of Rwanda — About Rwanda", data_date: "2026-11-11",
  url: "https://www.gov.rw/about", trust_tier: "official_government",
};
const kigaliSource: AssistantSource = {
  label: "City of Kigali — About Kigali City", data_date: "2026-11-11",
  url: "https://www.kigalicity.gov.rw/about/overview", trust_tier: "official_government",
};
const nyamashekeSource: AssistantSource = {
  label: "Nyamasheke District — About Nyamasheke District", data_date: "2026-11-11",
  url: "https://www.nyamasheke.gov.rw/en/district/about-nyamasheke",
  trust_tier: "official_government",
};
const nisrPopulationSource: AssistantSource = {
  label: "National Institute of Statistics of Rwanda — 2022 Population and Housing Census",
  data_date: "2022-08",
  url: "https://www.statistics.gov.rw/statistical-publications/population-size-and-population-characteristics",
  trust_tier: "official_government",
};
const governanceSource: AssistantSource = {
  label: "Government of Rwanda — Governance and Home Grown Solutions",
  data_date: "2026-11-11",
  url: "https://www.gov.rw/highlights/governance",
  trust_tier: "official_government",
};
const parliamentSource: AssistantSource = {
  label: "Parliament of Rwanda — Overview",
  data_date: "2026-11-11",
  url: "https://www.parliament.gov.rw/parliament/overview",
  trust_tier: "official_government",
};
const symbolsSource: AssistantSource = {
  label: "Government of Rwanda — About Rwanda and National Symbols",
  data_date: "2026-11-11",
  url: "https://www.gov.rw/government/publications/national-symbols",
  trust_tier: "official_government",
};
const basicsSource: AssistantSource = {
  label: "Government of Rwanda — About Rwanda",
  data_date: "2026-11-11",
  url: "https://www.gov.rw/about",
  trust_tier: "official_government",
};
const adminSource: AssistantSource = {
  label: "Government of Rwanda — Administrative structure", data_date: "2026-11-11",
  url: "https://www.gov.rw/overview", trust_tier: "official_government",
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’‘]/g, "'").replace(/[!?.,;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function languageOf(query: string): KnowledgeLanguage {
  const value = normalize(query);
  if (/\b(what is|what's|tell me about|which districts|how many districts|how many people|capital of|official languages|branches of government|national symbols|where is|currency|time zone)\b/.test(value)) return "en";
  if (/\b(qu'est ce|qu'est-ce|qu est ce|c'est quoi|combien de|combien d|quels sont|quelle est|langues officielles|pouvoirs de l'etat)\b/.test(value)) return "fr";
  return "rw";
}

function isDefinition(value: string): boolean {
  return /\b(ni iki|iki ni iki|what is|what's|define|tell me about|qu'est ce que|qu est ce que|c'est quoi|que signifie)\b/.test(value);
}

export function resolveKnowledgeTopic(query: string, previousTopic?: KnowledgeTopic | null): KnowledgeTopic | null {
  const value = normalize(query);
  if (/\biwacu\s+rwanda\b|\biwacu ai\b/.test(value) && isDefinition(value)) return "iwacu_rwanda";
  if (/\b(abaturage|population|population size|how many people|inhabitants|combien d'habitants|combien de personnes)\b/.test(value) &&
      /\b(u rwanda|urwanda|rwanda|republique du rwanda|republic of rwanda)\b/.test(value)) return "rwanda_population";
  if (/\b(ibendera|flag|drapeau|coat of arms|armoiries|national anthem|indirimbo yubahiriza igihugu|indirimbo y'igihugu|national symbols|ibimenyetso by'igihugu|symboles nationaux|hymne national|rwanda nziza)\b/.test(value)) return "rwanda_symbols";
  if (/\b(indimi|language|languages|official language|official languages|langue officielle|langues officielles)\b/.test(value) &&
      /\b(rwanda|u rwanda|urwanda|rwandan)\b/.test(value)) return "rwanda_languages";
  if (/\b(ubutegetsi|governance|government system|branches of government|amashami ya leta|amashami y'ubutegetsi|ubutegetsi bw'u rwanda|gouvernance|pouvoirs de l'etat)\b/.test(value)) return "rwanda_governance";
  if (/\b(inteko ishinga amategeko|parliament|parlement|senate|senat|chamber of deputies|chambre des deputes)\b/.test(value)) return "rwanda_parliament";
  if (/\b(umuganda|imihigo|abunzi|gacaca|home grown solutions|homegrown solutions|umuco nyarwanda|rwandan culture|culture rwandaise|umuco w'u rwanda)\b/.test(value)) return "rwanda_culture";
  if (/\b(ruherereye he|biherereye he|where is rwanda|where is .* located|geography|geographical|geographic|geographie|situation geographique|ubuso bw'u rwanda|area of rwanda|surface du rwanda|gahana imbibi|ruhana imbibi|borders of rwanda|frontieres du rwanda)\b/.test(value) &&
      /\b(rwanda|u rwanda|urwanda)\b/.test(value)) return "rwanda_geography";
  if (/\b(ifaranga|currency|monnaie|franc rwandais|rwandan franc|time zone|timezone|isaha mu rwanda|igihe mu rwanda|fuseau horaire)\b/.test(value) &&
      /\b(rwanda|u rwanda|urwanda)\b/.test(value)) return "rwanda_basics";
  if (/\b(kigali|umujyi wa kigali|city of kigali)\b/.test(value) &&
      (isDefinition(value) || /\b(igizwe|districts|uturere|sectors|imirenge|composed|consists)\b/.test(value))) return "kigali";
  // A definition question uses curated place knowledge; numeric hierarchy
  // questions remain on the verified place-facts index rather than this summary.
  if (/\b(nyamasheke|akarere ka nyamasheke|nyamasheke district)\b/.test(value) && isDefinition(value)) return "nyamasheke";
  if (/\b(u rwanda|urwanda|rwanda|republic of rwanda|republique du rwanda)\b/.test(value) && isDefinition(value)) return "rwanda";

  if (!previousTopic) return null;
  const followUp = /^(?:igizwe n'uturere tungahe|ifite uturere tungahe|uturere tungahe|ifite imirenge ingahe|imirenge ingahe|how many districts does it have|how many sectors does it have|what districts make it up|combien de districts compte t elle|combien de districts compte t il)$/.test(value);
  return followUp ? previousTopic : null;
}

export function getCuratedKnowledgeReply(topic: KnowledgeTopic, query: string): CuratedKnowledgeReply {
  const language = languageOf(query);
  const value = normalize(query);
  const kigaliDistrictFollowUp = topic === "kigali" &&
    /\b(igizwe|districts|uturere|composed|consists|combien|how many)\b/.test(value);

  if (topic === "iwacu_rwanda") {
    const answer = language === "en"
      ? "IWACU RWANDA is an independent digital information platform that helps people understand where they are in Rwanda's administrative structure, find places, learn how public administration is organised, and access public leaders' information when verified records are available. It also provides emergency information and an AI assistant called Iwacu AI (Ishakiro), which helps people search and understand information. IWACU RWANDA is not a government website and does not replace official institutions or emergency services. It identifies its sources and says when information is missing instead of inventing names, phone numbers or facts."
      : language === "fr"
        ? "IWACU RWANDA est une plateforme numérique indépendante qui aide les habitants à comprendre leur position dans l'organisation administrative du Rwanda, à rechercher des lieux, à comprendre l'administration publique et à consulter les informations publiques sur les responsables lorsque des données vérifiées sont disponibles. Elle propose aussi des informations d'urgence et un assistant appelé Iwacu AI (Ishakiro). IWACU RWANDA n'est pas un site du gouvernement et ne remplace ni les institutions officielles ni les services d'urgence. La plateforme indique ses sources et signale les informations manquantes au lieu d'inventer des noms, des numéros ou des faits."
        : "IWACU RWANDA ni urubuga rwigenga rw'ikoranabuhanga rufasha abantu kumenya aho baherereye mu nzego z'ubuyobozi bw'u Rwanda, gushaka ahantu, gusobanukirwa imiterere y'ubuyobozi no kubona amakuru rusange y'abayobozi igihe inyandiko zemejwe ziboneka. Runatanga amakuru y'ubutabazi kandi rufite umufasha w'ikoranabuhanga witwa Iwacu AI (Ishakiro), ufasha gushaka no gusobanukirwa amakuru. IWACU RWANDA si urubuga rwa Leta kandi ntirusimbura inzego za Leta cyangwa serivisi z'ubutabazi. Rugaragaza inkomoko y'amakuru kandi rukavuga igihe amakuru abuze aho guhimba amazina, nimero cyangwa ibindi bisubizo.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on IWACU RWANDA's published About, How it Works and Data Sources pages, checked on 11 November 2026."
        : language === "fr"
          ? "Cette réponse s'appuie sur les pages À propos, Fonctionnement et Sources de données d'IWACU RWANDA, vérifiées le 11 novembre 2026."
          : "Bishingiye ku mapaji ya IWACU RWANDA: Abo turi bo, Uko ikora n'Inkomoko y'amakuru; byasuzumwe ku wa 11 Ugushyingo 2026.",
      sources: siteSources,
      suggestions: language === "en" ? ["What is Iwacu AI?", "How does IWACU identify a location?", "How many districts are in Rwanda?"]
        : language === "fr" ? ["Qu'est-ce que Iwacu AI ?", "Comment IWACU identifie-t-il un lieu ?", "Combien de districts compte le Rwanda ?"]
        : ["Iwacu AI ni iki?", "IWACU imenya ite aho umuntu ari?", "U Rwanda rufite uturere tungahe?"],
    };
  }

  if (topic === "rwanda_population") {
    const answer = language === "en"
      ? "The Fifth Rwanda Population and Housing Census counted 13,246,394 residents in August 2022. This is the official census result for 2022, not a live estimate of the population today. The National Institute of Statistics of Rwanda (NISR) is the source."
      : language === "fr"
        ? "Le cinquième Recensement général de la population et de l'habitat a dénombré 13 246 394 habitants en août 2022. Il s'agit du résultat officiel du recensement de 2022, et non d'une estimation en temps réel de la population actuelle. La source est l'Institut national de la statistique du Rwanda (NISR)."
        : "Ibarura rusange ry'abaturage n'imiturire rya gatanu ryakozwe muri Kanama 2022 ryabaruye abaturage 13,246,394. Uyu ni umubare wemejwe n'ibarura ryo mu 2022, si igereranya ry'abaturage bariho uyu munsi. Inkomoko ni Ikigo cy'Igihugu gishinzwe Ibarurishamibare (NISR).";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "The figure is tied to the August 2022 census and is not presented as a current live population estimate."
        : language === "fr"
          ? "Ce chiffre correspond au recensement d'août 2022 et n'est pas présenté comme une estimation actuelle en temps réel."
          : "Umubare ugaragaza ibarura ryo muri Kanama 2022; ntabwo werekanwa nk'umubare w'abaturage bariho ubu.",
      sources: [nisrPopulationSource],
      suggestions: language === "en" ? ["How many districts are in Rwanda?", "What is Rwanda's capital?", "What are Rwanda's official languages?"]
        : language === "fr" ? ["Combien de districts compte le Rwanda ?", "Quelle est la capitale du Rwanda ?", "Quelles sont les langues officielles du Rwanda ?"]
        : ["U Rwanda rufite uturere tungahe?", "Umurwa mukuru w'u Rwanda ni uwuhe?", "Indimi zemewe mu Rwanda ni izihe?"],
    };
  }

  if (topic === "rwanda_languages") {
    const answer = language === "en"
      ? "Kinyarwanda is the common language spoken throughout Rwanda. The Government of Rwanda also lists English, French and Kiswahili as official languages. These are distinct facts: Kinyarwanda is the shared national language, while the other three are also official languages."
      : language === "fr"
        ? "Le kinyarwanda est la langue commune parlée dans tout le pays. Le Gouvernement du Rwanda cite également l'anglais, le français et le kiswahili parmi les langues officielles. Il faut distinguer la langue commune nationale des trois autres langues officielles."
        : "Ikinyarwanda ni ururimi ruhuriweho, ruvugwa mu bice byose by'u Rwanda. Guverinoma y'u Rwanda inagaragaza Icyongereza, Igifaransa n'Igiswahili nk'indimi zemewe. Bityo, Ikinyarwanda ni ururimi rusangi rw'igihugu, naho izindi eshatu na zo zikaba indimi zemewe.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the Government of Rwanda's published People and Culture information."
        : language === "fr"
          ? "Fondé sur les informations officielles du Gouvernement du Rwanda sur la population et la culture."
          : "Bishingiye ku bisobanuro Guverinoma y'u Rwanda yashyize ahagaragara ku Baturage n'Umuco.",
      sources: [basicsSource],
      suggestions: language === "en" ? ["What is Rwanda's national anthem?", "What is Rwanda's currency?", "What is Umuganda?"]
        : language === "fr" ? ["Quel est l'hymne national du Rwanda ?", "Quelle est la monnaie du Rwanda ?", "Qu'est-ce que l'Umuganda ?"]
        : ["Indirimbo yubahiriza igihugu yitwa ite?", "Ifaranga ry'u Rwanda ni irihe?", "Umuganda ni iki?"],
    };
  }

  if (topic === "rwanda_symbols") {
    const answer = language === "en"
      ? "Rwanda's national symbols include the national flag, the Coat of Arms and the national anthem, Rwanda Nziza. The flag has blue, yellow and green horizontal bands, with a golden sun in the blue upper band. The Coat of Arms includes a green ring and knot, a small basket, agricultural symbols and the national motto: Unity, Work, Patriotism. Rwanda Nziza is the national anthem."
      : language === "fr"
        ? "Les symboles nationaux du Rwanda comprennent le drapeau, les armoiries et l'hymne national, Rwanda Nziza. Le drapeau comporte des bandes horizontales bleue, jaune et verte, avec un soleil doré dans la bande bleue supérieure. Les armoiries comprennent un anneau et un nœud verts, un petit panier, des symboles agricoles et la devise nationale : Unité, Travail, Patriotisme. Rwanda Nziza est l'hymne national."
        : "Ibimenyetso by'igihugu birimo Ibendera ry'u Rwanda, Ikirango cy'Igihugu n'Indirimbo yubahiriza Igihugu yitwa Rwanda Nziza. Ibendera rifite amabara y'ubururu hejuru, umuhondo hagati n'icyatsi hasi, rikagira izuba ry'umuhondo mu gice cy'ubururu. Ikirango cy'Igihugu kirimo uruziga n'ipfundo by'icyatsi, agaseke, ibimenyetso by'ubuhinzi n'ikirango cy'amagambo agira ati: Ubumwe, Umurimo, Gukunda Igihugu.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the Government of Rwanda's official About page and National Symbols publication."
        : language === "fr"
          ? "Fondé sur la page officielle À propos et la publication sur les symboles nationaux du Gouvernement du Rwanda."
          : "Bishingiye ku rubuga rwa Guverinoma y'u Rwanda n'inyandiko yayo ku Bimenyetso by'Igihugu.",
      sources: [symbolsSource, rwandaSource],
      suggestions: language === "en" ? ["What is Rwanda Nziza?", "What is the national motto?", "What are Rwanda's official languages?"]
        : language === "fr" ? ["Qu'est-ce que Rwanda Nziza ?", "Quelle est la devise nationale ?", "Quelles sont les langues officielles du Rwanda ?"]
        : ["Rwanda Nziza isobanura iki?", "Ibirango by'igihugu ni ibihe?", "Indimi zemewe mu Rwanda ni izihe?"],
    };
  }

  if (topic === "rwanda_governance") {
    const answer = language === "en"
      ? "Rwanda's government has three branches: the Executive, the Legislature and the Judiciary. They are separate and independent from one another, while also being complementary. In territorial administration, Rwanda has four Provinces and the City of Kigali at the same first level, followed by 30 Districts."
      : language === "fr"
        ? "Le Gouvernement du Rwanda comprend trois pouvoirs : l'exécutif, le législatif et le judiciaire. Ils sont séparés et indépendants, tout en étant complémentaires. Dans l'organisation territoriale, le Rwanda compte quatre Provinces et la Ville de Kigali au même premier niveau, puis 30 districts."
        : "Ubutegetsi bw'u Rwanda bufite amashami atatu: ubutegetsi nyubahirizabikorwa, ubutegetsi nyubahirizategeko n'ubucamanza. Aya mashami aratandukanye kandi yigenga, ariko akuzuzanya. Mu nzego z'ubuyobozi bw'igihugu, hari Intara enye n'Umujyi wa Kigali biri ku rwego rumwe, hagakurikiraho Uturere 30.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the Government of Rwanda's Overview and Governance pages."
        : language === "fr"
          ? "Fondé sur les pages Présentation et Gouvernance du Gouvernement du Rwanda."
          : "Bishingiye ku mpapuro za Guverinoma y'u Rwanda zisobanura Imiterere y'Ubutegetsi n'Imiyoborere.",
      sources: [adminSource, governanceSource],
      suggestions: language === "en" ? ["What is the Parliament of Rwanda?", "How many districts are in Rwanda?", "What is Umuganda?"]
        : language === "fr" ? ["Qu'est-ce que le Parlement du Rwanda ?", "Combien de districts compte le Rwanda ?", "Qu'est-ce que l'Umuganda ?"]
        : ["Inteko Ishinga Amategeko y'u Rwanda ni iki?", "U Rwanda rufite uturere tungahe?", "Umuganda ni iki?"],
    };
  }

  if (topic === "rwanda_parliament") {
    const answer = language === "en"
      ? "The Parliament of Rwanda is bicameral. It has two chambers: the Senate and the Chamber of Deputies. Its core functions include representing the population, passing laws, and scrutinising and overseeing Executive action."
      : language === "fr"
        ? "Le Parlement du Rwanda est bicaméral. Il comprend deux chambres : le Sénat et la Chambre des députés. Ses fonctions principales sont de représenter la population, d'adopter les lois et de contrôler l'action de l'Exécutif."
        : "Inteko Ishinga Amategeko y'u Rwanda igizwe n'imitwe ibiri: Sena n'Umutwe w'Abadepite. Inshingano zayo z'ingenzi zirimo guhagararira abaturage, gushyiraho amategeko no kugenzura ibikorwa by'Ubutegetsi Nyubahirizabikorwa.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the official Parliament of Rwanda overview."
        : language === "fr"
          ? "Fondé sur la présentation officielle du Parlement du Rwanda."
          : "Bishingiye ku bisobanuro byemewe by'Inteko Ishinga Amategeko y'u Rwanda.",
      sources: [parliamentSource],
      suggestions: language === "en" ? ["What are the three branches of government?", "What is the Senate?", "What is the Chamber of Deputies?"]
        : language === "fr" ? ["Quels sont les trois pouvoirs de l'État ?", "Qu'est-ce que le Sénat ?", "Qu'est-ce que la Chambre des députés ?"]
        : ["Amashami y'ubutegetsi bw'u Rwanda ni ayahe?", "Sena ni iki?", "Umutwe w'Abadepite ni iki?"],
    };
  }

  if (topic === "rwanda_geography") {
    const answer = language === "en"
      ? "Rwanda is a landlocked country in Central Africa with an area of 26,338 km². It borders Uganda to the north, Tanzania to the east, Burundi to the south and the Democratic Republic of the Congo to the west. Its notable natural features include Lake Kivu, several other lakes, volcanoes and the national parks of Akagera, Volcanoes and Gishwati-Mukura."
      : language === "fr"
        ? "Le Rwanda est un pays enclavé d'Afrique centrale d'une superficie de 26 338 km². Il partage ses frontières avec l'Ouganda au nord, la Tanzanie à l'est, le Burundi au sud et la République démocratique du Congo à l'ouest. Ses éléments naturels comprennent le lac Kivu, plusieurs autres lacs, des volcans et les parcs nationaux d'Akagera, des Volcans et de Gishwati-Mukura."
        : "U Rwanda ni igihugu cyo muri Afurika yo Hagati kidakora ku nyanja, gifite ubuso bwa kilometero kare 26,338. Ruhana imbibi na Uganda mu majyaruguru, Tanzania mu burasirazuba, Burundi mu majyepfo na Repubulika Iharanira Demokarasi ya Kongo mu burengerazuba. Mu byiza nyaburanga bizwi harimo Ikiyaga cya Kivu, ibindi biyaga, ibirunga na za pariki za Akagera, Ibirunga na Gishwati-Mukura.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the Government of Rwanda's official About page."
        : language === "fr"
          ? "Fondé sur la page officielle À propos du Gouvernement du Rwanda."
          : "Bishingiye ku rupapuro rwa Guverinoma y'u Rwanda rusobanura igihugu n'imiterere yacyo.",
      sources: [rwandaSource],
      suggestions: language === "en" ? ["What is Lake Kivu?", "What is Akagera National Park?", "What is Rwanda's capital?"]
        : language === "fr" ? ["Qu'est-ce que le lac Kivu ?", "Qu'est-ce que le parc national de l'Akagera ?", "Quelle est la capitale du Rwanda ?"]
        : ["Ikiyaga cya Kivu ni ikihe?", "Pariki ya Akagera ni ikihe?", "Umurwa mukuru w'u Rwanda ni uwuhe?"],
    };
  }

  if (topic === "rwanda_basics") {
    const answer = language === "en"
      ? "The official currency of Rwanda is the Rwandan Franc (FRW). Rwanda uses Central Africa Time (CAT), which is UTC+2."
      : language === "fr"
        ? "La monnaie officielle du Rwanda est le franc rwandais (FRW). Le Rwanda utilise l'heure d'Afrique centrale (CAT), soit UTC+2."
        : "Ifaranga rikoreshwa mu Rwanda ni Ifaranga ry'u Rwanda (FRW). U Rwanda rukoresha isaha yo muri Afurika yo Hagati (CAT), ihwanye na UTC+2.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the Government of Rwanda's published country overview."
        : language === "fr"
          ? "Fondé sur la présentation officielle du pays par le Gouvernement du Rwanda."
          : "Bishingiye ku bisobanuro bya Guverinoma y'u Rwanda ku gihugu.",
      sources: [basicsSource],
      suggestions: language === "en" ? ["What is Rwanda's capital?", "What are Rwanda's official languages?", "How large is Rwanda?"]
        : language === "fr" ? ["Quelle est la capitale du Rwanda ?", "Quelles sont les langues officielles du Rwanda ?", "Quelle est la superficie du Rwanda ?"]
        : ["Umurwa mukuru w'u Rwanda ni uwuhe?", "Indimi zemewe mu Rwanda ni izihe?", "U Rwanda rufite ubuso bungana iki?"],
    };
  }

  if (topic === "rwanda_culture") {
    const answer = language === "en"
      ? "Rwanda's home-grown initiatives draw on local culture and community participation. Examples include Umuganda (community work), Imihigo (performance contracts), Abunzi (community mediators), Gacaca (community courts), Itorero (civic education), Girinka (One Cow per Poor Family), Umushyikirano (National Dialogue Council) and Umwiherero (National Leadership Retreat). Each has its own history and formal framework."
      : language === "fr"
        ? "Les initiatives rwandaises dites « solutions locales » s'appuient sur la culture et la participation communautaire. Elles comprennent notamment l'Umuganda (travaux communautaires), les Imihigo (contrats de performance), les Abunzi (médiateurs communautaires), les Gacaca (juridictions communautaires), l'Itorero (éducation civique), le programme Girinka (une vache par famille pauvre), l'Umushyikirano (Conseil national du dialogue) et l'Umwiherero (retraite nationale des dirigeants). Chacune possède son histoire et son cadre propre."
        : "Imikorere n'ibikorwa by'iterambere bishingiye ku muco nyarwanda bikunze kwitwa ibisubizo byihariye by'Abanyarwanda. Ingero ni Umuganda (imirimo rusange), Imihigo (amasezerano y'imihigo), Abunzi (abunzi), Gacaca (inkiko Gacaca), Itorero (inyigisho zo gukunda igihugu), Girinka (gahunda ya Girinka), Umushyikirano (Inama y'Igihugu y'Umushyikirano) n'Umwiherero. Buri kimwe gifite amateka n'uburyo bwacyo bwihariye.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the Government of Rwanda's Governance and Home Grown Solutions publication."
        : language === "fr"
          ? "Fondé sur la publication du Gouvernement du Rwanda sur la gouvernance et les solutions locales."
          : "Bishingiye ku nyandiko ya Guverinoma y'u Rwanda ku miyoborere n'ibisubizo byihariye by'Abanyarwanda.",
      sources: [governanceSource],
      suggestions: language === "en" ? ["What is Umuganda?", "What are Imihigo?", "How is Rwanda governed?"]
        : language === "fr" ? ["Qu'est-ce que l'Umuganda ?", "Que sont les Imihigo ?", "Comment le Rwanda est-il gouverné ?"]
        : ["Umuganda ni iki?", "Imihigo ni iki?", "Ubutegetsi bw'u Rwanda bukora bute?"],
    };
  }

  if (topic === "nyamasheke") {
    const answer = language === "en"
      ? "Nyamasheke is one of the seven districts in Rwanda's Western Province. The official district About page lists 15 sectors. The District website's summary pages show conflicting village totals, so no village total is stated here. It borders Rusizi District to the south, Karongi District to the north, Nyamagabe District to the east and the Democratic Republic of the Congo to the west. Its notable natural attractions include Nyungwe National Park and Lake Kivu. Coffee and tea farming are important parts of the district's economy."
      : language === "fr"
        ? "Nyamasheke est l'un des sept districts de la Province de l'Ouest du Rwanda. La page officielle « À propos » du district indique 15 secteurs. Les pages de présentation du District donnent des totaux de villages différents ; aucun total de villages n'est donc indiqué ici. Le district partage ses frontières avec Rusizi au sud, Karongi au nord, Nyamagabe à l'est et la République démocratique du Congo à l'ouest. Ses attractions naturelles comprennent le parc national de Nyungwe et le lac Kivu. La culture du café et du thé est importante pour son économie."
        : "Nyamasheke ni kamwe mu Turere turindwi tugize Intara y'Iburengerazuba bw'u Rwanda. Urupapuro rwemewe rw'Akarere rwa « About Nyamasheke » rugaragaza Imirenge 15. Ahandi ku rubuga rw'Akarere hagaragara imibare y'Imidugudu idahuye, ni yo mpamvu ntatanze umubare wayo. Gahana imbibi n'Akarere ka Rusizi mu majyepfo, Karongi mu majyaruguru, Nyamagabe mu burasirazuba na Repubulika Iharanira Demokarasi ya Kongo mu burengerazuba. Mu byiza nyaburanga hazwi harimo Pariki ya Nyungwe n'Ikiyaga cya Kivu. Ubuhinzi bw'ikawa n'icyayi na bwo ni ingenzi mu bukungu bwako.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the official Nyamasheke District website, checked on 11 November 2026. The 15-sector figure is attributed to the District's About page; inconsistent village totals are intentionally omitted."
        : language === "fr"
          ? "Fondé sur le site officiel du District de Nyamasheke, vérifié le 11 novembre 2026. Le chiffre de 15 secteurs provient de la page À propos du District ; les totaux de villages contradictoires sont volontairement omis."
          : "Bishingiye ku rubuga rwemewe rw'Akarere ka Nyamasheke; byasuzumwe ku wa 11 Ugushyingo 2026. Umubare w'Imirenge 15 uvuye ku rupapuro rwa About rw'Akarere; imibare y'Imidugudu idahuye nayiretse.",
      sources: [nyamashekeSource],
      suggestions: language === "en"
        ? ["What is Western Province?", "How many sectors does Nyamasheke have?", "Which districts border Nyamasheke?"]
        : language === "fr"
          ? ["Qu'est-ce que la Province de l'Ouest ?", "Combien de secteurs compte Nyamasheke ?", "Quels districts bordent Nyamasheke ?"]
          : ["Intara y'Iburengerazuba ni iyihe?", "Nyamasheke ifite imirenge ingahe?", "Nyamasheke gahana imbibi n'utundi turere tuhe?"],
    };
  }

  if (topic === "kigali") {
    const answer = language === "en"
      ? (kigaliDistrictFollowUp
        ? "The City of Kigali is made up of 3 districts: Gasabo, Kicukiro and Nyarugenge. The official City overview also lists 35 sectors, 161 cells and 1,155 villages. Kigali City is a distinct first-level administrative entity alongside Rwanda's four Provinces; it is not a fifth Province."
        : "Kigali is the capital city of Rwanda. Administratively, it is the City of Kigali, a first-level entity distinct from the four Provinces. The City is made up of three districts: Gasabo, Kicukiro and Nyarugenge. Its official overview lists 35 sectors, 161 cells, 1,155 villages and an area of 730 km².")
      : language === "fr"
        ? (kigaliDistrictFollowUp
          ? "La Ville de Kigali comprend 3 districts : Gasabo, Kicukiro et Nyarugenge. La présentation officielle indique aussi 35 secteurs, 161 cellules et 1 155 villages. La Ville de Kigali est une entité administrative de premier niveau distincte des quatre Provinces ; elle n'est pas une cinquième Province."
          : "Kigali est la capitale du Rwanda. Sur le plan administratif, la Ville de Kigali est une entité de premier niveau distincte des quatre Provinces. Elle comprend trois districts : Gasabo, Kicukiro et Nyarugenge. Sa présentation officielle indique 35 secteurs, 161 cellules, 1 155 villages et une superficie de 730 km².")
        : (kigaliDistrictFollowUp
          ? "Umujyi wa Kigali ugizwe n'uturere 3: Gasabo, Kicukiro na Nyarugenge. Urubuga rwemewe rw'Umujyi wa Kigali rugaragaza kandi imirenge 35, utugari 161 n'imidugudu 1,155. Umujyi wa Kigali uri ku rwego rwa mbere rw'ubuyobozi kimwe n'Intara enye, ariko si Intara ya gatanu."
          : "Kigali ni umurwa mukuru w'u Rwanda. Mu nzego z'ubuyobozi, ni Umujyi wa Kigali, urwego rwa mbere rutandukanye n'Intara enye z'u Rwanda. Ugizwe n'uturere dutatu: Gasabo, Kicukiro na Nyarugenge. Amakuru y'Umujyi wa Kigali agaragaza imirenge 35, utugari 161, imidugudu 1,155 n'ubuso bwa kilometero kare 730.");
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the official City of Kigali overview and the Government of Rwanda administrative overview, checked on 11 November 2026."
        : language === "fr"
          ? "Fondé sur la présentation officielle de la Ville de Kigali et celle du Gouvernement du Rwanda, vérifiées le 11 novembre 2026."
          : "Bishingiye ku rubuga rwemewe rw'Umujyi wa Kigali no ku mibare y'inzego itangazwa na Guverinoma y'u Rwanda; byasuzumwe ku wa 11 Ugushyingo 2026.",
      sources: [kigaliSource, adminSource],
      suggestions: language === "en" ? ["What is Gasabo District?", "How many sectors are in Gasabo?", "How is Rwanda administered?"]
        : language === "fr" ? ["Qu'est-ce que le district de Gasabo ?", "Combien de secteurs compte Gasabo ?", "Comment le Rwanda est-il administré ?"]
        : ["Akarere ka Gasabo ni akahe?", "Gasabo ifite imirenge ingahe?", "U Rwanda rugabanyijemo izihe nzego?"],
    };
  }

  const answer = language === "en"
    ? "Rwanda, officially the Republic of Rwanda, is a landlocked country in Central Africa. Its capital city is Kigali. It shares borders with Uganda to the north, Tanzania to the east, Burundi to the south and the Democratic Republic of the Congo to the west. The Government of Rwanda lists the country's area as 26,338 km². Rwanda is also known as the Land of a Thousand Hills."
    : language === "fr"
      ? "Le Rwanda, officiellement la République du Rwanda, est un pays enclavé d'Afrique centrale. Sa capitale est Kigali. Il partage ses frontières avec l'Ouganda au nord, la Tanzanie à l'est, le Burundi au sud et la République démocratique du Congo à l'ouest. Le Gouvernement du Rwanda indique une superficie de 26 338 km². Le pays est aussi connu comme le pays des mille collines."
      : "U Rwanda, rwitwa Repubulika y'u Rwanda mu izina ryuzuye, ni igihugu giherereye muri Afurika yo Hagati. Ni igihugu kidakora ku nyanja. Umurwa mukuru warwo ni Kigali. Ruhana imbibi na Uganda mu majyaruguru, Tanzania mu burasirazuba, Burundi mu majyepfo na Repubulika Iharanira Demokarasi ya Congo mu burengerazuba. Guverinoma y'u Rwanda igaragaza ko ubuso bwarwo ari kilometero kare 26,338. U Rwanda ruzwi kandi nk'Igihugu cy'Imisozi Igihumbi.";
  return {
    topic, answer,
    confidenceLabel: language === "en"
      ? "Based on the Government of Rwanda's official About page, checked on 11 November 2026. Population figures are omitted because they depend on census year."
      : language === "fr"
        ? "Fondé sur la page officielle À propos du Gouvernement du Rwanda, vérifiée le 11 novembre 2026. La population n'est pas indiquée car elle dépend de l'année du recensement."
        : "Bishingiye ku rupapuro rwemewe rwa Guverinoma y'u Rwanda; rwasuzumwe ku wa 11 Ugushyingo 2026. Umubare w'abaturage nawuretse kuko uhinduka bitewe n'umwaka w'ibarura.",
    sources: [rwandaSource],
    suggestions: language === "en" ? ["How many districts are in Rwanda?", "What is Kigali?", "Which countries border Rwanda?"]
      : language === "fr" ? ["Combien de districts compte le Rwanda ?", "Qu'est-ce que Kigali ?", "Quels pays bordent le Rwanda ?"]
      : ["U Rwanda rufite uturere tungahe?", "Kigali ni iki?", "U Rwanda ruhana imbibi n'ibihe bihugu?"],
  };
}
