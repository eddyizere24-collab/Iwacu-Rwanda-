import type { Locale } from "./i18n";

export const SITE_PAGE_KEYS = [
  "about",
  "how-it-works",
  "rwanda-administration",
  "data-sources",
  "privacy",
  "contact",
  "terms",
] as const;

export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export type SitePageSection = {
  title: string;
  body: string;
  items?: string[];
};

export type SitePageLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type SitePageContent = {
  eyebrow: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  lead: string;
  updated: string;
  sections: SitePageSection[];
  notice?: { title: string; body: string };
  links?: SitePageLink[];
};

export const SITE_PAGE_PATHS: Record<SitePageKey, string> = {
  about: "/about",
  "how-it-works": "/how-it-works",
  "rwanda-administration": "/rwanda-administration",
  "data-sources": "/data-sources",
  privacy: "/privacy",
  contact: "/contact",
  terms: "/terms",
};

export const SITE_PAGE_LABELS: Record<Locale, Record<SitePageKey, string>> = {
  rw: {
    about: "Abo turi bo",
    "how-it-works": "Uko IWACU ikora",
    "rwanda-administration": "Inzego z'u Rwanda",
    "data-sources": "Inkomoko y'amakuru",
    privacy: "Ibanga ry'amakuru",
    contact: "Twandikire",
    terms: "Amabwiriza",
  },
  en: {
    about: "About IWACU RWANDA",
    "how-it-works": "How IWACU works",
    "rwanda-administration": "Rwanda's administration",
    "data-sources": "Data sources",
    privacy: "Privacy",
    contact: "Contact",
    terms: "Terms of use",
  },
  fr: {
    about: "À propos d'IWACU RWANDA",
    "how-it-works": "Comment fonctionne IWACU",
    "rwanda-administration": "Administration du Rwanda",
    "data-sources": "Sources des données",
    privacy: "Confidentialité",
    contact: "Contact",
    terms: "Conditions d'utilisation",
  },
};

