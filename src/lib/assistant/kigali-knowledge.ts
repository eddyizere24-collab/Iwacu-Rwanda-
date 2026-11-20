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
  cells: number;
  urban: number;
  rural: number;
  density: number;
  sectors: SectorFact[];
}

const citySource: AssistantSource = {
  label: "Umujyi wa Kigali — About Kigali City (official overview)",
  data_date: null,
  url: "https://www.kigalicity.gov.rw/about/overview",
  trust_tier: "official_government",
};
const annualReportSource: AssistantSource = {
  label: "City of Kigali — Annual Report 2024–2025",
  data_date: "2024-2025",
  url: "https://www.kigalicity.gov.rw/fileadmin/user_upload/Kigali_city/Publications/Reports/City_of_Kigali_s_Annual_Report_2024-2025.pdf",
  trust_tier: "official_government",
};
const masterPlanSource: AssistantSource = {
  label: "City of Kigali — City of Kigali Launches New Master Plan 2050 (4 September 2020)",
  data_date: "2020-09-04",
  url: "https://www.kigalicity.gov.rw/news-detail/city-of-kigali-launches-new-master-plan-2050",
  trust_tier: "official_government",
};
const minubumweHistorySource: AssistantSource = {
  label: "Ministry of National Unity and Civic Engagement — History of Rwanda",
  data_date: null,
  url: "https://www.minubumwe.gov.rw/fileadmin/user_upload/MINUBUMWE/Archives/NURC_Archives/HISTORY_OF_RWANDA_ENGLISH_BOOK.pdf",
  trust_tier: "official_government",
};
const administrationSource: AssistantSource = {
  label: "Umujyi wa Kigali — Good Governance and Territorial Administration",
  data_date: null,
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
const gasaboSource: AssistantSource = {
  label: "Gasabo District — Menya Akarere",
  data_date: null,
  url: "https://www.gasabo.gov.rw/about/menya-akarere",
  trust_tier: "official_government",
};
const gasaboHomepageSource: AssistantSource = {
  label: "Gasabo District — official homepage",
  data_date: null,
  url: "https://www.gasabo.gov.rw/",
  trust_tier: "official_government",
};
const kicukiroSource: AssistantSource = {
  label: "Kicukiro District — Menya Akarere",
  data_date: null,
  url: "https://www.kicukiro.gov.rw/akarere/menya-akarere",
  trust_tier: "official_government",
};
const nyarugengeSource: AssistantSource = {
  label: "Nyarugenge District — Menya Akarere",
  data_date: null,
  url: "https://www.nyarugenge.gov.rw/akarere/menya-akarere",
  trust_tier: "official_government",
};

const districts: DistrictFact[] = [
  {
    name: "Gasabo", areaKm2: 429.3, population: 879505, male: 443987, female: 435518, cells: 73,
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
    name: "Kicukiro", areaKm2: 166.7, population: 491731, male: 249115, female: 242616, cells: 41,
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
    name: "Nyarugenge", areaKm2: 134, population: 374319, male: 195780, female: 178539, cells: 47,
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
  if (/\b(qu'est ce|qu est ce|c'est quoi|combien|quelle|quels|quelles|comment|pourquoi|quand|decrivez|presentez|parlez|expliquez|listez|population de|superficie|histoire de|densite|secteurs de|districts de|la ville de|ville de|dans la ville|sites a visiter)\b/.test(value)) return "fr";
  if (/\b(what|which|who|where|when|why|how|tell me|describe|explain|show me|list|name|give me|is|are|does|do|can|could|the|of|in|and|its|has|have|population|area|history|density|attractions|tourism|climate|weather|coordinates|sectors|districts|capital|responsibilities|vision|mission|economy|borders)\b/.test(value)) return "en";
  return "rw";
}

function number(value: number): string {
  return value.toLocaleString("en-US");
}

function districtFromQuery(value: string): DistrictFact | undefined {
  const explicitSectorLevel =
    /\b(umurenge|murenge|sector|secteur)\b/.test(value) &&
    (/\b(umurenge|murenge)\s+wa\b/.test(value) ||
      /\b(kicukiro|nyarugenge)\s+sector\b|\b(kicukiro|nyarugenge)\s+secteur\b/.test(value) ||
      /\b(sector|secteur)\s+(?:of|in|de|du)?\s*(kicukiro|nyarugenge)\b/.test(value));
  if (explicitSectorLevel) return undefined;
  return districts.find((district) =>
    new RegExp("\\b" + district.name.toLowerCase() + "\\b").test(value));
}

function sectorFromQuery(value: string): { sector: SectorFact; district: DistrictFact } | undefined {
  const districtNames = districts.map((item) => item.name.toLowerCase());
  const hasExplicitKigaliSector =
    /\bumurenge\s+wa\s+kigali\b|\bmurenge\s+wa\s+kigali\b|\bkigali\s+(?:sector|secteur)\b|\b(?:sector|secteur)\s+(?:of|in|de|du)?\s*kigali\b/.test(value);
  const hasExplicitDistrictSector =
    /\bumurenge\s+wa\s+(kicukiro|nyarugenge)\b|\bmurenge\s+wa\s+(kicukiro|nyarugenge)\b|\b(kicukiro|nyarugenge)\s+(?:sector|secteur)\b|\b(?:sector|secteur)\s+(?:of|in|de|du)?\s*(kicukiro|nyarugenge)\b/.test(value);

  for (const district of districts) {
    const sector = district.sectors.find((item) => {
      const name = item.name.toLowerCase();
      if (name === "kigali") return hasExplicitKigaliSector;
      if (districtNames.includes(name) && !hasExplicitDistrictSector) return false;
      return new RegExp("\\b" + name + "\\b").test(value);
    });
    if (sector) return { sector, district };
  }
  return undefined;
}

export function isKigaliKnowledgeQuery(query: string): boolean {
  const value = normalize(query);
  if (/\b(genocide|jenoside|kwibuka|memorial|memorials|urwibutso|nyanza|gisozi|eto|genocide archive|ubuhamya|testimony|testimonies|archives)\b/.test(value)) return true;
  if (/\b(kigali|umujyi wa kigali|city of kigali|ville de kigali)\b/.test(value)) return true;

  const district = districts.some((item) => new RegExp("\\b" + item.name.toLowerCase() + "\\b").test(value));
  const sector = districts.some((item) => item.sectors.some((entry) =>
    entry.name !== "Kigali" && new RegExp("\\b" + entry.name.toLowerCase() + "\\b").test(value)));
  const questionShape = /\b(abaturage|population|inhabitants|ubuso|area|superficie|amateka|history|histoire|umurenge|murenge|sector|secteur|akarere|district|imirenge|sectors|uturere|districts|gafite|ifite|how many|combien|what is|what are|ni iki|niki|cest quoi|attractions|tourism|tourisme|vision|mission|inshingano|responsibilities|master plan|ubukungu|economy|climate|temperature|coordinates|ibipimo|imidugudu|villages|cells|utugari)\b/.test(value);
  return questionShape && (district || sector);
}

function sources(...items: AssistantSource[]): AssistantSource[] {
  return items;
}

function districtSourceFor(name: DistrictFact["name"]): AssistantSource {
  if (name === "Gasabo") return gasaboSource;
  if (name === "Kicukiro") return kicukiroSource;
  return nyarugengeSource;
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
    "Kigali yatangiye gushingwa nk'icyicaro cy'ubutegetsi bw'Abadage mu 1907, ku gihe Dr. Richard Kandt yari ahagarariye ubutegetsi bw'Abadage mu Rwanda. Icyicaro cye cyafunguwe i Kigali (Nyarugenge) mu 1908; inyandiko z'icyo gihe zakoresheje Nyarugenge nk'umurwa mukuru w'ubutegetsi kugeza muri Nzeri 1908, nyuma izina Kigali risimbura iryo zina. Kigali yabaye umurwa mukuru w'igihugu igihe u Rwanda rwabonaga ubwigenge mu 1962.\n\nKimwe mu bimenyetso by'ayo mateka ni Kandt House, giherereye mu Karere ka Nyarugenge, Umurenge wa Gitega, Akagari ka Akabahizi, Umudugudu wa Nyaburanga. Inyubako yatangiye kubakwa mu 1908 irangira mu 1910, nyuma ikoreshwa nk'inzu ndangamurage y'amateka y'ubukoloni kuva mu 2004. Ibi ni amateka rusange y'Umujyi n'inyubako ya Kandt House; si amateka yemejwe ya buri Murenge.",
    "Kigali began to develop as a German colonial administrative centre in 1907, when Dr Richard Kandt represented German rule in Rwanda. His administrative office was inaugurated in Kigali (Nyarugenge) in 1908. Documents used Nyarugenge as the official capital until September 1908, after which Kigali replaced that name. Kigali became the national capital when Rwanda gained independence in 1962.\n\nOne landmark connected to this history is Kandt House, located in Nyaburanga Village, Akabahizi Cell, Gitega Sector, Nyarugenge District. Construction began in 1908 and was completed in 1910; the building has served as a museum of colonial history since 2004. These are city-level and Kandt House facts, not a verified history for every sector.",
    "Kigali a commencé à se développer comme centre administratif colonial allemand en 1907, lorsque le Dr Richard Kandt représentait l'administration allemande au Rwanda. Son bureau administratif a été inauguré à Kigali (Nyarugenge) en 1908. Les documents utilisaient Nyarugenge comme capitale officielle jusqu'en septembre 1908, puis le nom Kigali l'a remplacé. Kigali est devenue la capitale nationale lorsque le Rwanda a accédé à l'indépendance en 1962.\n\nUn lieu lié à cette histoire est la Maison Kandt, située au village de Nyaburanga, cellule d'Akabahizi, secteur de Gitega, district de Nyarugenge. Sa construction a commencé en 1908 et s'est achevée en 1910 ; le bâtiment sert de musée de l'histoire coloniale depuis 2004. Il s'agit de faits concernant la ville et la Maison Kandt, et non d'une histoire vérifiée de chaque secteur.",
  );
}

const kgmSource: AssistantSource = { label: "Kigali Genocide Memorial — official", data_date: null, url: "https://kgm.rw/about/", trust_tier: "official_government" };
const ibukaSource: AssistantSource = { label: "IBUKA Rwanda — Kigali memorial sites", data_date: null, url: "https://www.ibuka.rw/memorial-sites", trust_tier: "official_government" };
const nyanzaSource: AssistantSource = { label: "IBUKA Rwanda — Nyanza-Kicukiro Memorial", data_date: null, url: "https://www.ibuka.rw/memorial-sites/nyanza", trust_tier: "official_government" };
const unescoSource: AssistantSource = { label: "UNESCO — Genocide memorial sites", data_date: null, url: "https://whc.unesco.org/en/list/1586/", trust_tier: "international_organization" };
const garSource: AssistantSource = { label: "Genocide Archive of Rwanda — memorials", data_date: null, url: "https://genocidearchiverwanda.org.rw/category/Memorials", trust_tier: "official_government" };

function kigaliGenocideReply(query: string, language: Language) {
  const value = normalize(query);
  const gisozi = /\\b(gisozi|kigali genocide memorial|kigali memorial|urwibutso rwa gisozi)\\b/.test(value);
  const nyanza = /\\b(nyanza|eto|kicukiro memorial|nyanza kicukiro|nyanza-kicukiro)\\b/.test(value);
  const archive = /\\b(archive|archives|testimony|testimonies|ubuhamya|genocide archive)\\b/.test(value);
  const kwibuka = /\\b(kwibuka|commemor)\\b/.test(value);
  let rw = "Mu Mujyi wa Kigali, amakuru y'ububiko n'ibikorwa byo kwibuka Jenoside yakorewe Abatutsi mu 1994 ajyanye ahanini n'Urwibutso rwa Gisozi n'Urwibutso rwa Nyanza-Kicukiro. Izi ni ahantu ho kwibuka, kubika ibimenyetso n'amateka, kwigisha no guha icyubahiro abishwe. Ibisobanuro birambuye n'imibare bigomba gushingirwa ku nyandiko z'inzego n'ububiko bw'amateka.";
  let en = "Kigali-specific remembrance information includes the Kigali Genocide Memorial at Gisozi and the Nyanza-Kicukiro Memorial. These sites preserve remembrance, evidence and history, support education and honour those murdered. Detailed facts and figures should be grounded in institutional records and archives.";
  let fr = "Les informations sur la mémoire du génocide à Kigali concernent notamment le Mémorial de Gisozi et celui de Nyanza-Kicukiro. Ces lieux préservent la mémoire, les preuves et l'histoire, soutiennent l'éducation et rendent hommage aux personnes assassinées. Les détails et chiffres doivent être fondés sur des documents institutionnels et les archives.";
  let src: AssistantSource[] = [kgmSource, ibukaSource, nyanzaSource, garSource];
  if (gisozi) {
    rw = "Urwibutso rwa Kigali (Gisozi) ruherereye mu Murenge wa Gisozi, mu Karere ka Gasabo, mu Mujyi wa Kigali. Ni urwibutso rw'igihugu n'ikigo cy'uburezi ku mateka ya Jenoside yakorewe Abatutsi mu 1994. Rugaragaza amateka mu byumba by'imurikabikorwa, rufite ububiko bw'ubuhamya, ubusitani bwo kwibuka, urwibutso rw'abana n'imva rusange. Urubuga rwarwo ruvuga ko rwatashywe mu 2004, kandi ko rufite intego zo kwibuka, kwigisha, gukumira jenoside, kubika ibimenyetso no gufasha abarokotse. UNESCO yashyize Gisozi mu ruhererekane rw'ahantu ndangamurage z'ibikorwa byo kwibuka Jenoside mu Rwanda.";
    en = "The Kigali Genocide Memorial (Gisozi) is in Gisozi Sector, Gasabo District, Kigali City. It is a national memorial and education centre documenting the 1994 Genocide against the Tutsi. It has exhibitions, archive and testimony facilities, gardens, a children's memorial and mass graves. Its website says it was inaugurated in 2004 and lists remembrance, education, prevention, documentation and survivor support as objectives. UNESCO includes Gisozi in Rwanda's serial World Heritage memorial property.";
    fr = "Le Mémorial du Génocide de Kigali (Gisozi) se trouve dans le secteur de Gisozi, district de Gasabo, Ville de Kigali. C'est un mémorial national et un centre éducatif consacré au Génocide perpétré contre les Tutsi en 1994. Il comprend des expositions, archives et témoignages, des jardins, un mémorial pour les enfants et des fosses communes. Son site indique qu'il a été inauguré en 2004 et cite la commémoration, l'éducation, la prévention, la documentation et le soutien aux abarokotse parmi ses objectifs. Gisozi fait partie du bien sériel des mémoriaux du génocide inscrit par l'UNESCO.";
    src = [kgmSource, unescoSource, garSource];
  } else if (nyanza) {
    rw = "Urwibutso rwa Nyanza-Kicukiro ruherereye i Kagarama, mu Karere ka Kicukiro, mu Mujyi wa Kigali. IBUKA ivuga ko rwibutsa ubwicanyi bwakurikiye kuva kwa ETO ku wa 11 Mata 1994, igihe abari bahungiye aho basigaye badafite uburinzi nyuma yo kuva kw'ingabo za UN. Urwibutso rurimo imva rusange, ibimenyetso n'ubusitani bwo kwibuka, kandi rukoreshwa mu Kwibuka, mu buhamya no mu kwigisha. IBUKA ivuga ko hari imibiri y'abantu bagera ku 105,000 iruhukiye muri urwo rwibutso; uwo ni umubare w'imva yatangajwe, si umubare w'abishwe kuri uwo mwanya gusa.";
    en = "The Nyanza-Kicukiro Memorial is in Kagarama, Kicukiro District, Kigali. IBUKA says it commemorates killings following the withdrawal of UN peacekeepers from ETO on 11 April 1994, leaving people who sought refuge exposed. It has mass graves, memorial markers and a Garden of Memory, and is used for Kwibuka, survivor testimony and education. IBUKA reports about 105,000 victims buried there; this is the burial total reported for the memorial, not a count of those killed at the site alone.";
    fr = "Le mémorial de Nyanza-Kicukiro se trouve à Kagarama, district de Kicukiro, Kigali. IBUKA indique qu'il commémore les massacres après le retrait des soldats de l'ONU de l'ETO le 11 avril 1994, laissant les personnes réfugiées exposées. Il comprend des fosses communes, des monuments et un jardin de mémoire ; il accueille commémorations, témoignages et activités éducatives. IBUKA rapporte environ 105 000 victimes enterrées ; ce total concerne les sépultures du mémorial, pas uniquement les personnes tuées sur place.";
    src = [nyanzaSource, ibukaSource];
  } else if (archive) {
    rw = "Genocide Archive of Rwanda (GAR) ibika kandi igatanga uburyo bwo kubona ibimenyetso, ubuhamya bw'ab sobrevivants n'ababonye ibyabaye, amafoto, inyandiko n'ibindi bijyanye na Jenoside yakorewe Abatutsi. Urwibutso rwa Kigali ruvuga ko ububiko buri mu kigo cyarwo. Ubuhamya bw'umuntu ku giti cye bugomba gusomwa mu rwego rw'ibyo uwo muntu yanyuzemo, ntibufatwe nk'ubusobanuro bw'ibyabaye byose.";
    en = "The Genocide Archive of Rwanda (GAR) preserves and provides access to evidence, survivor and eyewitness testimonies, photographs, documents and other records related to the Genocide against the Tutsi. The Kigali Genocide Memorial says the Archive is based at the Memorial. Individual testimonies should be understood in their context, not as a complete account of every event.";
    fr = "Le Genocide Archive of Rwanda (GAR) conserve et donne accès à des preuves, témoignages de abarokotse et témoins, photographies, documents et archives liés au Génocide perpétré contre les Tutsi. Le Mémorial de Kigali indique que l'Archive est hébergée au mémorial. Les témoignages individuels doivent être compris dans leur contexte, et non comme un récit complet de tous les événements.";
    src = [garSource, kgmSource];
  } else if (kwibuka) {
    rw = "Kwibuka ni igihe cyo kwibuka Jenoside yakorewe Abatutsi mu 1994, kubika ibimenyetso n'amateka, guha icyubahiro abishwe, kwigisha no kuzirikana inshingano zo gukumira jenoside. I Kigali, ibikorwa byo kwibuka bishobora kubera i Gisozi no kuri Nyanza-Kicukiro, hakurikijwe gahunda y'inzego zitegura Kwibuka. Amatariki na gahunda by'umwaka bigomba kugenzurwa mu matangazo yemewe.";
    en = "Kwibuka is the annual remembrance of the 1994 Genocide against the Tutsi, preserving evidence and history, honouring victims, education and reflection on prevention. In Kigali, commemorations may take place at Gisozi and Nyanza-Kicukiro according to the annual programme. Dates and schedules should be checked against current official announcements.";
    fr = "Kwibuka est la commémoration annuelle du Génocide perpétré contre les Tutsi en 1994 : préserver les preuves et l'histoire, honorer les victimes, éduquer et réfléchir à la prévention. À Kigali, les cérémonies peuvent se tenir à Gisozi et Nyanza-Kicukiro selon le programme annuel. Les dates et horaires doivent être vérifiés dans les annonces officielles.";
    src = [kgmSource, ibukaSource, nyanzaSource];
  }
  return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
    confidenceLabel: "Kigali memorial and archive information from institutional sources.",
    sources: src,
    suggestions: suggestionSet(language,
      ["Urwibutso rwa Gisozi ruri he?", "Urwibutso rwa Nyanza-Kicukiro rwibutsa iki?", "Kwibuka ni iki?"],
      ["Where is the Gisozi memorial?", "What does Nyanza-Kicukiro commemorate?", "What is Kwibuka?"],
      ["Où se trouve le mémorial de Gisozi ?", "Que commémore Nyanza-Kicukiro ?", "Qu'est-ce que Kwibuka ?"]) };
}

