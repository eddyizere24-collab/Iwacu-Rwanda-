import { normalizeAssistantQuery } from "./query-normalization";
import type { AssistantSource } from "./contracts";
import {
  RWANDA_HISTORY_SOURCE_REGISTRY,
  type RwandaHistorySource,
} from "./history-sources";

/**
 * Reviewed first-release history corpus for Ishakiro.
 *
 * Phase 2 provides the same fact set in Kinyarwanda, English and French.
 * Historical statements remain deterministic and source-bound: no generative
 * model is allowed to fill missing dates, names, casualty estimates or verdicts.
 */

export const RWANDA_HISTORY_TOPICS = [
  "genocide_overview",
  "genocide_definition",
  "genocide_planning",
  "genocide_background",
  "genocide_beginning",
  "genocide_justice",
  "genocide_survivors",
  "kwibuka",
] as const;

export type RwandaHistoryTopic = (typeof RWANDA_HISTORY_TOPICS)[number];
export type RwandaHistoryLanguage = "rw" | "en" | "fr";

interface TopicEntry {
  title: Record<RwandaHistoryLanguage, string>;
  answer: Record<RwandaHistoryLanguage, string>;
  sourceRefs: readonly { id: string; locator: string }[];
  suggestions: Record<RwandaHistoryLanguage, string[]>;
}