const rw: Record<SitePageKey, SitePageContent> = {
  about: {
    eyebrow: "IBYEREKEYE IWACU RWANDA",
    title: "Menya aho uri. Menya amakuru y'aho uri.",
    seoTitle: "Abo turi bo | IWACU RWANDA",
    seoDescription: "Menya intego ya IWACU RWANDA, amakuru itanga n'amahame iyoboraho.",
    lead: "IWACU RWANDA ni urubuga rwigenga rugamije korohereza abantu kubona no gusobanukirwa amakuru y'aho bari, inzego z'ubuyobozi n'amakuru rusange ajyanye n'aho batuye mu Rwanda.",
    updated: "Byasuzumwe: 10 Ugushyingo 2026",
    sections: [
      {
        title: "Intego yacu",
        body: "Dushaka ko umuturage abasha kumenya aho aherereye mu nzego z'ubuyobozi, kubona amakuru y'aho hantu no kugera ku makuru y'abayobozi iyo hari inyandiko rusange zemejwe ziboneka.",
        items: [
          "Kwerekana urwego rw'aho umuntu aherereye rushingiye ku bimenyetso biboneka.",
          "Korohereza abantu gusobanukirwa Intara, Umujyi wa Kigali, Uturere, Imirenge, Utugari n'Imidugudu.",
          "Gutanga amakuru y'ubutabazi n'andi makuru afitiwe inkomoko.",
        ],
      },
      {
        title: "Amahame atuyobora",
        body: "Icyizere cy'abakoresha ni cyo dushyira imbere. Ntiduhimba amazina y'abayobozi, nimero, imbibi cyangwa imibare. Iyo amakuru adahari, atuzuye cyangwa atizewe, urubuga rugomba kubivuga aho kwerekana igisubizo kitagenzuwe.",
        items: [
          "Kugaragaza inkomoko y'amakuru igihe izwi.",
          "Kwerekana aho GPS cyangwa imbibi bidatanga igisubizo gihagije.",
          "Gutandukanya amakuru yemejwe n'ikigereranyo.",
          "Kurinda amakuru bwite no kugabanya ayo dusaba.",
        ],
      },
      {
        title: "IWACU RWANDA ni iki, si iki?",
        body: "IWACU RWANDA ni urubuga rw'ikoranabuhanga rwigenga. Si urubuga rwa Leta, ntirusimbura inzego za Leta, serivisi z'ubutabazi, inyandiko zemewe cyangwa inzira z'ubuyobozi. Amakuru y'abayobozi agaragara gusa iyo inyandiko rusange zemejwe kandi zatangajwe ziboneka.",
      },
    ],
    notice: {
      title: "Amakuru ashobora kuba atuzuye",
      body: "Imipaka n'inyandiko z'abayobozi bishobora guhinduka. Iyo urubuga rwerekanye ko amakuru adahari, ntibivuga ko urwego cyangwa umuyobozi bitabaho.",
    },
    links: [
      { label: "Uko IWACU ikora", href: "/how-it-works" },
      { label: "Inzego z'u Rwanda", href: "/rwanda-administration" },
    ],
  },
  "how-it-works": {
    eyebrow: "UBURYO BWO GUKORESHA",
    title: "Uko IWACU RWANDA ikora",
    seoTitle: "Uko IWACU RWANDA ikora | IWACU RWANDA",
    seoDescription: "Sobanukirwa uburyo bwo kumenya aho uri, kugenzura amakuru y'ahantu no kureba abayobozi.",
    lead: "IWACU ikoresha ibimenyetso by'aho telefone iri n'amakuru y'imbibi abitswe kugira ngo igaragaze urwego rw'ubuyobozi rushyigikiwe n'ibimenyetso biboneka.",
    updated: "Byasuzumwe: 10 Ugushyingo 2026",
    sections: [
      {
        title: "1. Menya aho uri",
        body: "Kanda kuri “Menya aho uri” maze wemere Location igihe telefone ibigusabye. Browser ishobora gutanga GPS cyangwa aho igereranya ko telefone iri. Uburyo buboneka n'ukuri kwabwo biterwa na telefone, uruhushya, interineti n'ibidukikije.",
      },
      {
        title: "2. Sobanukirwa n'igisubizo",
        body: "Urubuga rushaka guhuza aho telefone yerekanye n'imbibi z'ubuyobozi zibitse. Rwerekana urwego rwo hasi ibimenyetso bishyigikira. Icyizere cy'aho hantu ni ikigereranyo gishingiye ku makuru aboneka; si isezerano ry'uko GPS itazibeshya cyangwa igipimo cyemeza aho umuntu ari ku buryo bw'amategeko.",
        items: [
          "GPS ishobora kutagira ukuri guhagije cyane cyane mu nzu cyangwa hagati y'inyubako.",
          "Niba ibimenyetso bidahagije, urubuga rushobora kugaragaza Akarere, Umurenge cyangwa urwego ruri hejuru aho guhimba Umudugudu.",
          "Kanda “Si hano?” kugira ngo ukosore ahagaragajwe ukoresheje ikarita cyangwa urutonde rw'ahantu.",
        ],
      },
      {
        title: "3. Reba amakuru y'abayobozi",
        body: "Iyo hari inyandiko z'abayobozi zemejwe kandi zatangajwe, urubuga rushobora kwerekana umwirondoro rusange n'uburyo bwo kuvugana bwemewe gutangazwa. Iyo nta nyandiko iboneka, ntitwongeramo izina cyangwa nimero y'igihimbano.",
      },
      {
        title: "4. Koresha Ishakiro",
        body: "Iwacu AI, izwi kandi nka Ishakiro, ishobora gufasha gushaka no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi. Ishobora gusubiza gusa iyo amakuru yagenzuwe ayishyigikiye. Amakuru adahari cyangwa adashobora kugenzurwa agomba kugaragazwa nk'ayabuze.",
      },
    ],
    notice: {
      title: "Niba uri mu kaga kihutirwa",
      body: "Ntutegereze ibisubizo by'uru rubuga. Koresha serivisi z'ubutabazi ziboneka kuri telefone yawe; nimero 112 ni iya Polisi.",
    },
    links: [
      { label: "Subira ku rubuga rw'ibanze", href: "/" },
      { label: "Amakuru y'ibanga", href: "/privacy" },
    ],
  },
  "rwanda-administration": {
    eyebrow: "UBUYOBOZI BW'U RWANDA",
    title: "Imiterere y'inzego z'ubuyobozi bw'u Rwanda",
    seoTitle: "Inzego z'ubuyobozi bw'u Rwanda | IWACU RWANDA",
    seoDescription: "Sobanukirwa inzego z'ubuyobozi bw'u Rwanda n'imibare yatangajwe na Guverinoma.",
    lead: "U Rwanda rufite inzego z'ubuyobozi kuva ku rwego rw'igihugu kugera ku mudugudu. Imibare iri hano ikomoka ku rubuga rwa Guverinoma y'u Rwanda rwasuzumwe ku wa 10 Ugushyingo 2026.",
    updated: "Inkomoko y'imibare: Government of Rwanda Overview; igenzurwa rya 10 Ugushyingo 2026.",
    sections: [
      {
        title: "Inzego kuva ku rwego rwo hejuru",
        body: "Mu buryo bw'imiterere y'ubuyobozi bukoreshwa n'uru rubuga, inzego z'ahantu zigaragazwa kuva ku rwego rw'igihugu, hakurikiraho Intara n'Umujyi wa Kigali, Akarere, Umurenge, Akagari n'Umudugudu.",
        items: [
          "Igihugu",
          "Intara 4 n'Umujyi wa Kigali (Umujyi wa Kigali uri ku rwego rumwe n'Intara, ariko si Intara).",
          "Uturere 30",
          "Imirenge 416",
          "Utugari 2,148",
          "Imidugudu 14,837",
        ],
      },
      {
        title: "Itandukaniro ry'Intara n'Umujyi wa Kigali",
        body: "Guverinoma itangaza Intara 4 n'Umujyi wa Kigali nk'ibice bibiri bitandukanye biri ku rwego rwa mbere. Bityo, ntitwita Umujyi wa Kigali Intara ya gatanu. Mu rutonde rw'ahantu, byose bishobora kugaragara ku rwego rumwe kugira ngo umuturage abashe guhitamo aho aherereye.",
      },
      {
        title: "Icyo iyi mibare ivuze",
        body: "Iyi ni imibare rusange yatangajwe na Guverinoma y'u Rwanda, si umubare twabaze duhereye ku rutonde rw'imbibi za IWACU. Imibare y'ibice by'ubuyobozi ishobora kuvugururwa n'inzego zibifitiye ububasha; reba inkomoko iri hasi kugira ngo umenye igihe twongeye kuyigenzura.",
      },
    ],
    notice: {
      title: "Icyitonderwa ku mubare w'imidugudu",
      body: "Urutonde rw'imbibi rwari ruri muri repository ya IWACU ku itariki y'igenzura rwarimo imidugudu 14,823, mu gihe urubuga rwa Guverinoma rwatangaje 14,837. Ntitwifashisha urutonde rw'imbibi rwa IWACU mu gutanga umubare rusange w'igihugu; uwo mubare tuwukura ku rubuga rwa Guverinoma kandi tukagaragaza itandukaniro aho bikenewe.",
    },
    links: [
      { label: "Government of Rwanda — Overview", href: "https://www.gov.rw/overview", external: true },
      { label: "Government of Rwanda — Governance", href: "https://www.gov.rw/highlights/governance", external: true },
    ],
  },
  "data-sources": {
    eyebrow: "INKOMOKO N'UKO AMAKURU ATEGURWA",
    title: "Inkomoko y'amakuru n'imbibi",
    seoTitle: "Inkomoko y'amakuru n'imbibi | IWACU RWANDA",
    seoDescription: "Reba inkomoko y'imibare y'ubuyobozi, imbibi z'ahantu, ikarita n'amafoto bikoresha kuri IWACU RWANDA.",
    lead: "IWACU igaragaza aho amakuru yaturutse igihe inkomoko izwi. Imibare y'igihugu, imbibi z'ahantu n'ikarita si ikintu kimwe kandi ntibivana ku isoko rimwe.",
    updated: "Byasuzumwe: 10 Ugushyingo 2026",
    sections: [
      {
        title: "Imibare y'inzego z'ubuyobozi",
        body: "Imibare y'Intara, Umujyi wa Kigali, Uturere, Imirenge, Utugari n'Imidugudu iri kuri uru rubuga ivuye ku rubuga rwa Guverinoma y'u Rwanda. Ku wa 10 Ugushyingo 2026, urubuga rwatangaje Intara 4 n'Umujyi wa Kigali, Uturere 30, Imirenge 416, Utugari 2,148 n'Imidugudu 14,837.",
      },
      {
        title: "Imbibi z'ubuyobozi",
        body: "Urubuga rukoresha amakuru y'imbibi z'ubuyobozi yaturutse mu makuru ya National Institute of Statistics of Rwanda (NISR), nk'uko bigaragara mu nyandiko y'inkomoko y'imipaka. Iyi mbibi ni zo zifasha kugereranya aho telefone iri n'igice cy'ubuyobozi. Kuboneka kw'imbibi no kuvugururwa kwazo biterwa na dataset ibitswe muri sisitemu.",
      },
      {
        title: "Amakuru y'ikarita",
        body: "Ikarita ikoresha amakuru ya OpenStreetMap. Amakuru ya OpenStreetMap atangwa hakurikijwe Open Data Commons Open Database License (ODbL). Ikarita ikorwa hifashishijwe Planetiler, MapLibre GL JS na PMTiles; ibi ni ibikoresho bya software, si inzego zemeza imbibi z'ubuyobozi.",
      },
      {
        title: "Amafoto n'uburenganzira",
        body: "Amafoto yo ku rubuga atoranywa mu mafoto y'ahantu nyakuri kandi inkomoko n'uruhushya rw'ikoreshwa ryayo bikandikwa mu gice cy'inkomoko y'amafoto. Bimwe bikoreshwa hakurikijwe CC BY, CC BY-SA cyangwa CC0. Reba ibisobanuro by'ifoto mbere yo kuyikoresha ahandi.",
      },
      {
        title: "Uko dukemura amakuru atandukanye",
        body: "Iyo imibare y'inzego yatangajwe na Guverinoma idahuye n'umubare w'ibice biri muri dataset y'imbibi, ntituhindura imibare ngo ihure. Turerekana inkomoko ya buri mubare kandi tukandika itandukaniro kugeza igihe dataset iboneye ivuguruye.",
      },
    ],
    notice: {
      title: "Imbibi si icyemezo cy'ubutaka",
      body: "Ikarita n'imbibi zigaragara kuri IWACU bigamije gufasha umuntu gusobanukirwa aho hantu. Ntibisimbura inyandiko z'ubutaka, ibipimo by'umupimyi wemewe cyangwa icyemezo cy'urwego rubifitiye ububasha.",
    },
    links: [
      { label: "National Institute of Statistics of Rwanda", href: "https://www.statistics.gov.rw/", external: true },
      { label: "Government of Rwanda — Overview", href: "https://www.gov.rw/overview", external: true },
      { label: "OpenStreetMap copyright and licence", href: "https://www.openstreetmap.org/copyright", external: true },
      { label: "Open Database License (ODbL)", href: "https://opendatacommons.org/licenses/odbl/", external: true },
      { label: "Inkomoko y'amafoto n'amashusho", href: "/amenyesha" },
    ],
  },
  privacy: {
    eyebrow: "IBANGA N'AMAKURU BWITE",
    title: "Amabwiriza agenga ibanga ry'amakuru",
    seoTitle: "Amabwiriza y'ibanga ry'amakuru | IWACU RWANDA",
    seoDescription: "Sobanukirwa amakuru IWACU RWANDA ikoresha, impamvu iyakoresha n'uburyo bwo kurinda ibanga ryawe.",
    lead: "Aya mabwiriza asobanura amakuru ashobora gukoreshwa igihe ukoresha IWACU RWANDA. Turasobanura ibyo twagenzuye muri code iriho; uburyo bushya bwo kwamamaza buzashyirwaho gusa nyuma yo kongera gusobanura amakuru akoreshwa.",
    updated: "Verisiyo yasuzumwe: 11 Ugushyingo 2026",
    sections: [
      {
        title: "Amakuru y'aho uri",
        body: "Iyo ukoresheje “Menya aho uri”, browser cyangwa telefone bishobora kuduha latitude na longitude kugira ngo tugereranye ahantu n'imbibi z'ubuyobozi. Ntitugusaba konti kugira ngo ukoreshe iki gikorwa. Ibisubizo by'aho uheruka kumenyekana bishobora kubikwa muri browser ya telefone yawe kugeza ku masaha 24 kugira ngo ubone aho uheruka nyuma yo gusubira kuri urubuga. Ibi ni ububiko bwo kuri telefone yawe, si amateka y'aho wagiye.",
      },
      {
        title: "Igitekerezo utanze ku bushake",
        body: "Niba wemeje ku bushake gufasha kunoza amakuru y'aho uri, seriveri ibika kode y'Umudugudu, uburyo wakoresheje, urugero rw'ukuri rwa GPS n'aho telefone yari iri habanje kugabanywa ku bipimo bibiri nyuma ya decimal. Ntidusaba izina cyangwa nimero ya telefone muri icyo gikorwa. Ntugashyireho uruhushya niba utifuza gutanga ayo makuru.",
      },
      {
        title: "Amamenyesha na cookies",
        body: "Ihitamo ry'ururimi ribikwa muri browser yawe. Iyo wemeye Web Push notifications, serivisi ibika amakuru ya subscription ya browser, imfunguzo z'umutekano zayo na visitor ID itarimo izina; cookie ya visitor ID ishobora kumara umwaka umwe. Amamenyesha amwe abikwa muri browser ya telefone yawe. Ushobora guhagarika amamenyesha mu igenamiterere rya browser cyangwa telefone.",
      },
      {
        title: "Ibibazo ubaza Ishakiro",
        body: "Ikibazo wandika muri Ishakiro cyoherezwa kuri seriveri ya IWACU kugira ngo gisuzumwe kandi gisubizwe. Ikiganiro kigufi gishobora kugumana ubutumwa buheruka muri browser session kugira ngo gikomeze. Iyo optional AI model provider ifunguye ku ruhande rwa seriveri, ikibazo n'ubutumwa buheruka bishobora koherezwa kuri provider yatoranyijwe (Gemini cyangwa Groq) kugira ngo ifashe kumva ikibazo. Ntukandike ijambo ry'ibanga, nimero y'irangamuntu cyangwa andi makuru y'ibanga.",
      },
      {
        title: "Aderesi ya interineti n'abatanga serivisi",
        body: "API zimwe zikoresha aderesi ya interineti mu gihe gito kugira ngo zigabanye ikoreshwa rirenze urugero. IWACU ikoresha Vercel mu kwakira urubuga na Supabase mu kubika amakuru ya serivisi. Izo serivisi zishobora gutunganya amakuru ya tekiniki akenewe mu kwakira no kurinda sisitemu, hakurikijwe igenamiterere n'amabwiriza yazo. Igenamiterere ry'igihe izo serivisi zibika logs rigomba kugenzurwa na nyir'urubuga.",
      },
      {
        title: "Kwamamaza n'amatangazo",
        body: "Mu igenzura rya code ryo ku wa 10 Ugushyingo 2026, nta Google AdSense script cyangwa Google advertising cookie twasanze biri mu rubuga. Nitumara kwemererwa no gufungura amatangazo, tuzavugurura aya mabwiriza mbere yo kuyatangiza. Abatanga amatangazo, harimo Google n'abafatanyabikorwa bayo, bashobora gukoresha cookies kugira ngo berekane amatangazo ashingiye ku gusura uru rubuga cyangwa izindi mbuga. Ushobora guhindura personalized ads muri Google Ads Settings.",
      },
      {
        title: "Uburenganzira n'uko watanga ubusabe",
        body: "Amategeko y'u Rwanda arimo uburenganzira bwo gusaba kumenya amakuru akureba, kuyakosora, gusaba ko atunganywa mu buryo bugabanyijwe cyangwa ko asibwa igihe amategeko abiteganya, no gukuraho uruhushya watanze. Ushobora kohereza ubusabe bujyanye n'amakuru yawe bwite kuri izereeddy244@gmail.com cyangwa guhamagara +250 792 053 086. Iyi ni email y'ubufasha yakira n'ubusabe bw'ibanga ry'amakuru. Tanga amakuru akenewe gusa; ntwohereze ijambo ry'ibanga cyangwa nimero y'irangamuntu.",
      },
    ],
    notice: {
      title: "Icyitonderwa cy'ingenzi mbere yo kwamamaza",
      body: "Aya ni amabwiriza y'ibanze yateguwe hakurikijwe uko code iriho ikora; si icyemezo cy'uko ibisabwa byose mu mategeko byamaze kubahirizwa. Nyir'urubuga agomba kwemeza umwirondoro n'aderesi by'ushinzwe amakuru, igihe amakuru abikwa, amasezerano y'abatunganya amakuru n'uburyo bwo kwakira ubusabe bw'abakoresha mbere yo gushyira amatangazo ku rubuga.",
    },
    links: [
      { label: "Itegeko ry'u Rwanda No 058/2021 — DPO", href: "https://dpo.gov.rw/dpp-law/general-provisions", external: true },
      { label: "Uburenganzira bw'ufite amakuru — DPO", href: "https://dpo.gov.rw/dpp-law/rights-of-the-data-subject", external: true },
      { label: "Google Ads Settings", href: "https://adssettings.google.com/", external: true },
      { label: "AboutAds opt-out", href: "https://www.aboutads.info/", external: true },
    ],
  },
  contact: {
    eyebrow: "TUVUGISHE",
    title: "Uko watugezaho ikibazo cyangwa igitekerezo",
    seoTitle: "Twandikire | IWACU RWANDA",
    seoDescription: "Menya inzira ziriho zo gutanga raporo ku makuru y'aho uri, ku bayobozi cyangwa ku mikorere ya IWACU RWANDA.",
    lead: "Dushaka ko amakuru agaragara kuri IWACU aba afitiwe ishingiro. Koresha inzira ihuye n'ikibazo kugira ngo raporo igere ahantu hakwiye.",
    updated: "Amakuru yasuzumwe: 11 Ugushyingo 2026",
    sections: [
      {
        title: "Gukosora aho urubuga rukweretse",
        body: "Ku rupapuro rw'ibanze, kanda “Si hano?” kugira ngo uhindure ahagaragajwe. Ushobora gukoresha ikarita cyangwa guhitamo ahantu ku rutonde. Ntukohereze coordinates z'urugo rwawe mu butumwa rusange.",
      },
      {
        title: "Kumenyesha ikibazo ku muyobozi",
        body: "Ku mwirondoro w'umuyobozi cyangwa ku rutonde rwe, koresha “Hari ikibazo kuri aya makuru?” niba ihari. Hitamo ubwoko bw'ikibazo kandi wandike ibisobanuro bitarimo amakuru y'ibanga. Raporo ifasha gusuzuma inyandiko; ntabwo ihita ihindura amakuru agaragara kuri bose.",
      },
      {
        title: "Ikibazo cya tekiniki cyangwa ubusabe rusange",
        body: "Ku kibazo cya tekiniki, igitekerezo cyangwa ubusabe bw'ibanga ry'amakuru, hamagara +250 792 053 086 cyangwa andikira izereeddy244@gmail.com. Izi ni inzira z'ubufasha zatanzwe na nyir'urubuga. Ntushyire ijambo ry'ibanga, nimero y'irangamuntu cyangwa amakuru y'ibanga atari ngombwa mu butumwa.",
      },
      {
        title: "Ubutabazi bwihutirwa",
        body: "IWACU si serivisi y'ubutabazi. Mu gihe ukeneye ubufasha bwihuse, hamagara 112 cyangwa ukoreshe indi nimero yemewe igaragara mu gice cy'Ubutabazi ku rubuga.",
      },
    ],
    notice: {
      title: "Ubufasha bwa IWACU RWANDA",
      body: "Ushobora guhamagara +250 792 053 086 cyangwa kohereza email kuri izereeddy244@gmail.com ku bibazo rusange no ku busabe bujyanye n'ibanga ry'amakuru.",
    },
    links: [
      { label: "GitHub — umushinga wa IWACU RWANDA", href: "https://github.com/eddyizere24-collab/Iwacu-Rwanda-", external: true },
      { label: "Subira ku rubuga rw'ibanze", href: "/" },
    ],
  },
  terms: {
    eyebrow: "AMABWIRIZA YO GUKORESHA",
    title: "Amabwiriza agenga imikoreshereze ya IWACU RWANDA",
    seoTitle: "Amabwiriza yo gukoresha | IWACU RWANDA",
    seoDescription: "Amabwiriza n'imbibi z'imikoreshereze y'amakuru, ikarita na serivisi za IWACU RWANDA.",
    lead: "Iyo ukoresha IWACU RWANDA uba wemeye gukoresha serivisi mu buryo bwubaha abandi, amategeko n'uburenganzira bw'inkomoko y'amakuru.",
    updated: "Verisiyo yasuzumwe: 10 Ugushyingo 2026",
    sections: [
      {
        title: "Serivisi itanga amakuru",
        body: "IWACU RWANDA itanga ibikoresho byo gushaka ahantu, gusobanukirwa inzego z'ubuyobozi no kureba inyandiko rusange z'abayobozi iyo ziboneka. Ni urubuga rwigenga, si urubuga rwa Leta kandi ntirusimbura inyandiko cyangwa icyemezo bitangwa n'urwego rubifitiye ububasha.",
      },
      {
        title: "Ukuri kw'amakuru n'aho agarukira",
        body: "GPS, ikarita n'imbibi bishobora kugira amakosa cyangwa kubura amakuru. Imibare n'inyandiko bishobora kuvugururwa nyuma yo kugaragara kuri IWACU. Ntukoreshe ikigereranyo cy'aho uri nk'icyemezo cy'ubutaka, aho uba mu buryo bw'amategeko cyangwa gihamya y'ubuyobozi.",
      },
      {
        title: "Uko ugomba gukoresha urubuga",
        body: "Ntukoreshe urubuga mu buryo bwangiza serivisi, bugerageza kwinjira mu makuru atagenewe rubanda, bwohereza ubutumwa bwinshi mu buryo bwikora cyangwa bukusanya amakuru bwite y'abandi nta burenganzira. Ntukagerageze gukora ibikorwa byongera amatangazo cyangwa gukanda amatangazo mu buryo bw'uburiganya.",
      },
      {
        title: "Inkomoko n'uburenganzira",
        body: "Amakuru n'amafoto ashobora kugengwa n'amabwiriza y'uruhushya rw'inkomoko yabyo. Ikarita ya OpenStreetMap igengwa na ODbL; amafoto amwe agengwa na CC BY, CC BY-SA cyangwa CC0. Reba inkomoko n'uruhushya mbere yo gukoporora cyangwa gukwirakwiza.",
      },
      {
        title: "Guhindura amabwiriza",
        body: "Aya mabwiriza ashobora kuvugururwa igihe imikorere ya serivisi, inkomoko y'amakuru cyangwa amategeko bihindutse. Itariki iri hejuru yerekana igihe inyandiko iheruka gusuzumwa.",
      },
    ],
    notice: {
      title: "Ntukishingikirize kuri IWACU mu bihe byihutirwa",
      body: "Mu kibazo cyihutirwa, hamagara serivisi z'ubutabazi. Ntutegereze ko ikarita cyangwa umufasha wa AI biguha igisubizo.",
    },
    links: [
      { label: "Inkomoko y'amakuru", href: "/data-sources" },
      { label: "Amabwiriza y'ibanga", href: "/privacy" },
    ],
  },
};

