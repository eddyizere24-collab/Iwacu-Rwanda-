import type { AssistantSource } from "./contracts";

type Language = "rw" | "en" | "fr";

interface SectorFact {
  name: string;
  population: number;
  male: number;
  female: number;
}
interface DistrictFact {
  name: "Gasabo" | "Kicukiro" | "Nyarugenge";
  areaKm2: number;
  population: number;
  male: number;
  female: number;
  urban: number;
  rural: number;
  density: number;
  sectors: SectorFact[];
}

const citySource: AssistantSource = {
  label: "Umujyi wa Kigali — About Kigali City (official overview)",
  data_date: "2026-11-20",
  url: "https://www.kigalicity.gov.rw/about/overview",
  trust_tier: "official_government",
};
const administrationSource: AssistantSource = {
  label: "Umujyi wa Kigali — Good Governance and Territorial Administration",
  data_date: "2026-11-20",
  url: "https://www.kigalicity.gov.rw/1/good-governance-and-territorial-administration",
  trust_tier: "official_government",
};
const censusSource: AssistantSource = {
  label: "NISR — Fifth Rwanda Population and Housing Census, Main Indicators Report (February 2023), Tables 2 and 96; reference population date: August 2022",
  data_date: "2022-08",
  url: "https://statistics.gov.rw/sites/default/files/documents/2025-02/RPHC5_MainIndicatorsReport_Final.pdf",
  trust_tier: "official_government",
};
const historySource: AssistantSource = {
  label: "Visit Rwanda — Kigali city history and profile",
  data_date: null,
  url: "https://visitrwanda.com/meet-in-rwanda/kigali/",
  trust_tier: "reputable_publisher",
};
const kandtHouseSource: AssistantSource = {
  label: "Rwanda Digital Library — Kandt House historical record",
  data_date: null,
  url: "https://rwandadigitalibrary.gov.rw/pmb/opac_css/doc_num.php?explnum_id=440",
  trust_tier: "official_government",
};

const districts: DistrictFact[] = [
  {
    name: "Gasabo", areaKm2: 429.3, population: 879505, male: 443987, female: 435518,
    urban: 714069, rural: 165436, density: 2056,
    sectors: [
      { name: "Bumbogo", population: 112899, male: 56361, female: 56538 },
      { name: "Gatsata", population: 46262, male: 24146, female: 22116 },
      { name: "Gikomero", population: 19630, male: 9567, female: 10063 },
      { name: "Gisozi", population: 75611, male: 38995, female: 36616 },
      { name: "Jabana", population: 63862, male: 31600, female: 32262 },
      { name: "Jali", population: 41156, male: 20279, female: 20877 },
      { name: "Kacyiru", population: 30036, male: 15994, female: 14042 },
      { name: "Kimihurura", population: 16425, male: 8599, female: 7826 },
      { name: "Kimironko", population: 61733, male: 31721, female: 30012 },
      { name: "Kinyinya", population: 125400, male: 63081, female: 62319 },
      { name: "Ndera", population: 95164, male: 48058, female: 47106 },
      { name: "Nduba", population: 68424, male: 33609, female: 34815 },
      { name: "Remera", population: 38648, male: 20300, female: 18348 },
      { name: "Rusororo", population: 61787, male: 30812, female: 30975 },
      { name: "Rutunga", population: 22468, male: 10865, female: 11603 },
    ],
  },
  {
    name: "Kicukiro", areaKm2: 166.7, population: 491731, male: 249115, female: 242616,
    urban: 487200, rural: 4531, density: 2944,
    sectors: [
      { name: "Gahanga", population: 79082, male: 40127, female: 38955 },
      { name: "Gatenga", population: 67084, male: 34465, female: 32619 },
      { name: "Gikondo", population: 19803, male: 11383, female: 8420 },
      { name: "Kagarama", population: 21277, male: 10839, female: 10438 },
      { name: "Kanombe", population: 72346, male: 36321, female: 36025 },
      { name: "Kicukiro", population: 14039, male: 7328, female: 6711 },
      { name: "Kigarama", population: 63153, male: 32243, female: 30910 },
      { name: "Masaka", population: 78788, male: 38739, female: 40049 },
      { name: "Niboye", population: 26912, male: 13652, female: 13260 },
      { name: "Nyarugunga", population: 49247, male: 24018, female: 25229 },
    ],
  },
  {
    name: "Nyarugenge", areaKm2: 134, population: 374319, male: 195780, female: 178539,
    urban: 315899, rural: 58420, density: 2830,
    sectors: [
      { name: "Gitega", population: 26668, male: 13699, female: 12969 },
      { name: "Kanyinya", population: 31026, male: 15776, female: 15250 },
      { name: "Kigali", population: 61499, male: 32124, female: 29375 },
      { name: "Kimisagara", population: 56534, male: 28905, female: 27629 },
      { name: "Mageregere", population: 59747, male: 34038, female: 25709 },
      { name: "Muhima", population: 22531, male: 12286, female: 10245 },
      { name: "Nyakabanda", population: 29580, male: 14752, female: 14828 },
      { name: "Nyamirambo", population: 55315, male: 27838, female: 27477 },
      { name: "Nyarugenge", population: 16665, male: 8806, female: 7859 },
      { name: "Rwezamenyo", population: 14754, male: 7556, female: 7198 },
    ],
  },
];

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[!?.,;:()[\]{}]/g, " ").replace(/\s+/g, " ").trim();
}