const entries: Record<RwandaHistoryTopic, TopicEntry> = {
  genocide_overview: {
    title: {
      rw: "Jenoside yakorewe Abatutsi mu 1994",
      en: "The 1994 Genocide against the Tutsi",
      fr: "Le génocide perpétré contre les Tutsi en 1994",
    },
    answer: {
      rw: "Jenoside yakorewe Abatutsi mu Rwanda mu 1994 yari igikorwa cyo kurimbura Abatutsi nk'itsinda, cyateguwe kandi gishyirwa mu bikorwa. Guverinoma y'u Rwanda ivuga ko Abanyarwanda barenga miliyoni bishwe mu minsi 100 muri Jenoside yakorewe Abatutsi. Abahutu batari bashyigikiye Jenoside n'abandi bayirwanyaga na bo barishwe; kubibutsa ntibihindura cyangwa ngo bigabanye ukuri ko Abatutsi ari bo bari bagambiriwe kurimburwa. Iyi mateka igomba gusobanurwa hitawe ku mazina y'abagizweho ingaruka, ku bimenyetso no ku masoko yizewe.",
      en: "The 1994 Genocide against the Tutsi in Rwanda was an organised campaign to destroy the Tutsi as a group. The Government of Rwanda states that more than one million Rwandans were killed in 100 days during the Genocide against the Tutsi. Hutu who opposed the genocide and other people who resisted it were also murdered; acknowledging them does not change or diminish the fact that the Tutsi were the group targeted for destruction. This history must be explained with accurate names, evidence and reliable sources.",
      fr: "Le génocide perpétré contre les Tutsi au Rwanda en 1994 fut une entreprise organisée visant à détruire les Tutsi en tant que groupe. Le Gouvernement du Rwanda indique que plus d'un million de Rwandais ont été tués en 100 jours pendant le génocide perpétré contre les Tutsi. Des Hutu qui s'opposaient au génocide et d'autres personnes qui lui résistaient ont également été assassinés ; le rappeler ne change ni ne minimise le fait que les Tutsi étaient le groupe visé par l'extermination. Cette histoire doit être expliquée avec des termes exacts, des preuves et des sources fiables.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, section “Genocide” and commemoration paragraph; accessed 20 November 2026." },
      { id: "minubumwe-cnlg-preparation-execution-2021", locator: "CNLG, title page and Chapter II, section 2.1, printed pp. 1 and 75 onward." },
      { id: "un-rwanda-genocide-backgrounders", locator: "UN Outreach Programme, “Background Information on the Justice and Reconciliation Process in Rwanda”; historical estimate is older and is not used as the current Rwanda figure." },
    ],
    suggestions: {
      rw: ["Jenoside isobanurwa ite mu mategeko?", "Yateguwe ite mbere ya 1994?", "Kwibuka bitangira ryari?"],
      en: ["How is genocide defined in international law?", "How was it prepared before 1994?", "When does Kwibuka begin?"],
      fr: ["Comment le génocide est-il défini en droit international ?", "Comment a-t-il été préparé avant 1994 ?", "Quand commence le Kwibuka ?"],
    },
  },
  genocide_definition: {
    title: {
      rw: "Ibisobanuro by'ijambo Jenoside mu mategeko",
      en: "The legal definition of genocide",
      fr: "La définition juridique du génocide",
    },
    answer: {
      rw: "Amasezerano y'Umuryango w'Abibumbye yo mu 1948 yo gukumira no guhana icyaha cya Jenoside, mu ngingo ya II, asobanura Jenoside nk'ibikorwa bimwe na bimwe bikozwe hagamijwe kurimbura, burundu cyangwa igice, itsinda ry'abenegihugu, itsinda rishingiye ku bwoko, itsinda rishingiye ku ibara ry'uruhu cyangwa itsinda rishingiye ku idini nk'iryo tsinda. Ibyo bikorwa birimo kwica abagize iryo tsinda; kubateza ibikomere bikomeye ku mubiri cyangwa mu mitekerereze; kubashyiraho imibereho igamije kubarimbura; kubuza kubyara; no kwimurira abana ku rindi tsinda ku gahato. Icy'ingenzi mu mategeko ni uguhamya umugambi wihariye wo kurimbura iryo tsinda. Si buri bwicanyi bwose buhita bwitwa Jenoside mu rwego rw'amategeko.",
      en: "Article II of the 1948 UN Genocide Convention defines genocide as specified acts committed with intent to destroy, in whole or in part, a national, ethnic, racial or religious group as such. The listed acts include killing members of the group; causing serious bodily or mental harm; deliberately imposing conditions of life intended to bring about physical destruction; imposing measures intended to prevent births; and forcibly transferring children to another group. The specific intent to destroy the protected group is central to the legal definition. Not every mass killing automatically meets the legal test for genocide.",
      fr: "L'article II de la Convention des Nations Unies de 1948 définit le génocide comme certains actes commis dans l'intention de détruire, en tout ou en partie, un groupe national, ethnique, racial ou religieux en tant que tel. Ces actes comprennent le meurtre de membres du groupe, les atteintes graves à leur intégrité physique ou mentale, l'imposition délibérée de conditions de vie destinées à entraîner sa destruction physique, les mesures visant à entraver les naissances et le transfert forcé d'enfants vers un autre groupe. L'intention spécifique de détruire le groupe protégé est au cœur de la définition juridique. Tout massacre ne répond pas automatiquement à la définition juridique du génocide.",
    },
    sourceRefs: [
      { id: "un-genocide-convention-1948", locator: "Convention on the Prevention and Punishment of the Crime of Genocide, Articles I–III, adopted 9 December 1948." },
      { id: "un-genocide-definition", locator: "UN Office on Genocide Prevention, “Definition” and “Elements of the crime”." },
    ],
    suggestions: {
      rw: ["Kuki Jenoside yakorewe Abatutsi ari yo zina ryemewe?", "Ni uruhe rukiko rwaciye imanza za Jenoside?", "Tugaruke ku mateka mbere ya 1994."],
      en: ["Why is “Genocide against the Tutsi” the correct name?", "Which court tried genocide cases?", "Tell me about the history before 1994."],
      fr: ["Pourquoi employer le nom « génocide contre les Tutsi » ?", "Quel tribunal a jugé les crimes de génocide ?", "Parlez-moi du contexte avant 1994."],
    },
  },
  genocide_background: {
    title: {
      rw: "Amateka n'imiterere y'u Rwanda mbere ya 1994",
      en: "Historical background before 1994",
      fr: "Le contexte historique avant 1994",
    },
    answer: {
      rw: "Raporo ya Komisiyo y'Igihugu yo Kurwanya Jenoside (CNLG) yo mu 2017 isobanura ko mbere y'ubukoloni Abanyarwanda bari bazwi nk'Abanyarwanda, kandi ikavuga ko ubutegetsi bw'abakoloni b'Abadage, nyuma Ababiligi, bwashyize amatsinda y'Abahutu, Abatutsi n'Abatwa mu byiciro by'amoko. Iyo raporo ivuga ko mu 1933 Ababiligi bashyize ubwoko ku ndangamuntu, kandi ko uburyo bwo gutandukanya abantu bwakomeje gukoreshwa no mu butegetsi bwakurikiyeho. Ivuga kandi ku ihohoterwa ryakorewe Abatutsi mu myaka yakurikiye ubwigenge no ku mpunzi zahungiye mu bihugu bituranyi. Ibi ni ibisobanuro by'iyo raporo ishingiye ku nyandiko z'amateka; ntibigomba gufatwa nk'uko amatsinda y'Abanyarwanda yahoze ari amoko adahinduka cyangwa ngo abantu bose bo muri iryo tsinda bagirweho icyaha kimwe.",
      en: "A 2017 report by Rwanda's National Commission for the Fight against Genocide (CNLG) describes how German and later Belgian colonial administrations formalised Hutu, Tutsi and Twa categories. It states that identity cards identifying ethnicity were issued in 1933 and that divisive ethnic ideology continued under post-independence governments. The report also describes violence against Tutsi in the years after independence and the resulting refugee movements to neighbouring countries. These are the report's historical account, based on the works it cites; they must not be used to portray Rwanda's communities as fixed, unchanging groups or to assign collective guilt.",
      fr: "Un rapport de 2017 de la Commission nationale de lutte contre le génocide (CNLG) décrit la manière dont les administrations coloniales allemande puis belge ont institutionnalisé les catégories Hutu, Tutsi et Twa. Il indique que des cartes d'identité mentionnant l'appartenance ethnique ont été délivrées en 1933 et que cette idéologie de division a perduré sous les gouvernements qui ont suivi l'indépendance. Le rapport évoque également les violences contre les Tutsi après l'indépendance et les déplacements de réfugiés vers les pays voisins. Il s'agit du récit historique présenté par ce rapport à partir des travaux qu'il cite ; il ne faut pas en déduire que les communautés rwandaises seraient des groupes immuables ni attribuer une culpabilité collective.",
    },
    sourceRefs: [
      { id: "minubumwe-cnlg-survivor-testimonies-2017", locator: "CNLG, “History and Consequences of the 1994 Genocide against the Tutsi”, printed pp. 33–34; see also the report's methodology and scope at printed pp. 23–25." },
      { id: "un-rwanda-historical-background", locator: "UN Outreach Programme, sections “Prior to the Colonial Era”, “Late 1950s”, “1960s” and “1980s”." },
    ],
    suggestions: {
      rw: ["Ni ibihe bimenyetso byagaragaye mbere ya 1994?", "Jenoside yateguwe ite?", "Amasezerano ya Arusha yari agamije iki?"],
      en: ["What warning signs appeared before 1994?", "How was the genocide prepared?", "What were the Arusha Accords intended to do?"],
      fr: ["Quels signes avant-coureurs sont apparus avant 1994 ?", "Comment le génocide a-t-il été préparé ?", "Quel était l'objectif des accords d'Arusha ?"],
    },
  },
  genocide_planning: {
    title: {
      rw: "Imyiteguro n'ibimenyetso byabanje kugaragara",
      en: "Preparation and warning signs",
      fr: "La préparation et les signes avant-coureurs",
    },
    answer: {
      rw: "Igitabo CNLG cyasohotse muri Mutarama 2021, kivuga ku Rwanda kuva mu 1991 kugeza mu 1994, gishyira hamwe ibice bivuga ku myiteguro yabaye mbere ya Jenoside. Mu byo gisuzuma harimo ibitero n'ubwicanyi byabanje, gukwirakwiza intwaro, imitwe y'interahamwe, poropagande n'itangazamakuru ryashishikarizaga urwango, urutonde rw'abagombaga kwibasirwa, ndetse n'ibimenyetso byagejejwe ku rwego mpuzamahanga. Igitabo kibigaragaza mu bice bikurikirana, ariko iyo tuvuga ikirego ku muntu runaka cyangwa ku gikorwa runaka tugomba kwerekana urupapuro n'inyandiko cyifashishije, tukagitandukanya n'icyemezo cy'urukiko. Kuvuga ko Jenoside yateguwe ntibisobanura ko buri Munyarwanda cyangwa buri muntu wo mu itsinda runaka yabigizemo uruhare.",
      en: "A CNLG publication issued in January 2021, covering Rwanda from 1991 to 1994, brings together evidence and accounts concerning preparations before the genocide. Its chapters discuss earlier attacks and killings, distribution of weapons, militia organisation, propaganda and media incitement, lists of people to be targeted, and warnings communicated to the international community. The book presents these matters chronologically. A claim about a particular person or event must still be tied to the exact page and underlying record, and must be distinguished from a judicial finding. The fact that the genocide was prepared does not mean that every Rwandan or every member of a community participated in it.",
      fr: "Une publication de la CNLG parue en janvier 2021 et consacrée au Rwanda de 1991 à 1994 rassemble des éléments relatifs aux préparatifs du génocide. Ses chapitres abordent les attaques et massacres antérieurs, la distribution d'armes, l'organisation des milices, la propagande et les incitations à la haine dans les médias, les listes de personnes ciblées ainsi que les alertes adressées à la communauté internationale. L'ouvrage présente ces éléments dans un ordre chronologique. Toute affirmation concernant une personne ou un événement précis doit cependant renvoyer à la page exacte et au document sous-jacent, et être distinguée d'une décision judiciaire. Le fait que le génocide ait été préparé ne signifie pas que tous les Rwandais ni tous les membres d'une communauté y aient participé.",
    },
    sourceRefs: [
      { id: "minubumwe-cnlg-preparation-execution-2021", locator: "CNLG, Chapter I, “Planning of the Genocide Perpetrated against the Tutsi before 1994”, printed pp. 33–74; contents also identifies the 1991, 1992 and 1993 sections." },
      { id: "minubumwe-cnlg-preparation-execution-2021", locator: "CNLG, Chapter II, section 2.1, “7 April 1994: Beginning of Genocide across the Country”, printed p. 75 onward." },
      { id: "un-rwanda-historical-background", locator: "UN Outreach Programme, “1990s” and “Genocide — 6 April 1994”." },
    ],
    suggestions: {
      rw: ["Ni gute Jenoside yatangiye muri Mata 1994?", "Radio RTLM yagize uruhe ruhare?", "UNAMIR yari ifite inshingano izihe?"],
      en: ["How did the genocide begin in April 1994?", "What role did RTLM radio play?", "What was UNAMIR's mandate?"],
      fr: ["Comment le génocide a-t-il commencé en avril 1994 ?", "Quel rôle la radio RTLM a-t-elle joué ?", "Quel était le mandat de la MINUAR ?"],
    },
  },
  genocide_beginning: {
    title: {
      rw: "Itariki ya 6 na 7 Mata 1994",
      en: "6 and 7 April 1994",
      fr: "Les 6 et 7 avril 1994",
    },
    answer: {
      rw: "Ku wa 6 Mata 1994, indege yari itwaye Perezida w'u Rwanda Juvénal Habyarimana na Perezida w'u Burundi Cyprien Ntaryamira yakoze impanuka hafi y'ikibuga cy'indege cya Kigali; abari bayirimo bose barapfuye. Inyandiko y'Umuryango w'Abibumbye kuri UNAMIR ivuga ko icyateye iyo mpanuka kitamenyekanye, kuko iperereza ryuzuye ritashobotse. Ntabwo rero Ishakiro rigomba gukeka cyangwa kwemeza uwahanuye indege. Guverinoma y'u Rwanda igaragaza ko ku wa 7 Mata ari bwo Jenoside yakorewe Abatutsi yatangiye kandi ko uwo munsi ari na wo utangiriraho Kwibuka. CNLG isobanura ko ubwicanyi bwakwirakwiriye mu gihugu hose. Indege yakoze impanuka ntigomba kwitiranywa n'umugambi wari warateguwe cyangwa ngo impanuka ubwayo yitirirwe kuba icyemezo cy'urukiko ku wabigizemo uruhare.",
      en: "On 6 April 1994, an aircraft carrying Rwanda's President Juvénal Habyarimana and Burundi's President Cyprien Ntaryamira crashed at Kigali airport; everyone on board was killed. The UN record on UNAMIR says the cause of the crash remained unknown because a full investigation was not possible. Ishakiro must therefore not speculate about or name those responsible for the crash. The Government of Rwanda identifies 7 April as the beginning of the Genocide against the Tutsi and the start of the annual commemoration. CNLG describes the killings as spreading across the country. The aircraft crash must not be confused with the prior preparations for genocide or treated as a judicial finding about who caused it.",
      fr: "Le 6 avril 1994, un avion transportant le président rwandais Juvénal Habyarimana et le président burundais Cyprien Ntaryamira s'est écrasé à l'aéroport de Kigali ; toutes les personnes à bord ont péri. Le document des Nations Unies consacré à la MINUAR indique que la cause du crash est restée inconnue, faute d'enquête complète. Ishakiro ne doit donc pas spéculer sur l'identité des responsables. Le Gouvernement du Rwanda indique que le génocide perpétré contre les Tutsi a commencé le 7 avril, date qui marque également le début de la commémoration annuelle. La CNLG décrit l'extension des massacres à travers le pays. Le crash ne doit pas être confondu avec les préparatifs antérieurs du génocide ni présenté comme une décision judiciaire établissant qui l'a provoqué.",
    },
    sourceRefs: [
      { id: "un-unamir-mandate-and-crash", locator: "UN Department of Peacekeeping Operations, UNAMIR background, section “April 1994–June 1994: Mass murder and civil war”." },
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “Genocide” and Kwibuka commemoration paragraph; 7 April and 4 July dates." },
      { id: "minubumwe-cnlg-preparation-execution-2021", locator: "CNLG, Chapter II, section 2.1, printed p. 75 onward." },
    ],
    suggestions: {
      rw: ["Jenoside yakomeje ite mu gihugu hose?", "Ni iki cyabaye ku wa 4 Nyakanga 1994?", "Kwibuka bifite iyihe ntego?"],
      en: ["How did the genocide spread across the country?", "What happened on 4 July 1994?", "What is the purpose of Kwibuka?"],
      fr: ["Comment le génocide s'est-il étendu dans le pays ?", "Que s'est-il passé le 4 juillet 1994 ?", "Quel est le sens du Kwibuka ?"],
    },
  },
  genocide_justice: {
    title: {
      rw: "Ubutabera nyuma ya Jenoside",
      en: "Justice after the genocide",
      fr: "La justice après le génocide",
    },
    answer: {
      rw: "Nyuma ya Jenoside, ubutabera bwakoresheje inzira zitandukanye. Raporo ya CNLG yo mu 2017 isobanura ko Inkiko Gacaca zashyizweho n'Itegeko Ngenga No 40/2000 ryo ku wa 26 Mutarama 2001, kugira ngo zifashe kumenya ukuri no kuburanisha umubare munini w'abakekwagaho ibyaha bya Jenoside. Ku rwego mpuzamahanga, Urukiko Mpuzamahanga Mpanabyaha rwashyiriweho u Rwanda (ICTR) rwarebye ibyaha bikomeye byakozwe mu 1994; rwashinjaga abantu 93 nk'uko imibare yarwo yavuguruwe mu Ukwakira 2019 ibigaragaza. Ku wa 2 Nzeri 1998, ICTR yahamije Jean-Paul Akayesu icyaha cya Jenoside, mu rubanza rwabaye urwa mbere rw'urukiko mpuzamahanga rwahamije umuntu icyo cyaha. Ibyaha n'ibyemezo by'urukiko bigomba gusobanurwa buri rubanza ukwaryo; gushinjwa ntibivuga ko umuntu yahamijwe icyaha.",
      en: "After the genocide, justice was pursued through several mechanisms. A 2017 CNLG report says the modern Gacaca courts were established under Organic Law No. 40/2000 of 26 January 2001 to help establish the truth and try the large number of people accused of genocide-related crimes. At the international level, the International Criminal Tribunal for Rwanda (ICTR) dealt with serious crimes committed in 1994; its figures, last updated in October 2019, record 93 individuals indicted. On 2 September 1998, the ICTR found Jean-Paul Akayesu guilty of genocide in the first judgment by an international court to convict a person of that crime. Judicial charges and findings must be explained case by case: an indictment is not a conviction.",
      fr: "Après le génocide, la justice a emprunté plusieurs voies. Un rapport de la CNLG publié en 2017 indique que les juridictions Gacaca modernes ont été établies par la loi organique n° 40/2000 du 26 janvier 2001 afin de contribuer à établir la vérité et à juger le grand nombre de personnes accusées de crimes liés au génocide. Au niveau international, le Tribunal pénal international pour le Rwanda (TPIR) a traité les crimes graves commis en 1994 ; ses statistiques, mises à jour en octobre 2019, font état de 93 personnes mises en accusation. Le 2 septembre 1998, le TPIR a reconnu Jean-Paul Akayesu coupable de génocide, dans le premier jugement d'une juridiction internationale condamnant une personne pour ce crime. Les accusations et les décisions judiciaires doivent être expliquées affaire par affaire : une mise en accusation n'est pas une condamnation.",
    },
    sourceRefs: [
      { id: "minubumwe-cnlg-survivor-testimonies-2017", locator: "CNLG, “Gacaca Courts in Post-Genocide Rwanda”, printed pp. 35–36." },
      { id: "un-rwanda-genocide-backgrounders", locator: "UN Outreach Programme, “Background Information on the Justice and Reconciliation Process in Rwanda”; includes the ICTR mandate and closure date." },
      { id: "ictr-key-figures-2019", locator: "ICTR Key Figures page; last update October 2019; 93 individuals indicted." },
      { id: "ictr-akayesu-first-genocide-judgment", locator: "ICTR press release dated 2 September 1998 on the Trial Chamber I judgment in Prosecutor v. Jean-Paul Akayesu." },
    ],
    suggestions: {
      rw: ["Inkiko Gacaca zakoraga zite?", "Urukiko ICTR rwari rushinzwe iki?", "Ni izihe ngaruka Jenoside yagize ku bacitse ku icumu?"],
      en: ["How did the Gacaca courts work?", "What was the ICTR responsible for?", "What effects did the genocide have on survivors?"],
      fr: ["Comment fonctionnaient les juridictions Gacaca ?", "Quel était le rôle du TPIR ?", "Quelles ont été les conséquences pour les rescapés ?"],
    },
  },
  genocide_survivors: {
    title: {
      rw: "Abacitse ku icumu n'ingaruka za Jenoside",
      en: "Survivors and the consequences of the genocide",
      fr: "Les rescapés et les conséquences du génocide",
    },
    answer: {
      rw: "Raporo ya CNLG yo muri Gicurasi 2017 yibanze ku buhamya n'ibikenewe by'abacitse ku icumu, inagaragaza ingaruka z'imibereho, ubukungu n'imitekerereze zakomeje kugaragara nyuma ya Jenoside. Ubushakashatsi bwakoze ibiganiro n'abantu 254 bo mu mirenge ine, kandi raporo ubwayo isobanura ko ibyo abo babajijwe bavuze bidahagarariye ibitekerezo cyangwa ubuzima bw'abacitse ku icumu bose. Ishakiro rigomba kubaha ubuhamya, kutabukoresha mu buryo bwo kubabaza cyangwa gushaka kwerekana amashusho ateye ubwoba, no kutagaragaza amakuru y'umuntu ku giti cye atari ngombwa. Iyo umuntu ashaka ubuhamya burambuye, agomba kwerekezwa ku nyandiko y'umwimerere n'aho buherereye.",
      en: "A CNLG report published in May 2017 focuses on survivor testimonies and needs. It describes continuing social, economic and psychological consequences after the genocide. The study interviewed 254 people from four sectors, and the report itself cautions that the views of those interviewed are not necessarily shared by all survivors. Ishakiro must treat testimony with dignity, avoid using it to distress visitors or to sensationalise suffering, and must not expose unnecessary personal information. Visitors seeking detailed testimony should be directed to the original report and its precise section.",
      fr: "Un rapport de la CNLG publié en mai 2017 porte sur les témoignages et les besoins des rescapés. Il décrit les conséquences sociales, économiques et psychologiques qui ont perduré après le génocide. L'étude a interrogé 254 personnes dans quatre secteurs, et le rapport précise lui-même que les opinions des personnes interrogées ne sont pas nécessairement partagées par tous les rescapés. Ishakiro doit traiter les témoignages avec dignité, éviter de troubler les visiteurs ou de dramatiser la souffrance, et ne pas divulguer de renseignements personnels non nécessaires. Les personnes qui souhaitent consulter des témoignages détaillés doivent être orientées vers le rapport original et sa section précise.",
    },
    sourceRefs: [
      { id: "minubumwe-cnlg-survivor-testimonies-2017", locator: "CNLG, Executive Summary and sample limitations, printed pp. 3–5; Introduction, printed p. 13; methodology and participants, printed pp. 23–25." },
      { id: "minubumwe-cnlg-survivor-testimonies-2017", locator: "CNLG, ethical considerations for interviews and confidentiality, printed p. 32." },
    ],
    suggestions: {
      rw: ["Ni iki cyavuzwe ku ngaruka zo mu mitekerereze?", "Kwibuka bikorwa bite?", "Ni gute umuntu yareba ubuhamya bw'umwimerere?"],
      en: ["What does the report say about psychological consequences?", "How is Kwibuka observed?", "Where can I read the original testimonies?"],
      fr: ["Que dit le rapport des conséquences psychologiques ?", "Comment se déroule le Kwibuka ?", "Où lire les témoignages originaux ?"],
    },
  },
  kwibuka: {
    title: {
      rw: "Kwibuka Jenoside yakorewe Abatutsi",
      en: "Kwibuka: remembering the Genocide against the Tutsi",
      fr: "Kwibuka : commémorer le génocide contre les Tutsi",
    },
    answer: {
      rw: "Kwibuka ni igihe cyo kwibuka Abatutsi bishwe muri Jenoside, guha agaciro abacitse ku icumu, kubungabunga ibimenyetso by'amateka no kwigisha ibisekuruza bizaza. Guverinoma y'u Rwanda igaragaza ko ibikorwa byo kwibuka bitangira ku wa 7 Mata bikagera ku wa 4 Nyakanga, umunsi Jenoside yahagaritswe n'igihugu kikabohorwa. Umuryango w'Abibumbye na wo wizihiza umunsi mpuzamahanga wo kuzirikana Jenoside yakorewe Abatutsi ku wa 7 Mata. Kwibuka si umunsi umwe gusa; ni inshingano yo kurinda ukuri kw'amateka no kurwanya ingengabitekerezo ya Jenoside.",
      en: "Kwibuka is a period of remembrance for the Tutsi murdered in the genocide, recognition of survivors, preservation of historical evidence and education of future generations. The Government of Rwanda states that commemoration activities begin on 7 April and continue until 4 July, the date on which the genocide was stopped and the country was liberated. The United Nations also observes 7 April as the International Day of Reflection on the 1994 Genocide against the Tutsi. Kwibuka is not only a date on the calendar; it is a continuing responsibility to protect historical truth and oppose genocide ideology.",
      fr: "Kwibuka est une période de commémoration des Tutsi assassinés pendant le génocide, de reconnaissance des rescapés, de préservation des preuves historiques et d'éducation des générations futures. Le Gouvernement du Rwanda indique que les activités de commémoration commencent le 7 avril et se poursuivent jusqu'au 4 juillet, date à laquelle le génocide a été arrêté et le pays libéré. Les Nations Unies observent également le 7 avril comme Journée internationale de réflexion sur le génocide perpétré contre les Tutsi en 1994. Kwibuka n'est pas seulement une date du calendrier ; c'est une responsabilité permanente de protéger la vérité historique et de combattre l'idéologie du génocide.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, paragraph beginning “Rwandans commemorate the 1994 Genocide Against the Tutsi on April 7”." },
      { id: "un-2024-kwibuka-30", locator: "United Nations, 30th anniversary commemoration notice dated 1 April 2024." },
      { id: "un-rwanda-genocide-programme", locator: "UN Outreach Programme, Rwanda genocide home page; 7 April as the International Day of Reflection." },
    ],
    suggestions: {
      rw: ["Kuki Kwibuka bitangira ku wa 7 Mata?", "Ni iki kibera ku wa 4 Nyakanga?", "Ni izihe nzibutso ziri mu Rwanda?"],
      en: ["Why does Kwibuka begin on 7 April?", "What is commemorated on 4 July?", "What genocide memorials are there in Rwanda?"],
      fr: ["Pourquoi Kwibuka commence-t-il le 7 avril ?", "Que commémore-t-on le 4 juillet ?", "Quels mémoriaux du génocide existe-t-il au Rwanda ?"],
    },
  },
};