const en: Record<SitePageKey, SitePageContent> = {
  about: {
    eyebrow: "ABOUT IWACU RWANDA",
    title: "Know where you are. Understand the place around you.",
    seoTitle: "About IWACU RWANDA",
    seoDescription: "Learn what IWACU RWANDA is designed to do, the information it provides and the principles it follows.",
    lead: "IWACU RWANDA is an independent information platform designed to help people identify their administrative area and understand public information about places and local administration in Rwanda.",
    updated: "Reviewed: 10 November 2026",
    sections: [
      {
        title: "Our purpose",
        body: "We want residents to understand where they are in Rwanda's administrative structure, find information about that area and reach published leader information when verified public records are available.",
        items: [
          "Show the administrative level supported by the available location evidence.",
          "Explain provinces, the City of Kigali, districts, sectors, cells and villages.",
          "Provide emergency information and other facts with identifiable sources.",
        ],
      },
      {
        title: "Our principles",
        body: "People's trust comes first. We do not invent leader names, phone numbers, boundaries or statistics. When information is missing, incomplete or uncertain, the service should say so instead of presenting an unverified answer.",
        items: [
          "Show the source of information when known.",
          "Explain when GPS or boundary data is not sufficient.",
          "Distinguish verified information from an estimate.",
          "Protect personal information and collect as little as possible.",
        ],
      },
      {
        title: "What IWACU RWANDA is and is not",
        body: "IWACU RWANDA is an independent technology service. It is not a government website and does not replace public authorities, emergency services, official records or administrative procedures. Leader information is displayed only when approved public records are available.",
      },
    ],
    notice: {
      title: "Information may be incomplete",
      body: "Administrative boundaries and leader records can change. When the service says information is unavailable, that does not prove that an administrative unit or leader does not exist.",
    },
    links: [
      { label: "How IWACU works", href: "/how-it-works" },
      { label: "Rwanda's administration", href: "/rwanda-administration" },
    ],
  },
  "how-it-works": {
    eyebrow: "HOW TO USE THE SERVICE",
    title: "How IWACU RWANDA works",
    seoTitle: "How IWACU RWANDA works",
    seoDescription: "Learn how to identify your location, check place information and view public leader records.",
    lead: "IWACU uses available device-location signals and stored boundary data to identify the administrative level supported by the evidence it receives.",
    updated: "Reviewed: 10 November 2026",
    sections: [
      {
        title: "1. Find your location",
        body: "Tap “Find your location” and allow Location access when your phone asks. The browser may provide GPS or a network-assisted estimate. Availability and accuracy depend on your device, permissions, connectivity and surroundings.",
      },
      {
        title: "2. Understand the result",
        body: "The service compares the location reported by your device with the administrative boundaries in its data. It shows the finest level supported by the available evidence. A confidence value is an estimate based on available data; it is not a guarantee that GPS is exact or a legal determination of your location.",
        items: [
          "GPS may be inaccurate indoors or among tall buildings.",
          "When evidence is insufficient, the service may show a district, sector or higher level rather than inventing a village.",
          "Use “Not here?” to correct the displayed place with the map or the place list.",
        ],
      },
      {
        title: "3. View leader information",
        body: "When approved and published public leader records are available, the service may show a public profile and contact methods approved for publication. If no record is available, we do not add an invented name or phone number.",
      },
      {
        title: "4. Use Ishakiro",
        body: "Iwacu AI, also called Ishakiro, helps people search for and understand information about places and Rwanda's administrative structure. It should answer only when verified information supports the answer. Missing or unverified information must be identified as such.",
      },
    ],
    notice: {
      title: "For an emergency",
      body: "Do not wait for this website to respond. Use your phone to contact emergency services; 112 is the Rwanda Police emergency number.",
    },
    links: [
      { label: "Return to the home page", href: "/" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
  "rwanda-administration": {
    eyebrow: "RWANDA'S ADMINISTRATION",
    title: "How Rwanda's administrative structure is organised",
    seoTitle: "Rwanda's administrative structure",
    seoDescription: "Understand Rwanda's administrative levels and the national figures published by the Government of Rwanda.",
    lead: "Rwanda's administrative structure runs from the national level down to villages. The figures below come from the Government of Rwanda website, checked on 10 November 2026.",
    updated: "Source: Government of Rwanda Overview; checked 10 November 2026.",
    sections: [
      {
        title: "Administrative levels",
        body: "For the purposes of the place hierarchy shown by this service, the levels run from the national level to provinces and the City of Kigali, districts, sectors, cells and villages.",
        items: [
          "National level",
          "4 Provinces and the City of Kigali (Kigali City is at the same first level, but it is not a fifth Province).",
          "30 districts",
          "416 sectors",
          "2,148 cells",
          "14,837 villages",
        ],
      },
      {
        title: "The difference between a Province and Kigali City",
        body: "The Government lists 4 Provinces and the City of Kigali as separate first-level entities. Kigali City is therefore not a fifth Province. In the place selector, both may appear at the same level so residents can choose the correct first-level area.",
      },
      {
        title: "What these figures mean",
        body: "These are national figures published by the Government of Rwanda. They are not a count calculated from IWACU's stored boundary index. Administrative figures can be revised by the responsible authorities; use the source below to see when we last checked them.",
      },
    ],
    notice: {
      title: "A note about the village total",
      body: "The boundary index in the IWACU repository at the time of review contained 14,823 village records, while the Government website published 14,837. We do not use the IWACU boundary index to state the national total. We use the Government figure and disclose the difference where relevant.",
    },
    links: [
      { label: "Government of Rwanda — Overview", href: "https://www.gov.rw/overview", external: true },
      { label: "Government of Rwanda — Governance", href: "https://www.gov.rw/highlights/governance", external: true },
    ],
  },
  "data-sources": {
    eyebrow: "SOURCES AND DATA METHOD",
    title: "Data sources and administrative boundaries",
    seoTitle: "Data sources and boundaries",
    seoDescription: "Review the sources of Rwanda administrative figures, boundary data, map information and photographs used by IWACU RWANDA.",
    lead: "IWACU identifies the source of information when known. National statistics, local administrative boundaries and map data are different datasets and do not necessarily come from the same source.",
    updated: "Reviewed: 10 November 2026",
    sections: [
      {
        title: "Administrative figures",
        body: "The figures for Provinces, the City of Kigali, districts, sectors, cells and villages shown here come from the Government of Rwanda website. On 10 November 2026, it listed 4 Provinces and the City of Kigali, 30 districts, 416 sectors, 2,148 cells and 14,837 villages.",
      },
      {
        title: "Administrative boundaries",
        body: "The service uses administrative boundary information attributed to the National Institute of Statistics of Rwanda (NISR), as stated in the boundary source attribution. These boundaries help compare a device location with an administrative area. Coverage and freshness depend on the dataset stored by the service.",
      },
      {
        title: "Map information",
        body: "The map uses OpenStreetMap data. OpenStreetMap data is made available under the Open Data Commons Open Database License (ODbL). The map tiles are built with Planetiler, MapLibre GL JS and PMTiles; these are software tools, not authorities that certify administrative boundaries.",
      },
      {
        title: "Photographs and licences",
        body: "Photographs are selected from real places and their source and licence are recorded in the site's photo credits. Some images are used under CC BY, CC BY-SA or CC0 terms. Check the individual image record before reusing it elsewhere.",
      },
      {
        title: "How differences are handled",
        body: "When Government figures differ from the number of records in IWACU's boundary dataset, we do not alter one figure to make it match the other. We identify the source of each figure and document the difference until a verified dataset update is available.",
      },
    ],
    notice: {
      title: "A boundary map is not a land-title decision",
      body: "IWACU's map and boundaries are intended to help people understand a place. They do not replace land records, a survey by a qualified surveyor or a decision by the competent authority.",
    },
    links: [
      { label: "National Institute of Statistics of Rwanda", href: "https://www.statistics.gov.rw/", external: true },
      { label: "Government of Rwanda — Overview", href: "https://www.gov.rw/overview", external: true },
      { label: "OpenStreetMap copyright and licence", href: "https://www.openstreetmap.org/copyright", external: true },
      { label: "Open Database License (ODbL)", href: "https://opendatacommons.org/licenses/odbl/", external: true },
      { label: "Photo credits and sources", href: "/amenyesha" },
    ],
  },
  privacy: {
    eyebrow: "PRIVACY AND PERSONAL INFORMATION",
    title: "Privacy policy",
    seoTitle: "Privacy policy | IWACU RWANDA",
    seoDescription: "Understand what information IWACU RWANDA processes, why it is used and how your privacy is protected.",
    lead: "This policy describes information that may be processed when you use IWACU RWANDA. It reflects the implementation reviewed in the code; any future advertising service must be disclosed before it is enabled.",
    updated: "Reviewed version: 11 November 2026",
    sections: [
      {
        title: "Location information",
        body: "When you use “Find your location”, your browser or phone may provide latitude and longitude so the service can compare your location with administrative boundaries. You do not need an account. A copy of the last location result may be stored in your browser on this device for up to 24 hours so it can be restored when you return to the page. This is a local device snapshot, not a travel history.",
      },
      {
        title: "Optional location feedback",
        body: "If you actively consent to help improve location data, the server stores the village code, the method used, the GPS accuracy value and a coarse version of the device location rounded to two decimal places. This feedback does not ask for your name or phone number. Do not grant consent if you do not want to provide this information.",
      },
      {
        title: "Notifications and cookies",
        body: "Your language choice is stored in your browser. If you subscribe to Web Push notifications, the service stores the browser subscription, its security keys and a random visitor ID that does not contain your name; the visitor ID cookie may last up to one year. Some notifications are stored locally in your browser. You can disable notifications in your browser or phone settings.",
      },
      {
        title: "Questions sent to Ishakiro",
        body: "A question entered in Ishakiro is sent to IWACU's server for processing and response. A short conversation may remain in the browser session so the discussion can continue. When an optional AI model provider is enabled on the server, the question and recent conversation turns may be sent to the selected provider (Gemini or Groq) to help interpret the request. Do not enter passwords, identity numbers or other confidential information.",
      },
      {
        title: "Internet address and service providers",
        body: "Some APIs use an internet address temporarily to limit excessive requests. IWACU uses Vercel to host the website and Supabase to store service data. These providers may process technical information needed to host and secure the service under their own settings and policies. The website owner must verify the providers' log-retention settings.",
      },
      {
        title: "Advertising and advertising cookies",
        body: "In the code review on 10 November 2026, no Google AdSense script or Google advertising cookie was found on the website. When advertising is approved and enabled, this policy will be updated first. Advertising providers, including Google and its partners, may use cookies to serve ads based on visits to this site or other sites. You can manage personalised advertising in Google Ads Settings.",
      },
      {
        title: "Your rights and how to make a request",
        body: "Rwanda's law provides rights that may include asking whether personal information is processed, requesting access or correction, requesting restriction or erasure where the law allows, and withdrawing consent. You may submit privacy-related requests to izereeddy244@gmail.com or call +250 792 053 086. This owner-provided support email is also the contact channel for privacy requests. Share only the information needed to handle your request; do not send passwords or identity numbers.",
      },
    ],
    notice: {
      title: "Important before advertising begins",
      body: "This is a baseline policy drafted from the current code, not a legal certification that every requirement has been met. The site owner must confirm the controller's identity and contact details, retention periods, processor arrangements and a working way to receive privacy requests before ads are placed on the site.",
    },
    links: [
      { label: "Rwanda DPP Law — Data Protection & Privacy Office", href: "https://dpo.gov.rw/dpp-law/general-provisions", external: true },
      { label: "Data subject rights — DPO", href: "https://dpo.gov.rw/dpp-law/rights-of-the-data-subject", external: true },
      { label: "Google Ads Settings", href: "https://adssettings.google.com/", external: true },
      { label: "AboutAds opt-out", href: "https://www.aboutads.info/", external: true },
    ],
  },
  contact: {
    eyebrow: "CONTACT AND FEEDBACK",
    title: "How to report an issue or share feedback",
    seoTitle: "Contact IWACU RWANDA",
    seoDescription: "Find the available ways to report a location problem, a leader-record issue or a technical problem with IWACU RWANDA.",
    lead: "We want the information shown by IWACU to be supported by evidence. Use the route that matches the issue so the report reaches the right part of the service.",
    updated: "Information reviewed: 11 November 2026",
    sections: [
      {
        title: "Correct a displayed location",
        body: "On the home page, tap “Not here?” to correct the displayed place. You can use the map or select a place from the list. Do not post your home coordinates in a public message.",
      },
      {
        title: "Report a leader-record problem",
        body: "On a leader profile or directory entry, use “Is there a problem with this information?” when that control is available. Select an issue type and explain the problem without including confidential information. A report is reviewed; it does not automatically change public records.",
      },
      {
        title: "General or technical enquiries",
        body: "For technical issues, feedback or privacy-related requests, call +250 792 053 086 or email izereeddy244@gmail.com. These support contacts were provided by the site owner. Do not include passwords, identity numbers or unnecessary confidential information in your message.",
      },
      {
        title: "Emergency assistance",
        body: "IWACU is not an emergency-response service. For immediate help, call 112 or use another verified emergency number listed in the site's Emergency section.",
      },
    ],
    notice: {
      title: "IWACU RWANDA support",
      body: "Call +250 792 053 086 or email izereeddy244@gmail.com for general enquiries and privacy-related requests.",
    },
    links: [
      { label: "IWACU RWANDA on GitHub", href: "https://github.com/eddyizere24-collab/Iwacu-Rwanda-", external: true },
      { label: "Return to the home page", href: "/" },
    ],
  },
  terms: {
    eyebrow: "TERMS OF USE",
    title: "Terms for using IWACU RWANDA",
    seoTitle: "Terms of use | IWACU RWANDA",
    seoDescription: "Terms and limitations for using IWACU RWANDA information, maps and services.",
    lead: "By using IWACU RWANDA, you agree to use the service in ways that respect other people, the law and the rights attached to information sources.",
    updated: "Reviewed version: 10 November 2026",
    sections: [
      {
        title: "An information service",
        body: "IWACU RWANDA provides tools to search for places, understand administrative levels and view public leader records when available. It is an independent service, not a government website, and does not replace an official record or decision by a competent authority.",
      },
      {
        title: "Accuracy and limitations",
        body: "GPS, maps and boundaries may be inaccurate or incomplete. Statistics and records may change after they appear on IWACU. Do not treat a location estimate as a land-title decision, a legal proof of residence or an official administrative determination.",
      },
      {
        title: "Acceptable use",
        body: "Do not use the service to disrupt operations, access information that is not intended for the public, submit excessive automated requests or collect other people's personal information without authority. Do not attempt to generate advertising impressions or clicks artificially.",
      },
      {
        title: "Sources and intellectual property",
        body: "Information and images may be subject to the licence terms of their original sources. OpenStreetMap data is made available under ODbL; some photographs are used under CC BY, CC BY-SA or CC0 terms. Check the source and licence before copying or redistributing material.",
      },
      {
        title: "Changes to these terms",
        body: "These terms may be updated when the service, its data sources or applicable requirements change. The date above shows when the text was last reviewed.",
      },
    ],
    notice: {
      title: "Do not rely on IWACU in an emergency",
      body: "For an emergency, contact the relevant emergency service. Do not wait for a map or AI assistant to respond.",
    },
    links: [
      { label: "Data sources", href: "/data-sources" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
};

const fr: Record<SitePageKey, SitePageContent> = {
  about: {
    eyebrow: "À PROPOS D'IWACU RWANDA",
    title: "Savoir où vous êtes et comprendre votre environnement.",
    seoTitle: "À propos d'IWACU RWANDA",
    seoDescription: "Découvrez la mission d'IWACU RWANDA, les informations proposées et les principes qui guident le service.",
    lead: "IWACU RWANDA est une plateforme d'information indépendante conçue pour aider les personnes à identifier leur entité administrative et à comprendre les informations publiques relatives aux lieux et à l'administration locale au Rwanda.",
    updated: "Vérifié le : 10 novembre 2026",
    sections: [
      {
        title: "Notre objectif",
        body: "Nous souhaitons aider les habitants à comprendre leur position dans l'organisation administrative du Rwanda, à trouver des informations sur leur localité et à consulter les informations publiées sur les responsables lorsque des données publiques vérifiées sont disponibles.",
        items: [
          "Afficher le niveau administratif étayé par les éléments de localisation disponibles.",
          "Expliquer les provinces, la Ville de Kigali, les districts, les secteurs, les cellules et les villages.",
          "Fournir des informations d'urgence et d'autres faits accompagnés de leurs sources.",
        ],
      },
      {
        title: "Nos principes",
        body: "La confiance des utilisateurs est notre priorité. Nous n'inventons ni noms de responsables, ni numéros de téléphone, ni limites administratives, ni statistiques. Lorsque les informations sont absentes, incomplètes ou incertaines, le service doit le signaler au lieu de présenter une réponse non vérifiée.",
        items: [
          "Indiquer la source des informations lorsqu'elle est connue.",
          "Expliquer lorsque le GPS ou les données de limites ne suffisent pas.",
          "Distinguer les informations vérifiées des estimations.",
          "Protéger les données personnelles et en collecter le minimum nécessaire.",
        ],
      },
      {
        title: "Ce qu'est IWACU RWANDA et ce qu'il n'est pas",
        body: "IWACU RWANDA est un service technologique indépendant. Ce n'est pas un site gouvernemental et il ne remplace ni les autorités publiques, ni les services d'urgence, ni les documents officiels, ni les procédures administratives. Les informations sur les responsables ne sont affichées que lorsque des données publiques approuvées et publiées sont disponibles.",
      },
    ],
    notice: {
      title: "Les informations peuvent être incomplètes",
      body: "Les limites administratives et les dossiers des responsables peuvent changer. Lorsque le service indique qu'une information est indisponible, cela ne prouve pas qu'une entité administrative ou un responsable n'existe pas.",
    },
    links: [
      { label: "Comment fonctionne IWACU", href: "/how-it-works" },
      { label: "Administration du Rwanda", href: "/rwanda-administration" },
    ],
  },
  "how-it-works": {
    eyebrow: "GUIDE D'UTILISATION",
    title: "Comment fonctionne IWACU RWANDA",
    seoTitle: "Comment fonctionne IWACU RWANDA",
    seoDescription: "Découvrez comment identifier votre position, vérifier les informations d'un lieu et consulter les dossiers publics des responsables.",
    lead: "IWACU utilise les signaux de localisation disponibles sur l'appareil et les données de limites administratives stockées pour identifier le niveau étayé par les éléments reçus.",
    updated: "Vérifié le : 10 novembre 2026",
    sections: [
      {
        title: "1. Déterminer votre position",
        body: "Appuyez sur « Trouver ma position » et autorisez l'accès à la localisation lorsque votre téléphone le demande. Le navigateur peut fournir une position GPS ou une estimation assistée par le réseau. La disponibilité et la précision dépendent de l'appareil, des autorisations, de la connexion et de l'environnement.",
      },
      {
        title: "2. Comprendre le résultat",
        body: "Le service compare la position transmise par l'appareil aux limites administratives présentes dans ses données. Il affiche le niveau le plus précis étayé par les éléments disponibles. Le niveau de confiance est une estimation fondée sur les données disponibles ; il ne garantit pas la précision du GPS et ne constitue pas une décision juridique sur votre localisation.",
        items: [
          "Le GPS peut être imprécis à l'intérieur des bâtiments ou entre de grands immeubles.",
          "Lorsque les éléments sont insuffisants, le service peut afficher un district, un secteur ou un niveau supérieur plutôt que d'inventer un village.",
          "Utilisez « Ce n'est pas ici » pour corriger le lieu affiché à l'aide de la carte ou de la liste.",
        ],
      },
      {
        title: "3. Consulter les informations sur les responsables",
        body: "Lorsque des dossiers publics de responsables approuvés et publiés sont disponibles, le service peut afficher un profil public et des moyens de contact autorisés à la publication. En l'absence de dossier, nous n'ajoutons ni nom ni numéro inventé.",
      },
      {
        title: "4. Utiliser Ishakiro",
        body: "Iwacu AI, également appelé Ishakiro, aide à rechercher et à comprendre les informations sur les lieux et l'organisation administrative du Rwanda. Il doit répondre uniquement lorsque des informations vérifiées étayent la réponse. Les informations absentes ou non vérifiées doivent être signalées comme telles.",
      },
    ],
    notice: {
      title: "En cas d'urgence",
      body: "N'attendez pas la réponse de ce site. Utilisez votre téléphone pour joindre les services d'urgence ; le 112 est le numéro d'urgence de la Police nationale du Rwanda.",
    },
    links: [
      { label: "Retour à l'accueil", href: "/" },
      { label: "Politique de confidentialité", href: "/privacy" },
    ],
  },
  "rwanda-administration": {
    eyebrow: "ADMINISTRATION DU RWANDA",
    title: "Organisation administrative du Rwanda",
    seoTitle: "Organisation administrative du Rwanda",
    seoDescription: "Comprendre les niveaux administratifs du Rwanda et les chiffres publiés par le Gouvernement du Rwanda.",
    lead: "L'organisation administrative du Rwanda va du niveau national jusqu'aux villages. Les chiffres ci-dessous proviennent du site du Gouvernement du Rwanda, vérifié le 10 novembre 2026.",
    updated: "Source : aperçu du Gouvernement du Rwanda ; vérifié le 10 novembre 2026.",
    sections: [
      {
        title: "Les niveaux administratifs",
        body: "Pour la hiérarchie des lieux présentée par ce service, les niveaux vont du niveau national aux provinces et à la Ville de Kigali, puis aux districts, secteurs, cellules et villages.",
        items: [
          "Niveau national",
          "4 provinces et la Ville de Kigali (Kigali est au même premier niveau, mais n'est pas une cinquième province).",
          "30 districts",
          "416 secteurs",
          "2 148 cellules",
          "14 837 villages",
        ],
      },
      {
        title: "Différence entre une province et la Ville de Kigali",
        body: "Le Gouvernement présente séparément les 4 provinces et la Ville de Kigali comme des entités distinctes de premier niveau. Kigali n'est donc pas une cinquième province. Dans le sélecteur de lieux, les deux peuvent apparaître au même niveau afin que les habitants puissent choisir la bonne entité.",
      },
      {
        title: "Signification de ces chiffres",
        body: "Il s'agit de chiffres nationaux publiés par le Gouvernement du Rwanda. Ils ne résultent pas d'un comptage de l'index des limites stocké par IWACU. Les chiffres administratifs peuvent être révisés par les autorités compétentes ; consultez la source ci-dessous pour connaître la date de notre dernière vérification.",
      },
    ],
    notice: {
      title: "Remarque sur le nombre de villages",
      body: "L'index des limites du dépôt IWACU au moment de la vérification contenait 14 823 villages, tandis que le site du Gouvernement en publiait 14 837. Nous n'utilisons pas l'index des limites d'IWACU pour annoncer le total national. Nous utilisons le chiffre du Gouvernement et signalons l'écart lorsque cela est pertinent.",
    },
    links: [
      { label: "Gouvernement du Rwanda — Aperçu", href: "https://www.gov.rw/overview", external: true },
      { label: "Gouvernement du Rwanda — Gouvernance", href: "https://www.gov.rw/highlights/governance", external: true },
    ],
  },
  "data-sources": {
    eyebrow: "SOURCES ET MÉTHODE",
    title: "Sources des données et limites administratives",
    seoTitle: "Sources des données et limites administratives",
    seoDescription: "Consultez les sources des statistiques administratives, des limites, de la carte et des photographies utilisées par IWACU RWANDA.",
    lead: "IWACU indique la source des informations lorsqu'elle est connue. Les statistiques nationales, les limites administratives locales et les données cartographiques sont des jeux de données différents et ne proviennent pas nécessairement de la même source.",
    updated: "Vérifié le : 10 novembre 2026",
    sections: [
      {
        title: "Chiffres administratifs",
        body: "Les chiffres concernant les provinces, la Ville de Kigali, les districts, les secteurs, les cellules et les villages présentés ici proviennent du site du Gouvernement du Rwanda. Le 10 novembre 2026, celui-ci indiquait 4 provinces et la Ville de Kigali, 30 districts, 416 secteurs, 2 148 cellules et 14 837 villages.",
      },
      {
        title: "Limites administratives",
        body: "Le service utilise des informations sur les limites administratives attribuées à l'Institut national de statistique du Rwanda (NISR), comme indiqué dans la mention de source des limites. Ces limites permettent de comparer la position d'un appareil à une zone administrative. La couverture et l'actualité dépendent du jeu de données stocké par le service.",
      },
      {
        title: "Données cartographiques",
        body: "La carte utilise les données d'OpenStreetMap, mises à disposition sous licence Open Data Commons Open Database License (ODbL). Les tuiles cartographiques sont générées avec Planetiler, MapLibre GL JS et PMTiles ; il s'agit d'outils logiciels et non d'autorités qui certifient les limites administratives.",
      },
      {
        title: "Photographies et licences",
        body: "Les photographies sont sélectionnées parmi des images de lieux réels et leur source et licence sont consignées dans les crédits photographiques du site. Certaines images sont utilisées sous les licences CC BY, CC BY-SA ou CC0. Vérifiez la fiche de chaque image avant de la réutiliser ailleurs.",
      },
      {
        title: "Traitement des écarts",
        body: "Lorsque les chiffres du Gouvernement diffèrent du nombre d'enregistrements dans le jeu de limites d'IWACU, nous ne modifions pas un chiffre pour le faire correspondre à l'autre. Nous indiquons la source de chaque chiffre et documentons l'écart jusqu'à ce qu'une mise à jour vérifiée du jeu de données soit disponible.",
      },
    ],
    notice: {
      title: "Une carte des limites n'est pas une décision foncière",
      body: "La carte et les limites d'IWACU servent à aider les personnes à comprendre un lieu. Elles ne remplacent ni les titres fonciers, ni le travail d'un géomètre qualifié, ni une décision de l'autorité compétente.",
    },
    links: [
      { label: "Institut national de statistique du Rwanda", href: "https://www.statistics.gov.rw/", external: true },
      { label: "Gouvernement du Rwanda — Aperçu", href: "https://www.gov.rw/overview", external: true },
      { label: "Droits d'auteur et licence OpenStreetMap", href: "https://www.openstreetmap.org/copyright", external: true },
      { label: "Open Database License (ODbL)", href: "https://opendatacommons.org/licenses/odbl/", external: true },
      { label: "Crédits et sources des photos", href: "/amenyesha" },
    ],
  },
  privacy: {
    eyebrow: "CONFIDENTIALITÉ ET DONNÉES PERSONNELLES",
    title: "Politique de confidentialité",
    seoTitle: "Politique de confidentialité | IWACU RWANDA",
    seoDescription: "Comprendre quelles informations IWACU RWANDA traite, pourquoi elles sont utilisées et comment votre vie privée est protégée.",
    lead: "Cette politique décrit les informations susceptibles d'être traitées lorsque vous utilisez IWACU RWANDA. Elle reflète le code examiné ; tout futur service publicitaire devra être déclaré avant son activation.",
    updated: "Version vérifiée : 11 novembre 2026",
    sections: [
      {
        title: "Informations de localisation",
        body: "Lorsque vous utilisez « Trouver ma position », votre navigateur ou téléphone peut transmettre la latitude et la longitude afin que le service compare votre position aux limites administratives. Aucun compte n'est nécessaire. Une copie du dernier résultat de localisation peut être conservée dans le navigateur de cet appareil pendant 24 heures au maximum afin de restaurer le résultat lorsque vous revenez sur la page. Il s'agit d'une copie locale sur l'appareil, et non d'un historique des déplacements.",
      },
      {
        title: "Retour facultatif sur la localisation",
        body: "Si vous consentez expressément à contribuer à l'amélioration des données de localisation, le serveur enregistre le code du village, la méthode utilisée, la précision GPS et une version approximative de la position de l'appareil arrondie à deux décimales. Ce retour ne demande ni votre nom ni votre numéro de téléphone. Ne donnez pas votre consentement si vous ne souhaitez pas fournir ces informations.",
      },
      {
        title: "Notifications et cookies",
        body: "Votre choix de langue est enregistré dans votre navigateur. Si vous vous abonnez aux notifications Web Push, le service enregistre l'abonnement du navigateur, ses clés de sécurité et un identifiant visiteur aléatoire qui ne contient pas votre nom ; le cookie de cet identifiant peut durer jusqu'à un an. Certaines notifications sont enregistrées localement dans votre navigateur. Vous pouvez désactiver les notifications dans les paramètres du navigateur ou du téléphone.",
      },
      {
        title: "Questions adressées à Ishakiro",
        body: "Une question saisie dans Ishakiro est envoyée au serveur d'IWACU pour traitement et réponse. Une courte conversation peut rester dans la session du navigateur afin de poursuivre l'échange. Lorsqu'un fournisseur de modèle IA facultatif est activé sur le serveur, la question et les derniers messages peuvent être transmis au fournisseur sélectionné (Gemini ou Groq) pour aider à interpréter la demande. Ne saisissez pas de mots de passe, de numéros d'identité ni d'autres informations confidentielles.",
      },
      {
        title: "Adresse Internet et prestataires",
        body: "Certaines API utilisent temporairement une adresse Internet afin de limiter les demandes excessives. IWACU utilise Vercel pour héberger le site et Supabase pour stocker les données du service. Ces prestataires peuvent traiter les informations techniques nécessaires à l'hébergement et à la sécurité selon leurs propres paramètres et politiques. Le propriétaire du site doit vérifier les paramètres de conservation des journaux de ces prestataires.",
      },
      {
        title: "Publicité et cookies publicitaires",
        body: "Lors de l'examen du code le 10 novembre 2026, aucun script Google AdSense ni cookie publicitaire Google n'a été trouvé sur le site. Lorsque la publicité sera approuvée et activée, cette politique sera d'abord mise à jour. Les fournisseurs de publicité, dont Google et ses partenaires, peuvent utiliser des cookies pour diffuser des annonces en fonction des visites sur ce site ou d'autres sites. Vous pouvez gérer la publicité personnalisée dans les paramètres des annonces Google.",
      },
      {
        title: "Vos droits et la manière de faire une demande",
        body: "La législation rwandaise prévoit notamment le droit de demander si des données personnelles sont traitées, d'en demander l'accès ou la rectification, de demander une limitation ou un effacement lorsque la loi le permet et de retirer un consentement. Vous pouvez envoyer vos demandes relatives aux données personnelles à izereeddy244@gmail.com ou appeler le +250 792 053 086. Cette adresse e-mail fournie par le propriétaire sert également aux demandes de confidentialité. Ne transmettez que les informations nécessaires ; n'envoyez ni mot de passe ni numéro d'identité.",
      },
    ],
    notice: {
      title: "Point important avant le lancement de la publicité",
      body: "Il s'agit d'une politique de base rédigée à partir du code actuel, et non d'une certification juridique que toutes les obligations sont satisfaites. Le propriétaire du site doit confirmer l'identité et les coordonnées du responsable du traitement, les durées de conservation, les accords avec les sous-traitants et un moyen opérationnel de recevoir les demandes relatives aux données avant d'afficher des annonces.",
    },
    links: [
      { label: "Loi rwandaise sur les données personnelles — DPO", href: "https://dpo.gov.rw/dpp-law/general-provisions", external: true },
      { label: "Droits de la personne concernée — DPO", href: "https://dpo.gov.rw/dpp-law/rights-of-the-data-subject", external: true },
      { label: "Paramètres des annonces Google", href: "https://adssettings.google.com/", external: true },
      { label: "Désactivation AboutAds", href: "https://www.aboutads.info/", external: true },
    ],
  },
  contact: {
    eyebrow: "CONTACT ET RETOURS",
    title: "Signaler un problème ou partager un avis",
    seoTitle: "Contacter IWACU RWANDA",
    seoDescription: "Découvrez les moyens disponibles pour signaler un problème de localisation, une erreur dans un dossier de responsable ou un problème technique.",
    lead: "Nous souhaitons que les informations affichées par IWACU reposent sur des éléments vérifiables. Utilisez le parcours adapté afin que le signalement soit transmis au bon service.",
    updated: "Informations vérifiées : 11 novembre 2026",
    sections: [
      {
        title: "Corriger le lieu affiché",
        body: "Sur la page d'accueil, appuyez sur « Ce n'est pas ici » pour corriger le lieu affiché. Vous pouvez utiliser la carte ou sélectionner un lieu dans la liste. Ne publiez pas les coordonnées de votre domicile dans un message public.",
      },
      {
        title: "Signaler un problème concernant un responsable",
        body: "Sur un profil ou une entrée de l'annuaire, utilisez « Un problème avec ces informations ? » lorsque ce contrôle est disponible. Choisissez le type de problème et décrivez-le sans inclure d'informations confidentielles. Un signalement est examiné ; il ne modifie pas automatiquement les données publiques.",
      },
      {
        title: "Demandes générales ou techniques",
        body: "Pour un problème technique, un avis ou une demande relative à la confidentialité, appelez le +250 792 053 086 ou écrivez à izereeddy244@gmail.com. Ces coordonnées d'assistance ont été fournies par le propriétaire du site. Ne communiquez ni mot de passe, ni numéro d'identité, ni information confidentielle inutile.",
      },
      {
        title: "Assistance d'urgence",
        body: "IWACU n'est pas un service d'intervention d'urgence. Pour obtenir une aide immédiate, appelez le 112 ou utilisez un autre numéro d'urgence vérifié affiché dans la section Urgence du site.",
      },
    ],
    notice: {
      title: "Assistance IWACU RWANDA",
      body: "Appelez le +250 792 053 086 ou écrivez à izereeddy244@gmail.com pour toute demande générale ou demande relative à la confidentialité.",
    },
    links: [
      { label: "IWACU RWANDA sur GitHub", href: "https://github.com/eddyizere24-collab/Iwacu-Rwanda-", external: true },
      { label: "Retour à l'accueil", href: "/" },
    ],
  },
  terms: {
    eyebrow: "CONDITIONS D'UTILISATION",
    title: "Conditions d'utilisation d'IWACU RWANDA",
    seoTitle: "Conditions d'utilisation | IWACU RWANDA",
    seoDescription: "Conditions et limites relatives à l'utilisation des informations, cartes et services d'IWACU RWANDA.",
    lead: "En utilisant IWACU RWANDA, vous acceptez d'utiliser le service dans le respect des autres personnes, de la loi et des droits attachés aux sources d'information.",
    updated: "Version vérifiée : 10 novembre 2026",
    sections: [
      {
        title: "Un service d'information",
        body: "IWACU RWANDA propose des outils pour rechercher des lieux, comprendre les niveaux administratifs et consulter des dossiers publics de responsables lorsqu'ils sont disponibles. Il s'agit d'un service indépendant, non d'un site gouvernemental, qui ne remplace pas un document officiel ni une décision d'une autorité compétente.",
      },
      {
        title: "Exactitude et limites",
        body: "Le GPS, les cartes et les limites peuvent être imprécis ou incomplets. Les statistiques et les dossiers peuvent changer après leur publication sur IWACU. Ne considérez pas une estimation de localisation comme une décision foncière, une preuve légale de résidence ou une détermination administrative officielle.",
      },
      {
        title: "Utilisation autorisée",
        body: "N'utilisez pas le service pour perturber son fonctionnement, accéder à des informations non destinées au public, envoyer des demandes automatisées excessives ou collecter les données personnelles d'autrui sans autorisation. N'essayez pas de générer artificiellement des impressions ou des clics publicitaires.",
      },
      {
        title: "Sources et propriété intellectuelle",
        body: "Les informations et images peuvent être soumises aux conditions de licence de leurs sources d'origine. Les données OpenStreetMap sont proposées sous licence ODbL ; certaines photographies sont utilisées sous CC BY, CC BY-SA ou CC0. Vérifiez la source et la licence avant toute copie ou redistribution.",
      },
      {
        title: "Modification des présentes conditions",
        body: "Ces conditions peuvent être mises à jour lorsque le service, ses sources de données ou les exigences applicables évoluent. La date ci-dessus indique la dernière vérification du texte.",
      },
    ],
    notice: {
      title: "Ne vous fiez pas à IWACU en cas d'urgence",
      body: "En cas d'urgence, contactez le service compétent. N'attendez pas la réponse d'une carte ou d'un assistant IA.",
    },
    links: [
      { label: "Sources des données", href: "/data-sources" },
      { label: "Politique de confidentialité", href: "/privacy" },
    ],
  },
};

export const SITE_PAGES: Record<Locale, Record<SitePageKey, SitePageContent>> = {
  rw,
  en,
  fr,
};

export function getSitePage(page: SitePageKey, locale: Locale): SitePageContent {
  return SITE_PAGES[locale][page];
}
