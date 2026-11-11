import type { AssistantSource } from "./contracts";

export type KnowledgeTopic = "iwacu_rwanda" | "rwanda" | "kigali" | "nyamasheke";
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
  if (/\b(what is|what's|tell me about|which districts|how many districts|capital of)\b/.test(value)) return "en";
  if (/\b(qu'est ce|qu est ce|c'est quoi|combien de|quels sont|quelle est)\b/.test(value)) return "fr";
  return "rw";
}

function isDefinition(value: string): boolean {
  return /\b(ni iki|iki ni iki|what is|what's|define|tell me about|qu'est ce que|qu est ce que|c'est quoi|que signifie)\b/.test(value);
}

export function resolveKnowledgeTopic(query: string, previousTopic?: KnowledgeTopic | null): KnowledgeTopic | null {
  const value = normalize(query);
  if (/\biwacu\s+rwanda\b|\biwacu ai\b/.test(value) && isDefinition(value)) return "iwacu_rwanda";
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

  if (topic === "nyamasheke") {
    const answer = language === "en"
      ? "Nyamasheke is one of the seven districts in Rwanda's Western Province. The official district website lists 15 sectors, 68 cells and 588 villages. It borders Rusizi District to the south, Karongi District to the north, Nyamagabe District to the east and the Democratic Republic of the Congo to the west. Its notable natural attractions include Nyungwe National Park and Lake Kivu. Coffee and tea farming are important parts of the district's economy."
      : language === "fr"
        ? "Nyamasheke est l'un des sept districts de la Province de l'Ouest du Rwanda. Le site officiel du district indique 15 secteurs, 68 cellules et 588 villages. Le district partage ses frontières avec Rusizi au sud, Karongi au nord, Nyamagabe à l'est et la République démocratique du Congo à l'ouest. Ses attractions naturelles comprennent le parc national de Nyungwe et le lac Kivu. La culture du café et du thé est importante pour son économie."
        : "Nyamasheke ni kamwe mu Turere turindwi tugize Intara y'Iburengerazuba bw'u Rwanda. Urubuga rwemewe rw'Akarere rugaragaza ko kagizwe n'Imirenge 15, Utugari 68 n'Imidugudu 588. Gahana imbibi n'Akarere ka Rusizi mu majyepfo, Karongi mu majyaruguru, Nyamagabe mu burasirazuba na Repubulika Iharanira Demokarasi ya Kongo mu burengerazuba. Mu byiza nyaburanga hazwi harimo Pariki ya Nyungwe n'Ikiyaga cya Kivu. Ubuhinzi bw'ikawa n'icyayi na bwo ni ingenzi mu bukungu bwako.";
    return {
      topic, answer,
      confidenceLabel: language === "en"
        ? "Based on the official Nyamasheke District website, checked on 11 November 2026. Administrative counts are attributed to the District's published overview."
        : language === "fr"
          ? "Fondé sur le site officiel du District de Nyamasheke, vérifié le 11 novembre 2026. Les chiffres administratifs proviennent de la présentation publiée par le District."
          : "Bishingiye ku rubuga rwemewe rw'Akarere ka Nyamasheke; byasuzumwe ku wa 11 Ugushyingo 2026. Imibare y'inzego ni iyo Akarere kashyize ku rubuga rwako.",
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