function languageOf(query: string): Language {
  const value = normalize(query);
  if (/\b(qu'est ce|qu est ce|c'est quoi|combien|quelle|quels|quelle est|population de|superficie|histoire de|densite|secteurs de|districts de)\b/.test(value)) return "fr";
  if (/\b(what is|what are|tell me about|which|how many|how much|population of|area of|history of|density|borders of|sectors in|districts in|capital of)\b/.test(value)) return "en";
  return "rw";
}

function number(value: number): string {
  return value.toLocaleString("en-US");
}

function districtFromQuery(value: string): DistrictFact | undefined {
  const explicitSector = /\b(umurenge|sector|secteur)\b/.test(value);
  const explicitDistrict = /\b(akarere|district)\b/.test(value);
  if (explicitSector && !explicitDistrict) return undefined;
  return districts.find((district) => new RegExp("\\b" + district.name.toLowerCase() + "\\b").test(value));
}

function sectorFromQuery(value: string): { sector: SectorFact; district: DistrictFact } | undefined {
  const explicitSector = /\b(umurenge|sector|secteur)\b/.test(value);
  const districtNames = districts.map((item) => item.name.toLowerCase());
  for (const district of districts) {
    const sector = district.sectors.find((item) => {
      if (item.name === "Kigali") return explicitSector;
      if (!explicitSector && districtNames.includes(item.name.toLowerCase())) return false;
      return new RegExp("\\b" + item.name.toLowerCase() + "\\b").test(value);
    });
    if (sector) return { sector, district };
  }
  return undefined;
}

export function isKigaliKnowledgeQuery(query: string): boolean {
  const value = normalize(query);
  if (/\b(kigali|umujyi wa kigali|city of kigali|ville de kigali)\b/.test(value)) return true;

  const district = districts.some((item) => new RegExp("\\b" + item.name.toLowerCase() + "\\b").test(value));
  const sector = districts.some((item) => item.sectors.some((entry) =>
    entry.name !== "Kigali" && new RegExp("\\b" + entry.name.toLowerCase() + "\\b").test(value)));
  const questionShape = /\b(abaturage|population|inhabitants|ubuso|area|superficie|amateka|history|histoire|umurenge|sector|secteur|akarere|district|imirenge|sectors|uturere|districts|gafite|ifite|how many|combien)\b/.test(value);
  return questionShape && (district || sector);
}

function sources(...items: AssistantSource[]): AssistantSource[] {
  return items;
}

function answer(
  language: Language,
  rw: string,
  en: string,
  fr: string,
): string {
  return language === "en" ? en : language === "fr" ? fr : rw;
}

function suggestionSet(language: Language, rw: string[], en: string[], fr: string[]): string[] {
  return language === "en" ? en : language === "fr" ? fr : rw;
}

function cityHistory(language: Language): string {
  return answer(
    language,
    "Kigali yatangiye kugaragara nk'icyicaro cy'ubutegetsi bw'abakoloni mu 1907, mu gihe Richard Kandt yari ahagarariye ubutegetsi bw'Abadage muri ako gace. Mu 1908, Kandt yakoreraga ku musozi wa Nyarugenge. Kigali yabaye umurwa mukuru w'u Rwanda igihe igihugu cyabonaga ubwigenge mu 1962. Ibyo ni amateka rusange y'Umujyi; ntibivuze ko buri murenge wawo ufite amateka yanditse kandi yemejwe.",
    "Kigali began as a colonial administrative outpost in 1907, during the period when Richard Kandt represented German colonial administration in the area. Kandt's office was at Nyarugenge Hill in 1908. Kigali became Rwanda's capital when the country gained independence in 1962. These are city-level historical facts; they do not mean that a verified written history exists for every sector.",
    "Kigali a commencé comme poste administratif colonial en 1907, à l'époque où Richard Kandt représentait l'administration coloniale allemande dans la région. Le bureau de Kandt se trouvait sur la colline de Nyarugenge en 1908. Kigali est devenue la capitale du Rwanda lorsque le pays a accédé à l'indépendance en 1962. Il s'agit de faits historiques à l'échelle de la ville ; cela ne signifie pas qu'une histoire écrite et vérifiée existe pour chaque secteur.",
  );
}

