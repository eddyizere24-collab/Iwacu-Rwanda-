import type { AssistantSource } from "./contracts";

/**
 * Public, owner-approved IWACU project knowledge for Ishakiro.
 * This is deliberately deterministic: sensitive project facts and claims must
 * never be invented by a language model. Keep answers non-technical and cite
 * the public page or owner-confirmed project note that supports them.
 */
export type IwacuProjectTopic =
  | "iwacu_project_purpose"
  | "iwacu_project_features"
  | "iwacu_project_difference"
  | "iwacu_project_location"
  | "iwacu_project_data"
  | "iwacu_project_map"
  | "iwacu_project_leaders"
  | "iwacu_project_emergency"
  | "iwacu_project_privacy"
  | "iwacu_project_legal"
  | "iwacu_project_security"
  | "iwacu_project_ai"
  | "iwacu_project_accessibility"
  | "iwacu_project_team"
  | "iwacu_project_metrics"
  | "iwacu_project_pilot"
  | "iwacu_project_sustainability"
  | "iwacu_project_rdb";

type Language = "rw" | "en" | "fr";

export interface IwacuProjectReply {
  topic: IwacuProjectTopic;
  answer: string;
  confidenceLabel: string;
  sources: AssistantSource[];
  suggestions: string[];
}

const checked = "2026-11-19";
const projectOwnerSource: AssistantSource = {
  label: "Amakuru y'umushinga yemejwe na nyirawo",
  data_date: checked,
  trust_tier: "other",
};
const aboutSource: AssistantSource = {
  label: "IWACU RWANDA — Abo turi bo",
  data_date: "2026-11-11",
  url: "https://iwacu-rwanda-2.vercel.app/about?lang=rw",
};
const howSource: AssistantSource = {
  label: "IWACU RWANDA — Uko ikora",
  data_date: "2026-11-10",
  url: "https://iwacu-rwanda-2.vercel.app/how-it-works?lang=rw",
};
const dataSource: AssistantSource = {
  label: "IWACU RWANDA — Inkomoko y'amakuru n'imbibi",
  data_date: "2026-11-10",
  url: "https://iwacu-rwanda-2.vercel.app/data-sources?lang=rw",
};
const privacySource: AssistantSource = {
  label: "IWACU RWANDA — Ibanga ry'amakuru",
  data_date: "2026-11-11",
  url: "https://iwacu-rwanda-2.vercel.app/privacy?lang=rw",
};
const termsSource: AssistantSource = {
  label: "IWACU RWANDA — Amabwiriza yo gukoresha",
  data_date: "2026-11-10",
  url: "https://iwacu-rwanda-2.vercel.app/terms?lang=rw",
};
const dpoRegistrationSource: AssistantSource = {
  label: "Data Protection and Privacy Office — Registration of a data controller and a data processor",
  data_date: null,
  url: "https://dpo.gov.rw/dpp-law/registration-of-a-data-controller-and-a-data-processor",
  trust_tier: "official_government",
};
const dpoFaqSource: AssistantSource = {
  label: "Data Protection and Privacy Office — Frequently asked questions",
  data_date: null,
  url: "https://dpo.gov.rw/faqs",
  trust_tier: "official_government",
};
const rdbSource: AssistantSource = {
  label: "Rwanda Development Board — About RDB",
  data_date: null,
  url: "https://rdb.rw/about-rdb/",
  trust_tier: "official_government",
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[!?.,;:()[\]{}]/g, " ").replace(/\s+/g, " ").trim();
}

function languageOf(query: string): Language {
  const value = normalize(query);
  if (/\b(what|how|why|who|which|does|do|is|are|can|will|where|when|how many|privacy|security|company|team|pilot|funding|project|platform|data|location|leaders|emergency|difference|source|map|registered|gps|accuracy|inside|building|buildings|independent|audit|users|made|passed|launch)\b/.test(value)) return "en";
  if (/\b(quoi|comment|pourquoi|qui|quel|quelle|est|sont|peut|comment|confidentialite|securite|entreprise|equipe|projet|plateforme|donnees|localisation|responsables|urgence|difference|source|carte|enregistre)\b/.test(value)) return "fr";
  return "rw";
}