export function getKigaliKnowledgeReply(query: string) {
  const value = normalize(query);
  const language = languageOf(query);
  const asksGenocideMemory = /\\b(genocide|jenoside|kwibuka|memorial|memorials|urwibutso|nyanza|gisozi|eto|genocide archive|ubuhamya|testimony|testimonies|archives)\\b/.test(value);
  if (asksGenocideMemory) return kigaliGenocideReply(query, language);
  const sectorMatch = sectorFromQuery(value);
  const districtMatch = districtFromQuery(value);
  const selectedDistrict = sectorMatch?.district ?? districtMatch;
  const asksHistory = /\b(amateka|history|histoire|yashinzwe ryari|ryatangiye ryari|established|founded)\b/.test(value);
  const asksArea = /\b(ubuso|area|size|how large|superficie|km2|kilometero kare|square kilometer)\b/.test(value);
  const asksDensity = /\b(ubucucike|density|densite|densité|abaturage kuri km)\b/.test(value);
  const asksPopulation = /\b(abaturage|population|inhabitants|habitants|people in|how many people|ubwiyongere)\b/.test(value);
  const asksList = /\b(urutonde|amazina|ni iyihe|ni izihe|which|list|names|quels|quelles|liste)\b/.test(value);
  const asksSectors = /\b(imirenge|sectors|secteurs)\b/.test(value);
  const asksDistricts = /\b(uturere|akarere|districts|district)\b/.test(value);
  const asksVillages = /\b(imidugudu|umudugudu|villages|village)\b/.test(value);
  const asksCells = /\b(utugari|akagari|cells|cell|cellules?)\b/.test(value);
  const asksVision = /\b(vision|icyerekezo|mission|intego|goals|objectif|objectifs)\b/.test(value);
  const asksResponsibilities = /\b(inshingano|responsibilities|role of the city|mandate|mandat|ubuyobozi bukora iki)\b/.test(value);
  const asksMasterPlan = /\b(master plan|masterplan|igishushanyo mbonera|plan directeur|plan d'urbanisme|2050)\b/.test(value);
  const asksAttractions = /\b(ubukerarugendo|ahantu nyaburanga|gusura|tourism|tourist|attractions|attraction|visit|visiting|sites|lieux touristiques|a visiter)\b/.test(value);
  const asksEconomy = /\b(ubukungu|economy|economic|gdp|produit interieur brut|investissement|ishoramari|jobs|akazi)\b/.test(value);
  const asksClimate = /\b(ikirere|climate|weather|temperature|imvura|precipitation|meteo|temps qu'il fait)\b/.test(value);
  const asksCoordinates = /\b(coordinates|latitude|longitude|ubutumburuke|ibipimo bya gps|gps location)\b/.test(value);

  const asksDistrictFollowUp = /^(?:igizwe n'uturere tungahe|ifite uturere tungahe|uturere tungahe|how many districts does it have|what districts make it up|combien de districts compte t elle|combien de districts compte t il)$/.test(value);
  if (asksDistrictFollowUp) {
    const rw = "Umujyi wa Kigali ugizwe n'uturere 3: Gasabo, Kicukiro na Nyarugenge.";
    const en = "The City of Kigali is made up of 3 districts: Gasabo, Kicukiro and Nyarugenge.";
    const fr = "La Ville de Kigali comprend 3 districts : Gasabo, Kicukiro et Nyarugenge.";
    return {
      topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "City of Kigali official overview."
        : language === "fr" ? "Présentation officielle de la Ville de Kigali."
          : "Urubuga rwemewe rw'Umujyi wa Kigali.",
      sources: [citySource],
      suggestions: suggestionSet(language,
        ["Abaturage ba Gasabo ni bangahe?", "Gasabo ifite imirenge iyihe?", "Umujyi wa Kigali ufite ubuso bungana iki?"],
        ["What is Gasabo's population?", "Which sectors are in Gasabo?", "What is Kigali's area?"],
        ["Quelle est la population de Gasabo ?", "Quels secteurs composent Gasabo ?", "Quelle est la superficie de Kigali ?"]),
    };
  }

  const sourceList = sources(citySource, annualReportSource, censusSource, administrationSource);

  if (asksHistory) {
    if (districtMatch && !sectorMatch) {
      const district = districtMatch;
      const rw = "Nta nyandiko y'amateka yihariye y'Akarere ka " + district.name + " mfite yemejwe n'isoko ryizewe muri ubu bubiko. Ibyo nshobora kwemeza ni uko kari mu Mujyi wa Kigali, gafite imirenge " + district.sectors.length + " kandi ko Ibarura rya 2022 ryabaruye abaturage " + number(district.population) + ". Sinzafata amateka rusange y'Umujyi ngo nyitirire Akarere.";
      const en = "I do not currently have a reliable, verified historical record specifically for " + district.name + " District in this knowledge base. I can confirm that it is part of the City of Kigali, has " + district.sectors.length + " sectors, and had " + number(district.population) + " residents in the 2022 census. I will not present the city's general history as the district's own history.";
      const fr = "Je ne dispose pas actuellement d'un document historique fiable et vérifié consacré spécifiquement au district de " + district.name + " dans cette base. Je peux confirmer qu'il fait partie de la Ville de Kigali, compte " + district.sectors.length + " secteurs et avait " + number(district.population) + " habitants au recensement de 2022. Je ne présenterai pas l'histoire générale de la ville comme celle du district.";
      return {
        topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "District population is from the August 2022 census; a verified district-history source is not yet available."
          : language === "fr" ? "La population du district provient du recensement d'août 2022 ; aucune source historique vérifiée sur le district n'est encore disponible."
            : "Abaturage ni abo mu ibarura rya Kanama 2022; nta nyandiko y'amateka y'Akarere yemejwe iraboneka.",
        sources: [censusSource, administrationSource],
        suggestions: suggestionSet(language, ["Abaturage ba " + district.name + " ni bangahe?", "Akarere ka " + district.name + " gafite imirenge iyihe?", "Amateka rusange y'Umujyi wa Kigali ni ayahe?"],
          ["What is the population of " + district.name + "?", "Which sectors are in " + district.name + "?", "What is the history of Kigali City?"],
          ["Quelle est la population de " + district.name + " ?", "Quels secteurs compte " + district.name + " ?", "Quelle est l'histoire de la Ville de Kigali ?"]),
      };
    }
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
      sources: [minubumweHistorySource, historySource, kandtHouseSource],
      suggestions: suggestionSet(language,
        ["Kandt House iherereye he?", "Umujyi wa Kigali ugizwe n'uturere tungahe?", "Umujyi wa Kigali ufite ubuso bungana iki?"],
        ["Where is Kandt House?", "How many districts are in Kigali City?", "What is the area of Kigali City?"],
        ["Où se trouve la Maison Kandt ?", "Combien de districts compte Kigali ?", "Quelle est la superficie de Kigali ?"]),
    };
  }

  if (asksVillages) {
    if (selectedDistrict?.name === "Gasabo") {
      const rw = "Ku Karere ka Gasabo, amakuru abiri aturuka ku rubuga rw'ako Karere ntiyahuye: urupapuro rwa “Menya Akarere” ruvuga imidugudu 485, mu gihe urupapuro rw'ibanze n'urw'imiyoborere myiza bivuga 481. Sinshobora kwemeza umubare nyawo utaravugururwa n'Akarere.";
      const en = "For Gasabo District, two official pages disagree: the “Menya Akarere” page lists 485 villages, while the district homepage and governance page list 481. I cannot confirm which figure is the current corrected count without clarification from the District.";
      const fr = "Pour le district de Gasabo, deux pages officielles divergent : la page « Menya Akarere » indique 485 villages, tandis que la page d'accueil et la page de gouvernance du district en indiquent 481. Je ne peux pas confirmer le chiffre actuel corrigé sans clarification du district.";
      return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "Two Gasabo District official pages contain different village counts."
          : language === "fr" ? "Deux pages officielles du district de Gasabo indiquent des nombres différents."
            : "Amapaji abiri yemewe y'Akarere ka Gasabo atanga imibare itandukanye.",
        sources: [gasaboSource, gasaboHomepageSource],
        suggestions: suggestionSet(language,
          ["Abaturage ba Gasabo ni bangahe?", "Gasabo ifite utugari tungahe?", "Gasabo ifite imirenge iyihe?"],
          ["What is Gasabo's population?", "How many cells are in Gasabo?", "Which sectors are in Gasabo?"],
          ["Quelle est la population de Gasabo ?", "Combien de cellules compte Gasabo ?", "Quels secteurs composent Gasabo ?"]) };
    }
    if (selectedDistrict?.name === "Kicukiro" || selectedDistrict?.name === "Nyarugenge") {
      const count = selectedDistrict.name === "Kicukiro" ? 327 : 350;
      const rw = "Urubuga rwemewe rw'Akarere ka " + selectedDistrict.name + " ruvuga ko gafite imidugudu " + number(count) + ". Iyi ni imibare yatangajwe n'Akarere, naho umubare rusange w'Umujyi wa Kigali uracyafite itandukaniro hagati y'inyandiko z'Umujyi.";
      const en = selectedDistrict.name + " District's official website lists " + number(count) + " villages. This is the District's published figure; the City-wide total still differs between official City publications.";
      const fr = "Le site officiel du district de " + selectedDistrict.name + " indique " + number(count) + " villages. Il s'agit du chiffre publié par le district ; le total de la Ville continue de varier selon les publications officielles.";
      return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "District official website; City-wide village total remains inconsistent."
          : language === "fr" ? "Site officiel du district ; le total de la Ville demeure incohérent."
            : "Urubuga rwemewe rw'Akarere; umubare rusange w'Umujyi nturahuzwa.",
        sources: [districtSourceFor(selectedDistrict.name), citySource, annualReportSource],
        suggestions: suggestionSet(language,
          ["Umujyi wa Kigali ufite imidugudu ingahe?", "Akarere ka " + selectedDistrict.name + " gafite utugari tungahe?"],
          ["How many villages are in Kigali City?", "How many cells are in " + selectedDistrict.name + "?"],
          ["Combien de villages compte Kigali ?", "Combien de cellules compte " + selectedDistrict.name + " ?"]) };
    }
    const rw = "Imibare y'imidugudu itangwa n'inzego zemewe ntiyahuye: urubuga rusanzwe rw'Umujyi wa Kigali ruvuga imidugudu 1,155, ariko Raporo y'Umujyi ya 2024–2025 ivuga 1,163. No ku rwego rw'Akarere ka Gasabo, urupapuro rumwe ruvuga 485 ahandi rukavuga 481. Bityo sinatanga umubare umwe nk'ukuri kwa nyuma. Umubare w'imirenge 35 n'utugari 161 urahuye ku masoko y'Umujyi.";
    const en = "Official publications do not agree on the village total: the City of Kigali overview lists 1,155 villages, while the City's 2024–2025 Annual Report lists 1,163. Gasabo District pages also differ, with one listing 485 and another 481. I therefore will not present one number as definitively current. The City-level totals of 35 sectors and 161 cells are consistent across the City sources consulted.";
    const fr = "Les publications officielles ne concordent pas sur le nombre total de villages : la présentation de la Ville de Kigali en indique 1 155, tandis que le rapport annuel 2024–2025 en indique 1 163. Les pages du district de Gasabo divergent également : l'une indique 485 et l'autre 481. Je ne présenterai donc pas un seul chiffre comme définitivement actuel. Les totaux de 35 secteurs et 161 cellules sont cohérents dans les sources de la Ville consultées.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "Official-source discrepancy; requires confirmation by the City of Kigali."
        : language === "fr" ? "Divergence entre sources officielles ; confirmation nécessaire auprès de la Ville de Kigali."
          : "Inyandiko zemewe ziravuguruzanya; Umujyi wa Kigali ni wo ukwiye kwemeza umubare nyawo.",
      sources: [citySource, annualReportSource, gasaboSource, gasaboHomepageSource],
      suggestions: suggestionSet(language,
        ["Umujyi wa Kigali ufite uturere tungahe?", "Ni utugari tungahe mu Mujyi wa Kigali?", "Akarere ka Gasabo gafite imirenge iyihe?"],
        ["How many districts are in Kigali?", "How many cells does Kigali have?", "Which sectors are in Gasabo?"],
        ["Combien de districts compte Kigali ?", "Combien de cellules compte Kigali ?", "Quels secteurs composent Gasabo ?"]) };
  }

  if (asksVision) {
    const rw = "Icyerekezo cy'Umujyi wa Kigali ni ukuba “Ihuriro ry'Indashyikirwa mu Iterambere ry'Imijyi muri Afurika” (Centre of Urban Excellence in Africa). Intego zawo ni: ubukungu butandukanye kandi burimo bose; ibikorwa remezo birambye no gucunga neza umutungo; amacumbi n'imiturire biboneye kandi bidahenze; kubungabunga ibidukikije n'urusobe rw'ibinyabuzima; abaturage bishimye kandi bafite ubuzima bwiza; no guteza imbere umwihariko n'umuco w'Umujyi. Inshingano zawo ni kubaka no gukomeza Umujyi urangwa n'umuco wihariye, ubukungu buzima n'ubudasa, binyuze mu bufatanye n'abafatanyabikorwa.";
    const en = "The City of Kigali's vision is to become the “Centre of Urban Excellence in Africa.” Its goals are a diverse, vibrant and inclusive economy; sustainable infrastructure and resource management; affordable homes and neighbourhoods; nature and biodiversity; happy and healthy residents; and a strong local character and identity. Its mission is to build and sustain a city of character, a vibrant economy and diversity through partnerships with stakeholders.";
    const fr = "La vision de la Ville de Kigali est de devenir le « Centre d'excellence urbaine en Afrique ». Ses objectifs sont une économie diversifiée, dynamique et inclusive ; des infrastructures durables et une bonne gestion des ressources ; des logements et quartiers abordables ; la protection de la nature et de la biodiversité ; des habitants heureux et en bonne santé ; et une identité locale forte. Sa mission consiste à bâtir et à maintenir une ville de caractère, dotée d'une économie dynamique et de diversité grâce aux partenariats avec les parties prenantes.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "City of Kigali official vision and mission."
        : language === "fr" ? "Vision et mission officielles de la Ville de Kigali."
          : "Icyerekezo n'inshingano byatangajwe n'Umujyi wa Kigali.",
      sources: [citySource, annualReportSource],
      suggestions: suggestionSet(language,
        ["Inshingano z'Umujyi wa Kigali ni izihe?", "Igishushanyo mbonera cya Kigali 2050 ni iki?"],
        ["What are the City's responsibilities?", "What is Kigali Master Plan 2050?"],
        ["Quelles sont les responsabilités de la Ville ?", "Qu'est-ce que le plan directeur Kigali 2050 ?"]) };
  }

  if (asksResponsibilities) {
    const rw = "Inshingano z'Umujyi wa Kigali zirimo: gushyira mu bikorwa no gukurikirana politiki za Leta; gutegura gahunda y'iterambere n'igishushanyo mbonera; guteza imbere ibikorwa remezo n'imijyi; guteza imbere imibereho myiza n'ubukungu; kurinda umutekano w'abantu n'ibintu; guhuza no gukurikirana Uturere n'izindi nzego za Leta; gukurikirana isuku, isukura n'itunganywa ry'amazi; gutegura ubwikorezi bw'abantu n'ibintu; gukusanya umutungo n'imisoro hakurikijwe amategeko; guteza imbere ishoramari; gutanga serivisi zitangwa n'izindi nzego zitashoboye; no guteza imbere ubufatanye n'inzego zo mu gihugu no hanze yacyo.";
    const en = "The City's responsibilities include implementing and monitoring national policies; preparing and delivering the City's development and master plans; developing infrastructure and urbanisation; promoting social welfare and economic development; ensuring public safety; coordinating and monitoring the three Districts and other public bodies; overseeing hygiene, sanitation and water treatment; planning transport for people and goods; mobilising resources and lawful tax collection; promoting investment; providing services not assigned to lower administrative entities; and building national and international partnerships.";
    const fr = "Les responsabilités de la Ville comprennent la mise en œuvre et le suivi des politiques nationales ; la préparation et l'exécution des plans de développement et du plan directeur ; le développement des infrastructures et de l'urbanisation ; la promotion du bien-être social et du développement économique ; la sécurité des personnes et des biens ; la coordination des trois districts et des autres organes publics ; l'hygiène, l'assainissement et le traitement de l'eau ; la planification des transports ; la mobilisation des ressources et la collecte légale des taxes ; la promotion des investissements ; les services non attribués aux entités administratives inférieures ; et les partenariats nationaux et internationaux.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "Responsibilities as published by the City of Kigali."
        : language === "fr" ? "Responsabilités telles que publiées par la Ville de Kigali."
          : "Inshingano zishingiye ku byo Umujyi wa Kigali watangaje ku mugaragaro.",
      sources: [citySource, administrationSource],
      suggestions: suggestionSet(language,
        ["Icyerekezo cy'Umujyi wa Kigali ni iki?", "Igishushanyo mbonera cya Kigali 2050 ni iki?"],
        ["What is Kigali's vision?", "What is Kigali Master Plan 2050?"],
        ["Quelle est la vision de Kigali ?", "Qu'est-ce que le plan directeur Kigali 2050 ?"]) };
  }

  if (asksMasterPlan) {
    const rw = "Igishushanyo Mbonera cy'Umujyi wa Kigali 2050 (Kigali Master Plan 2050) ni gahunda ndende y'uko Umujyi uteganyijwe gukura no gutunganywa kugeza mu 2050. Cyatangijwe ku mugaragaro ku wa 4 Nzeri 2020. Kigena icyerekezo cy'imikoreshereze y'ubutaka n'imiterere y'Umujyi, harimo imiturire, ubwikorezi, ibikorwa remezo, ubukungu, ibidukikije n'ahantu rusange. Ni gahunda y'igihe kirekire; ntabwo buri gikorwa giteganyijwe kiba cyarangiye cyangwa ngo cyubakwe.";
    const en = "Kigali Master Plan 2050 is the City's long-term spatial development framework, launched on 4 September 2020. It sets out how land use and urban development should evolve towards 2050, including housing, transport, infrastructure, economic activity, the environment and public spaces. It is a long-term plan; not every planned project has necessarily been completed or built.";
    const fr = "Le Plan directeur de Kigali 2050 est le cadre de développement spatial à long terme de la Ville, lancé le 4 septembre 2020. Il définit l'évolution prévue de l'utilisation des terres et du développement urbain jusqu'en 2050, notamment le logement, les transports, les infrastructures, les activités économiques, l'environnement et les espaces publics. Il s'agit d'un plan à long terme ; tous les projets prévus ne sont pas nécessairement achevés ou construits.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "Official City of Kigali Master Plan 2050 announcement; launch date: 4 September 2020."
        : language === "fr" ? "Annonce officielle du Plan directeur de Kigali 2050 ; lancement le 4 septembre 2020."
          : "Itangazo ry'Umujyi wa Kigali ku Gishushanyo Mbonera 2050; cyatangijwe ku wa 4 Nzeri 2020.",
      sources: [masterPlanSource, annualReportSource],
      suggestions: suggestionSet(language,
        ["Icyerekezo cy'Umujyi wa Kigali ni iki?", "Umujyi uteganya guteza imbere ubwikorezi gute?", "Kigali ifite ubuso bungana iki?"],
        ["What is Kigali's vision?", "How does the plan address transport?", "How large is Kigali?"],
        ["Quelle est la vision de Kigali ?", "Comment le plan traite-t-il les transports ?", "Quelle est la superficie de Kigali ?"]) };
  }

  if (asksAttractions) {
    if (selectedDistrict?.name === "Kicukiro") {
      const rw = "Ahantu nyaburanga havugwa mu Karere ka Kicukiro harimo Kigali Cultural Village mu Murenge wa Gatenga, aho berekana ibihangano ndangamuco nyarwanda kandi hakakira inama n'ibitaramo; Gahanga International Cricket Stadium mu Murenge wa Gahanga, ikoreshwa mu mikino n'ibindi bikorwa; hamwe n'Ikibuga Mpuzamahanga cy'Indege cya Kigali. Amakuru y'ibi bice n'aho biherereye agomba kongera kugenzurwa mbere yo gutegura urugendo.";
      const en = "Kicukiro District highlights include Kigali Cultural Village in Gatenga Sector, which presents Rwandan cultural arts and hosts meetings and performances; Gahanga International Cricket Stadium in Gahanga Sector, used for sports and events; and Kigali International Airport. Check current access and opening information before planning a visit.";
      const fr = "Parmi les lieux d'intérêt du district de Kicukiro figurent le Kigali Cultural Village, dans le secteur de Gatenga, consacré aux arts culturels rwandais et accueillant des réunions et spectacles ; le stade international de cricket de Gahanga, dans le secteur de Gahanga, utilisé pour les sports et événements ; ainsi que l'aéroport international de Kigali. Vérifiez les conditions d'accès et les horaires avant votre visite.";
      return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "Kicukiro District official tourism information."
          : language === "fr" ? "Informations touristiques officielles du district de Kicukiro."
            : "Amakuru y'ubukerarugendo yatangajwe n'Akarere ka Kicukiro.",
        sources: [kicukiroSource],
        suggestions: suggestionSet(language,
          ["Akarere ka Kicukiro gafite imirenge iyihe?", "Ahantu nyaburanga ho gusura i Kigali ni hehe?"],
          ["Which sectors are in Kicukiro?", "What can I visit in Kigali?"],
          ["Quels secteurs composent Kicukiro ?", "Que visiter à Kigali ?"]) };
    }
    const rw = "Ahantu nyaburanga ushobora gusura mu Mujyi wa Kigali harimo Nyandungu Urban Wetland Eco-Tourism Park, ifite inzira zo gutemberamo n'amagare, kureba inyoni, ibidendezi n'ubusitani bw'ibimera bivura; Kandt House muri Gitega, Nyarugenge, yerekeye amateka y'ubukoloni; Amahoro National Stadium i Remera, yavuguruwe ikongera gufungura mu 2024; na Kigali Golf Resort & Villas i Nyarutarama. Raporo y'Umujyi ya 2024–2025 ni yo nkomoko y'amakuru ku hantu henshi muri uru rutonde. Amasaha yo gufungura n'ibiciro bishobora guhinduka, bityo bigomba kugenzurwa mbere yo gusura.";
    const en = "Kigali visitor attractions include Nyandungu Urban Wetland Eco-Tourism Park, with walking and cycling trails, birdwatching, ponds and medicinal gardens; Kandt House in Gitega, Nyarugenge, which interprets colonial history; Amahoro National Stadium in Remera, renovated and reopened in 2024; and Kigali Golf Resort & Villas in Nyarutarama. Most of these details are from the City's 2024–2025 Annual Report. Opening times and prices can change, so check before visiting.";
    const fr = "Parmi les sites à visiter à Kigali figurent le parc écotouristique des zones humides de Nyandungu, avec des sentiers pédestres et cyclables, l'observation des oiseaux, des étangs et des jardins de plantes médicinales ; la Maison Kandt à Gitega, Nyarugenge, consacrée à l'histoire coloniale ; le stade national Amahoro à Remera, rénové et rouvert en 2024 ; et le Kigali Golf Resort & Villas à Nyarutarama. La plupart de ces informations proviennent du rapport annuel 2024–2025 de la Ville. Les horaires et tarifs pouvant changer, vérifiez-les avant votre visite.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "City of Kigali Annual Report 2024–2025 and Rwanda Digital Library."
        : language === "fr" ? "Rapport annuel 2024–2025 de la Ville de Kigali et Bibliothèque numérique du Rwanda."
          : "Raporo y'Umujyi wa Kigali 2024–2025 n'Isomero ry'Ikoranabuhanga ry'u Rwanda.",
      sources: [annualReportSource, kandtHouseSource],
      suggestions: suggestionSet(language,
        ["Nyandungu Park iherereye he?", "Kandt House iherereye mu wuhe Murenge?", "Ni iki Kigali Master Plan 2050 iteganya?"],
        ["Where is Nyandungu Park?", "Which sector is Kandt House in?", "What does Kigali Master Plan 2050 provide for?"],
        ["Où se trouve le parc de Nyandungu ?", "Dans quel secteur se trouve la Maison Kandt ?", "Que prévoit le plan directeur Kigali 2050 ?"]) };
  }

  if (asksEconomy) {
    const rw = "Umujyi wa Kigali ufite uruhare rukomeye mu bukungu bw'u Rwanda. Inyandiko z'Umujyi zivuga ko utanga hejuru ya 41% by'umusaruro mbumbe w'igihugu (GDP). Raporo ya 2024–2025 yavuze ko abaturage 1,745,555 ari bo bari batuye mu Mujyi hakurikijwe Ibarura rya 2022, kandi ko umubare ushobora kurenga 1,860,000 iyo hiyongereyemo abantu bakorera i Kigali ariko batuye mu Turere tuyikikije. Iyi mibare yombi isobanura ibintu bitandukanye: abatuye mu Mujyi n'abawugana ku kazi. Kigali kandi ifite ibikorwa by'ubucuruzi, serivisi, ubukerarugendo, ubwikorezi n'ishoramari.";
    const en = "Kigali plays a major role in Rwanda's economy. City publications say it contributes over 41% of national GDP. The 2024–2025 Annual Report distinguishes 1,745,555 city residents in the 2022 census from a figure of over 1,860,000 when people who work in Kigali but live in neighbouring districts are included. These are different measures: resident population versus the wider daytime/workforce population. Kigali's economy includes commerce, services, tourism, transport and investment.";
    const fr = "Kigali joue un rôle majeur dans l'économie du Rwanda. Les publications de la Ville indiquent qu'elle contribue à plus de 41 % du PIB national. Le rapport annuel 2024–2025 distingue les 1 745 555 résidents recensés en 2022 d'un chiffre supérieur à 1 860 000 lorsque l'on inclut les personnes qui travaillent à Kigali mais vivent dans les districts voisins. Il s'agit de deux mesures différentes : la population résidente et la population élargie présente pour le travail. L'économie de Kigali comprend le commerce, les services, le tourisme, les transports et l'investissement.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "City of Kigali Annual Report 2024–2025; resident population separately sourced from NISR's 2022 census."
        : language === "fr" ? "Rapport annuel 2024–2025 de la Ville ; population résidente distincte issue du recensement NISR de 2022."
          : "Raporo y'Umujyi 2024–2025; abaturage batuye mu Mujyi batandukanyijwe n'imibare y'ibarura rya NISR 2022.",
      sources: [annualReportSource, censusSource, citySource],
      suggestions: suggestionSet(language,
        ["Umujyi wa Kigali ufite ibikorwa remezo ibihe?", "Kigali Master Plan 2050 ni iki?", "Ahantu nyaburanga ho gusura i Kigali ni hehe?"],
        ["What infrastructure is in Kigali?", "What is Kigali Master Plan 2050?", "What can I visit in Kigali?"],
        ["Quelles infrastructures trouve-t-on à Kigali ?", "Qu'est-ce que le plan directeur Kigali 2050 ?", "Que visiter à Kigali ?"]) };
  }

  if (asksCoordinates || asksClimate) {
    const rw = asksCoordinates
      ? "Umujyi wa Kigali uherereye hafi y'umutima w'u Rwanda. Imibare ya GPS yatangajwe n'Umujyi ni latitude 1°56'38.6” mu Majyepfo na longitude 30°03'42.9” mu Burasirazuba. Ibi ni ibipimo by'Umujyi muri rusange, si aho umuntu runaka aherereye."
      : "Urubuga rw'Umujyi wa Kigali rutanga impuzandengo y'ubushyuhe bwo hejuru mu mwaka ya 27°C n'ubushyuhe bwo hasi ya 16°C. Iyi ni imibare y'incamake y'ikirere cy'Umujyi; si iteganyagihe ry'uyu munsi cyangwa ry'ejo.";
    const en = asksCoordinates
      ? "Kigali lies near Rwanda's geographical centre. The City publishes approximate coordinates of latitude 1°56'38.6” South and longitude 30°03'42.9” East. These are city-level reference coordinates, not a visitor's current location."
      : "The City of Kigali overview gives an average annual high temperature of 27°C and an average annual low of 16°C. This is a general climate summary, not today's or tomorrow's weather forecast.";
    const fr = asksCoordinates
      ? "Kigali se situe près du centre géographique du Rwanda. La Ville publie les coordonnées approximatives suivantes : latitude 1°56'38,6” sud et longitude 30°03'42,9” est. Il s'agit de coordonnées de référence de la ville, et non de la position actuelle d'un visiteur."
      : "La présentation de la Ville de Kigali indique une température annuelle moyenne maximale de 27 °C et minimale de 16 °C. Il s'agit d'un aperçu climatique général, et non des prévisions météorologiques d'aujourd'hui ou de demain.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "City of Kigali official overview; general reference data only."
        : language === "fr" ? "Présentation officielle de la Ville de Kigali ; données générales de référence."
          : "Incamake y'Umujyi wa Kigali; ni amakuru rusange yo kwifashisha.",
      sources: [citySource],
      suggestions: suggestionSet(language,
        ["Umujyi wa Kigali ufite ubuso bungana iki?", "Uturere twa Kigali ni utuhe?"],
        ["What is Kigali's area?", "Which districts make up Kigali?"],
        ["Quelle est la superficie de Kigali ?", "Quels districts composent Kigali ?"]) };
  }

  if (asksCells && !selectedDistrict) {
    const rw = "Umujyi wa Kigali ufite utugari 161, tugabanyijwe mu Turere dutatu: Gasabo utugari 73, Kicukiro 41 na Nyarugenge 47. Dufite imirenge 35 yose hamwe.";
    const en = "The City of Kigali has 161 cells across three districts: Gasabo has 73, Kicukiro 41 and Nyarugenge 47. There are 35 sectors in total.";
    const fr = "La Ville de Kigali compte 161 cellules réparties dans trois districts : Gasabo en compte 73, Kicukiro 41 et Nyarugenge 47. Il y a 35 secteurs au total.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "Official City of Kigali administrative information."
        : language === "fr" ? "Informations administratives officielles de la Ville de Kigali."
          : "Amakuru y'ubuyobozi yatangajwe n'Umujyi wa Kigali.",
      sources: [citySource, administrationSource],
      suggestions: suggestionSet(language,
        ["Umujyi wa Kigali ufite imirenge ingahe?", "Uturere twa Kigali ni utuhe?", "Umujyi ufite imidugudu ingahe?"],
        ["How many sectors are in Kigali?", "Which districts make up Kigali?", "How many villages does the City have?"],
        ["Combien de secteurs compte Kigali ?", "Quels districts composent Kigali ?", "Combien de villages compte la Ville ?"]) };
  }

  if (asksCells && selectedDistrict) {
    const rw = "Akarere ka " + selectedDistrict.name + " gafite utugari " + selectedDistrict.cells + " n'imirenge " + selectedDistrict.sectors.length + ". Umujyi wa Kigali wose ufite utugari 161.";
    const en = selectedDistrict.name + " District has " + selectedDistrict.cells + " cells and " + selectedDistrict.sectors.length + " sectors. The whole City of Kigali has 161 cells.";
    const fr = "Le district de " + selectedDistrict.name + " compte " + selectedDistrict.cells + " cellules et " + selectedDistrict.sectors.length + " secteurs. La Ville de Kigali compte 161 cellules au total.";
    return { topic: "kigali" as const, answer: answer(language, rw, en, fr),
      confidenceLabel: language === "en" ? "District cell count is based on official district and City administrative information."
        : language === "fr" ? "Nombre de cellules fondé sur les informations administratives officielles du district et de la Ville."
          : "Umubare w'utugari ushingiye ku makuru y'inzego z'ubuyobozi y'Umujyi n'Akarere.",
      sources: [districtSourceFor(selectedDistrict.name), administrationSource],
      suggestions: suggestionSet(language,
        ["Akarere ka " + selectedDistrict.name + " gafite imirenge iyihe?", "Umujyi wa Kigali ufite utugari tungahe?", "Abaturage ba " + selectedDistrict.name + " ni bangahe?"],
        ["Which sectors are in " + selectedDistrict.name + "?", "How many cells does Kigali have?", "What is the population of " + selectedDistrict.name + "?"],
        ["Quels secteurs composent " + selectedDistrict.name + " ?", "Combien de cellules compte Kigali ?", "Quelle est la population de " + selectedDistrict.name + " ?"]) };
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
      sources: [citySource, administrationSource, districtSourceFor(selectedDistrict.name), censusSource],
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
      sources: [censusSource, districtSourceFor(district.name), citySource],
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
        sources: [citySource, districtSourceFor(district.name)], suggestions: suggestionSet(language, ["Abaturage ba " + district.name + " ni bangahe?", "Akarere ka " + district.name + " gafite imirenge iyihe?", "Umujyi wa Kigali uhana imbibi he?"],
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
      const en = district.name + " District is part of the City of Kigali. The August 2022 census counted " + number(district.population) + " residents: " + number(district.male) + " males and " + number(district.female) + " females. The urban population was " + number(district.urban) + " and the rural population was " + number(district.rural) + ". The district has " + district.sectors.length + " sectors and " + district.cells + " cells. These are 2022 census figures.";
      const fr = "Le district de " + district.name + " fait partie de la Ville de Kigali. Le recensement d'août 2022 a dénombré " + number(district.population) + " habitants : " + number(district.male) + " hommes et " + number(district.female) + " femmes. La population urbaine était de " + number(district.urban) + " et la population rurale de " + number(district.rural) + ". Le district compte " + district.sectors.length + " secteurs et " + district.cells + " cellules. Ce sont des chiffres du recensement de 2022.";
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
    const rw = "Umujyi wa Kigali ufite ubuso bwa 730 km². Uturere tuyigize dufite ubu buso: Gasabo 429.3 km², Kicukiro 166.7 km² na Nyarugenge 134 km².";
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

  if (asksSectors && !selectedDistrict) {
    if (asksList) {
      const sectorLists = districts.map((district) =>
        district.name + " (" + district.sectors.length + "): " + district.sectors.map((sector) => sector.name).join(", "),
      );
      const rw = "Umujyi wa Kigali ufite imirenge 35 mu Turere dutatu. Dore urutonde rwose, rugabanyijwe hakurikijwe Akarere: " + sectorLists.join("; ") + ".";
      const en = "The City of Kigali has all 35 sectors across its three districts. Here is the complete district-by-district list: " + sectorLists.join("; ") + ".";
      const fr = "La Ville de Kigali compte 35 secteurs répartis dans ses trois districts. Voici la liste complète, classée par district : " + sectorLists.join("; ") + ".";
      return {
        topic: "kigali" as const,
        answer: answer(language, rw, en, fr),
        confidenceLabel: language === "en" ? "Sector names and counts: City of Kigali official administrative overview."
          : language === "fr" ? "Noms et nombre de secteurs : présentation administrative officielle de la Ville de Kigali."
            : "Amazina n'umubare w'imirenge: amakuru y'ubuyobozi yatangajwe n'Umujyi wa Kigali.",
        sources: [citySource, administrationSource],
        suggestions: suggestionSet(language,
          ["Abaturage ba Gasabo ni bangahe?", "Kicukiro ifite imirenge iyihe?", "Nyarugenge ifite utugari tungahe?"],
          ["What is Gasabo's population?", "Which sectors are in Kicukiro?", "How many cells are in Nyarugenge?"],
          ["Quelle est la population de Gasabo ?", "Quels secteurs composent Kicukiro ?", "Combien de cellules compte Nyarugenge ?"]),
      };
    }
    const rw = "Umujyi wa Kigali ufite imirenge 35 mu Turere dutatu: Gasabo ifite 15, Kicukiro ifite 10, Nyarugenge ifite 10. Nshobora kuguha urutonde rw'imirenge yose cyangwa urw'Akarere kimwe.";
    const en = "The City of Kigali has 35 sectors across three districts: Gasabo has 15, Kicukiro has 10 and Nyarugenge has 10. I can provide the full list for the City or for one district.";
    const fr = "La Ville de Kigali compte 35 secteurs répartis dans trois districts : Gasabo en compte 15, Kicukiro 10 et Nyarugenge 10. Je peux fournir la liste complète de la Ville ou celle d'un district.";
    return {
      topic: "kigali" as const,
      answer: answer(language, rw, en, fr),
      confidenceLabel: "City of Kigali official overview and administrative information.",
      sources: [citySource, administrationSource],
      suggestions: suggestionSet(language,
        ["Imirenge yose y'Umujyi wa Kigali ni iyihe?", "Gasabo ifite imirenge iyihe?", "Kicukiro ifite imirenge iyihe?"],
        ["List all 35 sectors in Kigali City.", "Which sectors are in Gasabo?", "Which sectors are in Kicukiro?"],
        ["Quels sont les 35 secteurs de Kigali ?", "Quels secteurs composent Gasabo ?", "Quels secteurs composent Kicukiro ?"]),
    };
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

  const overviewRw = "Kigali ni umurwa mukuru w'u Rwanda. Ufite ubuso bwa 730 km² kandi ugizwe n'uturere 3: Gasabo, Kicukiro na Nyarugenge. Ibarura rya Kanama 2022 ryabaruye abaturage 1,745,555. Umujyi ufite imirenge 35 n'utugari 161. Ku midugudu, urubuga rusanzwe rw'Umujyi ruvuga 1,155, ariko Raporo y'Umujyi ya 2024–2025 ivuga 1,163; ayo masoko ntarahuzwa. Umujyi wa Kigali ni urwego rwa mbere ruri ku rwego rumwe n'Intara enye; si Intara ya gatanu.";
  const overviewEn = "The City of Kigali is Rwanda's capital. It covers 730 km² and consists of three districts: Gasabo, Kicukiro and Nyarugenge. The August 2022 census counted 1,745,555 residents. The City has 35 sectors and 161 cells. For villages, the City overview lists 1,155 while the 2024–2025 Annual Report lists 1,163; the official publications have not been reconciled. Administratively, the City is a first-level entity alongside the four Provinces; it is not a fifth Province.";
  const overviewFr = "La Ville de Kigali est la capitale du Rwanda. Elle couvre 730 km² et comprend trois districts : Gasabo, Kicukiro et Nyarugenge. Le recensement d'août 2022 a dénombré 1 745 555 habitants. La Ville compte 35 secteurs et 161 cellules. Pour les villages, la présentation de la Ville en indique 1 155, tandis que le rapport annuel 2024–2025 en indique 1 163 ; les publications officielles n'ont pas été harmonisées. Sur le plan administratif, Kigali est une entité de premier niveau au même rang que les quatre Provinces ; ce n'est pas une cinquième Province.";
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