export function getKigaliKnowledgeReply(query: string) {
  const value = normalize(query);
  const language = languageOf(query);
  const sectorMatch = sectorFromQuery(value);
  const districtMatch = districtFromQuery(value);
  const selectedDistrict = sectorMatch?.district ?? districtMatch;
  const asksHistory = /\b(amateka|history|histoire|yashinzwe ryari|ryatangiye ryari|established|founded)\b/.test(value);
  const asksArea = /\b(ubuso|area|superficie|km2|kilometero kare|square kilometer)\b/.test(value);
  const asksDensity = /\b(ubucucike|density|densite|densité|abaturage kuri km)\b/.test(value);
  const asksPopulation = /\b(abaturage|population|inhabitants|habitants|ubwiyongere)\b/.test(value);
  const asksList = /\b(urutonde|amazina|ni iyihe|ni izihe|which|list|names|quels|quelles|liste)\b/.test(value);
  const asksSectors = /\b(imirenge|umurenge|sectors|sector|secteur|secteurs)\b/.test(value);
  const asksDistricts = /\b(uturere|akarere|districts|district)\b/.test(value);
  const cityQuestion = /\b(kigali|umujyi wa kigali|city of kigali|ville de kigali)\b/.test(value);

  const sourceList = sources(citySource, censusSource, administrationSource);

  if (asksHistory) {
    if (sectorMatch) {
      const { sector, district } = sectorMatch;
      const pop = number(sector.population);
      const rw = "Ntabwo mfite inyandiko y'amateka y'Umurenge wa " + sector.name + " yemejwe n'isoko ryizewe. Ibyo nshobora kwemeza ni uko uri mu Karere ka " + district.name + " kandi ko Ibarura rusange rya 2022 ryabaruye abaturage " + pop + " muri uwo Murenge. Sinzavanga amateka y'Umujyi wose n'amateka yihariye y'uyu Murenge.";
      const en = "I do not currently have a reliable, verified historical record specifically for " + sector.name + " Sector. What I can verify is that it is in " + district.name + " District and that the 2022 census counted " + pop + " residents there. I will not present the city's general history as if it were the sector's own history.";
      const fr = "Je ne dispose pas actuellement d'un document historique fiable et vérifié consacré spécifiquement au secteur de " + sector.name + ". Je peux confirmer qu'il se trouve dans le district de " + district.name + " et que le recensement de 2022 y a dénombré " + pop + " habitants. Je ne présenterai pas l'histoire générale de la ville comme s'il s'agissait de l'histoire propre à ce secteur.";
      return {
        topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "The population is from the August 2022 census; no verified sector-history source is available in this knowledge set."
          : language === "fr" ? "La population provient du recensement d'août 2022 ; aucune source historique vérifiée sur ce secteur n'est disponible dans cette base."
            : "Abaturage ni abo mu ibarura ryo muri Kanama 2022; nta nyandiko y'amateka y'uyu Murenge yemejwe iri muri ubu bubiko.",
        sources: [censusSource, administrationSource],
        suggestions: suggestionSet(language,
          ["Uyu Murenge ufite abaturage bangahe?", "Ni iyihe mirenge igize Akarere ka " + district.name + "?", "Amateka rusange y'Umujyi wa Kigali ni ayahe?"],
          ["How many people live in this sector?", "Which sectors make up " + district.name + " District?", "What is the history of Kigali City?"],
          ["Quelle est la population de ce secteur ?", "Quels secteurs composent le district de " + district.name + " ?", "Quelle est l'histoire de la Ville de Kigali ?"]),
      };
    }
    return {
      topic: "kigali" as const, answer: cityHistory(language),
      confidenceLabel: language === "en"
        ? "Historical outline based on Visit Rwanda and the Rwanda Digital Library record for Kandt House."
        : language === "fr"
          ? "Aperçu historique fondé sur Visit Rwanda et la notice de la Maison Kandt de la Bibliothèque numérique du Rwanda."
          : "Incamake ishingiye kuri Visit Rwanda no ku nyandiko ya Kandt House yo mu isomero ry'ikoranabuhanga ry'u Rwanda.",
      sources: [historySource, kandtHouseSource],
      suggestions: suggestionSet(language,
        ["Kandt House iherereye he?", "Umujyi wa Kigali ugizwe n'uturere tungahe?", "Umujyi wa Kigali ufite ubuso bungana iki?"],
        ["Where is Kandt House?", "How many districts are in Kigali City?", "What is the area of Kigali City?"],
        ["Où se trouve la Maison Kandt ?", "Combien de districts compte Kigali ?", "Quelle est la superficie de Kigali ?"]),
    };
  }

  if (asksSectors && selectedDistrict && (asksList || asksSectors)) {
    const list = selectedDistrict.sectors.map((item) => item.name).join(", ");
    const rw = "Akarere ka " + selectedDistrict.name + " gafite imirenge " + selectedDistrict.sectors.length + ": " + list + ". Uru rutonde rukurikira ububiko bw'Umujyi wa Kigali. Imibare y'abaturage kuri buri Murenge ituruka mu Ibarura rusange rya 2022.";
    const en = selectedDistrict.name + " District has " + selectedDistrict.sectors.length + " sectors: " + list + ". This list follows the City of Kigali's administrative information. Sector population figures are from the 2022 Population and Housing Census.";
    const fr = "Le district de " + selectedDistrict.name + " compte " + selectedDistrict.sectors.length + " secteurs : " + list + ". Cette liste suit les informations administratives de la Ville de Kigali. Les populations des secteurs proviennent du recensement général de 2022.";
    return {
      topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "Sector names and counts: City of Kigali official overview; population reference: August 2022 census."
        : language === "fr" ? "Noms et nombre de secteurs : présentation officielle de la Ville de Kigali ; populations : recensement d'août 2022."
          : "Amazina n'umubare w'imirenge: urubuga rwemewe rw'Umujyi wa Kigali; abaturage: ibarura rya Kanama 2022.",
      sources: [citySource, administrationSource, censusSource],
      suggestions: suggestionSet(language,
        ["Abaturage ba " + selectedDistrict.name + " ni bangahe?", "Umurenge wa Kinyinya ufite abaturage bangahe?", "Akarere ka " + selectedDistrict.name + " gafite ubuso bungana iki?"],
        ["What is the population of " + selectedDistrict.name + "?", "How many people live in Kinyinya Sector?", "What is the area of " + selectedDistrict.name + " District?"],
        ["Quelle est la population de " + selectedDistrict.name + " ?", "Combien d'habitants compte le secteur de Kinyinya ?", "Quelle est la superficie du district de " + selectedDistrict.name + " ?"]),
    };
  }

  if (sectorMatch) {
    const { sector, district } = sectorMatch;
    const population = number(sector.population);
    if (asksArea) {
      const rw = "Umurenge wa " + sector.name + " uri mu Karere ka " + district.name + ". Nta mubare w'ubuso bwihariye bw'uyu Murenge mfite wemejwe n'inyandiko y'Umujyi cyangwa NISR; sinzawuhimba. Ubuso bw'Akarere ka " + district.name + " ni " + district.areaKm2 + " km².";
      const en = sector.name + " Sector is in " + district.name + " District. I do not have a verified area figure for this sector from the City or NISR, so I will not invent one. " + district.name + " District covers " + district.areaKm2 + " km².";
      const fr = "Le secteur de " + sector.name + " se trouve dans le district de " + district.name + ". Je ne dispose pas d'une superficie vérifiée pour ce secteur auprès de la Ville ou de la NISR ; je ne vais donc pas l'inventer. Le district de " + district.name + " couvre " + district.areaKm2 + " km².";
      return {
        topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "District area is from the City of Kigali; a verified sector-level area was not found."
          : language === "fr" ? "La superficie du district provient de la Ville de Kigali ; aucune superficie vérifiée au niveau du secteur n'a été trouvée."
            : "Ubuso bw'Akarere buturuka ku Mugi wa Kigali; nta buso bw'Umurenge bwemejwe nabonye.",
        sources: [citySource, censusSource],
        suggestions: suggestionSet(language, ["Abaturage ba " + sector.name + " ni bangahe?", "Amateka y'Umurenge wa " + sector.name + " arahari?", "Akarere ka " + district.name + " gafite imirenge iyihe?"],
          ["What is the population of " + sector.name + "?", "Is there a verified history of " + sector.name + " Sector?", "Which sectors are in " + district.name + " District?"],
          ["Quelle est la population de " + sector.name + " ?", "Existe-t-il une histoire vérifiée du secteur de " + sector.name + " ?", "Quels secteurs se trouvent dans le district de " + district.name + " ?"]),
      };
    }
    const rw = "Umurenge wa " + sector.name + " uherereye mu Karere ka " + district.name + ". Ibarura rusange ry'abaturage n'imiturire rya Kanama 2022 ryabaruye abantu " + population + " muri uyu Murenge: abagabo " + number(sector.male) + " n'abagore " + number(sector.female) + ". Uyu ni umubare w'ibarura rya 2022, si igereranya ry'abaturage bariho uyu munsi.";
    const en = sector.name + " Sector is in " + district.name + " District. Rwanda's August 2022 Population and Housing Census counted " + population + " residents in this sector: " + number(sector.male) + " males and " + number(sector.female) + " females. This is the 2022 census count, not a live estimate of today's population.";
    const fr = "Le secteur de " + sector.name + " se trouve dans le district de " + district.name + ". Le recensement de la population et de l'habitat d'août 2022 a dénombré " + population + " habitants dans ce secteur : " + number(sector.male) + " hommes et " + number(sector.female) + " femmes. Il s'agit du résultat du recensement de 2022, et non d'une estimation en temps réel de la population actuelle.";
    return {
      topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "Official NISR census, August 2022, Table 96. This is a historical census count."
        : language === "fr" ? "Recensement officiel de la NISR, août 2022, tableau 96. Il s'agit d'un chiffre historique de recensement."
          : "Ibarura ryemewe rya NISR, Kanama 2022, Imbonerahamwe ya 96. Uyu ni umubare w'ibarura ryabaye, si uw'uyu munsi.",
      sources: [censusSource, citySource],
      suggestions: suggestionSet(language, ["Akarere ka " + district.name + " gafite imirenge iyihe?", "Ubuso bw'Akarere ka " + district.name + " bungana iki?", "Amateka y'Umujyi wa Kigali ni ayahe?"],
        ["Which sectors are in " + district.name + " District?", "What is the area of " + district.name + " District?", "What is the history of Kigali City?"],
        ["Quels secteurs composent le district de " + district.name + " ?", "Quelle est la superficie du district de " + district.name + " ?", "Quelle est l'histoire de Kigali ?"]),
    };
  }

  if (selectedDistrict) {
    const district = selectedDistrict;
    if (asksArea) {
      const rw = "Akarere ka " + district.name + " gafite ubuso bwa " + district.areaKm2 + " km². Umujyi wa Kigali wose ufite 730 km².";
      const en = district.name + " District covers " + district.areaKm2 + " km². The entire City of Kigali covers 730 km².";
      const fr = "Le district de " + district.name + " couvre " + district.areaKm2 + " km². La Ville de Kigali couvre au total 730 km².";
      return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "Official City of Kigali overview, checked 20 November 2026."
          : language === "fr" ? "Présentation officielle de la Ville de Kigali, vérifiée le 20 novembre 2026."
            : "Urubuga rwemewe rw'Umujyi wa Kigali; rwasuzumwe ku wa 20 Ugushyingo 2026.",
        sources: [citySource], suggestions: suggestionSet(language, ["Abaturage ba " + district.name + " ni bangahe?", "Akarere ka " + district.name + " gafite imirenge iyihe?", "Umujyi wa Kigali uhana imbibi he?"],
          ["What is the population of " + district.name + "?", "Which sectors are in " + district.name + "?", "Which areas border Kigali City?"],
          ["Quelle est la population de " + district.name + " ?", "Quels secteurs compte " + district.name + " ?", "Quelles entités bordent Kigali ?"]) };
    }
    if (asksDensity) {
      const rw = "Ubucucike bw'abaturage mu Karere ka " + district.name + " bwari abantu " + number(district.density) + " kuri km² mu mibare y'Ibarura rya 2022. Ni imibare y'icyo gihe, ishobora kuba yarahindutse.";
      const en = "The 2022 census-based population density in " + district.name + " District was " + number(district.density) + " people per km². This is a 2022 figure and may have changed.";
      const fr = "La densité de population du district de " + district.name + " était de " + number(district.density) + " habitants par km² selon les données du recensement de 2022. Ce chiffre peut avoir changé depuis.";
      return { topic: "kigali" as const, answer: answer(language, rw, en, fr), confidenceLabel: "NISR — 2022 Census.", sources: [censusSource],
        suggestions: suggestionSet(language, ["Abaturage ba " + district.name + " ni bangahe?", "Akarere ka " + district.name + " gafite ubuso bungana iki?"],
          ["What is the population of " + district.name + "?", "What is its area?"],
          ["Quelle est la population de " + district.name + " ?", "Quelle est sa superficie ?"]) };
    }
    if (asksPopulation || !asksArea) {
      const rw = "Akarere ka " + district.name + " kari mu Mujyi wa Kigali. Ibarura rusange rya Kanama 2022 ryabaruye abaturage " + number(district.population) + ": abagabo " + number(district.male) + " n'abagore " + number(district.female) + ". Abaturage batuye mu bice by'Umujyi (urban) bari " + number(district.urban) + ", naho abari mu bice by'icyaro (rural) bari " + number(district.rural) + ". Umubare w'imirenge ni " + district.sectors.length + ". Iyi ni imibare y'ibarura rya 2022.";
      const en = district.name + " District is part of the City of Kigali. The August 2022 census counted " + number(district.population) + " residents: " + number(district.male) + " males and " + number(district.female) + " females. The urban population was " + number(district.urban) + " and the rural population was " + number(district.rural) + ". The district has " + district.sectors.length + " sectors. These are 2022 census figures.";
      const fr = "Le district de " + district.name + " fait partie de la Ville de Kigali. Le recensement d'août 2022 a dénombré " + number(district.population) + " habitants : " + number(district.male) + " hommes et " + number(district.female) + " femmes. La population urbaine était de " + number(district.urban) + " et la population rurale de " + number(district.rural) + ". Le district compte " + district.sectors.length + " secteurs. Ce sont des chiffres du recensement de 2022.";
      return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "NISR — August 2022 census, Tables 2 and 96; not a current population estimate."
          : language === "fr" ? "NISR — recensement d'août 2022, tableaux 2 et 96 ; ce n'est pas une estimation actuelle."
            : "NISR — ibarura rya Kanama 2022, Imbonerahamwe ya 2 na 96; si igereranya ry'abaturage b'uyu munsi.",
        sources: [censusSource, citySource],
        suggestions: suggestionSet(language, ["Akarere ka " + district.name + " gafite imirenge iyihe?", "Abaturage b'Umurenge wa Kinyinya ni bangahe?", "Ubuso bw'Akarere ka " + district.name + " bungana iki?"],
          ["Which sectors make up " + district.name + "?", "How many people live in Kinyinya Sector?", "What is the district's area?"],
          ["Quels secteurs composent " + district.name + " ?", "Combien d'habitants compte le secteur de Kinyinya ?", "Quelle est la superficie du district ?"]) };
    }
  }

  if (asksArea) {
    const rw = "Umujyi wa Kigali ufite ubuso bwa kilometero kare 730. Uturere tuyigize dufite ubu buso: Gasabo 429.3 km², Kicukiro 166.7 km² na Nyarugenge 134 km².";
    const en = "The City of Kigali covers 730 km². Its districts have these areas: Gasabo 429.3 km², Kicukiro 166.7 km² and Nyarugenge 134 km².";
    const fr = "La Ville de Kigali couvre 730 km². Ses districts ont les superficies suivantes : Gasabo 429,3 km², Kicukiro 166,7 km² et Nyarugenge 134 km².";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "Official City of Kigali overview, checked 20 November 2026."
        : language === "fr" ? "Présentation officielle de la Ville de Kigali, vérifiée le 20 novembre 2026."
          : "Urubuga rwemewe rw'Umujyi wa Kigali; rwasuzumwe ku wa 20 Ugushyingo 2026.",
      sources: [citySource], suggestions: suggestionSet(language,
        ["Abaturage b'Umujyi wa Kigali ni bangahe?", "Uturere twa Kigali ni utuhe?", "Umujyi wa Kigali uhana imbibi n'utundi turere tuhe?"],
        ["What is Kigali's population?", "Which districts make up Kigali?", "Which districts border Kigali?"],
        ["Quelle est la population de Kigali ?", "Quels districts composent Kigali ?", "Quels districts bordent Kigali ?"]) };
  }

  if (asksDensity) {
    const rw = "Ubucucike bw'abaturage mu Mujyi wa Kigali bwari abantu 2,401 kuri km² mu mibare ishingiye ku Ibarura rya 2022. Gasabo yari ifite 2,056 kuri km², Kicukiro 2,944 kuri km² na Nyarugenge 2,830 kuri km². Iyi ni imibare y'icyo gihe.";
    const en = "The census-based population density of the City of Kigali was 2,401 people per km² in 2022. Gasabo was 2,056 per km², Kicukiro 2,944 per km² and Nyarugenge 2,830 per km². These are 2022 figures.";
    const fr = "La densité de population de la Ville de Kigali était de 2 401 habitants par km² en 2022. Gasabo comptait 2 056 habitants par km², Kicukiro 2 944 et Nyarugenge 2 830. Il s'agit de chiffres de 2022.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: "NISR — 2022 Population and Housing Census.",
      sources: [censusSource], suggestions: suggestionSet(language, ["Abaturage ba Gasabo ni bangahe?", "Ubuso bw'Umujyi wa Kigali bungana iki?"],
        ["What is Gasabo's population?", "What is Kigali's area?"],
        ["Quelle est la population de Gasabo ?", "Quelle est la superficie de Kigali ?"]) };
  }

  if (asksPopulation) {
    const rw = "Ibarura rusange ry'abaturage n'imiturire rya Kanama 2022 ryabaruye abaturage 1,745,555 mu Mujyi wa Kigali: abagabo 888,882 n'abagore 856,673. Mu mijyi (urban) habaruwe 1,517,168, naho mu byaro (rural) habaruwe 228,387. Iyi mibare yerekana uko byari bimeze mu 2022; si umubare w'abaturage bariho uyu munsi.";
    const en = "The August 2022 Rwanda Population and Housing Census counted 1,745,555 residents in the City of Kigali: 888,882 males and 856,673 females. It counted 1,517,168 urban residents and 228,387 rural residents. These figures describe the population in 2022, not today's live population.";
    const fr = "Le recensement rwandais de la population et de l'habitat d'août 2022 a dénombré 1 745 555 habitants dans la Ville de Kigali : 888 882 hommes et 856 673 femmes. Il a recensé 1 517 168 habitants en zone urbaine et 228 387 en zone rurale. Ces chiffres décrivent la population en 2022 et non la population actuelle en temps réel.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "NISR — August 2022 census, Tables 2 and 96; this is not a current estimate."
        : language === "fr" ? "NISR — recensement d'août 2022, tableaux 2 et 96 ; il ne s'agit pas d'une estimation actuelle."
          : "NISR — ibarura rya Kanama 2022, Imbonerahamwe ya 2 na 96; si umubare w'ubu.",
      sources: [censusSource, citySource],
      suggestions: suggestionSet(language, ["Abaturage ba Gasabo ni bangahe?", "Abaturage ba Kicukiro ni bangahe?", "Abaturage ba Nyarugenge ni bangahe?"],
        ["What is the population of Gasabo?", "What is Kicukiro's population?", "What is Nyarugenge's population?"],
        ["Quelle est la population de Gasabo ?", "Quelle est la population de Kicukiro ?", "Quelle est la population de Nyarugenge ?"]) };
  }

  if (asksDistricts && asksList) {
    const rw = "Umujyi wa Kigali ugizwe n'uturere dutatu: Gasabo, Kicukiro na Nyarugenge. Ni urwego rwihariye rw'ubuyobozi ku rwego rwa mbere, rungana n'Intara enye z'u Rwanda; si Intara ya gatanu.";
    const en = "The City of Kigali is made up of three districts: Gasabo, Kicukiro and Nyarugenge. Kigali is a distinct first-level administrative entity alongside Rwanda's four Provinces; it is not a fifth Province.";
    const fr = "La Ville de Kigali comprend trois districts : Gasabo, Kicukiro et Nyarugenge. Kigali est une entité administrative distincte de premier niveau, au même rang que les quatre Provinces du Rwanda ; ce n'est pas une cinquième Province.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr), confidenceLabel: "City of Kigali and Government of Rwanda official administrative information.",
      sources: [citySource, administrationSource],
      suggestions: suggestionSet(language, ["Gasabo ifite imirenge iyihe?", "Umujyi wa Kigali ufite ubuso bungana iki?", "Abaturage b'Umujyi wa Kigali ni bangahe?"],
        ["Which sectors are in Gasabo?", "What is Kigali's area?", "What is Kigali's population?"],
        ["Quels secteurs compte Gasabo ?", "Quelle est la superficie de Kigali ?", "Quelle est la population de Kigali ?"]) };
  }

  if (asksSectors && asksList) {
    const rw = "Umujyi wa Kigali ufite imirenge 35 mu Turere dutatu. Gasabo ifite 15, Kicukiro ifite 10, Nyarugenge ifite 10. Vuga izina ry'Akarere kugira ngo nguhe urutonde rw'imirenge yako.";
    const en = "The City of Kigali has 35 sectors across three districts: Gasabo has 15, Kicukiro has 10 and Nyarugenge has 10. Name the district for its full sector list.";
    const fr = "La Ville de Kigali compte 35 secteurs répartis dans trois districts : Gasabo en compte 15, Kicukiro 10 et Nyarugenge 10. Indiquez le district pour obtenir la liste complète de ses secteurs.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr), confidenceLabel: "City of Kigali official overview and administrative information.",
      sources: [citySource, administrationSource], suggestions: suggestionSet(language, ["Gasabo ifite imirenge iyihe?", "Kicukiro ifite imirenge iyihe?", "Nyarugenge ifite imirenge iyihe?"],
        ["Which sectors are in Gasabo?", "Which sectors are in Kicukiro?", "Which sectors are in Nyarugenge?"],
        ["Quels secteurs sont dans Gasabo ?", "Quels secteurs sont dans Kicukiro ?", "Quels secteurs sont dans Nyarugenge ?"]) };
  }

  if (/\b(imbibi|gahana|borders|border|limitrophes|frontieres|frontiere)\b/.test(value)) {
    const rw = "Umujyi wa Kigali uhana imbibi n'Uturere twa Gicumbi na Rulindo mu Majyaruguru, Bugesera na Rwamagana mu Burasirazuba, na Kamonyi mu Majyepfo. Aho uhana imbibi mu Burengerazuba ntihagaragajwe muri uru rupapuro rw'Umujyi wa Kigali; sinzongeraho Akarere ntarabonera gihamya.";
    const en = "The City of Kigali borders Gicumbi and Rulindo to the north, Bugesera and Rwamagana to the east, and Kamonyi to the south. The City overview consulted does not identify a western neighbour, so I will not add one without a verified source.";
    const fr = "La Ville de Kigali est limitrophe de Gicumbi et Rulindo au nord, de Bugesera et Rwamagana à l'est, et de Kamonyi au sud. La présentation consultée de la Ville n'indique pas de voisin à l'ouest ; je n'en ajouterai donc pas sans source vérifiée.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr), confidenceLabel: "City of Kigali official overview.",
      sources: [citySource], suggestions: suggestionSet(language, ["Umujyi wa Kigali ufite uturere tungahe?", "Ubuso bw'Umujyi wa Kigali bungana iki?"],
        ["How many districts does Kigali have?", "What is Kigali's area?"],
        ["Combien de districts compte Kigali ?", "Quelle est sa superficie ?"]) };
  }

  const overviewRw = "Umujyi wa Kigali ni wo murwa mukuru w'u Rwanda. Ufite ubuso bwa km² 730 kandi ugizwe n'Uturere dutatu: Gasabo, Kicukiro na Nyarugenge. Ibarura rya Kanama 2022 ryabaruye abaturage 1,745,555. Umujyi ufite imirenge 35, utugari 161 n'imidugudu 1,155. Mu nzego z'ubuyobozi, Umujyi wa Kigali ni urwego rwa mbere ruri ku rwego rumwe n'Intara enye; si Intara ya gatanu.";
  const overviewEn = "The City of Kigali is Rwanda's capital. It covers 730 km² and consists of three districts: Gasabo, Kicukiro and Nyarugenge. The August 2022 census counted 1,745,555 residents. The City has 35 sectors, 161 cells and 1,155 villages. Administratively, the City is a first-level entity alongside the four Provinces; it is not a fifth Province.";
  const overviewFr = "La Ville de Kigali est la capitale du Rwanda. Elle couvre 730 km² et comprend trois districts : Gasabo, Kicukiro et Nyarugenge. Le recensement d'août 2022 a dénombré 1 745 555 habitants. La Ville compte 35 secteurs, 161 cellules et 1 155 villages. Sur le plan administratif, Kigali est une entité de premier niveau au même rang que les quatre Provinces ; ce n'est pas une cinquième Province.";
  return {
    topic: "kigali" as const,
    answer: answer(language, overviewRw, overviewEn, overviewFr),
    confidenceLabel: language === "en"
      ? "Administrative counts and area: City of Kigali official overview. Population: NISR August 2022 census; not a current estimate."
      : language === "fr"
        ? "Nombre d'unités administratives et superficie : présentation officielle de la Ville de Kigali. Population : recensement NISR d'août 2022 ; ce n'est pas une estimation actuelle."
        : "Imibare y'inzego n'ubuso: urubuga rwemewe rw'Umujyi wa Kigali. Abaturage: ibarura rya NISR rya Kanama 2022; si imibare y'uyu munsi.",
    sources: sourceList,
    suggestions: suggestionSet(language,
      ["Amateka y'Umujyi wa Kigali ni ayahe?", "Uturere twa Kigali ni utuhe?", "Abaturage ba Gasabo ni bangahe?"],
      ["What is the history of Kigali City?", "Which districts make up Kigali?", "What is Gasabo's population?"],
      ["Quelle est l'histoire de Kigali ?", "Quels districts composent Kigali ?", "Quelle est la population de Gasabo ?"]),
  };
}