const patterns: Array<[IwacuProjectTopic, RegExp]> = [
  ["iwacu_project_privacy", /\b(ibanga|amakuru bwite|amakuru yanjye|amakuru y'umuntu|amakuru y'abantu|amakuru y'aho ndi|location data|personal data|privacy|confidentiality|confidentialite|donnees personnelles|vie privee|umwirondoro w'umukoresha|visitor id|amakuru abikwa|amakuru ajyanwa hanze)\b/],
  ["iwacu_project_legal", /\b(iyandikwa|kwiyandikisha|registered|registration|company|legal entity|ikigo cyemewe|ubuzimagatozi|dpo|data controller|data processor|amakuru y'ibanga mu mategeko|amategeko yo kurinda amakuru|compliance|kubahiriza amategeko)\b/],
  ["iwacu_project_security", /\b(umutekano|umutekano wa sisitemu|security|cybersecurity|hack|hacker|attack|penetration test|security audit|audit y'umutekano|ibitero)\b/],
  ["iwacu_project_leaders", /\b(390|amakuru y'abayobozi|urutonde rw'abayobozi|amakarita y'abayobozi|leader records|leader cards|leaders register|verification of leaders|kwemeza abayobozi|leader information)\b/],
  ["iwacu_project_emergency", /\b(ubutabazi|emergency|emergencies|ambulance|polisi|police|fire|inkongi|nimero z'ubutabazi)\b/],
  ["iwacu_project_data", /\b(inkomoko y'amakuru|amakuru ava he|data source|data sources|amakuru y'ubuyobozi|14,?823|14,?837|14 823|14 837|village count|boundary data|dataset|amakuru atandukanye|difference in data|count discrepancy)\b/],
  ["iwacu_project_map", /\b(ikarita|map|mapping|openstreetmap|osm|geofabrik|nisr|ikarita yakozwe na nde|map made by|who made the map)\b/],
  ["iwacu_project_location", /\b(gps|geolocation|coordinates|latitude|longitude|location accuracy|gps accuracy|indoor gps|accuracy inside|accuracy indoors|mu nzu|mobile data|wifi)\b/],
  ["iwacu_project_ai", /\b(ishakiro|iwacu ai|artificial intelligence|artificial|ai assistant|hallucination|guhimba ibisubizo|ibisubizo by'ikinyoma|kwigira nyirayo|kumpagararira|answer for the founder|represent the owner|voice assistant|web search|external search)\b/],
  ["iwacu_project_accessibility", /\b(ubumuga|accessibility|accessibility test|talkback|screen reader|blind|low connectivity|internet nke|telefoni zidakomeye|low end android|low-end phone|phone support)\b/],
  ["iwacu_project_team", /\b(uwashinze|nyir'umushinga|founder|founders|cofounder|co-founder|team|abakozi|abafatanyabikorwa|itsinda|umukozi|staff|developer|developers)\b/],
  ["iwacu_project_metrics", /\b(abakoresha|umubare w'abakoresha|users|user count|reach|traffic|visitors|analytics|imibare y'abayikoresha|impact|ingaruka|imaze kugera kuri bande)\b/],
  ["iwacu_project_pilot", /\b(pilot|igerageza|igeragezwa|igihe cyo gutangiza|launch date|timeline|when will it launch|pilot area|akarere kazageragezwamo|ahazageragerezwa)\b/],
  ["iwacu_project_sustainability", /\b(uburyo bwo kwinjiza|business model|sustainability|financial sustainability|funding|inkunga|amafaranga|revenue|income|kwibeshaho|sponsor|sponsorship)\b/],
  ["iwacu_project_rdb", /\b(rdb|development board|ubufatanye n'inzego|ubufatanye|partnership|partner|support from rdb|ubufasha bwa rdb|turifuza iki kuri rdb)\b/],
  ["iwacu_project_difference", /\b(itandukaniro|bitandukaniye he|google maps|google map|maps|other platforms|izindi mbuga|why iwacu|why this project|what makes it different|unique|innovation|udushya)\b/],
  ["iwacu_project_features", /\b(ibyo urubuga rukora|imirimo y'urubuga|features|capabilities|services|serivisi|ibikorwa by'iwacu|mwafasha iki|what does iwacu do|what can iwacu do)\b/],
  ["iwacu_project_purpose", /\b(intego|igamije iki|purpose|objective|mission|vision|impamvu mwubatse|why was it built|what is the project about)\b/],
];

export function isIwacuProjectTopic(topic: string | null | undefined): topic is IwacuProjectTopic {
  return typeof topic === "string" && topic.startsWith("iwacu_project_");
}

/** Match specific project questions before the broader generic IWACU topic. */
export function resolveIwacuProjectTopic(
  query: string,
  previousTopic?: IwacuProjectTopic | null,
): IwacuProjectTopic | null {
  const value = normalize(query);
  const explicitProjectContext = /\b(iwacu|ishakiro|umushinga|urubuga rwacu|this project|our project|this platform|our platform|the platform|rdb|390|14,?823|14,?837|14 823|14 837)\b/.test(value);
  if (!explicitProjectContext && !previousTopic) return null;
  for (const [topic, pattern] of patterns) {
    if (pattern.test(value)) return topic;
  }
  if (!previousTopic) return null;
  if (/^(none se|kandi|naho|and|also|et aussi)?\s*(ese|what about|and what|et pour|et concernant)\b/.test(value)) {
    return previousTopic;
  }
  return null;
}

export function getIwacuProjectReply(topic: IwacuProjectTopic, query: string): IwacuProjectReply {
  const language = languageOf(query);
  const rw: Record<IwacuProjectTopic, string> = {
    iwacu_project_purpose: "IWACU RWANDA ni urubuga rwigenga rw'ikoranabuhanga rugamije gufasha abantu kumenya aho baherereye mu nzego z'ubuyobozi bw'u Rwanda, gushaka ahantu, gusobanukirwa amakuru y'aho batuye no kugera ku makuru rusange y'abayobozi igihe inyandiko zemejwe ziboneka. Intego ni uguhuza amakuru y'ahantu n'ubuyobozi mu buryo bworoshye, cyane cyane ku bakoresha telefone. IWACU si urubuga rwa Leta kandi ntirusimbura inzego zifite ububasha.",
    iwacu_project_features: "IWACU ifasha kumenya aho umuntu aherereye mu nzego z'ubuyobozi, gushaka ahantu no kureba inzira y'inzego, gusobanukirwa imiterere y'ubuyobozi bw'u Rwanda, kureba amakuru rusange y'abayobozi iyo yemejwe kandi iboneka, kubona amakuru y'ubutabazi afite inkomoko no gukoresha Ishakiro mu gushaka no gusobanukirwa amakuru. Hari n'ikarita n'ibindi bikoresho bifasha umuntu gusobanukirwa aho ari. Ibyo bitaragenzurwa cyangwa bitaraboneka ntibigaragazwa nk'ibyamaze kugerwaho.",
    iwacu_project_difference: "IWACU yibanda ku Rwanda no ku buryo inzego z'ubuyobozi zihurirana n'aho umuntu aherereye. Ishaka guhuza kumenya Umudugudu, Akagari, Umurenge n'Akarere, amakuru y'ahantu n'abayobozi, imbibi, ubutabazi n'ubusobanuro bw'ikoranabuhanga mu rurimi rworoshye. Google Maps ishobora gufasha gushaka inzira n'ahantu; IWACU yo yibanda ku gusobanura inzego z'ubuyobozi n'amakuru y'aho hantu mu Rwanda. Ntivuga ko isimbura Google Maps cyangwa serivisi za Leta.",
    iwacu_project_location: "Iyo umuntu akoresheje “Menya aho uri”, telefone cyangwa browser bishobora gutanga GPS cyangwa ikindi kimenyetso cy'aho iri. IWACU igereranya aho icyo kimenyetso cyerekana n'imbibi z'ubuyobozi zibitse kugira ngo ibone urwego rushyigikiwe n'ibimenyetso. GPS ishobora kudatanga ukuri guhagije, cyane cyane mu nzu, hagati y'inyubako cyangwa igihe ibimenyetso bya telefone bidakomeye. Ni yo mpamvu IWACU ishobora kwerekana Akarere cyangwa Umurenge aho guhimba Umudugudu. Ijanisha cyangwa icyizere ni ikigereranyo, si gihamya y'ubutaka cyangwa icyemezo cyemewe cy'aho umuntu atuye.",
    iwacu_project_data: "IWACU itandukanya imibare yatangajwe n'inzego z'igihugu n'imibare iboneka muri dataset y'imbibi ikoreshwa mu ikarita no kumenya aho umuntu ari. Urubuga rwa Guverinoma rwasuzumwe ku wa 10 Ugushyingo 2026 rwatangaje Intara 4 n'Umujyi wa Kigali, Uturere 30, Imirenge 416, Utugari 2,148 n'Imidugudu 14,837. Dataset y'imbibi yari muri repository ya IWACU mu igenzura ryagaragajwe ku rubuga yari ifite imidugudu 14,823. Itandukaniro ni 14. IWACU ntirihisha iryo tandukaniro cyangwa ngo rihindure imibare ngo ihure; igaragaza inkomoko ya buri mubare kandi ikeneye kugenzura dataset ivuguruye n'urwego rubifitiye ububasha mbere yo kuvuga ko ikibazo cyakemutse.",
    iwacu_project_map: "Ikarita ya IWACU ikoresha amakuru y'ikarita ya OpenStreetMap, kandi urubuga rugaragaza ko ayo makuru agengwa n'uruhushya ODbL. Imbibi z'ubuyobozi zikomoka ku makuru yaturutse muri NISR, nk'uko urubuga rubisobanura. Software n'uburyo bwo gutunganya no kwerekana ikarita ni ibikoresho by'umushinga IWACU; ntibivuze ko NISR ari yo yakoze ikarita cyangwa ko yemeje buri murongo wayo. Ikarita igenewe gufasha gusobanukirwa aho hantu, ntabwo isimbura inyandiko z'ubutaka cyangwa ibipimo byemewe.",
    iwacu_project_leaders: "Amakuru y'abayobozi agaragazwa gusa iyo hari inyandiko rusange zemejwe kandi zemerewe gutangazwa. Mu nyandiko y'umushinga yagejejwe kuri RDB, hagaragajwe amakarita y'amakuru y'abayobozi 390 yari yarinjijwe ariko ataragenzurwa no kwemezwa n'inzego zibifitiye ububasha. Bityo ayo makuru ntiyagomba kwitwa urutonde rwemewe rw'abayobozi bose. Iyo izina cyangwa nimero bitabonetse cyangwa bitaremezwa, IWACU igomba kubivuga kandi ntihimbe umuyobozi cyangwa nimero ye.",
    iwacu_project_emergency: "IWACU itanga amakuru y'ubutabazi igihe amakuru afite inkomoko yizewe kandi aboneka. Urubuga ntirusimbura Polisi, serivisi z'ubuvuzi, ubutabazi cyangwa izindi nzego zibifitiye ububasha. Mu kaga kihutirwa, umuntu agomba guhamagara serivisi z'ubutabazi ako kanya aho gutegereza igisubizo cya AI cyangwa ikarita. Nimero 112 igaragara ku rubuga nk'umurongo wa Polisi; andi makuru agomba kugenzurwa ku rutonde rwemewe mbere yo kuyasubiza.",
    iwacu_project_privacy: "IWACU isobanura ko Location ishobora gutanga latitude na longitude kugira ngo hamenyekane urwego rw'ubuyobozi; aho telefone iheruka kumenyekana hashobora kubikwa muri browser yayo kugeza ku masaha 24. Igitekerezo cyo kwemeza aho hantu gitanzwe ku bushake gishobora kubika kode y'Umudugudu, uburyo bwakoreshejwe, ukuri kwa GPS n'aho telefone yari iri hagabanyijwe ku bipimo bibiri nyuma ya decimal. Web Push ishobora kubika amakuru ya subscription na visitor ID itarimo izina; cookie yayo ishobora kumara umwaka. Ibibazo bya Ishakiro byoherezwa kuri seriveri ya IWACU, kandi igihe AI provider y'inyongera ifunguye, ikibazo n'ibiganiro bya vuba bishobora koherezwa kuri provider yatoranyijwe. Ntukandike ijambo ry'ibanga cyangwa nimero y'irangamuntu muri Ishakiro. Ibi bisobanuro ntibisimbura igenzura ry'amasezerano n'igihe logs zibikwa.",
    iwacu_project_legal: "IWACU ntigomba kuvuga ko yamaze kwemezwa mu kubahiriza amategeko yo kurinda amakuru niba nta cyemezo kibyemeza. Amategeko y'u Rwanda asaba umuntu ugambiriye kuba Data Controller cyangwa Data Processor kwiyandikisha ku rwego rubishinzwe; iryo tegeko ntirireba ibigo byanditse gusa, kuko ibisobanuro by'amategeko birimo n'umuntu ku giti cye. Ibyo bivuze ko kuba umushinga utarandikwa nk'ikigo bitakuraho inshingano zishobora guterwa no gutunganya amakuru bwite. Uko IWACU ihagaze mu kwiyandikisha, DPO, DPIA n'amasezerano n'abatanga serivisi bigomba kwemezwa n'ubuyobozi bw'umushinga hamwe na DPO/NCSA. Nta cyemezo cyo kwiyandikisha cyangwa icyemezo cy'uko byose byujujwe kigomba guhimbwa.",
    iwacu_project_security: "IWACU ishyira imbere kugabanya amakuru ikusanya, kugenzura uburenganzira bwo kubona amakuru no kurinda amakuru y'abakoresha. Amabwiriza y'ibanga asobanura ko Vercel yakira urubuga na Supabase ikabika amakuru, kandi ko izi serivisi zishobora gutunganya amakuru ya tekiniki akenewe mu mikorere. Igenzura ryigenga ry'umutekano cyangwa penetration test ntirigaragazwa nk'iryamaze kurangira mu nyandiko z'umushinga twabonye. Bityo Ishakiro ntigomba kuvuga ko urubuga rufite umutekano wemejwe n'impuguke cyangwa ko nta kibazo gishobora kubaho; ibibazo byihariye by'umutekano bigomba koherezwa ku bashinzwe urubuga, ntibitangazwe ku mugaragaro.",
    iwacu_project_ai: "Ishakiro ni umufasha wa AI wa IWACU RWANDA. Igamije kumva ibibazo mu Kinyarwanda, Icyongereza n'Igifaransa, gushaka amakuru ajyanye n'ahantu, inzego z'ubuyobozi, abayobozi n'ubutabazi, no gusobanura ibyo amakuru yemewe ashyigikiye. Ihame ry'ingenzi ni ukutahimba amazina, nimero, imibare cyangwa amasoko. Iyo amakuru abuze, igomba kubivuga no gutanga intambwe ikurikira. Ishakiro ishobora gusobanura umushinga no gusubiza ibibazo rusange byemejwe, ariko ntabwo ari nyir'umushinga, ntabwo ifite ububasha bwo gufata ibyemezo mu izina rye, kandi ntigomba kwigira ko ishobora gukora ibikorwa bitarafungurwa cyangwa bitaremezwa.",
    iwacu_project_accessibility: "IWACU yubakwa nk'urubuga rugenewe gukoreshwa kuri telefone kandi rugomba gukomeza koroshya imikoreshereze ku bantu bafite ibikoresho bidakomeye cyangwa interineti nke. Kinyarwanda ni ururimi rw'ingenzi, kandi urubuga rufite n'icyerekezo cy'Icyongereza n'Igifaransa. Icyakora, ntidukwiye kuvuga ko buri gikorwa cyamaze kugeragezwa ku bikoresho byose, kuri TalkBack cyangwa ku bantu bafite ubumuga niba raporo y'igerageza itarabigaragaza. Ibyo bisaba ibizamini by'abakoresha nyabo no kwandika ibyavuye mu igerageza.",
    iwacu_project_team: "Umushinga IWACU RWANDA washyizweho kandi ukomeje gutezwa imbere na nyir'umushinga ari umuntu ku giti cye. Mu makuru yari amaze gusangizwa RDB, umushinga wari utarandikwa nk'ikigo cyangwa company, kandi nta co-founder cyangwa itsinda ry'abakozi ryemewe ryari rihari. Iyo ibintu bihindutse, igisubizo kigomba kuvugururwa n'inyandiko nshya yemejwe na nyir'umushinga; Ishakiro ntigomba guhimba abaterankunga, abakozi cyangwa abafatanyabikorwa.",
    iwacu_project_metrics: "Kugeza ku makuru yari amaze gusangizwa RDB ku wa 18 Ugushyingo 2026, nta mubare w'abakoresha cyangwa reach wari waragenzuwe kandi wemejwe. Bityo IWACU ntigomba kuvuga ko ifite umubare runaka w'abakoresha, downloads cyangwa impact itafitiye raporo yizewe. Igihe analytics yagenzuwe ibonetse, imibare izasubizwa hamwe n'igihe yapimiwe n'uburyo yabazwe.",
    iwacu_project_pilot: "Nta tariki ntakuka ya pilot cyangwa igihe cyo gutangiza byari byarasezeranyijwe muri raporo yari yaragejejwe kuri RDB. Pilot ikwiye gutegurwa nyuma yo kumvikana n'inzego bireba ku karere izaberamo, amakuru azageragezwa, ibipimo by'ukuri, privacy, umutekano n'uburyo bwo gutanga raporo. Ishakiro ntigomba guhimba itariki cyangwa kuvuga ko pilot yatangiye itarabaye.",
    iwacu_project_sustainability: "Uburyo burambye bwo gutera inkunga no gukomeza IWACU, harimo amafaranga yinjira, abafatanyabikorwa cyangwa sponsorship, ntibwari bwarashyizweho nk'umwanzuro uhamye mu makuru y'umushinga twabonye. Umushinga uracyakeneye kuganira ku buryo bwo kwishyura hosting, kubungabunga amakuru, umutekano, support n'iterambere. Ishakiro ntigomba guhimba amasezerano, inkunga cyangwa revenue.",
    iwacu_project_rdb: "IWACU yasabye RDB ubuyobozi n'inama ku nzira ikwiye y'umushinga, cyane cyane ku igenzura ry'amakuru, privacy, umutekano n'uburyo bwo kumenya izindi nzego zafasha mu kugenzura amakuru y'ubuyobozi. Icyifuzo si ugusaba RDB kwemeza ko IWACU ari urubuga rwa Leta cyangwa kwemeza amakuru yose ataragenzurwa. RDB ni ikigo cya Leta gifite inshingano zo guteza imbere ubukungu binyuze mu kongera ubushobozi bw'abikorera; uruhare rwacyo ku mushinga rugomba kugenwa mu biganiro, ntirukwiye guhimbwa.",
  };

  const en: Record<IwacuProjectTopic, string> = {
    iwacu_project_purpose: "IWACU RWANDA is an independent digital platform designed to help people understand where they are within Rwanda's administrative structure, find places, understand local public information and access public leader information when verified records are available. Its purpose is to make location and administrative information easier to understand, especially on phones. IWACU is not a government website and does not replace competent public institutions.",
    iwacu_project_features: "IWACU is designed to help people identify their administrative area, search for places and their administrative hierarchy, understand Rwanda's administrative structure, view public leader information where approved records exist, access sourced emergency information and use Ishakiro to search and understand information. It also includes a map and other location tools. Features or records that have not been verified or made available must not be described as completed.",
    iwacu_project_difference: "IWACU focuses on Rwanda and on connecting a person's location with the country's administrative structure. It aims to bring together village, cell, sector and district context, place information, public leader records, boundaries, emergency information and explanations in accessible language. Google Maps can help find places and routes; IWACU focuses on explaining Rwanda's administrative hierarchy and local context. It does not claim to replace Google Maps or public services.",
    iwacu_project_location: "When someone uses 'Know where I am', the phone or browser may provide GPS or another location signal. IWACU compares that signal with stored administrative boundaries to identify the level supported by the evidence. GPS can be insufficient, especially indoors, among tall buildings or when the device signal is weak. IWACU may therefore show a district or sector rather than invent a village. A confidence percentage is an estimate, not proof of land ownership or a legal statement of residence.",
    iwacu_project_data: "IWACU distinguishes national administrative figures published by authorities from the records in the boundary dataset used for mapping and location matching. The Government of Rwanda website, reviewed on 10 November 2026, published 4 provinces plus the City of Kigali, 30 districts, 416 sectors, 2,148 cells and 14,837 villages. The boundary dataset in IWACU's repository at the review referenced on the site contained 14,823 villages. The difference is 14. IWACU does not hide the discrepancy or force the figures to match; it identifies each source and needs an updated dataset and confirmation from the competent authority before claiming the issue is resolved.",
    iwacu_project_map: "IWACU's map uses OpenStreetMap map data, which is provided under the ODbL licence. The administrative boundaries are described as originating from National Institute of Statistics of Rwanda (NISR) data. The software and way IWACU processes and displays the map are part of the project's own implementation; this does not mean NISR created the map or verified every line. The map is for understanding places, not a substitute for land-title documents or an official survey.",
    iwacu_project_leaders: "Leader information is displayed only when approved public records that may be published are available. The Project Overview shared with RDB identified 390 imported leader cards that had not yet been verified and approved by the competent authorities. They must therefore not be described as a complete or officially verified leaders register. When a name or phone number is missing or unverified, IWACU should say so rather than inventing a leader or contact.",
    iwacu_project_emergency: "IWACU provides emergency information when a reliable source is available. It does not replace the Police, medical services, emergency responders or other competent authorities. In an emergency, people should contact emergency services immediately instead of waiting for an AI or map response. The website lists 112 as the Police emergency line; other details must be checked against an official directory before being repeated.",
    iwacu_project_privacy: "IWACU's privacy notice says that Location may provide latitude and longitude to identify an administrative area; the last-known location may be stored in the browser for up to 24 hours. Optional location feedback may store a village code, method, GPS accuracy and coordinates rounded to two decimal places. Web Push may store browser subscription data and a non-name visitor ID; its cookie may last one year. Questions to Ishakiro are sent to IWACU's server, and when an optional AI provider is enabled, the question and recent conversation may be sent to the selected provider. Do not enter passwords or national ID numbers into Ishakiro. These disclosures do not replace verifying processor agreements and log-retention settings.",
    iwacu_project_legal: "IWACU must not claim that it has completed legal compliance unless there is evidence to support that claim. Rwanda's data protection law requires a person intending to act as a Data Controller or Data Processor to register with the supervisory authority; the legal definition includes a natural person, not only a registered company. Therefore, not being incorporated as a company does not remove possible obligations arising from processing personal data. IWACU's status regarding registration, a DPO, DPIAs and processor agreements must be confirmed by the project owner with the DPO/NCSA. Ishakiro must never invent a registration certificate or say that all legal requirements have been met.",
    iwacu_project_security: "IWACU prioritises limiting the data it collects, controlling access to information and protecting users' information. Its privacy notice says that Vercel hosts the website and Supabase stores service data, and these providers may process technical information needed to operate the service. The project materials reviewed do not establish that an independent security audit or penetration test has been completed. Ishakiro must not claim that experts have certified the platform as secure or that no security issue can occur. Specific security-sensitive details should be referred to the site operators rather than disclosed publicly.",
    iwacu_project_ai: "Ishakiro is the AI assistant for IWACU RWANDA. It is intended to understand questions in Kinyarwanda, English and French, find information about places, administrative structures, leaders and emergencies, and explain what verified sources support. Its core rule is not to invent names, numbers, statistics or sources. When information is missing, it should say so and offer a next step. Ishakiro can explain the project and answer approved general questions, but it is not the project owner, cannot make decisions on the owner's behalf and must not claim it can perform actions that have not been enabled and approved.",
    iwacu_project_accessibility: "IWACU is being built as a phone-friendly service and should remain usable on lower-end devices and weaker internet connections. Kinyarwanda is a priority language, with English and French also supported in the site's direction. However, the assistant must not claim that every feature has been tested on every device, with TalkBack or with people with disabilities unless test reports show that. Those claims require real-user testing and documented results.",
    iwacu_project_team: "IWACU RWANDA was created and is being developed by the project owner as an individual. Information already shared with RDB stated that the project had not yet been registered as a company or legal entity and did not have a formal co-founder or employee team. If that changes, the answer must be updated from a new owner-approved record. Ishakiro must not invent staff, investors or partners.",
    iwacu_project_metrics: "As of the information shared with RDB on 18 November 2026, there was no verified and confirmed user-reach figure. IWACU must therefore not claim a particular number of users, downloads or impact without a reliable report. When verified analytics become available, figures should include the measurement period and method.",
    iwacu_project_pilot: "The project information shared with RDB did not promise a fixed pilot date or launch schedule. A pilot should be planned after agreement with the relevant institutions on the pilot area, data to be tested, accuracy measures, privacy, security and reporting arrangements. Ishakiro must not invent a date or say that a pilot has started when it has not.",
    iwacu_project_sustainability: "A final sustainability and funding model, including revenue, partners or sponsorship, was not established in the project information reviewed. The project still needs to discuss how hosting, data maintenance, security, support and further development will be funded. Ishakiro must not invent agreements, grants or revenue.",
    iwacu_project_rdb: "IWACU asked RDB for guidance on the appropriate pathway for the project, particularly data validation, privacy, security and identifying other institutions that could help verify administrative information. The request is not for RDB to declare IWACU a government website or to endorse every record that has not been verified. RDB is a public institution mandated to accelerate economic development by enabling private-sector growth; its role in IWACU must be determined through discussion, not assumed.",
  };

  const fr: Record<IwacuProjectTopic, string> = {
    iwacu_project_purpose: "IWACU RWANDA est une plateforme numérique indépendante destinée à aider les habitants à comprendre leur position dans l'organisation administrative du Rwanda, à rechercher des lieux, à comprendre les informations publiques locales et à consulter les informations publiques sur les responsables lorsque des données vérifiées sont disponibles. Son objectif est de rendre les informations géographiques et administratives plus accessibles, notamment sur téléphone. IWACU n'est pas un site gouvernemental et ne remplace pas les institutions compétentes.",
    iwacu_project_features: "IWACU vise à aider les habitants à identifier leur zone administrative, rechercher des lieux et leur hiérarchie administrative, comprendre l'organisation administrative du Rwanda, consulter les informations publiques sur les responsables lorsque des dossiers approuvés existent, accéder aux informations d'urgence sourcées et utiliser Ishakiro pour rechercher et comprendre des informations. La plateforme comprend aussi une carte et des outils de localisation. Les fonctions ou dossiers non vérifiés ne doivent pas être présentés comme achevés.",
    iwacu_project_difference: "IWACU se concentre sur le Rwanda et sur le lien entre la position d'une personne et l'organisation administrative du pays. La plateforme souhaite réunir le contexte des villages, cellules, secteurs et districts, les informations sur les lieux, les dossiers publics des responsables, les limites administratives, les informations d'urgence et des explications accessibles. Google Maps peut aider à trouver des lieux et des itinéraires; IWACU se concentre sur l'explication de la hiérarchie administrative et du contexte local au Rwanda. IWACU ne prétend pas remplacer Google Maps ni les services publics.",
    iwacu_project_location: "Lorsque quelqu'un utilise « Me localiser », le téléphone ou le navigateur peut fournir un signal GPS ou un autre signal de localisation. IWACU compare ce signal aux limites administratives enregistrées afin d'identifier le niveau soutenu par les éléments disponibles. Le GPS peut être insuffisant, notamment à l'intérieur des bâtiments, entre de grands immeubles ou lorsque le signal est faible. IWACU peut donc afficher un district ou un secteur plutôt que d'inventer un village. Un pourcentage de confiance est une estimation, pas une preuve de propriété foncière ni une attestation légale de résidence.",
    iwacu_project_data: "IWACU distingue les chiffres administratifs nationaux publiés par les autorités des enregistrements de la base de limites utilisée pour la carte et la localisation. Le site du Gouvernement du Rwanda, consulté le 10 novembre 2026, publiait 4 provinces et la Ville de Kigali, 30 districts, 416 secteurs, 2 148 cellules et 14 837 villages. La base de limites du dépôt IWACU, lors de la vérification mentionnée sur le site, contenait 14 823 villages. L'écart est de 14. IWACU ne masque pas cet écart et ne force pas les chiffres à correspondre; chaque source est identifiée et la résolution nécessite une base actualisée et la confirmation de l'autorité compétente.",
    iwacu_project_map: "La carte d'IWACU utilise les données cartographiques d'OpenStreetMap, fournies sous licence ODbL. Les limites administratives sont décrites comme provenant des données du National Institute of Statistics of Rwanda (NISR). Le logiciel et la manière dont IWACU traite et affiche la carte relèvent de la réalisation propre du projet; cela ne signifie pas que le NISR a créé la carte ou vérifié chaque limite. La carte aide à comprendre les lieux et ne remplace pas les titres fonciers ni un levé officiel.",
    iwacu_project_leaders: "Les informations sur les responsables ne sont affichées que lorsque des dossiers publics approuvés et autorisés à la publication sont disponibles. Le document de présentation transmis au RDB mentionnait 390 fiches de responsables importées mais qui n'avaient pas encore été vérifiées et approuvées par les autorités compétentes. Elles ne doivent donc pas être présentées comme un registre complet ou officiellement vérifié. Lorsqu'un nom ou un numéro manque ou n'est pas vérifié, IWACU doit le signaler au lieu de l'inventer.",
    iwacu_project_emergency: "IWACU fournit des informations d'urgence lorsqu'une source fiable est disponible. La plateforme ne remplace pas la Police, les services médicaux, les secours ou les autres autorités compétentes. En cas d'urgence, il faut contacter immédiatement les services concernés au lieu d'attendre une réponse de l'IA ou de la carte. Le site indique le 112 comme numéro d'urgence de la Police; les autres coordonnées doivent être vérifiées dans un répertoire officiel avant d'être communiquées.",
    iwacu_project_privacy: "La notice de confidentialité d'IWACU indique que la fonction de localisation peut fournir la latitude et la longitude pour identifier une zone administrative; la dernière position connue peut rester dans le navigateur jusqu'à 24 heures. Un retour volontaire sur la localisation peut enregistrer le code du village, la méthode utilisée, la précision GPS et des coordonnées arrondies à deux décimales. Web Push peut stocker les données d'abonnement du navigateur et un identifiant visiteur sans nom; son cookie peut durer un an. Les questions adressées à Ishakiro sont envoyées au serveur IWACU et, lorsqu'un fournisseur d'IA optionnel est activé, la question et les échanges récents peuvent être transmis au fournisseur sélectionné. Ne saisissez pas de mot de passe ni de numéro d'identité nationale dans Ishakiro. Ces informations ne remplacent pas la vérification des contrats de sous-traitance et des durées de conservation des journaux.",
    iwacu_project_legal: "IWACU ne doit pas affirmer que sa conformité juridique est achevée sans preuve. La loi rwandaise sur la protection des données exige qu'une personne qui entend agir comme responsable du traitement ou sous-traitant s'enregistre auprès de l'autorité de contrôle; la définition légale inclut une personne physique et pas seulement une société enregistrée. Le fait de ne pas être constitué en société ne supprime donc pas les obligations qui peuvent découler du traitement de données personnelles. Le statut d'IWACU concernant l'enregistrement, un DPO, les analyses d'impact et les contrats avec les sous-traitants doit être confirmé par le propriétaire du projet auprès du DPO/NCSA. Ishakiro ne doit jamais inventer un certificat ni prétendre que toutes les exigences légales sont remplies.",
    iwacu_project_security: "IWACU donne la priorité à la limitation des données collectées, au contrôle des accès et à la protection des informations des utilisateurs. Sa notice de confidentialité indique que Vercel héberge le site et que Supabase stocke les données du service; ces prestataires peuvent traiter les informations techniques nécessaires au fonctionnement. Les documents examinés ne démontrent pas qu'un audit de sécurité indépendant ou un test d'intrusion a été achevé. Ishakiro ne doit pas prétendre que des experts ont certifié la sécurité de la plateforme ou qu'aucun incident ne peut se produire. Les détails sensibles de sécurité doivent être adressés aux responsables du site plutôt que publiés.",
    iwacu_project_ai: "Ishakiro est l'assistant IA d'IWACU RWANDA. Il est conçu pour comprendre les questions en kinyarwanda, en anglais et en français, rechercher des informations sur les lieux, l'administration, les responsables et les urgences, puis expliquer ce que les sources vérifiées permettent d'affirmer. Sa règle essentielle est de ne pas inventer de noms, de numéros, de statistiques ni de sources. Lorsque des informations manquent, il doit le dire et proposer l'étape suivante. Ishakiro peut expliquer le projet et répondre aux questions générales approuvées, mais il n'est pas le propriétaire du projet, ne peut pas décider en son nom et ne doit pas prétendre exécuter des actions qui n'ont pas été activées et approuvées.",
    iwacu_project_accessibility: "IWACU est conçu comme un service adapté aux téléphones et devrait rester utilisable sur des appareils modestes et avec une connexion faible. Le kinyarwanda est une langue prioritaire, avec l'anglais et le français également prévus. Toutefois, l'assistant ne doit pas affirmer que toutes les fonctions ont été testées sur tous les appareils, avec TalkBack ou auprès de personnes handicapées sans rapports de test. Ces affirmations nécessitent des essais avec de vrais utilisateurs et des résultats documentés.",
    iwacu_project_team: "IWACU RWANDA a été créé et est développé par le propriétaire du projet à titre individuel. Les informations déjà communiquées au RDB indiquaient que le projet n'était pas encore enregistré comme société ou entité juridique et qu'il n'avait pas de cofondateur ni d'équipe salariée formelle. Si cela change, la réponse doit être mise à jour à partir d'un nouveau document approuvé par le propriétaire. Ishakiro ne doit pas inventer de personnel, d'investisseurs ou de partenaires.",
    iwacu_project_metrics: "Selon les informations communiquées au RDB le 18 novembre 2026, aucun chiffre de portée ou d'utilisateurs n'avait été vérifié et confirmé. IWACU ne doit donc pas annoncer un nombre d'utilisateurs, de téléchargements ou un impact sans rapport fiable. Lorsque des statistiques vérifiées seront disponibles, elles devront préciser la période et la méthode de mesure.",
    iwacu_project_pilot: "Les informations du projet communiquées au RDB ne fixaient aucune date ferme de pilote ou de lancement. Un pilote devrait être planifié après accord avec les institutions concernées sur la zone, les données à tester, les mesures de précision, la confidentialité, la sécurité et les modalités de rapport. Ishakiro ne doit pas inventer une date ni dire qu'un pilote a commencé si ce n'est pas le cas.",
    iwacu_project_sustainability: "Un modèle définitif de durabilité et de financement, comprenant les revenus, les partenaires ou le parrainage, n'était pas encore établi dans les informations du projet examinées. Le projet doit encore examiner comment financer l'hébergement, la maintenance des données, la sécurité, l'assistance et le développement. Ishakiro ne doit pas inventer des accords, des subventions ou des revenus.",
    iwacu_project_rdb: "IWACU a demandé au RDB des orientations sur la voie appropriée pour le projet, notamment la validation des données, la confidentialité, la sécurité et l'identification d'autres institutions pouvant aider à vérifier les informations administratives. La demande ne vise pas à faire déclarer IWACU comme site gouvernemental ni à faire approuver toutes les données non vérifiées. Le RDB est une institution publique chargée d'accélérer le développement économique en favorisant la croissance du secteur privé; son rôle dans IWACU doit être déterminé par la discussion et non présumé.",
  };

  const allSources: Record<IwacuProjectTopic, AssistantSource[]> = {
    iwacu_project_purpose: [aboutSource, howSource],
    iwacu_project_features: [aboutSource, howSource],
    iwacu_project_difference: [aboutSource, howSource],
    iwacu_project_location: [howSource, dataSource],
    iwacu_project_data: [dataSource],
    iwacu_project_map: [dataSource],
    iwacu_project_leaders: [aboutSource, howSource, projectOwnerSource],
    iwacu_project_emergency: [howSource],
    iwacu_project_privacy: [privacySource],
    iwacu_project_legal: [privacySource, dpoRegistrationSource, dpoFaqSource],
    iwacu_project_security: [privacySource, projectOwnerSource],
    iwacu_project_ai: [howSource, privacySource, projectOwnerSource],
    iwacu_project_accessibility: [howSource, projectOwnerSource],
    iwacu_project_team: [projectOwnerSource],
    iwacu_project_metrics: [projectOwnerSource],
    iwacu_project_pilot: [projectOwnerSource],
    iwacu_project_sustainability: [projectOwnerSource],
    iwacu_project_rdb: [projectOwnerSource, rdbSource],
  };

  const confidenceLabel = language === "en"
    ? "Based on IWACU's published information and owner-confirmed project facts reviewed on 19 November 2026. Unverified items are explicitly identified."
    : language === "fr"
      ? "Fondé sur les informations publiques d'IWACU et les faits du projet confirmés par son propriétaire, examinés le 19 novembre 2026. Les éléments non vérifiés sont signalés."
      : "Bishingiye ku makuru rusange ya IWACU no ku makuru y'umushinga yemejwe na nyirawo, byasuzumwe ku wa 19 Ugushyingo 2026. Ibitaremezwa bigaragazwa uko biri.";

  const suggestions: Record<Language, string[]> = {
    rw: ["IWACU yirinda ite amakuru bwite?", "Amakuru y'abayobozi yemezwa ate?", "Ni iki IWACU isaba RDB?"],
    en: ["How does IWACU protect personal data?", "How are leader records verified?", "What guidance is IWACU seeking from RDB?"],
    fr: ["Comment IWACU protège-t-il les données personnelles ?", "Comment les responsables sont-ils vérifiés ?", "Quel accompagnement IWACU sollicite-t-il auprès du RDB ?"],
  };

  return {
    topic,
    answer: language === "en" ? en[topic] : language === "fr" ? fr[topic] : rw[topic],
    confidenceLabel,
    sources: allSources[topic],
    suggestions: suggestions[language],
  };
}
