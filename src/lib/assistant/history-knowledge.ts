import { normalizeAssistantQuery } from "./query-normalization";
import type { AssistantSource } from "./contracts";
import {
  RWANDA_HISTORY_SOURCE_REGISTRY,
  type RwandaHistorySource,
} from "./history-sources";

/**
 * Reviewed first-release history corpus for Ishakiro.
 *
 * History iteration 2 provides the same fact set in Kinyarwanda, English and French.
 * Historical statements remain deterministic and source-bound: no generative
 * model is allowed to fill missing dates, names, casualty estimates or verdicts.
 */

export const RWANDA_HISTORY_TOPICS = [
  "genocide_overview",
  "genocide_definition",
  "genocide_planning",
  "genocide_background",
  "rwanda_official_history",
  "genocide_arusha",
  "genocide_beginning",
  "genocide_end",
  "genocide_spread",
  "genocide_justice",
  "genocide_survivors",
  "genocide_memorials",
  "genocide_archive",
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
      rw: "Nk'uko Guverinoma y'u Rwanda ibitangaza ku rubuga rwayo, Jenoside yakorewe Abatutsi mu 1994 yateguwe ikanashyirwa mu bikorwa na regime ya jenoside. Guverinoma ivuga ko Abanyarwanda barenga miliyoni bishwe mu minsi 100. Ivuga ko iyo regime yatoje imitwe y'Interahamwe n'Abahutu b'intagondwa kwica Abatutsi n'Abahutu barwanyaga ubwicanyi, ikoresheje imihoro, udukoni, amacumu n'ibindi bikoresho gakondo, ishyigikiwe byuzuye n'inzego z'umutekano za Leta. Guverinoma inavuga ko bamwe mu bagizweho ingaruka batawe mu maboko y'abicanyi n'ingabo z'Umuryango w'Abibumbye zari mu butumwa bw'amahoro, ikabifata nk'ikimenyetso cyo kunanirwa kw'umuryango mpuzamahanga. Ibi ni ibisobanuro by'inyandiko ya Guverinoma; ibirego ku muntu cyangwa ku gikorwa runaka bigomba kugira inyandiko yabyo ibihamya.",
      en: "According to the Government of Rwanda's published account, the 1994 Genocide against the Tutsi was prepared and implemented by a genocidal regime. The Government states that more than one million Rwandans were killed in 100 days. It says the regime trained Interahamwe militia and extremist Hutu to kill Tutsi and Hutu who opposed the killings, using machetes, clubs, spears and other traditional weapons, with the full support of government security forces. The Government also states that some victims were left in the hands of killers by United Nations peacekeeping forces, which it describes as a failure of the international community. This is the Government's account as published on its website; claims about a named person or a particular incident require their own supporting record.",
      fr: "Selon le récit publié par le Gouvernement du Rwanda, le génocide perpétré contre les Tutsi en 1994 a été préparé et mis en œuvre par un régime génocidaire. Le Gouvernement indique que plus d'un million de Rwandais ont été tués en 100 jours. Il affirme que ce régime a entraîné des milices Interahamwe et des Hutu extrémistes pour tuer les Tutsi ainsi que les Hutu qui s'opposaient aux massacres, au moyen de machettes, de gourdins, de lances et d'autres armes traditionnelles, avec le plein soutien des forces de sécurité de l'État. Le Gouvernement indique également que des victimes ont été abandonnées aux mains des tueurs par les forces de maintien de la paix des Nations Unies, ce qu'il présente comme un échec de la communauté internationale. Il s'agit du récit publié par le Gouvernement ; toute accusation visant une personne ou un incident précis doit être étayée par son propre dossier.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “About” page, “Genocide” section: official naming, preparation and implementation by the genocidal regime, Interahamwe, extremist Hutu, security forces, more than one million victims and the 100-day period." },
      { id: "minubumwe-cnlg-preparation-execution-2021", locator: "CNLG, title page and Chapter II, section 2.1, printed pp. 1 and 75 onward; local institutional detail supporting the national overview." },
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
      rw: "Nk'uko Guverinoma y'u Rwanda ibivuga, mu binyejana byinshi u Rwanda rwari ubwami bukomatanyije, buyoborwa n'abami bakurikirana bo mu muryango umwe. Imiyoborere yanyuraga ku batware b'inka, ab'ubutaka n'ab'ingabo; urubuga rwa Guverinoma ruvuga ko Abahutu, Abatutsi n'Abatwa babanaga mu mibanire yuzuzanya. Mu 1899 u Rwanda rwabaye ubukoloni bw'u Budage; mu 1919 ubutegetsi bw'Ababiligi bwarakomeje, u Rwanda rugirwa agace ka manda k'Umuryango w'Ibihugu. Guverinoma ivuga ko kuva mu 1959 Abatutsi bagabweho ibitero, hapfa abantu ibihumbi kandi benshi bajya mu buhungiro. Ivuga kandi ko Repubulika ya mbere iyobowe na Perezida Gregoire Kayibanda n'iya kabiri iyobowe na Perezida Juvenal Habyarimana byashyize ivangura rikorerwa Abatutsi mu nzego. Ibi ni uko Guverinoma y'u Rwanda ibivuga mu ncamake yayo y'amateka; amakuru arambuye ku gikorwa cyangwa ku muntu runaka agomba kugenzurwa mu nyandiko yihariye.",
      en: "According to the Government of Rwanda, the country existed for centuries as a centralised monarchy under successive kings from one clan, with administration through cattle chiefs, land chiefs and military chiefs. The Government's page says that Hutu, Tutsi and Twa lived in a symbiotic relationship. Rwanda became a German colony in 1899; in 1919 Belgian administration continued under a League of Nations mandate. The Government states that from 1959 Tutsi were targeted, thousands died and many were sent into exile. It also says the First Republic under President Gregoire Kayibanda and the Second Republic under President Juvenal Habyarimana institutionalised discrimination against Batutsi. This is the Government's published historical summary; a claim about a particular event or person requires a specific supporting record.",
      fr: "Selon le Gouvernement du Rwanda, le pays a existé pendant des siècles comme une monarchie centralisée, dirigée par une succession de rois issus d'un même clan, avec une administration assurée par des chefs du bétail, des terres et de l'armée. La page du Gouvernement indique que les Hutu, les Tutsi et les Twa vivaient dans une relation de complémentarité. Le Rwanda est devenu une colonie allemande en 1899 ; en 1919, l'administration belge s'est poursuivie sous mandat de la Société des Nations. Le Gouvernement indique qu'à partir de 1959, les Tutsi ont été ciblés, que des milliers de personnes ont été tuées et que beaucoup ont été envoyées en exil. Il indique également que la Première République de Grégoire Kayibanda et la Deuxième République de Juvénal Habyarimana ont institutionnalisé la discrimination contre les Batutsi. Il s'agit du résumé historique publié par le Gouvernement ; toute affirmation sur un événement ou une personne précise exige un document justificatif spécifique.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “About” page, “History” section: centralized monarchy, colonial period, targeting of Tutsi from 1959 and discrimination under the First and Second Republics." },
      { id: "minubumwe-cnlg-survivor-testimonies-2017", locator: "CNLG, “History and Consequences of the 1994 Genocide against the Tutsi”, printed pp. 33–34; supplementary Rwandan institutional research." },
    ],
    suggestions: {
      rw: ["Ni ibihe bimenyetso byagaragaye mbere ya 1994?", "Jenoside yateguwe ite?", "Amasezerano ya Arusha yari agamije iki?"],
      en: ["What warning signs appeared before 1994?", "How was the genocide prepared?", "What were the Arusha Accords intended to do?"],
      fr: ["Quels signes avant-coureurs sont apparus avant 1994 ?", "Comment le génocide a-t-il été préparé ?", "Quel était l'objectif des accords d'Arusha ?"],
    },
  },
  rwanda_official_history: {
    title: {
      rw: "Amateka y'u Rwanda nk'uko Guverinoma y'u Rwanda iyatangaza",
      en: "History of Rwanda as presented by the Government of Rwanda",
      fr: "Histoire du Rwanda selon la présentation du Gouvernement du Rwanda",
    },
    answer: {
      rw: "Nk'uko Guverinoma y'u Rwanda ibivuga ku rubuga rwayo, RANU yashinzwe mu 1979 n'impunzi z'Abanyarwanda zari hanze y'igihugu, igamije kurwanya politiki z'amacakubiri, ingengabitekerezo ya Jenoside, ubwicanyi bwagiye bwisubiramo, ubwenegihugu budafite aho bushingiye n'ibura ry'uburyo bwo gukemura ibibazo mu mahoro. Mu 1987, RANU yahindutse RPF-Inkotanyi. Ku wa 1 Ukwakira 1990, RPF yatangije urugamba rwo kubohora igihugu; nk'uko Guverinoma ibivuga, rwaje kurangiza ubutegetsi bwa jenoside mu 1994 no guhagarika Jenoside yakorewe Abatutsi. Nyuma y'uko Kigali ifashwe n'ingabo za RPA, ishami rya gisirikare rya RPF, ku wa 4 Nyakanga 1994, RPF yashyizeho Guverinoma y'Ubumwe bw'Abanyarwanda iyobowe na Perezida Pasteur Bizimungu, ihuza amashyaka atagize uruhare muri Jenoside. Mu 2000, Inteko Ishinga Amategeko yatoye ikuraho Perezida Pasteur Bizimungu, maze RPF ishyiraho icyo gihe Visi-Perezida akaba na Minisitiri w'Ingabo, Majoro Jenerali Paul Kagame, kuba Perezida wa Repubulika no kuyobora Guverinoma ihuriweho. Guverinoma ivuga ko Paul Kagame yatowe mu 2003, yongera gutorwa mu 2010 no mu 2017. Ibi ni ibyatangajwe n'Urubuga rwa Guverinoma; ni ngombwa kubitandukanya n'ibisobanuro birambuye ku gikorwa cya gisirikare, ku muntu runaka cyangwa ku cyemezo cy'urukiko bitasobanuwe kuri uru rubuga.",
      en: "According to the Government of Rwanda's published history, the Rwandese Alliance for National Unity (RANU) was formed in 1979 by Rwandan refugees in exile to mobilise against divisive politics, genocide ideology, repeated massacres, statelessness and the lack of peaceful political exchange. In 1987, RANU became the Rwandese Patriotic Front (RPF-Inkotanyi). On 1 October 1990, the RPF launched an armed liberation struggle which, according to the Government, ultimately removed the genocidal regime in 1994 and ended the Genocide against the Tutsi. After Kigali fell to the Rwanda Patriotic Army (RPA), the RPF's armed wing, on 4 July 1994, the RPF formed a Government of National Unity headed by President Pasteur Bizimungu, bringing together parties that had not participated in the genocide. In 2000, Parliament voted President Pasteur Bizimungu out of office, and the RPF appointed the then Vice-President and Minister of Defence, Major General Paul Kagame, as President of the Republic to lead the coalition government. The Government states that Paul Kagame was elected in 2003 and re-elected in 2010 and 2017. This is the history as published by the Government; it should be distinguished from detailed accounts of particular military operations, individuals or judicial decisions not described on that page.",
      fr: "Selon l'histoire publiée par le Gouvernement du Rwanda, l'Alliance rwandaise pour l'unité nationale (RANU) a été créée en 1979 par des réfugiés rwandais en exil afin de mobiliser contre les politiques de division, l'idéologie du génocide, les massacres répétés, l'apatridie et l'absence de mécanismes pacifiques de règlement politique. En 1987, la RANU est devenue le Front patriotique rwandais (FPR-Inkotanyi). Le 1er octobre 1990, le FPR a lancé une lutte armée de libération qui, selon le Gouvernement, a finalement renversé le régime génocidaire en 1994 et mis fin au génocide perpétré contre les Tutsi. Après la prise de Kigali par l'Armée patriotique rwandaise (APR), branche armée du FPR, le 4 juillet 1994, le FPR a formé un Gouvernement d'unité nationale dirigé par le président Pasteur Bizimungu, réunissant les partis qui n'avaient pas participé au génocide. En 2000, le Parlement a voté le départ du président Pasteur Bizimungu, et le FPR a nommé le vice-président et ministre de la Défense de l'époque, le major-général Paul Kagame, président de la République afin de diriger le gouvernement de coalition. Le Gouvernement indique que Paul Kagame a été élu en 2003 puis réélu en 2010 et en 2017. Il s'agit de l'histoire telle qu'elle est publiée par le Gouvernement ; elle doit être distinguée des récits détaillés d'opérations militaires, de personnes ou de décisions judiciaires particulières qui ne sont pas exposés sur cette page.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “About” page, “History” section: RANU (1979), RPF-Inkotanyi (1987), liberation struggle (1 October 1990), RPA and Government of National Unity (4 July 1994), and presidency chronology (2000, 2003, 2010 and 2017)." },
    ],
    suggestions: {
      rw: ["Amateka y'u Rwanda mbere ya 1959 ni ayahe?", "Jenoside yakorewe Abatutsi ni iki?", "Kwibuka bitangira ryari?"],
      en: ["What is the history of Rwanda before 1959?", "What was the Genocide against the Tutsi?", "When does Kwibuka begin?"],
      fr: ["Quelle est l'histoire du Rwanda avant 1959 ?", "Qu'est-ce que le génocide contre les Tutsi ?", "Quand commence le Kwibuka ?"],
    },
  },
  genocide_arusha: {
    title: {
      rw: "Amasezerano ya Arusha na UNAMIR",
      en: "The Arusha Peace Agreement and UNAMIR",
      fr: "Les accords de paix d'Arusha et la MINUAR",
    },
    answer: {
      rw: "Ku wa 4 Kanama 1993, Guverinoma ya Repubulika y'u Rwanda n'Inkotanyi (RPF) byashyize umukono ku Masezerano y'Amahoro ya Arusha. Inyandiko yayo igaragaza ko yari igamije kurangiza intambara binyuze mu mishyikirano, kandi ikubiyemo amasezerano yerekeye agahenge, amategeko, gusangira ubutegetsi mu nzego z'inzibacyuho, gutaha kw'impunzi no guhuza ingabo. UNAMIR yashinzwe n'Inama y'Umutekano ya Loni ku wa 5 Ukwakira 1993 kugira ngo ifashe gushyira mu bikorwa ayo masezerano. Inshingano zayo za mbere zari zirimo umutekano wa Kigali, kugenzura agahenge n'ibikorwa by'inzibacyuho, mine clearance no guhuza ibikorwa by'ubutabazi. Nyuma y'uko imirwano yongeye gukaza muri Mata 1994, Inama y'Umutekano yahinduye inshingano za UNAMIR mu myanzuro ya 912 na 918. Ni ngombwa gutandukanya inshingano zayo za mbere n'izahinduwe nyuma; Amasezerano ya Arusha ntakwiye gufatwa nk'icyemezo cy'urukiko ku byaha bya Jenoside.",
      en: "The Government of the Republic of Rwanda and the Rwandese Patriotic Front signed the Arusha Peace Agreement on 4 August 1993. Its text records a negotiated effort to end the war and incorporates agreements on the ceasefire, the rule of law, power-sharing in transitional institutions, refugee return and the integration of armed forces. The UN Security Council established UNAMIR on 5 October 1993 to help implement the Agreement. Its initial tasks included security in Kigali, monitoring the ceasefire and the transition, mine clearance and coordination of humanitarian assistance. After fighting intensified again in April 1994, the Security Council adjusted UNAMIR's mandate through resolutions 912 and 918. The original peacekeeping tasks must be distinguished from the later changes; the Arusha Agreement is not a court judgment about genocide crimes.",
      fr: "Le Gouvernement de la République du Rwanda et le Front patriotique rwandais ont signé l'Accord de paix d'Arusha le 4 août 1993. Son texte présente une démarche négociée visant à mettre fin à la guerre et intègre des protocoles portant notamment sur le cessez-le-feu, l'État de droit, le partage du pouvoir au sein des institutions de transition, le retour des réfugiés et l'intégration des forces armées. Le Conseil de sécurité de l'ONU a créé la MINUAR le 5 octobre 1993 afin de contribuer à la mise en œuvre de l'Accord. Ses tâches initiales comprenaient la sécurité à Kigali, le suivi du cessez-le-feu et de la transition, le déminage et la coordination de l'aide humanitaire. Après la reprise des combats en avril 1994, le Conseil de sécurité a adapté le mandat de la MINUAR par les résolutions 912 et 918. Il faut distinguer le mandat initial des modifications ultérieures ; l'Accord d'Arusha n'est pas un jugement judiciaire sur les crimes de génocide.",
    },
    sourceRefs: [
      { id: "un-peacemaker-arusha-1993", locator: "Signed Peace Agreement, Articles 1–5 and 7–11, and the protocols incorporated into the Agreement; signed 4 August 1993." },
      { id: "un-unamir-mandate-history", locator: "UN Department of Peacekeeping Operations, sections “UNAMIR established” and “April 1994–June 1994: Mass murder and civil war”; Security Council resolutions 872, 912 and 918." },
    ],
    suggestions: {
      rw: ["UNAMIR yari ifite izihe nshingano mbere ya Mata 1994?", "Ni iki cyabaye ku wa 4 Nyakanga 1994?", "Jenoside yatangiye ite ku wa 7 Mata?"],
      en: ["What was UNAMIR's mandate before April 1994?", "What happened on 4 July 1994?", "How did the genocide begin on 7 April?"],
      fr: ["Quel était le mandat de la MINUAR avant avril 1994 ?", "Que s'est-il passé le 4 juillet 1994 ?", "Comment le génocide a-t-il commencé le 7 avril ?"],
    },
  },
  genocide_planning: {
    title: {
      rw: "Imyiteguro n'ibimenyetso byabanje kugaragara",
      en: "Preparation and warning signs",
      fr: "La préparation et les signes avant-coureurs",
    },
    answer: {
      rw: "Guverinoma y'u Rwanda ivuga ko Jenoside yakorewe Abatutsi yateguwe ikanashyirwa mu bikorwa na regime ya jenoside, yatoje imitwe y'Interahamwe n'Abahutu b'intagondwa kwica Abatutsi n'Abahutu barwanyaga ubwicanyi, ishyigikiwe n'inzego z'umutekano za Leta. Ibi ni byo Guverinoma ivuga mu ncamake yayo yemewe. Igitabo cya Komisiyo y'Igihugu yo Kurwanya Jenoside (CNLG) cyo muri Mutarama 2021 gitanga ibisobanuro birambuye ku myiteguro yo kuva mu 1991 kugeza mu 1994, birimo gukwirakwiza intwaro, imitwe y'Interahamwe, poropagande n'ibindi bimenyetso byabanje kugaragara. Iyo tuvuga umuntu cyangwa igikorwa runaka, tugomba kugaragaza urupapuro n'inyandiko bibishyigikira, tukabitandukanya n'icyemezo cy'urukiko. Kuvuga ko Jenoside yateguwe ntibisobanura ko buri Munyarwanda cyangwa buri muntu wo mu itsinda runaka yabigizemo uruhare.",
      en: "The Government of Rwanda states that the Genocide against the Tutsi was prepared and implemented by a genocidal regime which trained Interahamwe militia and extremist Hutu to kill Tutsi and Hutu who opposed the killings, with the support of government security forces. This is the Government's official public summary. A January 2021 publication by Rwanda's National Commission for the Fight against Genocide (CNLG) provides more detailed material on preparations from 1991 to 1994, including weapons distribution, Interahamwe organisation, propaganda and other warning signs. A claim about a particular person or incident must be tied to its exact page and supporting record and distinguished from a judicial finding. The fact that the genocide was prepared does not mean every Rwandan or every member of a community participated in it.",
      fr: "Le Gouvernement du Rwanda indique que le génocide perpétré contre les Tutsi a été préparé et mis en œuvre par un régime génocidaire qui a entraîné des milices Interahamwe et des Hutu extrémistes pour tuer les Tutsi ainsi que les Hutu opposés aux massacres, avec le soutien des forces de sécurité de l'État. Il s'agit du résumé public officiel du Gouvernement. Une publication de janvier 2021 de la Commission nationale de lutte contre le génocide (CNLG) apporte des éléments plus détaillés sur les préparatifs de 1991 à 1994, notamment la distribution d'armes, l'organisation des Interahamwe, la propagande et d'autres signes avant-coureurs. Toute affirmation sur une personne ou un incident précis doit renvoyer à la page exacte et au document justificatif, et être distinguée d'une décision judiciaire. Le fait que le génocide ait été préparé ne signifie pas que tous les Rwandais ni tous les membres d'une communauté y aient participé.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “About” page, “Genocide” section: the genocidal regime's preparation and implementation, training of Interahamwe militia and extremist Hutu, and support of government security forces." },
      { id: "minubumwe-cnlg-preparation-execution-2021", locator: "CNLG, Chapter I, “Planning of the Genocide Perpetrated against the Tutsi before 1994”, printed pp. 33–74; detailed Rwandan institutional account of 1991–1993 preparations." },
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
      rw: "Guverinoma y'u Rwanda igaragaza ko ku wa 7 Mata 1994 ari bwo Jenoside yakorewe Abatutsi yatangiye, kandi ko uwo munsi ari na wo utangiriraho Kwibuka. Inyandiko ya Guverinoma ivuga ko Jenoside yakorewe Abatutsi yari yarateguwe kandi igashyirwa mu bikorwa mu minsi 100. Igitabo cya Komisiyo y'Igihugu yo Kurwanya Jenoside (CNLG) gisobanura mu buryo burambuye itangiriro rya Jenoside ku wa 7 Mata 1994 n'uko ibikorwa byayo byakwirakwiriye. Urupapuro rwa Guverinoma twifashisha ntirutanga ibisobanuro birambuye ku mpanuka y'indege yo ku wa 6 Mata cyangwa ngo ruvuge uwaba yarayiteye; Ishakiro ntizahimba igisubizo ku cyateye iyo mpanuka.",
      en: "The Government of Rwanda identifies 7 April 1994 as the beginning of the Genocide against the Tutsi and as the start of Kwibuka. Its published account says the genocide was prepared and implemented over 100 days. The National Commission for the Fight against Genocide (CNLG) publication provides a more detailed account of the beginning of the genocide on 7 April 1994 and its spread. The Government page used here does not give a detailed account of the 6 April aircraft crash or name anyone responsible for it; Ishakiro will not invent an answer about the cause of the crash.",
      fr: "Le Gouvernement du Rwanda identifie le 7 avril 1994 comme le début du génocide perpétré contre les Tutsi et de la période de Kwibuka. Son récit publié indique que le génocide a été préparé et mis en œuvre sur une période de 100 jours. La publication de la Commission nationale de lutte contre le génocide (CNLG) fournit un récit plus détaillé du début du génocide le 7 avril 1994 et de son extension. La page du Gouvernement utilisée ici ne donne pas de détails sur le crash de l'avion du 6 avril et ne désigne aucun responsable ; Ishakiro n'inventera pas de réponse sur la cause de cet accident.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “About” page, “Genocide” and “Kwibuka” sections; 7 April as the start of the genocide and commemoration." },
      { id: "minubumwe-cnlg-preparation-execution-2021", locator: "CNLG, Chapter II, section 2.1, “7 April 1994: Beginning of Genocide across the Country”, printed p. 75 onward." },
    ],
    suggestions: {
      rw: ["Jenoside yakomeje ite mu gihugu hose?", "Ni iki cyabaye ku wa 4 Nyakanga 1994?", "Kwibuka bifite iyihe ntego?"],
      en: ["How did the genocide spread across the country?", "What happened on 4 July 1994?", "What is the purpose of Kwibuka?"],
      fr: ["Comment le génocide s'est-il étendu dans le pays ?", "Que s'est-il passé le 4 juillet 1994 ?", "Quel est le sens du Kwibuka ?"],
    },
  },
  genocide_end: {
    title: {
      rw: "Ihagarikwa rya Jenoside ku wa 4 Nyakanga 1994",
      en: "The end of the genocide on 4 July 1994",
      fr: "La fin du génocide le 4 juillet 1994",
    },
    answer: {
      rw: "Mu nkuru yayo yemewe, Guverinoma y'u Rwanda ivuga ko ingabo za Rwanda Patriotic Army (RPA), ishami rya gisirikare rya RPF-Inkotanyi, zahagaritse Jenoside yakorewe Abatutsi zikanabohora igihugu ku wa 4 Nyakanga 1994, nyuma y'uko Kigali ifashwe n'izo ngabo. Guverinoma inavuga ko igihe cyo kwibuka kiba kuva ku wa 7 Mata kugeza ku wa 4 Nyakanga. Iki gisubizo kigaragaza uko Guverinoma y'u Rwanda isobanura iyo tariki n'uruhare rw'ingabo za RPA; amakuru arambuye ku gikorwa runaka cyangwa ku muntu ku giti cye agomba gushakirwa isoko ryihariye ribyemeza.",
      en: "The Government of Rwanda's official account says that the Rwanda Patriotic Army (RPA), the armed wing of the Rwandese Patriotic Front, stopped the Genocide against the Tutsi and liberated the country on 4 July 1994, after Kigali fell to RPA forces. The Government also states that the annual commemoration period runs from 7 April to 4 July. This answer reports the Government's account of the date and the RPA's role; detailed claims about a particular operation or individual require a separate source that supports them.",
      fr: "Selon le récit officiel du Gouvernement du Rwanda, l'Armée patriotique rwandaise (APR), branche armée du Front patriotique rwandais, a mis fin au génocide perpétré contre les Tutsi et libéré le pays le 4 juillet 1994, après la prise de Kigali par les forces de l'APR. Le Gouvernement indique également que la période annuelle de commémoration s'étend du 7 avril au 4 juillet. Cette réponse rapporte le récit du Gouvernement concernant cette date et le rôle de l'APR ; toute affirmation détaillée sur une opération ou une personne précise exige une source distincte qui l'étaye.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “About” page, paragraphs on Kigali falling to the RPA, the genocide being stopped on 4 July 1994, and the 7 April–4 July commemoration period." },
    ],
    suggestions: {
      rw: ["Amasezerano ya Arusha yari agamije iki?", "Kwibuka bifite iyihe ntego?", "Ni izihe nzira z'ubutabera zakurikiye Jenoside?"],
      en: ["What were the Arusha Accords intended to do?", "What is the purpose of Kwibuka?", "What justice mechanisms followed the genocide?"],
      fr: ["Quel était l'objectif des accords d'Arusha ?", "Quel est le sens du Kwibuka ?", "Quels mécanismes de justice ont suivi le génocide ?"],
    },
  },
  genocide_spread: {
    title: {
      rw: "Uko Jenoside yakorewe Abatutsi yakwirakwiye mu gihugu hose",
      en: "How the Genocide against the Tutsi spread across Rwanda",
      fr: "La propagation du génocide contre les Tutsi à travers le Rwanda",
    },
    answer: {
      rw: "Raporo y'agateganyo ya Komisiyo y'impuguke yigenga yashyizweho n'Inama y'Umutekano ya Loni, nimero S/1994/1125, yo ku wa 4 Ukwakira 1994, ikurikirana ibimenyetso by'ibyabaye hagati ya 6 Mata na 15 Nyakanga 1994. Mu ngingo ya 55–58, ivuga ko ubwicanyi bwibasiraga Abatutsi bwatangiye muri Kigali, burimo za bariyeri, kugenzura indangamuntu no gushakisha abantu mu ngo. Ivuga ko bamwe mu Batutsi bashakaga ubuhungiro mu nsengero, hoteli no kuri Stade Amahoro, ariko ko hari n'ibitero byabereye muri ibyo bibanza. Mu ngingo ya 59–78, Komisiyo ikusanya amakuru yaturutse ku nzego zitandukanye ku bwicanyi bwabereye no mu zindi perefegitura, bityo ikerekana ko Jenoside yakorewe Abatutsi yakwirakwiriye mu gihugu hose. Iyi ni raporo y'agateganyo, si urubanza rw'urukiko. Imibare y'ibyabereye ahantu runaka igomba kuvugwa iri kumwe n'isoko yayo; iyi raporo si urutonde rwuzuye rw'ahantu hose cyangwa rw'abagizweho ingaruka.",
      en: "The interim report of the Independent Commission of Experts established by the UN Security Council, document S/1994/1125 dated 4 October 1994, examines evidence from the period 6 April to 15 July 1994. In paragraphs 55–58, it describes the systematic targeting of Tutsi civilians in Kigali, including roadblocks, identity checks and house-to-house searches. It records that some Tutsi sought refuge in churches, hotels and Amahoro Stadium, and that attacks also took place at places where people had sought safety. In paragraphs 59–78, the Commission compiles information from different sources about massacres in other prefectures, showing that the Genocide against the Tutsi spread across the country. This is an interim investigative report, not a criminal-court judgment. Figures for individual locations must remain attributed to their source; the report is not a complete list of every place or every person affected.",
      fr: "Le rapport intérimaire de la Commission indépendante d'experts créée par le Conseil de sécurité de l'ONU, document S/1994/1125 daté du 4 octobre 1994, examine des éléments concernant la période du 6 avril au 15 juillet 1994. Aux paragraphes 55 à 58, il décrit le ciblage systématique des civils tutsi à Kigali, notamment les barrages routiers, les contrôles d'identité et les perquisitions de maisons. Il indique que des Tutsi ont cherché refuge dans des églises, des hôtels et au stade Amahoro, et que des attaques ont également eu lieu dans des lieux où des personnes cherchaient à se mettre à l'abri. Aux paragraphes 59 à 78, la Commission rassemble des informations provenant de différentes sources sur des massacres dans d'autres préfectures, montrant que le génocide contre les Tutsi s'est étendu à travers le pays. Il s'agit d'un rapport d'enquête intérimaire, et non d'un jugement pénal. Les chiffres concernant un lieu précis doivent rester attribués à leur source ; le rapport ne constitue pas une liste exhaustive de tous les lieux ni de toutes les personnes touchées.",
    },
    sourceRefs: [
      { id: "un-s1994-1125-independent-commission-interim", locator: "UN Independent Commission of Experts, Preliminary report S/1994/1125, 4 October 1994: mandate period, paras. 4 and 21; Kigali roadblocks, identity checks and attacks on places of refuge, paras. 55–58 (PDF pp. 14–15); reports from other prefectures, paras. 59–78 (PDF pp. 15–18)." },
    ],
    suggestions: {
      rw: ["Abatutsi bashakaga ubuhungiro he?", "UNAMIR yitwaye ite mu gihe cya Jenoside?", "Ni izihe ngaruka ku bacitse ku icumu?"],
      en: ["Where did Tutsi seek refuge?", "What did UNAMIR do during the genocide?", "What were the consequences for survivors?"],
      fr: ["Où les Tutsi ont-ils cherché refuge ?", "Quel rôle la MINUAR a-t-elle joué pendant le génocide ?", "Quelles ont été les conséquences pour les rescapés ?"],
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

  genocide_memorials: {
    title: {
      rw: "Inzibutso za Jenoside yakorewe Abatutsi",
      en: "Memorials of the Genocide against the Tutsi",
      fr: "Les mémoriaux du génocide contre les Tutsi",
    },
    answer: {
      rw: "Inzibutso za Jenoside yakorewe Abatutsi ni ahantu ho kubungabunga amateka, guha icyubahiro abazize Jenoside no kwigisha ibisekuruza bizaza. Buri rwibutso rugira amateka n'ibimenyetso byihariye; imibare y'abahashyinguwe ntigomba kwitiranywa n'umubare w'abiciwe kuri urwo rwibutso. Baza izina ry'urwibutso ushaka kugira ngo nguhe amakuru yarwo yihariye.",
      en: "Memorials of the Genocide against the Tutsi preserve historical evidence, honour victims and support education for future generations. Each memorial has its own history; the number of victims buried at a site must not be confused with the number killed at that exact location. Name the memorial for site-specific information.",
      fr: "Les mémoriaux du génocide contre les Tutsi préservent les preuves historiques, rendent hommage aux victimes et contribuent à l'éducation des générations futures. Chaque mémorial a sa propre histoire ; le nombre de personnes qui y sont inhumées ne doit pas être confondu avec le nombre de personnes tuées précisément sur ce lieu. Indiquez le nom du mémorial pour obtenir des informations propres au site.",
    },
    sourceRefs: [
      { id: "kgm-kigali-genocide-memorial", locator: "Kigali Genocide Memorial, “Our Story”; official history of the Gisozi memorial and its 2004 opening." },
      { id: "ibuka-nyanza-genocide-memorial", locator: "IBUKA, “Nyanza Genocide Memorial”; site history and separate figures for victims buried and killed on site." },
    ],
    suggestions: {
      rw: ["Urwibutso rwa Kigali ruri he?", "Urwibutso rwa Nyanza-Kicukiro rwibutsa iki?", "Kwibuka bitangira ryari?"],
      en: ["Where is the Kigali Genocide Memorial?", "What does Nyanza-Kicukiro Memorial commemorate?", "When does Kwibuka begin?"],
      fr: ["Où se trouve le Mémorial du génocide de Kigali ?", "Que commémore le mémorial de Nyanza-Kicukiro ?", "Quand commence le Kwibuka ?"],
    },
  },
  genocide_archive: {
    title: {
      rw: "Genocide Archive of Rwanda",
      en: "Genocide Archive of Rwanda",
      fr: "Genocide Archive of Rwanda",
    },
    answer: {
      rw: "Genocide Archive of Rwanda ni ububiko bw'inyandiko n'ibimenyetso byerekeye Jenoside yakorewe Abatutsi mu 1994, amateka ayibanziriza n'ibikorwa byo kongera kubaka igihugu nyuma yayo. Bwashyizweho n'ishami rishinzwe ububiko n'inyandiko rya Aegis Trust Rwanda. Bukusanya ubuhamya bw'abacitse ku icumu, abari barokoye abandi, abakoze Jenoside n'abasaza; bukabika amajwi, amashusho, amafoto, inyandiko, ibitabo n'amakuru y'amakarita. Ububiko bw'inyandiko bw'umubiri bubarizwa kuri Kigali Genocide Memorial i Gisozi. Si urwego rwa Leta.",
      en: "The Genocide Archive of Rwanda is a documentary archive about the 1994 Genocide against the Tutsi, Rwanda's pre-genocide history and post-genocide reconstruction. It was established by the archive and documentation department of Aegis Trust Rwanda. Its collections include testimonies from survivors, rescuers, perpetrators and elders, as well as audio and video recordings, photographs, documents, publications, objects and interactive mapping. The physical archive is located at the Kigali Genocide Memorial in Gisozi. It is not a government agency.",
      fr: "Le Genocide Archive of Rwanda est un centre d'archives documentaires consacré au génocide contre les Tutsi de 1994, à l'histoire du Rwanda avant le génocide et à la reconstruction après celui-ci. Il a été créé par le département des archives et de la documentation d'Aegis Trust Rwanda. Ses collections comprennent des témoignages de rescapés, de sauveteurs, d'auteurs du génocide et d'anciens, ainsi que des enregistrements audio et vidéo, des photographies, des documents, des publications, des objets et des cartes interactives. Les archives physiques se trouvent au Mémorial du génocide de Kigali, à Gisozi. Il ne s'agit pas d'un organisme gouvernemental.",
    },
    sourceRefs: [
      { id: "genocide-archive-rwanda", locator: "Genocide Archive of Rwanda, “About Us” and “Collections”; ownership, collection types and relationship to the physical archive at Kigali Genocide Memorial." },
    ],
    suggestions: {
      rw: ["Ni ubuhe buhamya buboneka muri ubwo bubiko?", "Urwibutso rwa Kigali ruri he?", "Kwibuka ni iki?"],
      en: ["What testimonies are available in the archive?", "Where is the Kigali Genocide Memorial?", "What is Kwibuka?"],
      fr: ["Quels témoignages sont disponibles dans ces archives ?", "Où se trouve le Mémorial du génocide de Kigali ?", "Qu'est-ce que le Kwibuka ?"],
    },
  },
  kwibuka: {
    title: {
      rw: "Kwibuka Jenoside yakorewe Abatutsi",
      en: "Kwibuka: remembering the Genocide against the Tutsi",
      fr: "Kwibuka : commémorer le génocide contre les Tutsi",
    },
    answer: {
      rw: "Kwibuka bisobanura 'kwibuka' kandi ni umuhango ngarukamwaka wo kwibuka Jenoside yakorewe Abatutsi mu Rwanda mu 1994. Nk'uko Guverinoma y'u Rwanda ibitangaza, ibikorwa byo kwibuka bitangira ku wa 7 Mata bikageza ku wa 4 Nyakanga, igihe Jenoside yahagaritswe n'igihugu kikabohorwa. Kwibuka biha Abanyarwanda umwanya wo kwibuka abazize Jenoside, kubungabunga ibimenyetso by'amateka no kwigisha ibisekuruza bizaza. Urubuga rwa Guverinoma ni rwo shingiro ry'aya makuru ku gihe n'intego za Kwibuka.",
      en: "Kwibuka means “to remember” and describes the annual commemoration of the 1994 Genocide against the Tutsi in Rwanda. According to the Government of Rwanda, commemoration activities begin on 7 April and continue until 4 July, when the genocide was stopped and the country was liberated. Kwibuka provides an opportunity to remember victims, preserve historical evidence and educate future generations. The Government's page is the primary source here for the commemoration period and its stated purpose.",
      fr: "Kwibuka signifie « se souvenir » et désigne la commémoration annuelle du génocide perpétré contre les Tutsi au Rwanda en 1994. Selon le Gouvernement du Rwanda, les activités de commémoration commencent le 7 avril et se poursuivent jusqu'au 4 juillet, date à laquelle le génocide a été arrêté et le pays libéré. Kwibuka donne l'occasion de se souvenir des victimes, de préserver les preuves historiques et d'éduquer les générations futures. La page du Gouvernement constitue ici la source principale concernant la période et l'objectif annoncés de la commémoration.",
    },
    sourceRefs: [
      { id: "gov-rw-about-genocide", locator: "Government of Rwanda, “About” page, “Kwibuka” section and “Genocide” section: meaning and annual commemoration period from 7 April through 4 July." },
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
  if (/^(?:que\b|qu'est|c'est quoi\b|est-ce que\b|comment\b|quand\b|quelle\b|quels?\b|où\b|ou\b|parlez?\b|raconte[sz]?\b|explique[sz]?\b|je veux savoir\b|je voudrais\b)|\b(pourquoi|l'histoire|histoire du|histoire de|les rescap|le genocide|commemoration|temoignage|justice|tribunal|accords? (?:d|de) arusha)\b/.test(value)) return "fr";
  if (/^(?:what|when|where|why|how|who|tell me|can you tell me|could you tell me|could you explain|please tell me|do you know)\b|\b(genocide against|survivors|justice|court|commemoration|history|definition|before 1994)\b/.test(value)) return "en";
  return "rw";
}

const TOPIC_PATTERNS: Record<RwandaHistoryTopic, RegExp> = {
  rwanda_official_history: /\b(history of rwanda|rwanda history|histoire du rwanda|histoire de rwanda|amateka y'u rwanda|amateka y'urwanda|amateka y'u gihugu)\b(?!.*\b(genocide|jenoside|abatutsi|tutsis?|kwibuka)\b)/,
  genocide_definition: /\b(legal definition|definition of genocide|what is genocide|meaning of genocide|genocide definition|genocide convention|article ii|ibisobanuro.*jenoside|jenoside.*isobanurwa|ijambo jenoside|jenoside mu mategeko|amasezerano.*jenoside|definition juridique|definition du genocide|que signifie le genocide|convention.*genocide)\b/,
  genocide_background: /\b(before 1994|before the genocide|historical background|history|historical|histoire|historique|amateka|ubukoloni|colonial|colonisation|identity cards|indangamuntu|mbere ya 1994|mbere ya jenoside|contexte historique|avant 1994|avant le genocide|colonialisme|cartes d'identite)\b/,
  genocide_planning: /\b(planning|preparation|prepared|planned|how was it planned|how was it prepared|what were the preparations|comment a ete planifie|comment a ete prepare|warning signs|propaganda|rtlm|interahamwe|weapons|intwaro|byateguwe|yateguwe|imyiteguro|ibimenyetso.*mbere|urwango|itangazamakuru|kwamamaza urwango|planification|preparation du genocide|signes avant coureurs|propagande|milices)\b/,
  genocide_beginning: /\b(6 april|7 april|6 et 7 avril|april 1994|started|begin|began|beginning|start of the genocide|when did|when was|what year|which year|byatangiye|yatangiye|yabaye.*ryari|ryari|mu wuhe mwaka|mu mwaka uwuhe|umwaka wahe|quelle annee|quel annee|quelle date|itangiriro|ku wa 6 mata|ku wa 7 mata|6 na 7 mata|ku wa 6 na 7 mata|mata 1994|impanuka y'indege|indege.*habyarimana|plane crash|crash.*avion|debut du genocide|a commence|quand a commence|6 avril|7 avril|avril 1994)\b/,
  genocide_arusha: /\b(arusha|unamir|minuar|peace agreement.*rwanda|arusha accords?|accords? d arusha|amasezerano ya arusha|amasezerano y amahoro ya arusha|mandate of unamir|inshingano za unamir|mandat de la minuar)\b/,
  genocide_end: /\b(4 july(?: 1994)?|july 4(?:,? 1994)?|4 juillet(?: 1994)?|4 nyakanga(?: 1994)?|nyakanga 4(?: 1994)?|what happened on 4|what happened on july 4|stopped the genocide|end of the genocide|ended the genocide|genocide was stopped|yahagaritswe.*jenoside|ihagarikwa rya jenoside|fin du genocide|arret du genocide|liberation du rwanda)\b/,
  genocide_spread: /\b(spread across|spread throughout|across rwanda|throughout rwanda|nationwide|targeted across rwanda|places of refuge|refuge sites|where did (?:the )?(?:tutsi|they|people) seek refuge|where did tutsi seek refuge|massacres.*(country|prefecture|church|stadium)|yakwirakwiye|yakwirakwiriye|mu gihugu hose|hirya no hino|abantu bahungiye|aho bahungiye|ahantu ho guhungira|ahantu bahungiye|abatutsi bashakaga ubuhungiro he|insengero|kiliziya|stade|amashuri|mu nsengero|dans tout le rwanda|a travers le rwanda|etendue du genocide|lieux de refuge|eglises|stades|massacres.*(pays|prefecture)|ou les tutsi ont-ils cherche refuge|ou les tutsi ont ils cherche refuge)\b/,
  genocide_justice: /\b(gacaca|ictr|tpir|international criminal tribunal|tribunal penal international|justice after|post genocide justice|urukiko mpuzamahanga|inkiko gacaca|imanza za jenoside|akayesu|ubutabera nyuma|justice apres|juridictions gacaca)\b/,
  genocide_survivors: /\b(survivors?|survivor testimony|testimonies|needs of survivors|effects on survivors|abacitse ku icumu|bacitse ku icumu|umucitse ku icumu|ubuhamya|ingaruka.*bacitse|ingaruka.*jenoside|rescap(es|e)|temoignages?|besoins des rescapes|consequences pour les rescapes)\b/,
  genocide_archive: /\b(genocide archive of rwanda|genocide archive|archives? of rwanda|genocide archives|ububiko bw'inyandiko.*jenoside|ububiko.*jenoside)\b/,
  genocide_memorials: /\b(urwibutso|inzibutso|kigali genocide memorial|nyanza(?:-kicukiro)? memorial|memorials? of the genocide|genocide memorials?)\b/,
  kwibuka: /\b(kwibuka|commemoration|commemorate|remembering|journee internationale de reflexion|journee de commemoration)\b/,
  genocide_overview: /\b(genocide|jenoside|jenoside yakorewe abatutsi|genocide against the tutsi|genocide against tutsi|genocide perpetrated against tutsi|genocide des tutsi|genocide perp(i|e)tre contre les tutsi|abatutsi mu 1994|abatutsi muri 1994|tutsi.*1994|1994.*tutsi|tutsis.*1994|1994.*tutsis)\b/,
};

const HISTORY_DOMAIN_ANCHOR = /\b(history of rwanda|rwanda history|histoire du rwanda|amateka y'u rwanda|amateka y'urwanda|genocide|jenoside|abatutsi|tutsis?|kwibuka|urwibutso|inzibutso|genocide archive|gacaca|ictr|tpir|akayesu|interahamwe|rtlm|abacitse ku icumu|bacitse ku icumu|survivor|rescap(es|e)|6 april|7 april|6 avril|7 mata|mata 1994|avril 1994|arusha|unamir|minuar|4 july|july 4|4 juillet|4 nyakanga|nyakanga 4|s 1994 1125)\b/;

const HISTORY_FOLLOW_UP = /^(?:mbwira byinshi|sobanura|nsobanurira|komeza|komeza umbwire|bivuze iki|ni iki kindi|ibindi|byagenze bite|byagenze gute|yateguwe ite|yateguwe gute|yatangiye ryari|byatangiye ryari|mbwira uko byagenze|aho bahungiye|abantu bahungiye he|kuki|kubera iki|tell me more|explain more|continue|go on|what happened next|what happened|where did they seek refuge|where did people seek refuge|how did it spread|how was it prepared|when did it start|why|how so|more details|more about this|tell me more about this|explique davantage|continuez|et ensuite|où se sont-ils réfugiés|ou se sont ils refugies|pourquoi|qu'est ce qui s'est passe ensuite|comment cela s'est passe|plus de details)$/;

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
      "genocide_archive",
      "genocide_memorials",
      "kwibuka",
      "genocide_definition",
      "genocide_arusha",
      "genocide_planning",
      "rwanda_official_history",
      "genocide_background",
      "genocide_end",
      "genocide_beginning",
      "genocide_spread",
      "genocide_justice",
      "genocide_survivors",
    ] as const) {
      if (TOPIC_PATTERNS[topic].test(value)) return topic;
    }

    if (TOPIC_PATTERNS.genocide_overview.test(value)) return "genocide_overview";
  }

  if (isRwandaHistoryTopic(previousTopic)) {
    if (/\b(ku wa 4 nyakanga|4 nyakanga|4 july|july 4|4 juillet|what happened on 4)\b/.test(value)) {
      return "genocide_end";
    }
    if (/\b(arusha|unamir|minuar|amasezerano ya arusha|accords? d arusha)\b/.test(value)) {
      return "genocide_arusha";
    }
    if (/\b(yateguwe|byateguwe|imyiteguro|planned|prepared|planning|preparation|planifie|planification)\b/.test(value)) {
      return "genocide_planning";
    }
    if (/\b(yatangiye|byatangiye|ryari|when did it start|how did it start|when was it|quand a commence|quelle date)\b/.test(value)) {
      return "genocide_beginning";
    }
    if (HISTORY_FOLLOW_UP.test(value)) return previousTopic;
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
  const queryValue = normalize(query);

  if (topic === "genocide_memorials") {
    if (/\b(nyanza|kicukiro)\b/.test(queryValue)) {
      const siteEntry: TopicEntry = {
        ...entry,
        sourceRefs: [{ id: "ibuka-nyanza-genocide-memorial", locator: "IBUKA, “Nyanza Genocide Memorial”; location, 11 April 1994 context, total number buried and number killed on site." }],
      };
      const answers: Record<RwandaHistoryLanguage, string> = {
        rw: "Urwibutso rwa Nyanza-Kicukiro ruri i Kagarama, mu Karere ka Kicukiro, mu Mujyi wa Kigali. Rwibutsa ubwicanyi bwakurikiye kuva kw'abasirikare b'Umuryango w'Abibumbye bari kuri ETO ku wa 11 Mata 1994. IBUKA ivuga ko muri uru rwibutso hashyinguwe imibiri y'abazize Jenoside igera ku 105,000; ivuga kandi ko abagera ku 3,000 ari bo biciwe kuri uwo musozi. Bityo 105,000 si umubare w'abishwe kuri uwo mwanya gusa; ni umubare w'abashyinguwe aho, harimo n'abazanywe baturutse mu bindi bice bya Kicukiro.",
        en: "Nyanza-Kicukiro Genocide Memorial is in Kagarama, Kicukiro District, in Kigali. It commemorates the killings that followed the withdrawal of UN peacekeepers from ETO on 11 April 1994. IBUKA reports that about 105,000 victims are buried at the memorial, while about 3,000 were killed at that site. The 105,000 figure is therefore not the number killed at this location alone; it is the number buried there, including victims brought from other parts of Kicukiro District.",
        fr: "Le mémorial du génocide de Nyanza-Kicukiro se trouve à Kagarama, dans le district de Kicukiro, à Kigali. Il commémore les massacres qui ont suivi le retrait des Casques bleus de l'ONU de l'ETO le 11 avril 1994. IBUKA indique qu'environ 105 000 victimes sont inhumées dans ce mémorial, tandis qu'environ 3 000 personnes ont été tuées sur ce site même. Le chiffre de 105 000 ne représente donc pas uniquement les personnes tuées à cet endroit ; il correspond aux victimes qui y sont inhumées, y compris celles amenées d'autres secteurs du district de Kicukiro.",
      };
      return {
        topic,
        title: entry.title[language],
        answer: answers[language],
        confidenceLabel: language === "en"
          ? "IBUKA's memorial page; buried victims and people killed at the site are stated separately."
          : language === "fr"
            ? "Page du mémorial publiée par IBUKA ; les personnes inhumées et celles tuées sur le site sont distinguées."
            : "Urupapuro rwa IBUKA ku rwibutso; imibiri yashyinguwe n'abiciwe kuri uwo mwanya byatandukanyijwe.",
        sources: toAssistantSources(siteEntry),
        suggestions: entry.suggestions[language],
      };
    }

    if (/\b(gisozi|kigali)\b/.test(queryValue)) {
      const siteEntry: TopicEntry = {
        ...entry,
        sourceRefs: [
          { id: "kgm-kigali-genocide-memorial", locator: "Kigali Genocide Memorial, “Our Story”; the Gisozi hillside, mass graves and official opening in 2004." },
          { id: "gasabo-district-official-overview", locator: "Gasabo District, “Menya Akarere”; official administrative information for Gisozi Sector." },
        ],
      };
      const answers: Record<RwandaHistoryLanguage, string> = {
        rw: "Urwibutso rwa Kigali (Gisozi) ruri mu Murenge wa Gisozi, mu Karere ka Gasabo, mu Mujyi wa Kigali. Rwubatswe hafi y'ahatoranyijwe kugira ngo imibiri y'Abatutsi bishwe muri Jenoside yakorewe Abatutsi mu 1994 ibone aho iruhukira. Urwibutso rwatangijwe ku bufatanye bw'inzego z'u Rwanda na Aegis Trust, rufungurwa ku mugaragaro mu 2004. Rukora kandi ibikorwa byo kubungabunga ibimenyetso by'amateka no kwigisha amahoro n'indangagaciro.",
        en: "The Kigali Genocide Memorial (Gisozi) is in Gisozi Sector, Gasabo District, in the City of Kigali. It stands beside mass graves prepared as a final resting place for Tutsi victims of the 1994 Genocide against the Tutsi. The Memorial was developed in collaboration between Rwandan authorities and Aegis Trust and officially opened in 2004. It also supports the preservation of historical evidence and peace and values education.",
        fr: "Le Mémorial du génocide de Kigali (Gisozi) se trouve dans le secteur de Gisozi, district de Gasabo, dans la Ville de Kigali. Il se situe à côté de fosses communes aménagées comme lieu de repos final pour les victimes tutsi du génocide perpétré contre les Tutsi en 1994. Le mémorial a été développé en collaboration entre les autorités rwandaises et Aegis Trust, puis officiellement inauguré en 2004. Il contribue également à la préservation des preuves historiques ainsi qu'à l'éducation à la paix et aux valeurs.",
      };
      return {
        topic,
        title: entry.title[language],
        answer: answers[language],
        confidenceLabel: language === "en"
          ? "Kigali Genocide Memorial official history and Gasabo District administrative information."
          : language === "fr"
            ? "Histoire officielle du Mémorial du génocide de Kigali et informations administratives du district de Gasabo."
            : "Amateka yatangajwe n'Urwibutso rwa Kigali n'amakuru y'inzego z'ubuyobozi bw'Akarere ka Gasabo.",
        sources: toAssistantSources(siteEntry),
        suggestions: entry.suggestions[language],
      };
    }
  }

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