const sourceById = new Map<string, RwandaHistorySource>(
  RWANDA_HISTORY_SOURCE_REGISTRY.map((source): [string, RwandaHistorySource] => [source.id, source]),
);

function normalize(value: string): string {
  return normalizeAssistantQuery(value);
}

function detectLanguage(query: string): RwandaHistoryLanguage {
  const value = normalize(query);
  if (/^(?:que\b|qu'est|c'est quoi\b|comment\b|quand\b|quelle\b|quels?\b|parlez?\b|raconte[sz]?\b|explique[sz]?\b)|\b(pourquoi|histoire du|histoire de|les rescap|le genocide|commemoration|temoignage|justice|tribunal|accords?)\b/.test(value)) return "fr";
  if (/^(?:what|when|where|why|how|who|tell me|can you tell me|explain)\b|\b(genocide against|survivors|justice|court|commemoration|history|definition|before 1994)\b/.test(value)) return "en";
  return "rw";
}

const TOPIC_PATTERNS: Record<RwandaHistoryTopic, RegExp> = {
  genocide_definition: /\b(legal definition|definition of genocide|what is genocide|meaning of genocide|genocide definition|genocide convention|article ii|ibisobanuro.*jenoside|jenoside.*isobanurwa|ijambo jenoside|jenoside mu mategeko|amasezerano.*jenoside|definition juridique|definition du genocide|que signifie le genocide|convention.*genocide)\b/,
  genocide_background: /\b(before 1994|before the genocide|historical background|history|historical|histoire|historique|amateka|ubukoloni|colonial|colonisation|identity cards|indangamuntu|mbere ya 1994|mbere ya jenoside|contexte historique|avant 1994|avant le genocide|colonialisme|cartes d'identite)\b/,
  genocide_planning: /\b(planning|preparation|prepared|planned|warning signs|propaganda|rtlm|interahamwe|weapons|intwaro|byateguwe|yateguwe|imyiteguro|ibimenyetso.*mbere|urwango|itangazamakuru|kwamamaza urwango|planification|preparation du genocide|signes avant coureurs|propagande|milices)\b/,
  genocide_beginning: /\b(6 april|7 april|6 et 7 avril|april 1994|started|beginning|start of the genocide|when did|when was|byatangiye|yatangiye|yabaye.*ryari|ryari|itangiriro|ku wa 6 mata|ku wa 7 mata|6 na 7 mata|ku wa 6 na 7 mata|mata 1994|impanuka y'indege|indege.*habyarimana|plane crash|crash.*avion|debut du genocide|a commence|quand a commence|6 avril|7 avril|avril 1994)\b/,
  genocide_justice: /\b(gacaca|ictr|tpir|international criminal tribunal|tribunal penal international|justice after|post genocide justice|urukiko mpuzamahanga|inkiko gacaca|imanza za jenoside|akayesu|ubutabera nyuma|justice apres|juridictions gacaca)\b/,
  genocide_survivors: /\b(survivors?|survivor testimony|testimonies|needs of survivors|effects on survivors|abacitse ku icumu|bacitse ku icumu|umucitse ku icumu|ubuhamya|ingaruka.*bacitse|ingaruka.*jenoside|rescap(es|e)|temoignages?|besoins des rescapes|consequences pour les rescapes)\b/,
  kwibuka: /\b(kwibuka|commemoration|commemorate|remembering|memorial|memorials|inzibutso|urwibutso|journee internationale de reflexion|journee de commemoration)\b/,
  genocide_overview: /\b(genocide|jenoside|jenoside yakorewe abatutsi|genocide against the tutsi|genocide against tutsi|genocide perpetrated against tutsi|genocide des tutsi|genocide perp(i|e)tre contre les tutsi|abatutsi mu 1994|abatutsi muri 1994)\b/,
};

const HISTORY_DOMAIN_ANCHOR = /\b(genocide|jenoside|abatutsi|tutsi|kwibuka|gacaca|ictr|tpir|akayesu|interahamwe|rtlm|abacitse ku icumu|survivor|rescap|6 april|7 april|6 avril|7 avril|6 mata|7 mata|mata 1994|avril 1994)\b/;

const HISTORY_FOLLOW_UP = /^(?:mbwira byinshi|sobanura|nsobanurira|komeza|komeza umbwire|bivuze iki|ni iki kindi|ibindi|byagenze bite|byagenze gute|yateguwe ite|yateguwe gute|yatangiye ryari|byatangiye ryari|mbwira uko byagenze|kuki|kubera iki|tell me more|explain more|continue|go on|what happened next|what happened|how did it start|how was it prepared|when did it start|why|how so|more details|more about this|tell me more about this|explique davantage|continuez|et ensuite|pourquoi|qu'est ce qui s'est passe ensuite|comment cela s'est passe|plus de details)$/;

export function isRwandaHistoryTopic(value: unknown): value is RwandaHistoryTopic {
  return typeof value === "string" && (RWANDA_HISTORY_TOPICS as readonly string[]).includes(value);
}

export function resolveRwandaHistoryTopic(
  query: string,
  previousTopic?: string | null,
): RwandaHistoryTopic | null {
  const value = normalize(query);
  if (!value) return null;

  const hasHistoryAnchor = HISTORY_DOMAIN_ANCHOR.test(value);

  // Specific topic routes win over the general overview. Historical topic cues
  // are only considered when the visitor has supplied a Rwanda-history anchor,
  // so unrelated uses of words such as "history", "preparation" or "justice"
  // are not pulled into the genocide answers.
  if (hasHistoryAnchor) {
    for (const topic of [
      "kwibuka",
      "genocide_definition",
      "genocide_planning",
      "genocide_background",
      "genocide_beginning",
      "genocide_justice",
      "genocide_survivors",
    ] as const) {
      if (TOPIC_PATTERNS[topic].test(value)) return topic;
    }

    if (TOPIC_PATTERNS.genocide_overview.test(value)) return "genocide_overview";
  }

  if (isRwandaHistoryTopic(previousTopic) && HISTORY_FOLLOW_UP.test(value)) {
    return previousTopic;
  }

  return null;
}

function toAssistantSources(entry: TopicEntry): AssistantSource[] {
  const seen = new Set<string>();
  return entry.sourceRefs.flatMap(({ id, locator }) => {
    const key = id + "::" + locator;
    if (seen.has(key)) return [];
    seen.add(key);
    const source = sourceById.get(id);
    if (!source) return [];
    const trustTier: AssistantSource["trust_tier"] =
      source.role === "rwanda_government_primary" || source.role === "rwanda_institutional_research"
        ? "official_government"
        : source.role === "international_judicial_record" || source.role === "un_intergovernmental_record"
          ? "intergovernmental_academic"
          : "other";
    return [{
      label: source.title,
      data_date: source.publishedDate,
      url: source.url,
      snippet: locator,
      trust_tier: trustTier,
    }];
  });
}

export interface RwandaHistoryReply {
  topic: RwandaHistoryTopic;
  title: string;
  answer: string;
  confidenceLabel: string;
  sources: AssistantSource[];
  suggestions: string[];
}

export function getRwandaHistoryReply(
  topic: RwandaHistoryTopic,
  query: string,
): RwandaHistoryReply {
  const entry = entries[topic];
  const language = detectLanguage(query);
  const confidenceLabel = language === "en"
    ? "Reviewed IWACU explanation based on the cited Government of Rwanda, CNLG, United Nations and/or judicial records. Source language and page references are shown; this is not legal advice."
    : language === "fr"
      ? "Explication révisée par IWACU à partir des sources gouvernementales, de la CNLG, des Nations Unies et/ou des archives judiciaires citées. La langue originale et les références sont indiquées ; ceci ne constitue pas un avis juridique."
      : "Ibisobanuro byasuzumwe na IWACU bishingiye ku masoko ya Guverinoma y'u Rwanda, CNLG, Umuryango w'Abibumbye na/cyangwa inyandiko z'inkiko zagaragajwe. Ururimi rw'inkomoko n'aho amakuru yakuwe biragaragazwa; si inama mu by'amategeko.";
  return {
    topic,
    title: entry.title[language],
    answer: entry.answer[language],
    confidenceLabel,
    sources: toAssistantSources(entry),
    suggestions: entry.suggestions[language],
  };
}
