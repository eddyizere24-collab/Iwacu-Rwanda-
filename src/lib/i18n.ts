export type Locale = "rw" | "en" | "fr";

export const SUPPORTED_LOCALES: readonly Locale[] = ["rw", "en", "fr"] as const;

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "en" || value === "fr" ? value : "rw";
}

export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  rw: { short: "RW", name: "Kinyarwanda" },
  en: { short: "EN", name: "English" },
  fr: { short: "FR", name: "Français" },
};

const en: Record<string, string> = {
  "Iwacu AI": "Iwacu AI",
  "Muraho, ndi Iwacu AI.": "Hello, I am Iwacu AI.",
  "Muraho. Ndi Iwacu AI. Mbaza ikibazo cy'ahantu, umuyobozi, cyangwa nimero z'ubutabazi.": "Hello. I am Iwacu AI. Ask me about a place, a leader, or emergency numbers.",
  "Ndi Iwacu AI, umufasha wa AI wa IWACU RWANDA. Nagenewe kugufasha kubona no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi mu Rwanda, abayobozi n'amakuru y'ubutabazi. Nsubiza gusa iyo amakuru yagenzuwe ashyigikiye igisubizo; iyo amakuru abuze cyangwa atizewe, ndabikubwira aho kugira ngo mpimbe.": "I am Iwacu AI, the AI assistant of IWACU RWANDA. I help you find and understand information about places, Rwanda's administrative structure, local leaders and emergency services. I answer only when verified information supports the answer. When information is missing or uncertain, I tell you rather than inventing it.",
  "Ububiko bw'amakuru ntibwashoboye kuboneka ubu. Sinshobora kugenzura amakuru y'abayobozi muri iki gihe; ibi ntibihamya ko nta bayobozi bahari. Ongera ugerageze nyuma.": "The leaders database is unavailable right now. I cannot verify leader information at this time; this does not mean that no leaders exist. Please try again later.",
  "Menya aho uri.": "Find your location.",
  "Menya aho uri": "Find your location",
  "Abayobozi baho, hafi yawe.": "Local leaders, near you.",
  "Menya aho uri · Abayobozi baho, hafi yawe.": "Find your location · Local leaders near you.",
  "Amamenyesha yawe": "Your notifications",
  "Amamenyesha": "Notifications",
  "atarasomwa": "unread",
  "amamenyesha atarasomwa": "unread notifications",
  "Ubufasha": "Help",
  "Ubufasha (Help)": "Help",
  "Ubutabazi": "Emergency",
  "Ubutabazi bwihuse": "Emergency assistance",
  "Nimero z'ubutabazi": "Emergency numbers",
  "Izindi nimero": "Other numbers",
  "Hamagara 112": "Call 112",
  "Hamagara 112 ubutabazi bwa Polisi": "Call 112 for police assistance",
  "Polisi — ubutabazi bwihuse": "Police — emergency assistance",
  "· Zikora nta interineti": "· Works without internet",
  "Izi nimero ziri kuri telefone yawe. Zikora nta interineti.": "These numbers are available on your phone and work without an internet connection.",
  "Nimero z'ubutabazi ziri hasi hose ku rupapuro.": "Emergency numbers are available at the bottom of every page.",
  "Funga": "Close",
  "Nabyumvise": "Got it",
  "Subira": "Back",
  "Subira inyuma": "Go back",
  "Subira ku bisubizo": "Back to results",
  "Subira ku ntangiriro": "Back to home",
  "Vugurura": "Refresh",
  "Menya aho uri. Abayobozi baho, hafi yawe.": "Find your location. Local leaders near you.",
  "Si hano? Hindura (gukosora aho hantu)": "Not here? Correct the location",
  "Si hano? Hindura umudugudu (uburyo bwa nyuma)": "Not here? Choose a village",
  "Si hano? Gukosora aho uri": "Not here? Correct your location",
  "Amakuru yawe arinzwe (NCSA 058/2021)": "Your information is protected (NCSA 058/2021)",
  "Reka": "Cancel",
  "Turimo gusaba uruhushya...": "Requesting permission…",
  "Turimo gushaka aho uri...": "Finding your location…",
  "Turimo gushaka aho uri…": "Finding your location…",
  "Ongera ushake": "Try again",
  "Igereranyo cy'aho uri": "Estimated location",
  "Aho ibimenyetso byerekana": "Location indicated by available evidence",
  "Icyizere gihagije": "Sufficient confidence",
  "Ikigereranyo": "Estimate",
  "Icyizere": "Confidence",
  "Icyizere:": "Confidence:",
  "Uri hafi y'imbibi z'u Rwanda cyangwa ku nkengero z'ikiyaga. Turerekana Akarere kari hafi gusa.": "You appear to be near Rwanda's border or a lakeshore. We can only show the nearest district.",
  "\"Ikigereranyo\" bivuga ko aho hantu hashobora kuba ari ho uri, ariko ibimenyetso ntibirabyemeza.": "\"Estimated\" means this may be your location, but the available evidence has not confirmed it.",
  "Fasha kunoza urubuga (ubishatse gusa)": "Help improve the service (optional)",
  "Niba wemera, tubika gusa umudugudu wemeje n'aho hafi y'aho telefone yari iri. Ntidubika izina ryawe, telefone, konti cyangwa IP. Ushobora kutabyemera.": "With your permission, we store only the village you confirm and an approximate location from your phone. We do not store your name, phone number, account or IP address. You may decline.",
  "Nemeza ko aho ngaragaye ari ho, kandi nemeye gutanga aya makuru atarimo umwirondoro.": "I confirm that the displayed location is correct and agree to share this anonymous information.",
  "Urakoze. Igitekerezo cyawe cyakiriwe.": "Thank you. Your feedback has been received.",
  "Ntibyashobotse kubika igitekerezo. Ushobora gukomeza gukoresha urubuga.": "We could not save your feedback. You can continue using the service.",
  "Turimo kohereza...": "Sending…",
  "Emeza kandi wohereze": "Confirm and send",
  "Dukeneye kumenya aho uri": "We need to determine your location",
  "Telefone yawe iri bukubaze niba wemera kumenya aho uri. Nta konti ukeneye.": "Your phone will ask whether you allow location access. You do not need an account.",
  "Emera": "Allow",
  "Si ubu": "Not now",
  "Hitamo aho uri ku ikarita": "Choose your location on the map",
  "Kanda aho uri cyangwa ukurure akamenyetso. Imbibi zigaragara aho amakuru aboneka.": "Tap your location or drag the marker. Boundaries appear where data is available.",
  "Fungura ikarita": "Open map",
  "Funga ikarita": "Close map",
  "Turimo gufungura ikarita...": "Loading the map…",
  "Ikarita ntiyafungutse. Reba interineti cyangwa ukoreshe urutonde rw'imidugudu.": "The map did not load. Check your connection or use the village list.",
  "Ahantu wahisemo": "Selected location",
  "Koresha aha hantu": "Use this location",
  "Amakarita: © OpenStreetMap; imbibi z'imidugudu zivanwa muri database. IP cyangwa GPS ishobora kwibeshya; genzura umudugudu mbere yo kuwemeza.": "Maps: © OpenStreetMap; village boundaries come from the database. IP or GPS can be inaccurate; confirm the village before submitting.",
  "Kwegera ku ikarita kugira ngo ubone imbibi z'imidugudu.": "Zoom in on the map to see village boundaries.",
  "Amakuru yawe (Ibanga ry’amakuru)": "Your information (Privacy)",
  "Ntidusaba konti:": "No account required:",
  "Ntidusaba izina, ifoto cyangwa nimero ya telefone yawe.": "We do not ask for your name, photo or phone number.",
  "Aho uri:": "Your location:",
  "Twohereza aho uri gusa kuri seriveri yacu kugira ngo tumenye aho uri.": "We send your location to our server only to identify the area you are in.",
  "Ntitubika aho wabaye.": "We do not keep a history of where you have been.",
  "Umutekano w'urubuga:": "Service security:",
  "Mu kurinda urubuga gukoreshwa nabi, dukoresha aderesi ya interineti ya telefone yawe mu gihe gito gusa (rate limiting).": "To prevent misuse, your phone's internet address is used temporarily for rate limiting.",
  "Nimero z'abayobozi:": "Leaders' contact numbers:",
  "Zigaragara kuri bose mu rwego rwo korohereza umuturage kugera ku buyobozi, hubahirijwe amategeko y'uburinzi bw'amakuru bwite (NCSA Law No. 058/2021).": "They are shown publicly to help residents reach local authorities, in accordance with personal-data protection law (NCSA Law No. 058/2021).",
  "Uko ukoresha uru rubuga:": "How to use this service:",
  "Kanda": "Tap",
  "«Menya aho uri»": "“Find your location”",
  "Emera GPS": "Allow GPS",
  "telefone yawe niramuka ikubajije uruhushya.": "when your phone asks for permission.",
  "Reba abayobozi b'agace kawe, ubahamagare cyangwa ubandikire kuri WhatsApp.": "View the leaders in your area, call them or contact them on WhatsApp.",
  "Niba GPS ifunze:": "If GPS is turned off:",
  "Fungura:": "Open:",
  "Settings (Igenamiterere)": "Settings",
  "Location (Aho uri)": "Location",
  "› Fungura. Hanyuma ugaruke hano.": "› Turn it on, then return here.",
  "Ubutabazi bwihuse:": "Emergency assistance:",
  "«Hamagara 112»": "“Call 112”",
  "iyo ari ikibazo cyihutirwa.": "for an emergency.",
  "Ishakiro ry'Ubuhanga": "Smart search",
  "Shaka": "Search",
  "Turimo gushaka…": "Searching…",
  "Baza hano…": "Ask here…",
  "Ikibazo cy'urukurikirane mu gushakisha.": "There was a problem with the search request.",
  "Igisubizo cya AI": "AI answer",
  "Abayobozi babonetse muri aka gace": "Leaders found in this area",
  "Guhindura ahagaragajwe (Si hano?)": "Correct the displayed location (Not here?)",
  "Umudugudu wari wemeje mbere": "Previously confirmed village",
  "Ongera uwemeze": "Confirm it again",
  "Turimo gufungura uru rwego…": "Loading this administrative level…",
  "Aho uri mu nzego z'ubuyobozi": "Your location in the administrative hierarchy",
  "Shakisha ahantu": "Search for a place",
  "Nta mazina abitswe kuri uru rwego. Subira ku rwego rubanziriza cyangwa uhuze interineti.": "No names are saved for this level. Go back to the previous level or connect to the internet.",
  "Urutonde rwemewe rwubakiye mu rubuga, rukabikwa kuri telefone kugira ngo rukomeze gukora no offline.": "The official list is built into the service and stored on your phone so it can work offline.",
  "Nta menyesha urakira arabikwa": "No notifications have been saved yet",
  "Aha ni ho usubira kureba ubutumwa wigeze kwakira, harimo igihe wabwakiriye n'aho bwavugaga.": "Here you can review notifications you have received, including when they arrived and which area they referred to.",
  "Amamenyesha abikwa muri iyi telefone. Ushobora kuyasubiramo hano n'igihe utari kuri paji y'ibanze. Kuyasiba mu makuru ya browser bishobora kuyakuraho.": "Notifications are stored on this phone. You can review them here even when you are away from the home page. Clearing browser data may delete them.",
  "Turimo gufungura amamenyesha yawe...": "Loading your notifications…",
  "Nimara gukoresha “Menya aho uri” no kwemerera amamenyesha, ubutumwa bwawe buzatangira kugaragara hano.": "After you use “Find your location” and allow notifications, your messages will start appearing here.",
  "Byabitswe muri iyi telefone": "Saved on this phone",
  "Koporora raporo": "Copy report",
  "Raporo yakoporowewe. Ushobora kuyishyira mu butumwa bwo kuyigenzura.": "The report has been copied. You can attach it to a review message.",
  "Raporo yakoporowewe.": "The report has been copied.",
  "Ntibyashobotse kuyikoporora kuri iyi telefone.": "Could not copy it on this phone.",
  "Abayobozi b'aho uri": "Leaders in your area",
  "Tubwire umuyobozi": "Report a leader issue",
  "Turimo gushaka": "Searching",
  "Ifoto ya": "Photo of",
  "Funga ifoto": "Close photo",
  "Reba umwirondoro wa": "View the profile of",
  "Reba umwirondoro w'": "View the profile of ",
  "Ukuntu twizeye aho uri": "How confident we are in your location",
  "Hari ikibazo kuri aya makuru?": "Is there a problem with this information?",
  "Sobanura ikibazo mu magambo make...": "Briefly describe the problem…",
  "Ubwoko": "Type",
  "Ubutumwa": "Message",
  "Ishuri, ivuriro, isoko, itorero, igishanga cyangwa umugezi": "A school, clinic, market, church, wetland or river",
  "Reba ahantu ushobora kuba uri hafi": "See places that may be near you",
  "Reba niba uri hafi y'aha hantu:": "Check whether you are near these places:",
  "Turimo kureba ahantu handitse muri OpenStreetMap...": "Searching OpenStreetMap for nearby places…",
  "Amazi / ibishanga byagaragaye muri data:": "Water / wetlands found in the data:",
  "Amakuru y'ahantu hafi ntaraboneka ubu. Ikarita na GPS biracyakora ukwabyo.": "Nearby-place information is not available right now. The map and GPS still work independently.",
  "Ntabwo twabashije gufungura amakuru y'ahantu hafi. Ikarita iracyagufasha.": "We could not load nearby-place information. The map is still available.",
  "Inkomoko y'amakuru n'amafoto": "Data and photo credits",
  "yahinduwe mu mikoreshereze yayo": "adapted for this use",
  "yahinduwe mu bunini no mu mikoreshereze yayo": "resized and adapted for this use",
  "yeguriwe rubanda": "dedicated to the public domain",
  "Inkomoko y'imipaka:": "Boundary data source:",
  "Ikarita:": "Map:",
  "Ifoto y'imisozi ya Bigogwe:": "Bigogwe hills photo:",
  "Ifoto y'inyamaswa zo muri Pariki y'Akagera:": "Akagera National Park wildlife photo:",
  "Ifoto y'ibirunga byo muri Pariki y'Igihugu y'Ibirunga:": "Volcanoes National Park photo:",
  "Ifoto y'imirima y'icyayi mu Karere ka Nyabihu:": "Tea fields in Nyabihu District photo:",
  "Amafoto y'ingagi:": "Gorilla photographs:",
  "Kanda hano uvugurure urubuga": "Tap here to refresh the website",
  "IWACU RWANDA: subira ku ntangiriro kandi uvugurure urubuga": "IWACU RWANDA: return to the home page and refresh",
  "a": "a",
  "Akarere": "District",
  "Umurenge": "Sector",
  "Akagari": "Cell",
  "Umudugudu": "Village",
  "Intara": "Province",
  "Intara 5 z'u Rwanda": "Rwanda's 5 provinces",
  "Umujyi wa Kigali": "City of Kigali",
  "Amajyaruguru": "Northern",
  "Amajyepfo": "Southern",
  "Iburasirazuba": "Eastern",
  "Iburengerazuba": "Western",
  "Yemejwe": "Verified",
  "Byemejwe": "Verified",
  "Yemejwe ku wa": "Verified on",
  "Yatangiye akazi ku wa": "Started serving on",
  "Amasaha y'akazi": "Office hours",
  "Imihigo": "Performance commitments",
  "Ibiografi": "Biography",
  "Aho wahamagara": "Contact",
  "Hamagara": "Call",
  "Umwirondoro nturuzuzwa": "Profile not yet completed",
  "Icyemezo": "Verification",
  "Ahantu": "Location",
  "Koresha WhatsApp": "Contact on WhatsApp",
  "Nta muyobozi uremezwa": "No verified leader yet",
  "Serivisi y'abayobozi ntiri kuboneka.": "The leaders service is unavailable.",
  "Ikibazo cyabaye": "Something went wrong",
  "Mwihangane, ongera ugerageze.": "Sorry, please try again.",
  "GPS irafunze": "GPS is turned off",
  "Ntidushobora kumenya aho uri kuko telefone itatwemereye. Fungura: Settings › Location (Igenamiterere › Aho uri), wemerere iyi porogaramu.": "We cannot determine your location because your phone has not granted permission. Open Settings › Location and allow this service.",
  "Ibyoherejwe ntibisomeka": "The submitted information could not be read",
  "Aho uri ntihasomye neza. Ongera ugerageze cyangwa uhitemo aho uri ku rutonde.": "Your location could not be read clearly. Try again or choose a place from the list.",
  "Telefone ntiyabonye aho uri": "Your phone could not determine your location",
  "Ntitwashoboye kubona aho uri. Hitamo aho uri ku rutonde ruri hasi.": "We could not determine your location. Choose a place from the list below.",
  "Birimo gutinda": "This is taking longer than expected",
  "GPS yafashe igihe kirekire. Ushobora gukomeza uhitamo umudugudu ku rutonde ruri hasi.": "GPS is taking a while. You can continue by choosing a village from the list below.",
  "Iyi porogaramu ntishobora kumenya aho uri": "This browser cannot determine your location",
  "Gerageza indi porogaramu yo kureba imbuga (nka Chrome).": "Try another web browser, such as Chrome.",
  "Aho uri ntihasomye neza": "Your location could not be read clearly",
  "Ongera ugerageze.": "Please try again.",
  "Uri hanze y'u Rwanda": "You are outside Rwanda",
  "Iyi porogaramu ikora mu Rwanda gusa. Nimero z'ubutabazi z'u Rwanda ziracyaboneka.": "This service is available in Rwanda only. Rwanda's emergency numbers are still available.",
  "Ntitwabonye aho uri": "We could not identify your location",
  "Aho uri ntihaboneka mu mipaka dufite. Egera ahandi, wongere ugerageze.": "Your location is not covered by the boundaries we have. Move to a nearby place and try again.",
  "Uri ku mupaka": "You are near a boundary",
  "Uri hagati y'imidugudu ibiri. Turakwereka abayobozi b'iyo yombi.": "You are between two villages. We are showing leaders for both.",
  "Ntituzi neza aho uri": "Your location is uncertain",
  "Ntidushobora kwemeza aho uri. Ongera ugerageze uri ahafunguye.": "We cannot confirm your location. Try again in a more open area.",
  "Aka gace ntikaraboneka": "This area is not available yet",
  "Imipaka y'aka gace ntiratugeraho. Si ikibazo cya telefone yawe. Mwihangane, turakomeza kongeramo amakuru.": "We do not yet have boundary data for this area. This is not a problem with your phone. We are continuing to add information.",
  "Hari ikibazo cyacu": "There is a problem on our side",
  "Ntitubashije kubona amakuru ubu. Si ikibazo cyawe. Mwihangane, ongera ugerageze nyuma y'akanya gato.": "We cannot retrieve the information right now. This is not your fault. Please try again shortly.",
  "Interineti ntirimo gukora": "The internet connection is unavailable",
  "Ntitwabashije kugera ku rubuga. Reba interineti yawe, hanyuma wongere ugerageze.": "We could not reach the service. Check your internet connection and try again.",
  "Interineti iratinda": "The internet connection is slow",
  "Tegereza gato…": "Please wait…",
  "Nta interineti": "You are offline",
  "Dukoresha amakuru abitswe kuri telefone yawe. Abayobozi ntibagaragara, ariko nimero z'ubutabazi zirakora.": "We are using information saved on your phone. Leaders are not available, but emergency numbers still work.",
  "Mwihangane, tegereza gato": "Please wait a moment",
  "Wakanze inshuro nyinshi. Tegereza umunota umwe, hanyuma wongere ugerageze.": "You have tried too many times. Wait one minute, then try again.",
  "Ntibyabonetse": "Not found",
  "Ibyo ushaka ntibihari.": "The information you requested is not available.",
  "Nta muyobozi uremezwa aha. Reba ab'akagari cyangwa ab'umurenge.": "There is no verified leader listed here. Check the cell or sector leaders.",
  "Nta buryo bwo kuvugana": "No contact details available",
  "Uyu muyobozi ntaragira uburyo bwo kuvugana bwanditswe. Reba abayobozi b'urwego rukurikira.": "No contact details have been published for this leader. Check the leaders at the next administrative level.",
};

const fr: Record<string, string> = {
  "Iwacu AI": "Iwacu AI",
  "Muraho, ndi Iwacu AI.": "Bonjour, je suis Iwacu AI.",
  "Muraho. Ndi Iwacu AI. Mbaza ikibazo cy'ahantu, umuyobozi, cyangwa nimero z'ubutabazi.": "Bonjour. Je suis Iwacu AI. Posez une question sur un lieu, un responsable ou les numéros d'urgence.",
  "Ndi Iwacu AI, umufasha wa AI wa IWACU RWANDA. Nagenewe kugufasha kubona no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi mu Rwanda, abayobozi n'amakuru y'ubutabazi. Nsubiza gusa iyo amakuru yagenzuwe ashyigikiye igisubizo; iyo amakuru abuze cyangwa atizewe, ndabikubwira aho kugira ngo mpimbe.": "Je suis Iwacu AI, l'assistant d'intelligence artificielle d'IWACU RWANDA. Je vous aide à trouver et à comprendre les informations sur les lieux, l'organisation administrative du Rwanda, les responsables locaux et les services d'urgence. Je réponds uniquement lorsque des informations vérifiées étayent la réponse. Si des informations manquent ou sont incertaines, je vous le signale au lieu de les inventer.",
  "Ububiko bw'amakuru ntibwashoboye kuboneka ubu. Sinshobora kugenzura amakuru y'abayobozi muri iki gihe; ibi ntibihamya ko nta bayobozi bahari. Ongera ugerageze nyuma.": "La base de données des responsables est actuellement indisponible. Je ne peux pas vérifier ces informations pour le moment ; cela ne signifie pas qu'aucun responsable n'existe. Veuillez réessayer plus tard.",
  "Menya aho uri.": "Trouvez votre position.",
  "Menya aho uri": "Trouver ma position",
  "Abayobozi baho, hafi yawe.": "Les responsables locaux, près de vous.",
  "Menya aho uri · Abayobozi baho, hafi yawe.": "Votre position · Les responsables locaux près de vous.",
  "Amamenyesha yawe": "Vos notifications",
  "Amamenyesha": "Notifications",
  "atarasomwa": "non lues",
  "amamenyesha atarasomwa": "notifications non lues",
  "Ubufasha": "Aide",
  "Ubufasha (Help)": "Aide",
  "Ubutabazi": "Urgences",
  "Ubutabazi bwihuse": "Assistance d'urgence",
  "Nimero z'ubutabazi": "Numéros d'urgence",
  "Izindi nimero": "Autres numéros",
  "Hamagara 112": "Appeler le 112",
  "Hamagara 112 ubutabazi bwa Polisi": "Appeler le 112 pour joindre la police",
  "Polisi — ubutabazi bwihuse": "Police — assistance d'urgence",
  "· Zikora nta interineti": "· Fonctionne sans Internet",
  "Izi nimero ziri kuri telefone yawe. Zikora nta interineti.": "Ces numéros sont disponibles sur votre téléphone et fonctionnent sans connexion Internet.",
  "Nimero z'ubutabazi ziri hasi hose ku rupapuro.": "Les numéros d'urgence sont accessibles en bas de chaque page.",
  "Funga": "Fermer",
  "Nabyumvise": "J'ai compris",
  "Subira": "Retour",
  "Subira inyuma": "Revenir",
  "Subira ku bisubizo": "Retour aux résultats",
  "Subira ku ntangiriro": "Retour à l'accueil",
  "Vugurura": "Actualiser",
  "Menya aho uri. Abayobozi baho, hafi yawe.": "Trouvez votre position. Les responsables locaux près de vous.",
  "Si hano? Hindura (gukosora aho hantu)": "Ce n'est pas ici ? Corriger l'emplacement",
  "Si hano? Hindura umudugudu (uburyo bwa nyuma)": "Ce n'est pas ici ? Choisir un village",
  "Si hano? Gukosora aho uri": "Ce n'est pas ici ? Corriger votre position",
  "Amakuru yawe arinzwe (NCSA 058/2021)": "Vos informations sont protégées (NCSA 058/2021)",
  "Reka": "Annuler",
  "Turimo gusaba uruhushya...": "Demande d'autorisation…",
  "Turimo gushaka aho uri...": "Recherche de votre position…",
  "Turimo gushaka aho uri…": "Recherche de votre position…",
  "Ongera ushake": "Réessayer",
  "Igereranyo cy'aho uri": "Position estimée",
  "Aho ibimenyetso byerekana": "Position indiquée par les données disponibles",
  "Icyizere gihagije": "Niveau de confiance suffisant",
  "Ikigereranyo": "Estimation",
  "Icyizere": "Confiance",
  "Icyizere:": "Confiance :",
  "Uri hafi y'imbibi z'u Rwanda cyangwa ku nkengero z'ikiyaga. Turerekana Akarere kari hafi gusa.": "Vous semblez être près de la frontière du Rwanda ou d'un lac. Nous pouvons uniquement afficher le district le plus proche.",
  "\"Ikigereranyo\" bivuga ko aho hantu hashobora kuba ari ho uri, ariko ibimenyetso ntibirabyemeza.": "\"Estimation\" signifie qu'il pourrait s'agir de votre position, sans confirmation par les données disponibles.",
  "Fasha kunoza urubuga (ubishatse gusa)": "Aidez-nous à améliorer le service (facultatif)",
  "Niba wemera, tubika gusa umudugudu wemeje n'aho hafi y'aho telefone yari iri. Ntidubika izina ryawe, telefone, konti cyangwa IP. Ushobora kutabyemera.": "Avec votre accord, nous enregistrons uniquement le village que vous confirmez et une position approximative fournie par votre téléphone. Nous n'enregistrons ni votre nom, ni votre numéro, ni votre compte, ni votre adresse IP. Vous pouvez refuser.",
  "Nemeza ko aho ngaragaye ari ho, kandi nemeye gutanga aya makuru atarimo umwirondoro.": "Je confirme que la position affichée est correcte et j'accepte de partager ces informations anonymisées.",
  "Urakoze. Igitekerezo cyawe cyakiriwe.": "Merci. Votre avis a bien été reçu.",
  "Ntibyashobotse kubika igitekerezo. Ushobora gukomeza gukoresha urubuga.": "Nous n'avons pas pu enregistrer votre avis. Vous pouvez continuer à utiliser le service.",
  "Turimo kohereza...": "Envoi…",
  "Emeza kandi wohereze": "Confirmer et envoyer",
  "Dukeneye kumenya aho uri": "Nous devons déterminer votre position",
  "Telefone yawe iri bukubaze niba wemera kumenya aho uri. Nta konti ukeneye.": "Votre téléphone vous demandera l'autorisation d'accéder à votre position. Aucun compte n'est nécessaire.",
  "Emera": "Autoriser",
  "Si ubu": "Pas maintenant",
  "Hitamo aho uri ku ikarita": "Choisissez votre position sur la carte",
  "Kanda aho uri cyangwa ukurure akamenyetso. Imbibi zigaragara aho amakuru aboneka.": "Touchez votre position ou déplacez le repère. Les limites s'affichent lorsque les données sont disponibles.",
  "Fungura ikarita": "Ouvrir la carte",
  "Funga ikarita": "Fermer la carte",
  "Turimo gufungura ikarita...": "Chargement de la carte…",
  "Ikarita ntiyafungutse. Reba interineti cyangwa ukoreshe urutonde rw'imidugudu.": "La carte ne s'est pas chargée. Vérifiez votre connexion ou utilisez la liste des villages.",
  "Ahantu wahisemo": "Lieu sélectionné",
  "Koresha aha hantu": "Utiliser cet emplacement",
  "Amakarita: © OpenStreetMap; imbibi z'imidugudu zivanwa muri database. IP cyangwa GPS ishobora kwibeshya; genzura umudugudu mbere yo kuwemeza.": "Cartes : © OpenStreetMap ; les limites des villages proviennent de la base de données. Le GPS ou l'adresse IP peut être imprécis ; vérifiez le village avant de confirmer.",
  "Kwegera ku ikarita kugira ngo ubone imbibi z'imidugudu.": "Zoomez sur la carte pour afficher les limites des villages.",
  "Amakuru yawe (Ibanga ry’amakuru)": "Vos informations (confidentialité)",
  "Ntidusaba konti:": "Aucun compte requis :",
  "Ntidusaba izina, ifoto cyangwa nimero ya telefone yawe.": "Nous ne demandons ni votre nom, ni votre photo, ni votre numéro de téléphone.",
  "Aho uri:": "Votre position :",
  "Twohereza aho uri gusa kuri seriveri yacu kugira ngo tumenye aho uri.": "Nous transmettons votre position à notre serveur uniquement pour identifier la zone où vous vous trouvez.",
  "Ntitubika aho wabaye.": "Nous ne conservons pas l'historique de vos déplacements.",
  "Umutekano w'urubuga:": "Sécurité du service :",
  "Mu kurinda urubuga gukoreshwa nabi, dukoresha aderesi ya interineti ya telefone yawe mu gihe gito gusa (rate limiting).": "Pour prévenir les abus, l'adresse Internet de votre téléphone est utilisée temporairement pour limiter le nombre de requêtes.",
  "Nimero z'abayobozi:": "Coordonnées des responsables :",
  "Zigaragara kuri bose mu rwego rwo korohereza umuturage kugera ku buyobozi, hubahirijwe amategeko y'uburinzi bw'amakuru bwite (NCSA Law No. 058/2021).": "Elles sont affichées publiquement afin de faciliter le contact avec les autorités locales, conformément à la loi sur la protection des données personnelles (NCSA n° 058/2021).",
  "Uko ukoresha uru rubuga:": "Comment utiliser ce service :",
  "Kanda": "Touchez",
  "«Menya aho uri»": "« Trouver ma position »",
  "Emera GPS": "Autoriser le GPS",
  "telefone yawe niramuka ikubajije uruhushya.": "lorsque votre téléphone demande l'autorisation.",
  "Reba abayobozi b'agace kawe, ubahamagare cyangwa ubandikire kuri WhatsApp.": "Consultez les responsables de votre secteur, appelez-les ou contactez-les sur WhatsApp.",
  "Niba GPS ifunze:": "Si le GPS est désactivé :",
  "Fungura:": "Ouvrez :",
  "Settings (Igenamiterere)": "Paramètres",
  "Location (Aho uri)": "Localisation",
  "› Fungura. Hanyuma ugaruke hano.": "› Activez-la, puis revenez ici.",
  "Ubutabazi bwihuse:": "En cas d'urgence :",
  "«Hamagara 112»": "« Appeler le 112 »",
  "iyo ari ikibazo cyihutirwa.": "en cas d'urgence.",
  "Ishakiro ry'Ubuhanga": "Recherche intelligente",
  "Shaka": "Rechercher",
  "Turimo gushaka…": "Recherche en cours…",
  "Baza hano…": "Posez votre question…",
  "Ikibazo cy'urukurikirane mu gushakisha.": "Une erreur est survenue lors de la recherche.",
  "Igisubizo cya AI": "Réponse de l'IA",
  "Abayobozi babonetse muri aka gace": "Responsables trouvés dans cette zone",
  "Guhindura ahagaragajwe (Si hano?)": "Corriger l'emplacement affiché (Ce n'est pas ici ?)",
  "Umudugudu wari wemeje mbere": "Village confirmé précédemment",
  "Ongera uwemeze": "Confirmer à nouveau",
  "Turimo gufungura uru rwego…": "Chargement de ce niveau administratif…",
  "Aho uri mu nzego z'ubuyobozi": "Votre position dans la hiérarchie administrative",
  "Shakisha ahantu": "Rechercher un lieu",
  "Nta mazina abitswe kuri uru rwego. Subira ku rwego rubanziriza cyangwa uhuze interineti.": "Aucun nom n'est enregistré à ce niveau. Revenez au niveau précédent ou connectez-vous à Internet.",
  "Urutonde rwemewe rwubakiye mu rubuga, rukabikwa kuri telefone kugira ngo rukomeze gukora no offline.": "La liste officielle est intégrée au service et enregistrée sur votre téléphone pour rester disponible hors ligne.",
  "Nta menyesha urakira arabikwa": "Aucune notification n'a encore été enregistrée",
  "Aha ni ho usubira kureba ubutumwa wigeze kwakira, harimo igihe wabwakiriye n'aho bwavugaga.": "Vous pouvez consulter ici les notifications reçues, leur date et la zone concernée.",
  "Amamenyesha abikwa muri iyi telefone. Ushobora kuyasubiramo hano n'igihe utari kuri paji y'ibanze. Kuyasiba mu makuru ya browser bishobora kuyakuraho.": "Les notifications sont enregistrées sur ce téléphone. Vous pouvez les consulter ici même lorsque vous n'êtes pas sur la page d'accueil. La suppression des données du navigateur peut les effacer.",
  "Turimo gufungura amamenyesha yawe...": "Chargement de vos notifications…",
  "Nimara gukoresha “Menya aho uri” no kwemerera amamenyesha, ubutumwa bwawe buzatangira kugaragara hano.": "Après avoir utilisé « Trouver ma position » et autorisé les notifications, vos messages apparaîtront ici.",
  "Byabitswe muri iyi telefone": "Enregistré sur ce téléphone",
  "Koporora raporo": "Copier le rapport",
  "Raporo yakoporowewe. Ushobora kuyishyira mu butumwa bwo kuyigenzura.": "Le rapport a été copié. Vous pouvez le joindre à un message pour vérification.",
  "Raporo yakoporowewe.": "Le rapport a été copié.",
  "Ntibyashobotse kuyikoporora kuri iyi telefone.": "Impossible de le copier sur ce téléphone.",
  "Abayobozi b'aho uri": "Responsables de votre zone",
  "Tubwire umuyobozi": "Signaler un problème concernant un responsable",
  "Turimo gushaka": "Recherche en cours",
  "Ifoto ya": "Photo de",
  "Funga ifoto": "Fermer la photo",
  "Reba umwirondoro wa": "Voir le profil de",
  "Reba umwirondoro w'": "Voir le profil de ",
  "Ukuntu twizeye aho uri": "Niveau de confiance de votre position",
  "Hari ikibazo kuri aya makuru?": "Un problème avec ces informations ?",
  "Sobanura ikibazo mu magambo make...": "Décrivez brièvement le problème…",
  "Ubwoko": "Type",
  "Ubutumwa": "Message",
  "Ishuri, ivuriro, isoko, itorero, igishanga cyangwa umugezi": "Une école, un centre de santé, un marché, une église, une zone humide ou une rivière",
  "Reba ahantu ushobora kuba uri hafi": "Voir les lieux qui pourraient être proches",
  "Reba niba uri hafi y'aha hantu:": "Vérifiez si vous êtes près de ces lieux :",
  "Turimo kureba ahantu handitse muri OpenStreetMap...": "Recherche des lieux à proximité dans OpenStreetMap…",
  "Amazi / ibishanga byagaragaye muri data:": "Eau / zones humides présentes dans les données :",
  "Amakuru y'ahantu hafi ntaraboneka ubu. Ikarita na GPS biracyakora ukwabyo.": "Les informations sur les lieux proches sont momentanément indisponibles. La carte et le GPS continuent de fonctionner.",
  "Ntabwo twabashije gufungura amakuru y'ahantu hafi. Ikarita iracyagufasha.": "Impossible de charger les informations sur les lieux proches. La carte reste disponible.",
  "Inkomoko y'amakuru n'amafoto": "Sources des données et crédits photos",
  "yahinduwe mu mikoreshereze yayo": "adaptée pour cette utilisation",
  "yahinduwe mu bunini no mu mikoreshereze yayo": "redimensionnée et adaptée pour cette utilisation",
  "yeguriwe rubanda": "dans le domaine public",
  "Inkomoko y'imipaka:": "Source des limites :",
  "Ikarita:": "Carte :",
  "Ifoto y'imisozi ya Bigogwe:": "Photo des collines de Bigogwe :",
  "Ifoto y'inyamaswa zo muri Pariki y'Akagera:": "Photo de la faune du parc national de l'Akagera :",
  "Ifoto y'ibirunga byo muri Pariki y'Igihugu y'Ibirunga:": "Photo du parc national des Volcans :",
  "Ifoto y'imirima y'icyayi mu Karere ka Nyabihu:": "Photo des plantations de thé du district de Nyabihu :",
  "Amafoto y'ingagi:": "Photos de gorilles :",
  "Kanda hano uvugurure urubuga": "Touchez ici pour actualiser le site",
  "IWACU RWANDA: subira ku ntangiriro kandi uvugurure urubuga": "IWACU RWANDA : revenir à l'accueil et actualiser le site",
  "Akarere": "District",
  "Umurenge": "Secteur",
  "Akagari": "Cellule",
  "Umudugudu": "Village",
  "Intara": "Province",
  "Intara 5 z'u Rwanda": "Les 5 provinces du Rwanda",
  "Umujyi wa Kigali": "Ville de Kigali",
  "Amajyaruguru": "Nord",
  "Amajyepfo": "Sud",
  "Iburasirazuba": "Est",
  "Iburengerazuba": "Ouest",
  "Yemejwe": "Vérifié",
  "Byemejwe": "Vérifié",
  "Yemejwe ku wa": "Vérifié le",
  "Yatangiye akazi ku wa": "A pris ses fonctions le",
  "Amasaha y'akazi": "Heures de service",
  "Imihigo": "Engagements de performance",
  "Ibiografi": "Biographie",
  "Aho wahamagara": "Contact",
  "Hamagara": "Appeler",
  "Umwirondoro nturuzuzwa": "Profil non encore complété",
  "Icyemezo": "Vérification",
  "Ahantu": "Lieu",
  "Koresha WhatsApp": "Contacter sur WhatsApp",
  "Nta muyobozi uremezwa": "Aucun responsable vérifié pour le moment",
  "Serivisi y'abayobozi ntiri kuboneka.": "Le service des responsables est indisponible.",
  "Ikibazo cyabaye": "Une erreur est survenue",
  "Mwihangane, ongera ugerageze.": "Désolé, veuillez réessayer.",
  "GPS irafunze": "Le GPS est désactivé",
  "Ntidushobora kumenya aho uri kuko telefone itatwemereye. Fungura: Settings › Location (Igenamiterere › Aho uri), wemerere iyi porogaramu.": "Nous ne pouvons pas déterminer votre position car votre téléphone n'a pas accordé l'autorisation. Ouvrez Paramètres › Localisation et autorisez ce service.",
  "Ibyoherejwe ntibisomeka": "Les informations envoyées sont illisibles",
  "Aho uri ntihasomye neza. Ongera ugerageze cyangwa uhitemo aho uri ku rutonde.": "Votre position n'a pas pu être déterminée avec précision. Réessayez ou choisissez un lieu dans la liste.",
  "Telefone ntiyabonye aho uri": "Votre téléphone n'a pas pu déterminer votre position",
  "Ntitwashoboye kubona aho uri. Hitamo aho uri ku rutonde ruri hasi.": "Nous n'avons pas pu déterminer votre position. Choisissez un lieu dans la liste ci-dessous.",
  "Birimo gutinda": "Cela prend plus de temps que prévu",
  "GPS yafashe igihe kirekire. Ushobora gukomeza uhitamo umudugudu ku rutonde ruri hasi.": "Le GPS met du temps à répondre. Vous pouvez continuer en choisissant un village dans la liste ci-dessous.",
  "Iyi porogaramu ntishobora kumenya aho uri": "Ce navigateur ne peut pas déterminer votre position",
  "Gerageza indi porogaramu yo kureba imbuga (nka Chrome).": "Essayez un autre navigateur, comme Chrome.",
  "Aho uri ntihasomye neza": "Votre position n'a pas pu être lue correctement",
  "Ongera ugerageze.": "Veuillez réessayer.",
  "Uri hanze y'u Rwanda": "Vous êtes hors du Rwanda",
  "Iyi porogaramu ikora mu Rwanda gusa. Nimero z'ubutabazi z'u Rwanda ziracyaboneka.": "Ce service fonctionne uniquement au Rwanda. Les numéros d'urgence du Rwanda restent accessibles.",
  "Ntitwabonye aho uri": "Votre position n'a pas été identifiée",
  "Aho uri ntihaboneka mu mipaka dufite. Egera ahandi, wongere ugerageze.": "Votre position ne figure pas dans les limites dont nous disposons. Déplacez-vous vers un autre endroit et réessayez.",
  "Uri ku mupaka": "Vous êtes près d'une limite",
  "Uri hagati y'imidugudu ibiri. Turakwereka abayobozi b'iyo yombi.": "Vous êtes entre deux villages. Nous affichons les responsables des deux villages.",
  "Ntituzi neza aho uri": "Votre position est incertaine",
  "Ntidushobora kwemeza aho uri. Ongera ugerageze uri ahafunguye.": "Nous ne pouvons pas confirmer votre position. Réessayez dans un endroit dégagé.",
  "Aka gace ntikaraboneka": "Cette zone n'est pas encore disponible",
  "Imipaka y'aka gace ntiratugeraho. Si ikibazo cya telefone yawe. Mwihangane, turakomeza kongeramo amakuru.": "Nous ne disposons pas encore des limites de cette zone. Le problème ne vient pas de votre téléphone. Nous continuons à enrichir les données.",
  "Hari ikibazo cyacu": "Un problème est survenu de notre côté",
  "Ntitubashije kubona amakuru ubu. Si ikibazo cyawe. Mwihangane, ongera ugerageze nyuma y'akanya gato.": "Nous ne pouvons pas récupérer les informations pour le moment. Ce n'est pas de votre faute. Veuillez réessayer dans quelques instants.",
  "Interineti ntirimo gukora": "La connexion Internet est indisponible",
  "Ntitwabashije kugera ku rubuga. Reba interineti yawe, hanyuma wongere ugerageze.": "Nous n'avons pas pu joindre le service. Vérifiez votre connexion Internet et réessayez.",
  "Interineti iratinda": "La connexion Internet est lente",
  "Tegereza gato…": "Veuillez patienter…",
  "Nta interineti": "Vous êtes hors ligne",
  "Dukoresha amakuru abitswe kuri telefone yawe. Abayobozi ntibagaragara, ariko nimero z'ubutabazi zirakora.": "Nous utilisons les informations enregistrées sur votre téléphone. Les responsables ne sont pas disponibles, mais les numéros d'urgence fonctionnent.",
  "Mwihangane, tegereza gato": "Veuillez patienter un instant",
  "Wakanze inshuro nyinshi. Tegereza umunota umwe, hanyuma wongere ugerageze.": "Vous avez effectué trop de tentatives. Attendez une minute, puis réessayez.",
  "Ntibyabonetse": "Introuvable",
  "Ibyo ushaka ntibihari.": "Les informations demandées ne sont pas disponibles.",
  "Nta muyobozi uremezwa aha. Reba ab'akagari cyangwa ab'umurenge.": "Aucun responsable vérifié n'est répertorié ici. Consultez les responsables de la cellule ou du secteur.",
  "Nta buryo bwo kuvugana": "Aucun moyen de contact disponible",
  "Uyu muyobozi ntaragira uburyo bwo kuvugana bwanditswe. Reba abayobozi b'urwego rukurikira.": "Aucun moyen de contact n'a été publié pour ce responsable. Consultez les responsables du niveau administratif supérieur.",
};

const dictionaries: Record<Exclude<Locale, "rw">, Record<string, string>> = { en, fr };


Object.assign(en, {
  "Inkongi y'umuriro n'ubutabazi": "Fire and rescue",
  "Impanuka zo mu muhanda": "Road accidents",
  "Ambulance — ubutabazi bw'ubuvuzi": "Ambulance — medical emergency",
  "Umurongo w'abana": "Child helpline",
  "Ihohoterwa rishingiye ku gitsina (Isange)": "Gender-based violence (Isange)",
  "Kurwanya ruswa": "Anti-corruption",
  "Ibibazo byo mu mazi (ibiyaga)": "Water-related emergencies (lakes)",
  "Kurega umupolisi wakoze nabi": "Report police misconduct",
  "Ibibazo by'impushya zo gutwara": "Driving licence enquiries",
  "Ninde uyobora umurenge wa Kacyiru?": "Who leads Kacyiru Sector?",
  "Meya w'Akarere ka Gasabo ni nde?": "Who is the Mayor of Gasabo District?",
  "Umukuru w'umudugudu w'Ubumwe": "Who is the village leader of Ubumwe?",
  "Akagari ka Kamatamu kayoborwa na nde?": "Who leads Kamatamu Cell?",
  "Kopora": "Copy",
  "Yego": "Yes",
  "Oya": "No",
  "Nta makuru ahari": "No information available",
  "Aho ibimenyetso byerekana": "Location indicated by available evidence",
  "Aho uri ubu": "Your current location",
  "Umuyobozi ntaraboneka": "Leader not yet listed",
  "Nta muyobozi wanditswe muri aka gace kugeza ubu.": "No leader has been registered in this area yet.",
  "Abandi bayobozi": "Other leaders",
  "Ahandi hashoboka": "Other possible locations",
  "Hitamo ahantu": "Choose a place",
  "Ifoto": "Photo",
  "Reba umwirondoro": "View profile",
  "Yemejwe": "Verified",
  "Nta makuru y'umuyobozi araboneka.": "No leader information is available yet.",
  "Ntibyashobotse kubona amakuru. Ongera ugerageze.": "We could not retrieve the information. Please try again.",
  "Umuyobozi ntabwo abonetse": "Leader not found",
  "Igihugu": "Country",
  "Nta mwirondoro uraboneka": "No profile available",
  "Ibindi": "Other",
  "Imibare": "Statistics",
  "Kwegera": "Zoom in",
  "Imbibi zigaragara:": "Boundaries shown:",
  "Imbibi z'imidugudu zagaragajwe:": "Village boundaries shown:",
  "Amazina agaragara iyo ikarita yegerejwe.": "Names appear when you zoom in.",
  "Kwegera (zoom) kugira ngo ubone n'utundi duce n'amazina yabyo.": "Zoom in to see more areas and their names.",
  "Ikarita ikoresha amakuru y'imipaka abitswe muri database.": "The map uses boundary information stored in the database.",
  "Inkomoko: OpenStreetMap.": "Source: OpenStreetMap.",
  "Ishuri": "School",
  "Ivuriro": "Health centre",
  "Isoko": "Market",
  "Itorero": "Church",
  "Igishanga": "Wetland",
  "Umugezi": "River",
  "Amazi": "Water",
  "Byabitswe kuri telefone yawe": "Saved on your phone",
  "Aho uherereye": "Your location",
  "Umwirondoro w'umuyobozi": "Leader profile",
  "Yemejwe ku wa": "Verified on",
  "Ibyerekeye umuyobozi": "About the leader",
  "Amateka y'akazi": "Work history",
  "Imirimo": "Role",
  "Yatangiye akazi ku wa": "Started serving on",
  "Nta muyobozi uremejwe aha": "No verified leader here yet",
  "Uko ukoresha uru rubuga": "How to use this service",
  "Kanda hano": "Tap here",
  "Amakuru": "Information",
  "Amakuru y'ibanga": "Privacy information",
  "Imikoreshereze": "Usage",
  "Kwamamaza": "Advertising",
  "Hitamo ururimi": "Choose language",
  "Ururimi": "Language",
  "Yeguriwe rubanda": "Dedicated to the public domain",
  "Inkomoko y'amakuru n'amafoto": "Data and photo credits",
  "OpenStreetMap contributors": "OpenStreetMap contributors",
  "Kanda «Menya aho uri»": "Tap “Find your location”",
  "Turimo gushaka aho uri": "Finding your location",
  "Ubu uri:": "You are now in:",
  "Ubu ugeze muri:": "You have now reached:",
  "Uvuye muri:": "You came from:",
  "WASEZETSE:": "LEFT:",
  "Wasohotse muri": "You left",
  "Uvuye aho hantu werekeza kuri:": "You are heading towards:",
  "Murakaza neza muri": "Welcome to",
  "Ubu uri muri:": "You are now in:",
  "agace wari urimo": "your previous area",
  "ahantu hashya": "a new area",
  "Icyizere:": "Confidence:",
  "Ibibazo": "Questions",
  "Amafoto n'amakuru": "Photos and information",
  "Urutonde rw'abayobozi": "Leader directory",
  "Aho ndi": "My location",
  "Aho uri": "Your location",
  "Gusubira": "Back",
  "Witondere": "Please note",
  "Saba ubufasha": "Get help",
});
Object.assign(fr, {
  "Inkongi y'umuriro n'ubutabazi": "Incendie et secours",
  "Impanuka zo mu muhanda": "Accidents de la route",
  "Ambulance — ubutabazi bw'ubuvuzi": "Ambulance — urgence médicale",
  "Umurongo w'abana": "Ligne d'aide pour les enfants",
  "Ihohoterwa rishingiye ku gitsina (Isange)": "Violences basées sur le genre (Isange)",
  "Kurwanya ruswa": "Lutte contre la corruption",
  "Ibibazo byo mu mazi (ibiyaga)": "Urgences liées à l'eau (lacs)",
  "Kurega umupolisi wakoze nabi": "Signaler un abus policier",
  "Ibibazo by'impushya zo gutwara": "Renseignements sur le permis de conduire",
  "Ninde uyobora umurenge wa Kacyiru?": "Qui dirige le secteur de Kacyiru ?",
  "Meya w'Akarere ka Gasabo ni nde?": "Qui est le maire du district de Gasabo ?",
  "Umukuru w'umudugudu w'Ubumwe": "Qui est le chef du village d'Ubumwe ?",
  "Akagari ka Kamatamu kayoborwa na nde?": "Qui dirige la cellule de Kamatamu ?",
  "Kopora": "Copier",
  "Yego": "Oui",
  "Oya": "Non",
  "Nta makuru ahari": "Aucune information disponible",
  "Aho ibimenyetso byerekana": "Position indiquée par les données disponibles",
  "Aho uri ubu": "Votre position actuelle",
  "Umuyobozi ntaraboneka": "Responsable pas encore répertorié",
  "Nta muyobozi wanditswe muri aka gace kugeza ubu.": "Aucun responsable n'a encore été enregistré dans cette zone.",
  "Abandi bayobozi": "Autres responsables",
  "Ahandi hashoboka": "Autres emplacements possibles",
  "Hitamo ahantu": "Choisir un lieu",
  "Ifoto": "Photo",
  "Reba umwirondoro": "Voir le profil",
  "Yemejwe": "Vérifié",
  "Nta makuru y'umuyobozi araboneka.": "Aucune information sur les responsables n'est disponible pour le moment.",
  "Ntibyashobotse kubona amakuru. Ongera ugerageze.": "Impossible de récupérer les informations. Veuillez réessayer.",
  "Umuyobozi ntabwo abonetse": "Responsable introuvable",
  "Igihugu": "Pays",
  "Nta mwirondoro uraboneka": "Aucun profil disponible",
  "Ibindi": "Autre",
  "Imibare": "Statistiques",
  "Kwegera": "Zoomer",
  "Imbibi zigaragara:": "Limites affichées :",
  "Imbibi z'imidugudu zagaragajwe:": "Limites des villages affichées :",
  "Amazina agaragara iyo ikarita yegerejwe.": "Les noms apparaissent lorsque vous zoomez.",
  "Kwegera (zoom) kugira ngo ubone n'utundi duce n'amazina yabyo.": "Zoomez pour voir davantage de zones et leurs noms.",
  "Ikarita ikoresha amakuru y'imipaka abitswe muri database.": "La carte utilise les données de limites enregistrées dans la base de données.",
  "Inkomoko: OpenStreetMap.": "Source : OpenStreetMap.",
  "Ishuri": "École",
  "Ivuriro": "Centre de santé",
  "Isoko": "Marché",
  "Itorero": "Église",
  "Igishanga": "Zone humide",
  "Umugezi": "Rivière",
  "Amazi": "Eau",
  "Byabitswe kuri telefone yawe": "Enregistré sur votre téléphone",
  "Aho uherereye": "Votre position",
  "Umwirondoro w'umuyobozi": "Profil du responsable",
  "Yemejwe ku wa": "Vérifié le",
  "Ibyerekeye umuyobozi": "À propos du responsable",
  "Amateka y'akazi": "Parcours professionnel",
  "Imirimo": "Fonction",
  "Yatangiye akazi ku wa": "A pris ses fonctions le",
  "Nta muyobozi uremejwe aha": "Aucun responsable vérifié ici pour le moment",
  "Uko ukoresha uru rubuga": "Comment utiliser ce service",
  "Kanda hano": "Touchez ici",
  "Amakuru": "Informations",
  "Amakuru y'ibanga": "Informations de confidentialité",
  "Imikoreshereze": "Utilisation",
  "Kwamamaza": "Publicité",
  "Hitamo ururimi": "Choisir la langue",
  "Ururimi": "Langue",
  "Yeguriwe rubanda": "Dans le domaine public",
  "Inkomoko y'amakuru n'amafoto": "Sources des données et crédits photos",
  "Kanda «Menya aho uri»": "Touchez « Trouver ma position »",
  "Turimo gushaka aho uri": "Recherche de votre position",
  "Ubu uri:": "Vous êtes actuellement à :",
  "Ubu ugeze muri:": "Vous êtes arrivé à :",
  "Uvuye muri:": "Vous venez de :",
  "WASEZETSE:": "VOUS AVEZ QUITTÉ :",
  "Wasohotse muri": "Vous avez quitté",
  "Uvuye aho hantu werekeza kuri:": "Vous vous dirigez vers :",
  "Murakaza neza muri": "Bienvenue à",
  "Ubu uri muri:": "Vous êtes maintenant à :",
  "agace wari urimo": "votre zone précédente",
  "ahantu hashya": "un nouvel endroit",
  "Icyizere:": "Confiance :",
  "Ibibazo": "Questions",
  "Amafoto n'amakuru": "Photos et informations",
  "Urutonde rw'abayobozi": "Répertoire des responsables",
  "Aho ndi": "Ma position",
  "Aho uri": "Votre position",
  "Gusubira": "Retour",
  "Witondere": "À noter",
  "Saba ubufasha": "Obtenir de l'aide",
});



Object.assign(en, {
  "Menya aho uri. Reba abayobozi baho, ubahamagare cyangwa ubandikire. Harimo n'inimero z'ubutabazi.": "Find your location. View local leaders, call or message them. Emergency numbers are also available.",
  "Amazina agaragara iyo wegeranije ikarita.": "Names appear as you zoom in on the map.",
  "Imiterere": "Status",
  "Urutonde": "List",
  "Sobanura": "Explain",
  "Bika": "Save",
  "Ohereza": "Send",
  "Koresha WhatsApp": "Contact on WhatsApp",
  "Yemejwe ku wa": "Verified on",
});
Object.assign(fr, {
  "Menya aho uri. Reba abayobozi baho, ubahamagare cyangwa ubandikire. Harimo n'inimero z'ubutabazi.": "Trouvez votre position. Consultez les responsables locaux, appelez-les ou envoyez-leur un message. Les numéros d'urgence sont également disponibles.",
  "Amazina agaragara iyo wegeranije ikarita.": "Les noms apparaissent lorsque vous zoomez sur la carte.",
  "Imiterere": "Statut",
  "Urutonde": "Liste",
  "Sobanura": "Expliquer",
  "Bika": "Enregistrer",
  "Ohereza": "Envoyer",
  "Koresha WhatsApp": "Contacter sur WhatsApp",
  "Yemejwe ku wa": "Vérifié le",
});


Object.assign(en, {
  "Nimero z'ubutabazi ziri hasi hose ku rupapuro. Kanda": "Emergency numbers are available at the bottom of every page. Tap",
  "Ubutumwa bw'aho uri n'imbibi z'imidugudu": "Location and village-boundary notifications",
  "Kumenyeshwa impinduka z'aho uri": "Location-change notifications",
  "Chrome ntiyemereye ubutumwa. Reba Site settings → Notifications.": "Chrome did not allow notifications. Check Site settings → Notifications.",
  "Ubutumwa ntibwabitswe kuri iyi telefone. Reba umwanya wa Chrome, wongere ugerageze.": "The notification was not saved on this phone. Check Chrome storage and try again.",
  "Ubutumwa bwo kukwakira ntibwageze kuri telefone. Turongera kubugerageza ubutaha.": "The welcome notification did not reach your phone. We will try again next time.",
  "Hari ubutumwa butabitswe kuri iyi telefone. Reba umwanya wa Chrome.": "Some notifications were not saved on this phone. Check Chrome storage.",
  "Chrome ntiyashoboye kwerekana amwe mu menyesha kuri telefone.": "Chrome could not display some notifications on your phone.",
  "Imburi ntiyabitswe kuri iyi telefone. Reba umwanya wa Chrome.": "The alert was not saved on this phone. Check Chrome storage.",
  "Chrome ntiyashoboye kwerekana imburi y'imbibi kuri telefone.": "Chrome could not display the boundary alert on your phone.",
  "Gukurikirana imbibi z'imidugudu ntibyabashije kuvugururwa kuri iyi GPS fix.": "Village-boundary tracking could not be updated for this GPS reading.",
  "Iyi browser ntiyemera system notifications. Gerageza Chrome igezweho kuri HTTPS.": "This browser does not support system notifications. Try an up-to-date version of Chrome over HTTPS.",
  "Chrome yahagaritse ubutumwa bwa IWACU. Bihindurire muri Site settings → Notifications.": "Chrome has blocked IWACU notifications. Change this in Site settings → Notifications.",
  "Bikora. Uzakira ikaze, imburi zo hafi y'imbibi, no kumenyeshwa aho winjiye igihe GPS ikomeje gutanga amakuru.": "Notifications are on. You will receive a welcome message, nearby-boundary alerts and updates when GPS detects that you have entered an area.",
  "Ku nshuro ya mbere ukanda Emera, Chrome izakubaza niba IWACU yemerewe kukwoherereza ubutumwa.": "The first time you tap Allow, Chrome will ask whether IWACU may send you notifications.",
  "Murakaza neza!": "Welcome!",
  "Kanda kuri iri menyesha wongere ukoreshe IWACU RWANDA.": "Tap this notification to return to IWACU RWANDA.",
  "IWACU RWANDA — Murakaza neza": "IWACU RWANDA — Welcome",
  "IWACU RWANDA — Uri hafi y'imbibi": "IWACU RWANDA — Approaching a boundary",
});
Object.assign(fr, {
  "Nimero z'ubutabazi ziri hasi hose ku rupapuro. Kanda": "Les numéros d'urgence sont accessibles en bas de chaque page. Touchez",
  "Ubutumwa bw'aho uri n'imbibi z'imidugudu": "Notifications de position et des limites des villages",
  "Kumenyeshwa impinduka z'aho uri": "Notifications de changement de position",
  "Chrome ntiyemereye ubutumwa. Reba Site settings → Notifications.": "Chrome n'a pas autorisé les notifications. Vérifiez Paramètres du site → Notifications.",
  "Ubutumwa ntibwabitswe kuri iyi telefone. Reba umwanya wa Chrome, wongere ugerageze.": "La notification n'a pas été enregistrée sur ce téléphone. Vérifiez l'espace de stockage de Chrome et réessayez.",
  "Ubutumwa bwo kukwakira ntibwageze kuri telefone. Turongera kubugerageza ubutaha.": "Le message de bienvenue n'a pas été envoyé à votre téléphone. Nous réessaierons la prochaine fois.",
  "Hari ubutumwa butabitswe kuri iyi telefone. Reba umwanya wa Chrome.": "Certaines notifications n'ont pas été enregistrées sur ce téléphone. Vérifiez l'espace de stockage de Chrome.",
  "Chrome ntiyashoboye kwerekana amwe mu menyesha kuri telefone.": "Chrome n'a pas pu afficher certaines notifications sur votre téléphone.",
  "Imburi ntiyabitswe kuri iyi telefone. Reba umwanya wa Chrome.": "L'alerte n'a pas été enregistrée sur ce téléphone. Vérifiez l'espace de stockage de Chrome.",
  "Chrome ntiyashoboye kwerekana imburi y'imbibi kuri telefone.": "Chrome n'a pas pu afficher l'alerte de limite sur votre téléphone.",
  "Gukurikirana imbibi z'imidugudu ntibyabashije kuvugururwa kuri iyi GPS fix.": "Le suivi des limites des villages n'a pas pu être actualisé avec cette position GPS.",
  "Iyi browser ntiyemera system notifications. Gerageza Chrome igezweho kuri HTTPS.": "Ce navigateur ne prend pas en charge les notifications système. Essayez une version récente de Chrome en HTTPS.",
  "Chrome yahagaritse ubutumwa bwa IWACU. Bihindurire muri Site settings → Notifications.": "Chrome a bloqué les notifications d'IWACU. Modifiez ce réglage dans Paramètres du site → Notifications.",
  "Bikora. Uzakira ikaze, imburi zo hafi y'imbibi, no kumenyeshwa aho winjiye igihe GPS ikomeje gutanga amakuru.": "Les notifications sont activées. Vous recevrez un message de bienvenue, des alertes à proximité des limites et des mises à jour lorsque le GPS détecte votre entrée dans une zone.",
  "Ku nshuro ya mbere ukanda Emera, Chrome izakubaza niba IWACU yemerewe kukwoherereza ubutumwa.": "La première fois que vous touchez Autoriser, Chrome vous demandera si IWACU peut vous envoyer des notifications.",
  "Murakaza neza!": "Bienvenue !",
  "Kanda kuri iri menyesha wongere ukoreshe IWACU RWANDA.": "Touchez cette notification pour revenir à IWACU RWANDA.",
  "IWACU RWANDA — Murakaza neza": "IWACU RWANDA — Bienvenue",
  "IWACU RWANDA — Uri hafi y'imbibi": "IWACU RWANDA — À proximité d'une limite",
});


Object.assign(en, {
  "Reba ifoto nini ya": "View the full-size photo of",
  "Reba umwirondoro wa": "View the profile of",
  "Reba umwirondoro w'": "View the profile of ",
  "Nta muyobozi uremejwe aha.": "No verified leader is listed here.",
  "Amakuru y'umuyobozi ntaruzuzwa": "Leader information has not been completed yet.",
  "Urutonde ntirubashije gufunguka. Ongera uhuze interineti.": "The list could not be loaded. Check your internet connection and try again.",
  "Si uyu muyobozi": "This is not the correct leader",
  "Si aha hantu": "This is not the correct place",
  "Telefone ntabwo ari yo": "The phone number is incorrect",
  "Ikindi": "Other",
  "Andika ubutumwa bw'amagambo 1 kugeza 500.": "Write a message of 1 to 500 characters.",
  "Ntibyashobotse kubika igitekerezo.": "We could not save your feedback.",
  "Kwegera ku ikarita (zoom) kugira ngo ubone imbibi z'imidugudu.": "Zoom in on the map to see village boundaries.",
  "Turimo gushaka imbibi z'imidugudu...": "Loading village boundaries…",
  "Nta mbibi z'imidugudu zabonetse muri aka gace; gerageza kwegera cyangwa uhitemo ahandi.": "No village boundaries were found in this area. Zoom in or choose another location.",
  "Imbibi ntizibashije gufunguka. Ushobora gukomeza guhitamo aho uri ku ikarita.": "The boundaries could not be loaded. You can still choose your location on the map.",
  "Ikarita yo guhitamo aho uri": "Map for choosing your location",
  "Ahantu wahisemo": "Selected location",
  "Amakuru yawe arinzwe (NCSA 058/2021)": "Your information is protected (NCSA 058/2021)",
  "Mwihangane, mugerageje inshuro nyinshi. Ongera ugerageze nyuma y'umunota.": "Too many attempts. Please wait one minute and try again.",
  "Andika izina ry'ahantu ushaka gushakisha.": "Enter the name of the place you want to search for.",
  "Serivisi yo gushakisha amazina ntibashije kugera kuri database.": "The place-search service could not reach the database.",
  "Gushakisha amazina muri database ntibyashobotse ubu.": "The place search is temporarily unavailable.",
  "Nta hantu twabonye muri database bihuye n'iryo zina. Nta zina twahimbye cyangwa ngo duhindure.": "No places in the database matched that name. We have not invented or changed any place names.",
  "Serivisi yo gushakisha amazina ntibashije gukora ubu.": "The place-search service is unavailable right now.",
  "Ahantu twabonye muri database:": "Places found in the database:",
  "Village Leader": "Village leader",
  "Cell Executive Secretary": "Cell executive secretary",
  "Sector Executive Secretary": "Sector executive secretary",
  "Mayor": "Mayor",
  "Vice Mayor": "Vice mayor",
  "District Executive Secretary": "District executive secretary",
  "Other": "Other",
  "village": "Village",
  "cell": "Cell",
  "sector": "Sector",
  "district": "District",
  "province": "Province",
  "Intara 5 z'u Rwanda": "Rwanda's five provinces",
});
Object.assign(fr, {
  "Reba ifoto nini ya": "Voir la photo en taille réelle de",
  "Reba umwirondoro wa": "Voir le profil de",
  "Reba umwirondoro w'": "Voir le profil de ",
  "Nta muyobozi uremejwe aha.": "Aucun responsable vérifié n'est répertorié ici.",
  "Amakuru y'umuyobozi ntaruzuzwa": "Les informations sur le responsable ne sont pas encore complètes.",
  "Urutonde ntirubashije gufunguka. Ongera uhuze interineti.": "La liste n'a pas pu être chargée. Vérifiez votre connexion Internet et réessayez.",
  "Si uyu muyobozi": "Ce n'est pas le bon responsable",
  "Si aha hantu": "Ce n'est pas le bon lieu",
  "Telefone ntabwo ari yo": "Le numéro de téléphone est incorrect",
  "Ikindi": "Autre",
  "Andika ubutumwa bw'amagambo 1 kugeza 500.": "Rédigez un message de 1 à 500 caractères.",
  "Ntibyashobotse kubika igitekerezo.": "Impossible d'enregistrer votre commentaire.",
  "Kwegera ku ikarita (zoom) kugira ngo ubone imbibi z'imidugudu.": "Zoomez sur la carte pour voir les limites des villages.",
  "Turimo gushaka imbibi z'imidugudu...": "Chargement des limites des villages…",
  "Nta mbibi z'imidugudu zabonetse muri aka gace; gerageza kwegera cyangwa uhitemo ahandi.": "Aucune limite de village n'a été trouvée dans cette zone. Zoomez ou choisissez un autre emplacement.",
  "Imbibi ntizibashije gufunguka. Ushobora gukomeza guhitamo aho uri ku ikarita.": "Les limites n'ont pas pu être chargées. Vous pouvez toujours choisir votre position sur la carte.",
  "Ikarita yo guhitamo aho uri": "Carte pour choisir votre position",
  "Amakuru yawe arinzwe (NCSA 058/2021)": "Vos informations sont protégées (NCSA 058/2021)",
  "Mwihangane, mugerageje inshuro nyinshi. Ongera ugerageze nyuma y'umunota.": "Trop de tentatives. Veuillez attendre une minute avant de réessayer.",
  "Andika izina ry'ahantu ushaka gushakisha.": "Saisissez le nom du lieu que vous recherchez.",
  "Serivisi yo gushakisha amazina ntibashije kugera kuri database.": "Le service de recherche de lieux n'a pas pu accéder à la base de données.",
  "Gushakisha amazina muri database ntibyashobotse ubu.": "La recherche de lieux est temporairement indisponible.",
  "Nta hantu twabonye muri database bihuye n'iryo zina. Nta zina twahimbye cyangwa ngo duhindure.": "Aucun lieu de la base de données ne correspond à ce nom. Aucun nom n'a été inventé ou modifié.",
  "Serivisi yo gushakisha amazina ntibashije gukora ubu.": "Le service de recherche de lieux est momentanément indisponible.",
  "Ahantu twabonye muri database:": "Lieux trouvés dans la base de données :",
  "Village Leader": "Chef de village",
  "Cell Executive Secretary": "Secrétaire exécutif de cellule",
  "Sector Executive Secretary": "Secrétaire exécutif de secteur",
  "Mayor": "Maire",
  "Vice Mayor": "Maire adjoint",
  "District Executive Secretary": "Secrétaire exécutif de district",
  "Other": "Autre",
  "village": "Village",
  "cell": "Cellule",
  "sector": "Secteur",
  "district": "District",
  "province": "Province",
  "Intara 5 z'u Rwanda": "Les cinq provinces du Rwanda",
});

Object.assign(en, {
  "Umugezi / amazi": "River / water",
  "Ikiyaga": "Lake",
  "Umuhanda munini": "Main road",
  "nta zina ryanditse": "unnamed",
  " (nta zina ryanditse)": " (unnamed)",
  "Amazi / ibishanga byagaragaye muri data:": "Water / wetlands found in the data:",
  "Inkomoko: OpenStreetMap. Kanda ahantu ubona ko uri hafi; ikoreshwa nk'ikimenyetso cy'igereranya kiri mu ntera ya hafi 1–1.5 km, si coordinate yawe nyayo.": "Source: OpenStreetMap. Select a nearby place you recognize; it is an approximate reference within about 1–1.5 km, not your exact coordinates.",
  "Nta hantu handitse habonetse muri OpenStreetMap mu birometero 3. Ibi ntibivuga ko nta shuri, isoko cyangwa amazi bihari; bishobora kuba bitarashyizwe muri iyi data.": "No places were listed in OpenStreetMap within 3 km. This does not mean there are no schools, markets or water sources; they may not have been added to the data.",
});
Object.assign(fr, {
  "Umugezi / amazi": "Rivière / eau",
  "Ikiyaga": "Lac",
  "Umuhanda munini": "Route principale",
  "nta zina ryanditse": "sans nom",
  " (nta zina ryanditse)": " (sans nom)",
  "Amazi / ibishanga byagaragaye muri data:": "Eau / zones humides présentes dans les données :",
  "Inkomoko: OpenStreetMap. Kanda ahantu ubona ko uri hafi; ikoreshwa nk'ikimenyetso cy'igereranya kiri mu ntera ya hafi 1–1.5 km, si coordinate yawe nyayo.": "Source : OpenStreetMap. Sélectionnez un lieu proche que vous reconnaissez ; il sert de repère approximatif dans un rayon d'environ 1 à 1,5 km et ne correspond pas à vos coordonnées exactes.",
  "Nta hantu handitse habonetse muri OpenStreetMap mu birometero 3. Ibi ntibivuga ko nta shuri, isoko cyangwa amazi bihari; bishobora kuba bitarashyizwe muri iyi data.": "Aucun lieu n'a été répertorié dans OpenStreetMap à moins de 3 km. Cela ne signifie pas qu'il n'y a pas d'école, de marché ou de point d'eau ; ces lieux peuvent simplement ne pas figurer dans les données.",
});


Object.assign(en, {
  "Muraho. Ndi Ishakiro rya IWACU RWANDA. Mbaza ikibazo cy'ahantu, umuyobozi, cyangwa nimero z'ubutabazi.": "Hello. I am Ishakiro, IWACU RWANDA's assistant. Ask me about a place, a leader, or emergency numbers.",
  "Ndi Ishakiro ry'Ubuhanga rya IWACU RWANDA, umufasha wa AI wagenewe kugufasha kubona no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi mu Rwanda, abayobozi n'amakuru y'ubutabazi. Nshobora gusubiza ibyo amakuru yagenzuwe ashyigikira; iyo amakuru abuze cyangwa ntizeye igisubizo, ndabikubwira aho kugira ngo mpimbe.": "I am Ishakiro, IWACU RWANDA's AI assistant. I help you find and understand information about places, Rwanda's administrative structure, local leaders and emergency services. I answer only when verified information supports the answer. When information is missing or uncertain, I tell you rather than inventing it.",
  "Nshobora kugufasha kumenya aho uri, gushaka ahantu mu Rwanda, kubona abayobozi n'itumanaho ryabo igihe amakuru yabo yemejwe abitswe, kubona nimero z'ubutabazi, kumenya umubare w'inzego z'ubuyobozi, kubara ubuso bw'ahantu, kureba ahantu hahana imbibi no kugereranya intera yo mu murongo ugororotse hagati y'ahantu habiri. Ibyapa biri hafi y'aho uri ntibiraboneka kuko nta rutonde rw'ibyapa n'imyanya yabyo rwemejwe turafite. Ubushakashatsi bwo hanze buracyafunze. Igihe amakuru cyangwa igikoresho bitabonetse, ndabikubwira aho guhanga igisubizo.": "I can help identify your location, find places in Rwanda, look up leaders and their contacts when verified records are available, find emergency numbers, count administrative units, calculate mapped area, identify places that share a boundary, and compare straight-line distances between two places. Nearby road-sign lookup is not available because IWACU does not yet have a verified road-sign inventory with locations. External web research is also disabled. When information or a tool is unavailable, I will say so instead of making up an answer.",
  "Iki kibazo kiri hanze y'amakuru ya IWACU RWANDA nshobora kugenzura. Nshobora kugufasha ku bijyanye n'aho uri, abayobozi, ahantu n'imibare y'ubutabazi. Sinatanga igisubizo ntashingiye ku makuru yizewe.": "This question is outside the information that IWACU RWANDA can currently verify. I can help with your location, local leaders, places and emergency information. I will not give an answer without reliable supporting information.",
  "Nta hantu telefone yawe imaze kumenya muri iki gihe. Ongera ugerageze kumenya aho uri; niba Location yazimye, yifungure muri Quick Settings za telefone.": "Your phone has not identified a location yet. Try locating yourself again. If Location is turned off, enable it in your phone's Quick Settings.",
  "Nta hantu bihuye n'ikibazo cyawe nabonye mu bubiko bw'ahantu bwa IWACU. Ntabwo nzagerageza guhimba aho ari ho. Gerageza andi magambo cyangwa wongereho Akarere/Umurenge niba uhabizi.": "I could not find a matching place in IWACU's place database. I will not guess or invent a location. Try different wording or add the district or sector if you know it.",
  "Andika ikibazo cyawe. Nshobora gushakisha ahantu, abayobozi, nimero z'ubutabazi n'amakuru y'inzego z'ubuyobozi mu Rwanda.": "Enter your question. I can search for places, local leaders, emergency numbers and information about Rwanda's administrative structure.",
  "Ububiko bw'ahantu bwa IWACU RWANDA (search_places)": "IWACU RWANDA place database (search_places)",
  "Urutonde rw'abayobozi rwa IWACU RWANDA (get_leader_candidates_v2)": "IWACU RWANDA verified public-leader register (get_leader_candidates_v2)",
  "Imibare y'ubutabazi — Urubuga rwa Leta y'u Rwanda": "Emergency information — Government of Rwanda website",
  "Itariki y'ivugurura ntigaragajwe muri database.": "The database does not show a last-updated date.",
  "Iri menyesha ryagejejwe ku buyobozi bubishinzwe.": "This information gap has been sent to the responsible authority.",
  "Iri menyyesha ryabitswe, ariko nta konti y'ubuyobozi ishobora kurihabwa ubu.": "This information gap was recorded, but no responsible authority account is currently available to receive it."
});

Object.assign(fr, {
  "Muraho. Ndi Ishakiro rya IWACU RWANDA. Mbaza ikibazo cy'ahantu, umuyobozi, cyangwa nimero z'ubutabazi.": "Bonjour. Je suis Ishakiro, l'assistant d'IWACU RWANDA. Posez-moi une question sur un lieu, un responsable ou les numéros d'urgence.",
  "Ndi Ishakiro ry'Ubuhanga rya IWACU RWANDA, umufasha wa AI wagenewe kugufasha kubona no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi mu Rwanda, abayobozi n'amakuru y'ubutabazi. Nshobora gusubiza ibyo amakuru yagenzuwe ashyigikira; iyo amakuru abuze cyangwa ntizeye igisubizo, ndabikubwira aho kugira ngo mpimbe.": "Je suis Ishakiro, l'assistant d'intelligence artificielle d'IWACU RWANDA. Je vous aide à trouver et à comprendre les informations sur les lieux, l'organisation administrative du Rwanda, les responsables locaux et les services d'urgence. Je réponds uniquement lorsque des informations vérifiées étayent la réponse. Si des informations manquent ou sont incertaines, je vous le signale au lieu de les inventer.",
  "Nshobora kugufasha kumenya aho uri, gushaka ahantu mu Rwanda, kubona abayobozi n'itumanaho ryabo igihe amakuru yabo yemejwe abitswe, kubona nimero z'ubutabazi, kumenya umubare w'inzego z'ubuyobozi, kubara ubuso bw'ahantu, kureba ahantu hahana imbibi no kugereranya intera yo mu murongo ugororotse hagati y'ahantu habiri. Ibyapa biri hafi y'aho uri ntibiraboneka kuko nta rutonde rw'ibyapa n'imyanya yabyo rwemejwe turafite. Ubushakashatsi bwo hanze buracyafunze. Igihe amakuru cyangwa igikoresho bitabonetse, ndabikubwira aho guhanga igisubizo.": "Je peux vous aider à déterminer votre position, à rechercher des lieux au Rwanda, à consulter les responsables et leurs coordonnées lorsque des données vérifiées sont disponibles, à trouver les numéros d'urgence, à compter les unités administratives, à calculer une superficie cartographique, à identifier les zones limitrophes et à comparer les distances à vol d'oiseau entre deux lieux. La recherche des panneaux routiers à proximité n'est pas disponible, car IWACU ne dispose pas encore d'un inventaire géolocalisé et vérifié des panneaux. La recherche sur le Web est également désactivée. Lorsqu'une information ou un outil n'est pas disponible, je vous le dirai au lieu d'inventer une réponse.",
  "Iki kibazo kiri hanze y'amakuru ya IWACU RWANDA nshobora kugenzura. Nshobora kugufasha ku bijyanye n'aho uri, abayobozi, ahantu n'imibare y'ubutabazi. Sinatanga igisubizo ntashingiye ku makuru yizewe.": "Cette question sort du périmètre des informations qu'IWACU RWANDA peut actuellement vérifier. Je peux vous aider concernant votre position, les responsables locaux, les lieux et les informations d'urgence. Je ne fournirai pas de réponse sans source fiable.",
  "Nta hantu telefone yawe imaze kumenya muri iki gihe. Ongera ugerageze kumenya aho uri; niba Location yazimye, yifungure muri Quick Settings za telefone.": "Votre téléphone n'a pas encore déterminé votre position. Réessayez. Si la fonction de localisation est désactivée, activez-la dans les paramètres rapides de votre téléphone.",
  "Nta hantu bihuye n'ikibazo cyawe nabonye mu bubiko bw'ahantu bwa IWACU. Ntabwo nzagerageza guhimba aho ari ho. Gerageza andi magambo cyangwa wongereho Akarere/Umurenge niba uhabizi.": "Je n'ai trouvé aucun lieu correspondant dans la base de données d'IWACU. Je ne vais pas deviner ni inventer un lieu. Essayez d'autres termes ou ajoutez le district ou le secteur si vous le connaissez.",
  "Andika ikibazo cyawe. Nshobora gushakisha ahantu, abayobozi, nimero z'ubutabazi n'amakuru y'inzego z'ubuyobozi mu Rwanda.": "Saisissez votre question. Je peux rechercher des lieux, des responsables locaux, des numéros d'urgence et des informations sur l'organisation administrative du Rwanda.",
  "Ububiko bw'ahantu bwa IWACU RWANDA (search_places)": "Base de données des lieux d'IWACU RWANDA (search_places)",
  "Urutonde rw'abayobozi rwa IWACU RWANDA (get_leader_candidates_v2)": "Registre public vérifié des responsables d'IWACU RWANDA (get_leader_candidates_v2)",
  "Imibare y'ubutabazi — Urubuga rwa Leta y'u Rwanda": "Informations d'urgence — site du Gouvernement du Rwanda",
  "Itariki y'ivugurura ntigaragajwe muri database.": "La base de données n'indique pas sa date de dernière mise à jour.",
  "Iri menyesha ryagejejwe ku buyobozi bubishinzwe.": "Cette lacune d'information a été transmise à l'autorité compétente.",
  "Iri menyesha ryabitswe, ariko nta konti y'ubuyobozi ishobora kurihabwa ubu.": "Cette lacune a été enregistrée, mais aucun compte d'autorité compétente n'est actuellement disponible pour la recevoir."
});


Object.assign(en, {
  "Mu makuru rusange": "In the public directory",
  "Reba amakuru y'uyu muyobozi": "View this leader's details",
  "Umwanya ntiwanditswe": "Position not listed",
  "Inkomoko:": "Source:",
  "Itariki yo gutangaza ntiyatangajwe.": "Publication date not stated.",
  "Dore nimero zemewe zatangajwe z'umuyobozi w'aho hantu. Nongeraho n'abayobozi bo ku nzego zo hejuru kugira ngo ubone inzira z'ubuyobozi:": "Here are the verified public contact numbers for leaders in this area. I have also included leaders at higher administrative levels so you can see the available contact routes:",
  "Dore nimero rusange zatangajwe z'uwo muyobozi:": "Here are the publicly listed contact numbers for this leader:",
  "Nta nimero rusange y'uwo muyobozi iri mu makuru yatangajwe. Ntabwo mfite nimero yemewe yo kuguha.": "No public contact number for this leader appears in the published information. I do not have a verified number to give you.",
  "Nta muyobozi uhuye n'izina watanze nabonye mu rutonde rw'abayobozi rwemejwe kandi rugaragara ku mugaragaro. Ibyo ntibihamya ko uwo muntu atari umuyobozi; bivuga gusa ko atabonetse muri aya makuru.": "I could not find a leader matching that name in the verified public directory. This does not prove that the person is not a leader; it only means they were not found in this dataset.",
  "Andika nibura igice cy'izina ry'umuntu ushaka. Nta muntu nzahitamo ntamubonye mu makuru yemewe.": "Enter at least part of the person's name. I will not select anyone unless they appear in verified information.",
  "Hari abayobozi benshi bafite amazina asa. Reba aho buri wese akorera kugira ngo utavanga abantu:": "Several leaders have similar names. Check where each person serves so that they are not confused:",
  "Nabonye umuyobozi uhuye n'izina watanze mu makuru yemejwe kandi agaragara ku mugaragaro:": "I found a leader matching the name you provided in verified public information:",
  "Sinabonye umuyobozi twari tumaze kuvuga. Ongera ubaze izina rye kugira ngo nguhe amakuru yemejwe.": "I could not find the leader we were discussing. Ask for the person's name again so I can look for verified information.",
  "Sinashoboye kongera kwemeza amakuru y'uwo muyobozi muri uru rutonde. Ntabwo ngiye gutanga nimero ntabonye.": "I could not re-verify this leader in the directory. I will not provide a phone number that I have not found.",
  "Nta nimero rusange y'umuyobozi wa ": "No public contact number is listed for ",
  "Nta hantu bihuye n'ikibazo cyawe nabonye mu bubiko bw'ahantu bwa IWACU. Ntabwo nzagerageza guhimba aho ari ho. Gerageza andi magambo cyangwa wongereho Akarere/Umurenge niba uhabizi.": "I could not find a matching place in IWACU's place database. I will not guess or invent a location. Try different wording or add the district or sector if you know it.",
  "Hari ahantu henshi bihuye n'izina washakishije. Hitamo ahantu hagaragajwe kugira ngo ntavange amazina:": "Several places match the name you searched for. Choose one of the places shown so that I do not confuse them:",
  "Nkeneye izina ry'ahantu kugira ngo nshakishe neza. Urugero: Gasabo, Kacyiru cyangwa Kamatamu.": "I need a place name to search accurately. For example: Gasabo, Kacyiru or Kamatamu.",
  "Nkeneye izina cyangwa kode y'ahantu kugira ngo mbarire imibare y'inzego (umubare w'imirenge, utugari, n'ibindi). Urugero: Akarere ka Gasabo gafite imirenge ingahe?": "I need a place name or place code to count its administrative units (such as sectors or cells). For example: How many sectors are in Gasabo District?",
  "Kugira ngo ngereranye intera, andika ahantu habiri. Urugero: Intera iri hagati ya Gasabo na Huye ingana iki?": "To compare a distance, enter two places. For example: What is the distance between Gasabo and Huye?",
  "Ahantu ha mbere ntihabonetse mu bubiko bw'ahantu bwa IWACU. Ongera ugenzure izina ryaho.": "The first place was not found in IWACU's place database. Check its name and try again.",
  "Ahantu ha mbere hashobora kuba henshi. Hitamo aho washakaga mbere yo kugereranya intera.": "The first name may refer to several places. Choose the intended place before comparing the distance.",
  "Ahantu ha kabiri ntihabonetse mu bubiko bw'ahantu bwa IWACU. Ongera ugenzure izina ryaho.": "The second place was not found in IWACU's place database. Check its name and try again.",
  "Ahantu ha kabiri hashobora kuba henshi. Hitamo aho washakaga mbere yo kugereranya intera.": "The second name may refer to several places. Choose the intended place before comparing the distance.",
  "Ahantu habiri hagomba kuba hatandukanye. Ongera utange amazina yombi.": "The two places must be different. Enter both names again.",
  "Nta hantu bihuye n'izina watanze nabonye mu bubiko. Ongera ugenzure izina ry'aho ushaka imbibi.": "I could not find a place matching that name in the database. Check the name of the place whose boundaries you want to see.",
  "Hari ahantu henshi bihuye n'izina. Hitamo ahantu mbere yo gusuzuma imbibi.": "Several places match that name. Choose the intended place before checking its boundaries.",
  "Vuga ahantu ushaka kumenya imbibi zako. Urugero: Imbibi z'Akarere ka Gasabo ziri he?": "Name the place whose boundaries you want to check. For example: Where are the boundaries of Gasabo District?",
  "Dore nimero zemewe z'ubutabazi zo mu Rwanda. Koresha izihuye n'ikibazo cyawe:": "Here are verified emergency numbers for Rwanda. Use the number that matches your situation:",
  "Mu gihe cy'inkongi: hamagara nimero zemewe z'ubutabazi. Kurikiza amabwiriza y'umutekano. Ntabwo nshobora kugufasha mu buryo butari ubwo gutanga nimero zemewe.": "In case of fire: call the verified emergency numbers and follow safety instructions. I can provide verified numbers, but I cannot replace emergency responders.",
  "Ububiko bw'amakuru ntibwashoboye kuboneka ubu. Nta makuru nshobora kwemeza. Ongera ugerageze nyuma.": "The information database is unavailable right now, so I cannot verify an answer. Please try again later.",
  "Icyizere kiri hagati: amakuru yavuye ku rutonde rw'abayobozi rwemejwe; itariki yo kuvugurura ntigaragajwe.": "Medium confidence: the information comes from the verified leaders directory, but its update date is not stated.",
  "Icyizere kiri hagati: amakuru yavuye ku rutonde rw'abayobozi rwemejwe, ariko itariki yo kuvugurura ntigaragajwe.": "Medium confidence: the information comes from the verified leaders directory, but its update date is not stated.",
  "Icyizere kiri hasi: igisubizo kivuye ku rwego rwo hejuru kuko urwego wabajije rutuzuye.": "Low confidence: the result comes from a higher administrative level because the requested level has no listed record.",
  "Icyizere kiri hagati: izina ryabonetse mu bubiko bw'ahantu, ariko itariki y'amakuru ntigaragajwe.": "Medium confidence: the name was found in the place database, but the data date is not stated.",
  "Icyizere kiri hagati: umubare uva ku index y'inzego z'ubuyobozi iri muri application; ntabwo ari official census count.": "Medium confidence: this count comes from the administrative index bundled with the application; it is not an official census count.",
  "Nta muntu uhuye n'iri zina wabonetse mu rutonde rw'amakuru rusange.": "No person matching this name was found in the public directory.",
  "Abantu barenze umwe bahuye n'izina; nta muntu nahisemo mu mwanya wawe.": "More than one person matched the name; I have not chosen someone on your behalf.",
  "Nimero zakuwe ku makuru yemejwe kandi yatangajwe ku mugaragaro.": "The numbers come from verified information published for public use.",
  "Nta nimero rusange yemewe yabonetse mu makuru yagenzuwe.": "No verified public contact number was found in the checked information.",
  "Nta muyobozi wabonetse mu makuru rusange.": "No leader was found in the public information.",
  "Nta gipimo cy'icyizere gikenewe kuri iki gisubizo.": "A confidence rating is not applicable to this answer.",
  "Igikoresho cy'iki kibazo kiracyategurwa.": "The tool for this question is still being prepared.",
  "Icyizere kiri hasi.": "Low confidence.",
  "Icyizere kiri hagati.": "Medium confidence.",
  "Icyizere kiri hejuru.": "High confidence.",
  "Kwamamaza:": "Source:",
  "Urwego rw'ahantu rufite parent ituzuye muri index. Ntabwo nshobora kwemeza hierarchy y'iyi kode.": "This place has an incomplete parent record in the index. I cannot verify the hierarchy for this code.",
  "Index nta nyandiko z'urwego rukurikiyeho ifite kuri aha hantu. Ntabwo nzerekana ko ifite abana zero, kuko amakuru ashobora kuba atuzuye.": "The index has no records for the next administrative level in this place. I will not report zero children because the data may be incomplete.",
  "Kode y'ahantu ntabwo yemewe. Ntabwo nshobora kubara imibare idafite kode yemewe.": "The place code is invalid. I cannot calculate counts without a valid code.",
  "Nta hantu bihuye n'iyi kode nabonye mu bubiko bw'inzego z'ubuyobozi. Ntabwo nzahimba umubare.": "I could not find a place matching this code in the administrative index. I will not invent a count.",
  "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzatanga ubuso ntashingiye ku mibare yagenzuwe.": "The PostGIS service is currently unavailable. I will not provide an area without verified measurements.",
  "Nta geometry yemewe y'ahantu habonetse muri database ya IWACU RWANDA.": "No verified geometry for this place was found in the IWACU RWANDA database.",
  "Geometry y'ahantu ntiyashoboye kugenzurwa neza. Ntabwo nzatanga umubare w'ubuso utizewe.": "The geometry could not be verified. I will not provide an unreliable area figure.",
  "Nta kode ebyiri z'ahantu zemewe zabonetse zo gupima intera. Ntabwo nzahimba intera.": "Two valid place codes were not found for the distance calculation. I will not invent a distance.",
  "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzatanga intera ntashingiye ku mibare yagenzuwe.": "The PostGIS service is currently unavailable. I will not provide a distance without verified measurements.",
  "Geometry y'ahantu habiri ntiyabonetse mu database ya IWACU RWANDA. Nta intera ntanze.": "The geometry for the two places was not found in the IWACU RWANDA database. No distance has been provided.",
  "Geometry y'ahantu habiri ntiyashoboye kugenzurwa. Ntabwo nzatanga intera itizewe.": "The geometry for the two places could not be verified. I will not provide an unreliable distance.",
  "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzahimba ahantu bihana imbibi.": "The PostGIS service is currently unavailable. I will not invent neighbouring places.",
  "Geometry y'ahantu ntiyashoboye kugenzurwa. Ntabwo nzatanga urutonde rw'ahantu hihana imbibi rutizewe.": "The place geometry could not be verified. I will not provide an unreliable list of neighbouring places."
});

Object.assign(fr, {
  "Mu makuru rusange": "Dans l'annuaire public",
  "Reba amakuru y'uyu muyobozi": "Voir les informations de ce responsable",
  "Umwanya ntiwanditswe": "Fonction non renseignée",
  "Inkomoko:": "Source :",
  "Itariki yo gutangaza ntiyatangajwe.": "Date de publication non indiquée.",
  "Dore nimero zemewe zatangajwe z'umuyobozi w'aho hantu. Nongeraho n'abayobozi bo ku nzego zo hejuru kugira ngo ubone inzira z'ubuyobozi:": "Voici les coordonnées publiques vérifiées des responsables de cette zone. J'ai également ajouté les responsables des niveaux administratifs supérieurs afin de présenter les voies de contact disponibles :",
  "Dore nimero rusange zatangajwe z'uwo muyobozi:": "Voici les numéros de contact publiés pour ce responsable :",
  "Nta nimero rusange y'uwo muyobozi iri mu makuru yatangajwe. Ntabwo mfite nimero yemewe yo kuguha.": "Aucun numéro public pour ce responsable ne figure dans les informations publiées. Je ne dispose d'aucun numéro vérifié à vous communiquer.",
  "Nta muyobozi uhuye n'izina watanze nabonye mu rutonde rw'abayobozi rwemejwe kandi rugaragara ku mugaragaro. Ibyo ntibihamya ko uwo muntu atari umuyobozi; bivuga gusa ko atabonetse muri aya makuru.": "Je n'ai trouvé aucun responsable correspondant à ce nom dans l'annuaire public vérifié. Cela ne prouve pas que cette personne n'est pas responsable ; cela signifie seulement qu'elle ne figure pas dans ces données.",
  "Andika nibura igice cy'izina ry'umuntu ushaka. Nta muntu nzahitamo ntamubonye mu makuru yemewe.": "Saisissez au moins une partie du nom de la personne recherchée. Je ne sélectionnerai personne sans information vérifiée.",
  "Hari abayobozi benshi bafite amazina asa. Reba aho buri wese akorera kugira ngo utavanga abantu:": "Plusieurs responsables ont des noms similaires. Vérifiez le lieu d'affectation de chacun afin de ne pas les confondre :",
  "Nabonye umuyobozi uhuye n'izina watanze mu makuru yemejwe kandi agaragara ku mugaragaro:": "J'ai trouvé un responsable correspondant au nom indiqué dans les informations publiques vérifiées :",
  "Sinabonye umuyobozi twari tumaze kuvuga. Ongera ubaze izina rye kugira ngo nguhe amakuru yemejwe.": "Je n'ai pas retrouvé le responsable dont nous parlions. Demandez à nouveau son nom pour que je recherche des informations vérifiées.",
  "Sinashoboye kongera kwemeza amakuru y'uwo muyobozi muri uru rutonde. Ntabwo ngiye gutanga nimero ntabonye.": "Je n'ai pas pu vérifier à nouveau les informations de ce responsable dans l'annuaire. Je ne fournirai pas un numéro que je n'ai pas trouvé.",
  "Nta hantu bihuye n'ikibazo cyawe nabonye mu bubiko bw'ahantu bwa IWACU. Ntabwo nzagerageza guhimba aho ari ho. Gerageza andi magambo cyangwa wongereho Akarere/Umurenge niba uhabizi.": "Je n'ai trouvé aucun lieu correspondant dans la base de données d'IWACU. Je ne vais pas deviner ni inventer un lieu. Essayez d'autres termes ou ajoutez le district ou le secteur si vous le connaissez.",
  "Hari ahantu henshi bihuye n'izina washakishije. Hitamo ahantu hagaragajwe kugira ngo ntavange amazina:": "Plusieurs lieux correspondent au nom recherché. Choisissez l'un des lieux affichés afin d'éviter toute confusion :",
  "Nkeneye izina ry'ahantu kugira ngo nshakishe neza. Urugero: Gasabo, Kacyiru cyangwa Kamatamu.": "J'ai besoin du nom d'un lieu pour effectuer une recherche précise. Par exemple : Gasabo, Kacyiru ou Kamatamu.",
  "Nkeneye izina cyangwa kode y'ahantu kugira ngo mbarire imibare y'inzego (umubare w'imirenge, utugari, n'ibindi). Urugero: Akarere ka Gasabo gafite imirenge ingahe?": "J'ai besoin du nom ou du code d'un lieu pour compter ses unités administratives (secteurs, cellules, etc.). Par exemple : combien de secteurs compte le district de Gasabo ?",
  "Kugira ngo ngereranye intera, andika ahantu habiri. Urugero: Intera iri hagati ya Gasabo na Huye ingana iki?": "Pour comparer une distance, indiquez deux lieux. Par exemple : quelle est la distance entre Gasabo et Huye ?",
  "Ahantu ha mbere ntihabonetse mu bubiko bw'ahantu bwa IWACU. Ongera ugenzure izina ryaho.": "Le premier lieu n'a pas été trouvé dans la base de données d'IWACU. Vérifiez son nom et réessayez.",
  "Ahantu ha mbere hashobora kuba henshi. Hitamo aho washakaga mbere yo kugereranya intera.": "Le premier nom peut désigner plusieurs lieux. Sélectionnez le lieu voulu avant de comparer la distance.",
  "Ahantu ha kabiri ntihabonetse mu bubiko bw'ahantu bwa IWACU. Ongera ugenzure izina ryaho.": "Le deuxième lieu n'a pas été trouvé dans la base de données d'IWACU. Vérifiez son nom et réessayez.",
  "Ahantu ha kabiri hashobora kuba henshi. Hitamo aho washakaga mbere yo kugereranya intera.": "Le deuxième nom peut désigner plusieurs lieux. Sélectionnez le lieu voulu avant de comparer la distance.",
  "Ahantu habiri hagomba kuba hatandukanye. Ongera utange amazina yombi.": "Les deux lieux doivent être différents. Indiquez à nouveau les deux noms.",
  "Nta hantu bihuye n'izina watanze nabonye mu bubiko. Ongera ugenzure izina ry'aho ushaka imbibi.": "Je n'ai trouvé aucun lieu correspondant à ce nom dans la base de données. Vérifiez le nom du lieu dont vous souhaitez consulter les limites.",
  "Hari ahantu henshi bihuye n'izina. Hitamo ahantu mbere yo gusuzuma imbibi.": "Plusieurs lieux correspondent à ce nom. Sélectionnez le lieu voulu avant de consulter ses limites.",
  "Vuga ahantu ushaka kumenya imbibi zako. Urugero: Imbibi z'Akarere ka Gasabo ziri he?": "Indiquez le lieu dont vous souhaitez connaître les limites. Par exemple : où se trouvent les limites du district de Gasabo ?",
  "Dore nimero zemewe z'ubutabazi zo mu Rwanda. Koresha izihuye n'ikibazo cyawe:": "Voici les numéros d'urgence vérifiés au Rwanda. Utilisez celui qui correspond à votre situation :",
  "Mu gihe cy'inkongi: hamagara nimero zemewe z'ubutabazi. Kurikiza amabwiriza y'umutekano. Ntabwo nshobora kugufasha mu buryo butari ubwo gutanga nimero zemewe.": "En cas d'incendie : appelez les numéros d'urgence vérifiés et suivez les consignes de sécurité. Je peux fournir des numéros vérifiés, mais je ne remplace pas les services de secours.",
  "Ububiko bw'amakuru ntibwashoboye kuboneka ubu. Nta makuru nshobora kwemeza. Ongera ugerageze nyuma.": "La base de données est actuellement indisponible ; je ne peux donc pas vérifier de réponse. Veuillez réessayer plus tard.",
  "Icyizere kiri hagati: amakuru yavuye ku rutonde rw'abayobozi rwemejwe; itariki yo kuvugurura ntigaragajwe.": "Confiance moyenne : les informations proviennent de l'annuaire vérifié des responsables, mais sa date de mise à jour n'est pas indiquée.",
  "Icyizere kiri hagati: amakuru yavuye ku rutonde rw'abayobozi rwemejwe, ariko itariki yo kuvugurura ntigaragajwe.": "Confiance moyenne : les informations proviennent de l'annuaire vérifié des responsables, mais sa date de mise à jour n'est pas indiquée.",
  "Icyizere kiri hasi: igisubizo kivuye ku rwego rwo hejuru kuko urwego wabajije rutuzuye.": "Confiance faible : le résultat provient d'un niveau administratif supérieur, car aucun enregistrement n'est disponible au niveau demandé.",
  "Icyizere kiri hagati: izina ryabonetse mu bubiko bw'ahantu, ariko itariki y'amakuru ntigaragajwe.": "Confiance moyenne : le nom figure dans la base de données des lieux, mais la date des données n'est pas indiquée.",
  "Icyizere kiri hagati: umubare uva ku index y'inzego z'ubuyobozi iri muri application; ntabwo ari official census count.": "Confiance moyenne : ce décompte provient de l'index administratif intégré à l'application ; il ne s'agit pas d'un recensement officiel.",
  "Nta muntu uhuye n'iri zina wabonetse mu rutonde rw'amakuru rusange.": "Aucune personne correspondant à ce nom n'a été trouvée dans l'annuaire public.",
  "Abantu barenze umwe bahuye n'izina; nta muntu nahisemo mu mwanya wawe.": "Plusieurs personnes correspondent à ce nom ; je n'ai choisi personne à votre place.",
  "Nimero zakuwe ku makuru yemejwe kandi yatangajwe ku mugaragaro.": "Les numéros proviennent d'informations vérifiées et publiées pour le public.",
  "Nta nimero rusange yemewe yabonetse mu makuru yagenzuwe.": "Aucun numéro public vérifié n'a été trouvé dans les informations consultées.",
  "Nta muyobozi wabonetse mu makuru rusange.": "Aucun responsable n'a été trouvé dans les informations publiques.",
  "Nta gipimo cy'icyizere gikenewe kuri iki gisubizo.": "Aucun niveau de confiance n'est applicable à cette réponse.",
  "Igikoresho cy'iki kibazo kiracyategurwa.": "L'outil nécessaire pour cette question est encore en préparation.",
  "Icyizere kiri hasi.": "Confiance faible.",
  "Icyizere kiri hagati.": "Confiance moyenne.",
  "Icyizere kiri hejuru.": "Confiance élevée.",
  "Urwego rw'ahantu rufite parent ituzuye muri index. Ntabwo nshobora kwemeza hierarchy y'iyi kode.": "Le parent administratif de ce lieu est incomplet dans l'index. Je ne peux pas vérifier la hiérarchie de ce code.",
  "Index nta nyandiko z'urwego rukurikiyeho ifite kuri aha hantu. Ntabwo nzerekana ko ifite abana zero, kuko amakuru ashobora kuba atuzuye.": "L'index ne contient aucun enregistrement pour le niveau administratif suivant dans ce lieu. Je ne vais pas indiquer zéro enfant, car les données peuvent être incomplètes.",
  "Kode y'ahantu ntabwo yemewe. Ntabwo nshobora kubara imibare idafite kode yemewe.": "Le code du lieu n'est pas valide. Je ne peux pas calculer de décompte sans code valide.",
  "Nta hantu bihuye n'iyi kode nabonye mu bubiko bw'inzego z'ubuyobozi. Ntabwo nzahimba umubare.": "Aucun lieu correspondant à ce code n'a été trouvé dans l'index administratif. Je n'inventerai pas de chiffre.",
  "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzatanga ubuso ntashingiye ku mibare yagenzuwe.": "Le service PostGIS est actuellement indisponible. Je ne fournirai pas de superficie sans mesures vérifiées.",
  "Nta geometry yemewe y'ahantu habonetse muri database ya IWACU RWANDA.": "Aucune géométrie vérifiée pour ce lieu n'a été trouvée dans la base de données d'IWACU RWANDA.",
  "Geometry y'ahantu ntiyashoboye kugenzurwa neza. Ntabwo nzatanga umubare w'ubuso utizewe.": "La géométrie du lieu n'a pas pu être vérifiée. Je ne fournirai pas de superficie non fiable.",
  "Nta kode ebyiri z'ahantu zemewe zabonetse zo gupima intera. Ntabwo nzahimba intera.": "Deux codes de lieux valides n'ont pas été trouvés pour calculer la distance. Je n'inventerai pas de distance.",
  "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzatanga intera ntashingiye ku mibare yagenzuwe.": "Le service PostGIS est actuellement indisponible. Je ne fournirai pas de distance sans mesures vérifiées.",
  "Geometry y'ahantu habiri ntiyabonetse mu database ya IWACU RWANDA. Nta intera ntanze.": "La géométrie des deux lieux n'a pas été trouvée dans la base de données d'IWACU RWANDA. Aucune distance n'est fournie.",
  "Geometry y'ahantu habiri ntiyashoboye kugenzurwa. Ntabwo nzatanga intera itizewe.": "La géométrie des deux lieux n'a pas pu être vérifiée. Je ne fournirai pas de distance non fiable.",
  "Serivisi ya PostGIS ntibonetse ubu. Ntabwo nzahimba ahantu bihana imbibi.": "Le service PostGIS est actuellement indisponible. Je n'inventerai pas les lieux voisins.",
  "Geometry y'ahantu ntiyashoboye kugenzurwa. Ntabwo nzatanga urutonde rw'ahantu hihana imbibi rutizewe.": "La géométrie du lieu n'a pas pu être vérifiée. Je ne fournirai pas une liste non fiable des lieux limitrophes."
});


Object.assign(en, {
  "Polisi — ubutabazi bwihuse": "Police — emergency assistance",
  "Inkongi y'umuriro n'ubutabazi": "Fire and rescue",
  "Impanuka zo mu muhanda": "Road traffic accidents",
  "RBC — umurongo w'amakuru n'ubufasha ku buzima": "RBC health information and support line",
  "Imbangukiragutabara (SAMU)": "Ambulance (SAMU)",
  "Umurongo w'abana": "Child helpline",
  "Ihohoterwa rishingiye ku gitsina (Isange)": "Gender-based violence (Isange)",
  "Kurwanya ruswa": "Report corruption",
  "Ibibazo byo mu mazi (ibiyaga)": "Water and lake emergencies",
  "Kurega umupolisi wakoze nabi": "Report police misconduct",
  "Ibibazo by'impushya zo gutwara": "Driving licence enquiries",
  "Rwanda National Police (RNP)": "Rwanda National Police (RNP)",
  "Traffic Police Rwanda": "Traffic Police Rwanda",
  "Rwanda Biomedical Centre (RBC)": "Rwanda Biomedical Centre (RBC)",
  "Rwanda Biomedical Centre (RBC), SAMU": "Rwanda Biomedical Centre (RBC), SAMU",
  "National Child Development Agency (NCDA)": "National Child Development Agency (NCDA)",
  "Ministry of Gender and Family Promotion": "Ministry of Gender and Family Promotion",
  "Office of the Ombudsman": "Office of the Ombudsman",
  "RNP Marine Unit": "Rwanda National Police Marine Unit",
  "Ubushakashatsi bwo hanze ntabwo bwemewe ubu. Nta makuru yo kuri internet nzahimba.": "External research is currently disabled. I will not invent information from the internet.",
  "Ikibazo ni kigufi cyane cyangwa amakuru yihariye yakuweho. Andika icyo ushaka gushakisha muri rusange.": "The question is too short or personal information was removed. Describe what you want to research in general terms.",
  "Nta provider y'ubushakashatsi yatoranyijwe cyangwa yemewe. Nta masoko nshobora kwemeza.": "No research provider has been selected or enabled. I cannot verify any sources.",
  "Provider yatoranyijwe ariko API key yo kuri server ntiyashyizweho. Nta bushakashatsi bwakozwe.": "A provider is selected, but its server-side API key has not been configured. No research was performed.",
  "Search provider ntiyashoboye kugarura amakuru ubu.": "The search provider could not retrieve information right now.",
  "Urufunguzo rwa search provider ntirwemewe.": "The search provider's API key was rejected.",
  "Search provider yasabye kugabanya umuvuduko w'ibibazo. Ongera ugerageze nyuma.": "The search provider has rate-limited requests. Please try again later.",
  "Nabonye amasoko yo hanze. Reba incamake n'aho yaturutse; ibisubizo bya search ntabwo bihita byemerwa nk'ukuri kwemejwe.": "I found external sources. Review the summary and its sources; search results are not automatically treated as verified facts.",
  "Nta masoko yizewe kandi afite HTTPS yabonetse kuri iki kibazo. Ntabwo nzahimba ibisubizo.": "No reliable HTTPS sources were found for this question. I will not invent an answer.",
  "Ntibyashobotse kuvugana na search provider ubu. Nta makuru cyangwa isoko byahimbwe.": "The search provider could not be reached. No information or source has been invented.",
  "Icyizere kiri hasi: igisubizo kivuye ku rwego rwo hejuru kuko urwego wabajije rutuzuye.": "Low confidence: the answer comes from a higher administrative level because the requested level has no complete record.",
  "Nimero zakuwe ku rutonde rwemejwe rw'ubutabazi.": "The numbers come from the verified emergency list.",
  "Itariki yo gusuzuma urutonde: 2026-11-09.": "List checked on 9 November 2026.",
  "Igazeti ya Leta n° Special yo ku wa 10/03/2026 — Itegeko n° 014/2026, Ingingo ya 5": "Official Gazette Special of 10 March 2026 — Law No. 014/2026, Article 5",
  "Itegeko n° 014/2026 ryo ku wa 06/03/2026, ryasohotse mu Igazeti ya Leta yo ku wa 10/03/2026, mu ngingo ya 5(1)(g) rivuga ko ibimenyetso bigenga ikoreshwa ry'umuhanda biri mu mategeko agenga umuhanda. Ingingo ya 5(2) ivuga ko ibisobanuro birambuye bizashyirwaho n'Iteka rya Minisitiri. Ariko IWACU ntirafite urutonde rw'ibyapa rwemejwe rugaragaza buri cyapa n'aho giherereye. Ntabwo nshobora kwemeza icyapa kiri hafi yawe cyangwa kuguhereza urutonde rwacyo ntashingiye ku makuru yagenzuwe.": "Law No. 014/2026 of 6 March 2026, published in the Official Gazette on 10 March 2026, states in Article 5(1)(g) that road traffic signs are governed by road traffic rules. Article 5(2) states that detailed provisions will be set by a Ministerial Order. However, IWACU does not yet have a verified inventory showing each sign and its location. I cannot confirm which sign is near you or provide a list without verified information."
});

Object.assign(fr, {
  "Polisi — ubutabazi bwihuse": "Police — secours d'urgence",
  "Inkongi y'umuriro n'ubutabazi": "Incendie et secours",
  "Impanuka zo mu muhanda": "Accidents de la route",
  "RBC — umurongo w'amakuru n'ubufasha ku buzima": "Ligne d'information et d'assistance sanitaire du RBC",
  "Imbangukiragutabara (SAMU)": "Ambulance (SAMU)",
  "Umurongo w'abana": "Ligne d'assistance aux enfants",
  "Ihohoterwa rishingiye ku gitsina (Isange)": "Violences basées sur le genre (Isange)",
  "Kurwanya ruswa": "Signaler la corruption",
  "Ibibazo byo mu mazi (ibiyaga)": "Urgences liées à l'eau et aux lacs",
  "Kurega umupolisi wakoze nabi": "Signaler un abus policier",
  "Ibibazo by'impushya zo gutwara": "Renseignements sur les permis de conduire",
  "Rwanda National Police (RNP)": "Police nationale du Rwanda (RNP)",
  "Traffic Police Rwanda": "Police routière du Rwanda",
  "Rwanda Biomedical Centre (RBC)": "Rwanda Biomedical Centre (RBC)",
  "Rwanda Biomedical Centre (RBC), SAMU": "Rwanda Biomedical Centre (RBC), SAMU",
  "National Child Development Agency (NCDA)": "Agence nationale de développement de l'enfant (NCDA)",
  "Ministry of Gender and Family Promotion": "Ministère du Genre et de la Promotion de la famille",
  "Office of the Ombudsman": "Office de l'Ombudsman",
  "RNP Marine Unit": "Unité maritime de la Police nationale du Rwanda",
  "Ubushakashatsi bwo hanze ntabwo bwemewe ubu. Nta makuru yo kuri internet nzahimba.": "La recherche externe est actuellement désactivée. Je n'inventerai aucune information provenant d'Internet.",
  "Ikibazo ni kigufi cyane cyangwa amakuru yihariye yakuweho. Andika icyo ushaka gushakisha muri rusange.": "La question est trop courte ou des informations personnelles ont été retirées. Décrivez de manière générale ce que vous souhaitez rechercher.",
  "Nta provider y'ubushakashatsi yatoranyijwe cyangwa yemewe. Nta masoko nshobora kwemeza.": "Aucun fournisseur de recherche n'a été sélectionné ou activé. Je ne peux vérifier aucune source.",
  "Provider yatoranyijwe ariko API key yo kuri server ntiyashyizweho. Nta bushakashatsi bwakozwe.": "Un fournisseur a été sélectionné, mais sa clé API côté serveur n'est pas configurée. Aucune recherche n'a été effectuée.",
  "Search provider ntiyashoboye kugarura amakuru ubu.": "Le moteur de recherche n'a pas pu récupérer les informations pour le moment.",
  "Urufunguzo rwa search provider ntirwemewe.": "La clé API du moteur de recherche a été refusée.",
  "Search provider yasabye kugabanya umuvuduko w'ibibazo. Ongera ugerageze nyuma.": "Le moteur de recherche a limité le nombre de requêtes. Veuillez réessayer plus tard.",
  "Nabonye amasoko yo hanze. Reba incamake n'aho yaturutse; ibisubizo bya search ntabwo bihita byemerwa nk'ukuri kwemejwe.": "J'ai trouvé des sources externes. Consultez le résumé et ses sources ; les résultats de recherche ne sont pas automatiquement considérés comme des faits vérifiés.",
  "Nta masoko yizewe kandi afite HTTPS yabonetse kuri iki kibazo. Ntabwo nzahimba ibisubizo.": "Aucune source fiable utilisant HTTPS n'a été trouvée pour cette question. Je n'inventerai pas de réponse.",
  "Ntibyashobotse kuvugana na search provider ubu. Nta makuru cyangwa isoko byahimbwe.": "Impossible de joindre le moteur de recherche pour le moment. Aucune information ni source n'a été inventée.",
  "Icyizere kiri hasi: igisubizo kivuye ku rwego rwo hejuru kuko urwego wabajije rutuzuye.": "Confiance faible : la réponse provient d'un niveau administratif supérieur, car les données du niveau demandé sont incomplètes.",
  "Nimero zakuwe ku rutonde rwemejwe rw'ubutabazi.": "Les numéros proviennent de la liste d'urgence vérifiée.",
  "Itariki yo gusuzuma urutonde: 2026-11-09.": "Liste vérifiée le 9 novembre 2026.",
  "Igazeti ya Leta n° Special yo ku wa 10/03/2026 — Itegeko n° 014/2026, Ingingo ya 5": "Journal officiel spécial du 10 mars 2026 — Loi n° 014/2026, article 5",
  "Itegeko n° 014/2026 ryo ku wa 06/03/2026, ryasohotse mu Igazeti ya Leta yo ku wa 10/03/2026, mu ngingo ya 5(1)(g) rivuga ko ibimenyetso bigenga ikoreshwa ry'umuhanda biri mu mategeko agenga umuhanda. Ingingo ya 5(2) ivuga ko ibisobanuro birambuye bizashyirwaho n'Iteka rya Minisitiri. Ariko IWACU ntirafite urutonde rw'ibyapa rwemejwe rugaragaza buri cyapa n'aho giherereye. Ntabwo nshobora kwemeza icyapa kiri hafi yawe cyangwa kuguhereza urutonde rwacyo ntashingiye ku makuru yagenzuwe.": "La loi n° 014/2026 du 6 mars 2026, publiée au Journal officiel le 10 mars 2026, dispose à l'article 5(1)(g) que la signalisation routière relève des règles de circulation routière. L'article 5(2) précise que les modalités détaillées seront fixées par arrêté ministériel. Toutefois, IWACU ne dispose pas encore d'un inventaire vérifié indiquant chaque panneau et son emplacement. Je ne peux pas confirmer quel panneau se trouve près de vous ni fournir une liste sans données vérifiées."
});


Object.assign(en, {
  "Baza, ganira, ushake amakuru y'ubuyobozi.": "Ask questions, have a conversation and find public administration information.",
  "Tangira ikiganiro gishya": "Start a new conversation",
  "Tangira bundi bushya": "Start again",
  "Ntabwo mpimba amakuru": "I do not invent information",
  "Amakuru aturuka mu bubiko bwemewe": "Information comes from verified records",
  "Muraho, ndi Ishakiro ry'Ubuhanga.": "Hello, I am Ishakiro, your AI assistant.",
  "Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.": "Choose a question or type what you would like to know.",
  "Icyuho cy'amakuru cyanditswe kugira ngo kizakurikiranwe.": "This information gap has been recorded for follow-up.",
  "Turimo kumenya aho uri kugira ngo dushake umuyobozi...": "We are identifying your location so we can find the local leader...",
  "Turimo kugenzura amakuru...": "We are checking the information...",
  "Andika ikibazo cyawe": "Enter your question",
  "Andika ikibazo cyawe hano...": "Type your question here...",
  "Ohereza ikibazo": "Send question",
  "Ohereza": "Send",
  "Ntukandike amakuru y'ibanga.": "Do not enter confidential information.",
  "Leta": "Government",
  "Umuryango mpuzamahanga / uburezi": "International or academic organization",
  "Itangazamakuru": "Publisher",
  "Irindi soko": "Other source"
});
Object.assign(fr, {
  "Baza, ganira, ushake amakuru y'ubuyobozi.": "Posez vos questions, échangez et trouvez des informations sur l'administration publique.",
  "Tangira ikiganiro gishya": "Commencer une nouvelle conversation",
  "Tangira bundi bushya": "Recommencer",
  "Ntabwo mpimba amakuru": "Je n'invente pas d'informations",
  "Amakuru aturuka mu bubiko bwemewe": "Les informations proviennent de sources vérifiées",
  "Muraho, ndi Ishakiro ry'Ubuhanga.": "Bonjour, je suis Ishakiro, votre assistant d'intelligence artificielle.",
  "Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.": "Choisissez une question ou saisissez ce que vous souhaitez savoir.",
  "Icyuho cy'amakuru cyanditswe kugira ngo kizakurikiranwe.": "Cette lacune d'information a été enregistrée pour un suivi.",
  "Turimo kumenya aho uri kugira ngo dushake umuyobozi...": "Nous déterminons votre position afin de rechercher le responsable local...",
  "Turimo kugenzura amakuru...": "Nous vérifions les informations...",
  "Andika ikibazo cyawe": "Saisissez votre question",
  "Andika ikibazo cyawe hano...": "Saisissez votre question ici...",
  "Ohereza ikibazo": "Envoyer la question",
  "Ohereza": "Envoyer",
  "Ntukandike amakuru y'ibanga.": "Ne saisissez pas d'informations confidentielles.",
  "Leta": "Gouvernement",
  "Umuryango mpuzamahanga / uburezi": "Organisation internationale ou universitaire",
  "Itangazamakuru": "Éditeur",
  "Irindi soko": "Autre source"
});


Object.assign(en, {
  "Mpa nimero z'ubutabazi.": "Show me emergency numbers.",
  "Ninde uyobora aho ndi?": "Who is the leader where I am?",
  "Menya aho ndi": "Find my location",
  "Baza, ganira, ushake amakuru y'ubuyobozi.": "Ask questions, have a conversation and find administrative information.",
  "Muraho, ndi Ishakiro ry'Ubuhanga.": "Hello, I am Ishakiro, the smart assistant.",
  "Nshobora gushaka ahantu n'abayobozi, kuguha amakuru y'ubutabazi no kukubwira aho amakuru abura.": "I can find places and leaders, provide emergency information, and tell you when information is missing.",
  "Igisubizo cyose cy'amakuru kigomba kugira aho cyavuye.": "Every factual answer must have a source.",
  "Ntibyashobotse kubona igisubizo. Ongera ugerageze.": "I could not retrieve an answer. Please try again.",
  "Ikibazo cyabaye mu gihe cyo gushakisha. Ongera ugerageze.": "A problem occurred while searching. Please try again.",
  "Ntabwo nashoboye kugera ku makuru ubu. Nta gisubizo mpimbye. Ongera ugerageze.": "I cannot access the information right now. I will not invent an answer. Please try again.",
  "Ntibyashobotse kumenya aho uri ubu. Ntabwo ngiye gutanga izina ry'umuyobozi ntaramenya aho agomba gushakirwa. Ongera ugerageze kumenya aho uri, cyangwa ubaze izina ry'Umurenge/Akarere ushaka.": "I could not determine your current location. I will not name a leader until I know which area to search. Try locating yourself again, or ask about a named sector or district.",
  "Banza ukande Menya aho ndi ku rubuga kugira ngo nshakishe umuyobozi w'aho uri.": "First select Find my location on the page so I can search for the leader in your area.",
  "Tangira bundi bushya": "Start again",
  "Ntabwo mpimba amakuru": "I do not invent information",
  "Amakuru aturuka mu bubiko bwemewe": "Information comes from verified records",
  "Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.": "Choose a question or type what you would like to know.",
  "Hitamo ikibazo cyangwa wandike icyo ushaka kumenya": "Choose a question or type what you would like to know",
  "Andika ikibazo cyawe hano...": "Type your question here...",
  "Ohereza ikibazo": "Send question",
  "Ohereza": "Send",
  "Ntukandike amakuru y'ibanga.": "Do not enter sensitive personal information.",
  "Turimo kumenya aho uri kugira ngo dushake umuyobozi...": "Determining your location so I can find the local leader...",
  "Turimo kugenzura amakuru...": "Checking the information...",
  "Tangira ikiganiro gishya": "Start a new conversation",
  "Ishakiro ry'Ubuhanga": "Smart Assistant",
  "Andika ikibazo cyawe": "Type your question",
  "Icyuho cy'amakuru cyanditswe kugira ngo kizakurikiranwe.": "This information gap has been recorded for follow-up.",
  "Leta": "Government",
  "Umuryango mpuzamahanga / uburezi": "International or academic organization",
  "Itangazamakuru": "Publisher",
  "Irindi soko": "Other source",
  "Intara": "Province",
  "Akarere": "District",
  "Umurenge": "Sector",
  "Akagari": "Cell",
  "Umudugudu": "Village",
  "Igihugu": "Country",
  "Aho akorera": "Area of service"
});

Object.assign(fr, {
  "Mpa nimero z'ubutabazi.": "Indiquez-moi les numéros d'urgence.",
  "Ninde uyobora aho ndi?": "Qui est le responsable de ma localité ?",
  "Menya aho ndi": "Déterminer ma position",
  "Baza, ganira, ushake amakuru y'ubuyobozi.": "Posez vos questions, échangez et trouvez des informations administratives.",
  "Muraho, ndi Ishakiro ry'Ubuhanga.": "Bonjour, je suis Ishakiro, l'assistant intelligent.",
  "Nshobora gushaka ahantu n'abayobozi, kuguha amakuru y'ubutabazi no kukubwira aho amakuru abura.": "Je peux rechercher des lieux et des responsables, fournir des informations d'urgence et signaler les informations manquantes.",
  "Igisubizo cyose cy'amakuru kigomba kugira aho cyavuye.": "Toute réponse factuelle doit être accompagnée de sa source.",
  "Ntibyashobotse kubona igisubizo. Ongera ugerageze.": "Impossible d'obtenir une réponse. Veuillez réessayer.",
  "Ikibazo cyabaye mu gihe cyo gushakisha. Ongera ugerageze.": "Un problème est survenu pendant la recherche. Veuillez réessayer.",
  "Ntabwo nashoboye kugera ku makuru ubu. Nta gisubizo mpimbye. Ongera ugerageze.": "Je ne peux pas accéder aux informations pour le moment. Je n'inventerai pas de réponse. Veuillez réessayer.",
  "Ntibyashobotse kumenya aho uri ubu. Ntabwo ngiye gutanga izina ry'umuyobozi ntaramenya aho agomba gushakirwa. Ongera ugerageze kumenya aho uri, cyangwa ubaze izina ry'Umurenge/Akarere ushaka.": "Je n'ai pas pu déterminer votre position actuelle. Je ne citerai aucun responsable avant de savoir dans quelle zone effectuer la recherche. Réessayez de déterminer votre position ou posez une question sur un secteur ou un district précis.",
  "Banza ukande Menya aho ndi ku rubuga kugira ngo nshakishe umuyobozi w'aho uri.": "Sélectionnez d'abord « Déterminer ma position » sur la page afin que je recherche le responsable de votre zone.",
  "Tangira ikiganiro gishya": "Commencer une nouvelle conversation",
  "Tangira bundi bushya": "Recommencer",
  "Ntabwo mpimba amakuru": "Je n'invente pas d'informations",
  "Amakuru aturuka mu bubiko bwemewe": "Les informations proviennent de registres vérifiés",
  "Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.": "Choisissez une question ou saisissez ce que vous souhaitez savoir.",
  "Hitamo ikibazo cyangwa wandike icyo ushaka kumenya": "Choisissez une question ou saisissez ce que vous souhaitez savoir",
  "Andika ikibazo cyawe hano...": "Saisissez votre question ici...",
  "Ohereza ikibazo": "Envoyer la question",
  "Ohereza": "Envoyer",
  "Ntukandike amakuru y'ibanga.": "Ne saisissez pas d'informations personnelles sensibles.",
  "Turimo kumenya aho uri kugira ngo dushake umuyobozi...": "Détermination de votre position pour rechercher le responsable local...",
  "Turimo kugenzura amakuru...": "Vérification des informations...",
  "Ishakiro ry'Ubuhanga": "Assistant intelligent",
  "Andika ikibazo cyawe": "Saisissez votre question",
  "Icyuho cy'amakuru cyanditswe kugira ngo kizakurikiranwe.": "Cette lacune d'information a été enregistrée pour être suivie.",
  "Leta": "Gouvernement",
  "Umuryango mpuzamahanga / uburezi": "Organisation internationale ou universitaire",
  "Itangazamakuru": "Média d'information",
  "Irindi soko": "Autre source",
  "Intara": "Province",
  "Akarere": "District",
  "Umurenge": "Secteur",
  "Akagari": "Cellule",
  "Umudugudu": "Village",
  "Igihugu": "Pays",
  "Aho akorera": "Lieu d'affectation"
});


Object.assign(en, {
  "Ongera ugerageze": "Try again",
  "Shaka umuyobozi w'aho ndi": "Find the leader in my area",
  "Reba nimero z'ubutabazi": "View emergency numbers",
  "Nimero ye": "Their phone number",
  "Reba abayobozi bo ku rwego rwo hejuru": "View leaders at higher administrative levels",
  "Reba abayobozi bo ku nzego zo hejuru": "View leaders at higher administrative levels",
  "Baza ibiro by'ubuyobozi": "Contact the administrative office",
  "Shaka ibiro by'ubuyobozi bw'ako gace": "Find the local administrative office",
  "Reba amakuru y'akarere": "View district information",
  "Mpa nimero y'umuyobozi": "Give me the leader's phone number",
  "Gerageza andi mazina": "Try other names",
  "Ongeraho Akarere cyangwa Umurenge": "Add the district or sector",
  "Shakisha irindi zina": "Search for another name",
  "Baza umuyobozi w'aho uri": "Ask the leader in your area",
  "Hitamo ahantu hagaragara hano": "Choose one of the places shown here",
  "Ninde uyobora aha?": "Who leads this area?",
  "Mpa nimero y'umuyobozi w'aha": "Give me the phone number of this area's leader",
  "Ongera ushakishe umuyobozi": "Search for the leader again",
  "Reba amakuru y'aho akorera": "View information about their area of service",
  "Reba urwego rw'ubuyobozi rumwegereye": "View the nearest higher administrative level",
  "Shaka undi muyobozi": "Find another leader",
  "Shaka umuyobozi w'ahantu": "Find a local leader",
  "Shaka ahantu mu Rwanda": "Find a place in Rwanda",
  "Ongera ugerageze kumenya aho ndi": "Try to determine my location again",
  "Reba imbibi z'aho ndi": "View the boundaries of my area",
  "Shakisha amakuru ku yindi ngingo": "Search for information about another topic",
  "Ninde uyobora umurenge wa Kacyiru?": "Who leads Kacyiru Sector?",
  "Meya w'Akarere ka Gasabo ni nde?": "Who is the Mayor of Gasabo District?",
  "Akarere ka Gasabo gafite imirenge ingahe?": "How many sectors does Gasabo District have?",
  "U Rwanda rufite uturere tungahe?": "How many districts does Rwanda have?",
  "Akarere ka Gasabo kari mu Ntara iyihe?": "Which province is Gasabo District in?",
  "Umurenge wa Kacyiru ufite utugari tungahe?": "How many cells does Kacyiru Sector have?",
  "Intera iri hagati ya Gasabo na Huye ingana iki?": "What is the distance between Gasabo and Huye?",
  "Imbibi z'Akarere ka Gasabo ziri he?": "Where are the boundaries of Gasabo District?",
  "Show the boundaries of Gasabo": "Show the boundaries of Gasabo"
});

Object.assign(fr, {
  "Ongera ugerageze": "Réessayer",
  "Shaka umuyobozi w'aho ndi": "Trouver le responsable de ma localité",
  "Reba nimero z'ubutabazi": "Consulter les numéros d'urgence",
  "Nimero ye": "Son numéro de téléphone",
  "Reba abayobozi bo ku rwego rwo hejuru": "Consulter les responsables des niveaux administratifs supérieurs",
  "Reba abayobozi bo ku nzego zo hejuru": "Consulter les responsables des niveaux administratifs supérieurs",
  "Baza ibiro by'ubuyobozi": "Contacter le bureau administratif",
  "Shaka ibiro by'ubuyobozi bw'ako gace": "Trouver le bureau administratif local",
  "Reba amakuru y'akarere": "Consulter les informations du district",
  "Mpa nimero y'umuyobozi": "Donnez-moi le numéro du responsable",
  "Gerageza andi mazina": "Essayez d'autres noms",
  "Ongeraho Akarere cyangwa Umurenge": "Ajoutez le district ou le secteur",
  "Shakisha irindi zina": "Rechercher un autre nom",
  "Baza umuyobozi w'aho uri": "Contacter le responsable de votre localité",
  "Hitamo ahantu hagaragara hano": "Choisissez l'un des lieux affichés",
  "Ninde uyobora aha?": "Qui dirige cette zone ?",
  "Mpa nimero y'umuyobozi w'aha": "Donnez-moi le numéro du responsable de cette zone",
  "Ongera ushakishe umuyobozi": "Rechercher à nouveau le responsable",
  "Reba amakuru y'aho akorera": "Consulter les informations sur son lieu d'affectation",
  "Reba urwego rw'ubuyobozi rumwegereye": "Consulter le niveau administratif supérieur le plus proche",
  "Shaka undi muyobozi": "Trouver un autre responsable",
  "Shaka umuyobozi w'ahantu": "Trouver un responsable local",
  "Shaka ahantu mu Rwanda": "Rechercher un lieu au Rwanda",
  "Ongera ugerageze kumenya aho ndi": "Réessayer de déterminer ma position",
  "Reba imbibi z'aho ndi": "Consulter les limites de ma zone",
  "Shakisha amakuru ku yindi ngingo": "Rechercher des informations sur un autre sujet",
  "Ninde uyobora umurenge wa Kacyiru?": "Qui dirige le secteur de Kacyiru ?",
  "Meya w'Akarere ka Gasabo ni nde?": "Qui est le maire du district de Gasabo ?",
  "Akarere ka Gasabo gafite imirenge ingahe?": "Combien de secteurs compte le district de Gasabo ?",
  "U Rwanda rufite uturere tungahe?": "Combien de districts compte le Rwanda ?",
  "Akarere ka Gasabo kari mu Ntara iyihe?": "Dans quelle province se trouve le district de Gasabo ?",
  "Umurenge wa Kacyiru ufite utugari tungahe?": "Combien de cellules compte le secteur de Kacyiru ?",
  "Intera iri hagati ya Gasabo na Huye ingana iki?": "Quelle est la distance entre Gasabo et Huye ?",
  "Imbibi z'Akarere ka Gasabo ziri he?": "Où se trouvent les limites du district de Gasabo ?",
  "How far is Kacyiru from Gasabo?": "Quelle est la distance entre Kacyiru et Gasabo ?",
  "Show the boundaries of Gasabo": "Afficher les limites de Gasabo"
});


Object.assign(en, {
  "Mu Rwanda hari uturere tungahe?": "How many districts are there in Rwanda?",
  "Ongeraho Akarere, Umurenge cyangwa umwanya afite": "Add the district, sector or the person's position",
  "Reba aho aka gace gaherereye": "View where this area is located",
  "Shaka amakuru y'akarere": "Find district information",
  "Shaka ahantu": "Find a place",
  "Shaka umuyobozi w'aho uri": "Find the leader in your area",
  "Shaka umuyobozi witwa Muhire Boniface": "Find the leader named Muhire Boniface",
  "Wamfasha iki?": "What can you help me with?"
});

Object.assign(fr, {
  "Mu Rwanda hari uturere tungahe?": "Combien de districts compte le Rwanda ?",
  "Ongeraho Akarere, Umurenge cyangwa umwanya afite": "Ajoutez le district, le secteur ou la fonction de la personne",
  "Reba aho aka gace gaherereye": "Consulter l'emplacement de cette zone",
  "Shaka amakuru y'akarere": "Rechercher des informations sur le district",
  "Shaka ahantu": "Rechercher un lieu",
  "Shaka umuyobozi w'aho uri": "Trouver le responsable de votre localité",
  "Shaka umuyobozi witwa Muhire Boniface": "Rechercher le responsable nommé Muhire Boniface",
  "Wamfasha iki?": "En quoi pouvez-vous m'aider ?",
  "How far is Kacyiru from Gasabo?": "Quelle est la distance entre Kacyiru et Gasabo ?"
});


Object.assign(en, {
  "Mpa nimero z'ubutabazi": "Give me emergency numbers",
  "Mu Rwanda hari uturere tungahe?": "How many districts are there in Rwanda?",
  "Ongeraho Akarere, Umurenge cyangwa umwanya afite": "Add the district, sector or the person's role",
  "Reba aho aka gace gaherereye": "View this area's location",
  "Shaka ahantu": "Find a place",
  "Shaka amakuru y'akarere": "Find district information",
  "Shaka umuyobozi w'aho uri": "Find the leader for your location",
  "Shaka umuyobozi witwa Muhire Boniface": "Find the leader named Muhire Boniface",
  "Wamfasha iki?": "What can you help me with?",
  "Koresha nimero y'ubutabazi yemewe iri ku rutonde; mu kaga kihutirwa hamagara serivisi z'ubutabazi.": "Use an official emergency number from the list; in an urgent situation, call emergency services.",
  "Ongera ugerageze kumenya aho uri kandi ugenzure ko Location ifunguye muri telefone.": "Try locating yourself again and check that Location is enabled on your phone.",
  "Ongera ugenzure Location ya telefone cyangwa utange izina ry'Umudugudu uri gushakiramo umuyobozi.": "Check your phone's Location setting again or provide the name of the village where you want to find the leader.",
  "Tanga izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi.": "Provide the place name, and add the district or sector if you know it.",
  "Ongera ushakishe umuyobozi ukoresheje izina rye cyangwa aho akorera.": "Search for the leader again using their name or place of work.",
  "Ongeraho igice cy'izina, Akarere cyangwa Umurenge uwo muntu akoreramo.": "Add part of the person's name, the district or the sector where they work.",
  "Tanga amazina y'ahantu habiri atandukanye kugira ngo intera ibarwe.": "Provide the names of two different places so their distance can be calculated.",
  "Tanga izina cyangwa kode y'ahantu ushaka gusuzuma imbibi zako.": "Provide the name or code of the place whose boundaries you want to check.",
  "Baza urwego rushinzwe imihanda ku rutonde rw'ibyapa n'aho biherereye; IWACU ntirufite urutonde rwabyo rwagenzuwe.": "Ask the road authority for an inventory of signs and their locations; IWACU does not yet have a verified inventory.",
  "Tanga izina cyangwa kode y'ahantu ushaka kubarira imibare y'inzego.": "Provide the name or code of the place whose administrative units you want counted.",
  "Ongera ugerageze nyuma cyangwa ubaze ikibazo kijyanye n'ahantu n'ubuyobozi muri IWACU.": "Try again later, or ask a question about places and public administration in IWACU.",
  "Baza ikibazo kijyanye n'ahantu, abayobozi cyangwa ubutabazi mu Rwanda.": "Ask a question about places, leaders or emergency services in Rwanda."
});
Object.assign(fr, {
  "Mpa nimero z'ubutabazi": "Donnez-moi les numéros d'urgence",
  "Mu Rwanda hari uturere tungahe?": "Combien de districts compte le Rwanda ?",
  "Ongeraho Akarere, Umurenge cyangwa umwanya afite": "Ajoutez le district, le secteur ou la fonction de cette personne",
  "Reba aho aka gace gaherereye": "Voir où se trouve cette zone",
  "Shaka ahantu": "Rechercher un lieu",
  "Shaka amakuru y'akarere": "Rechercher des informations sur le district",
  "Shaka umuyobozi w'aho uri": "Rechercher le responsable de votre emplacement",
  "Shaka umuyobozi witwa Muhire Boniface": "Rechercher le responsable nommé Muhire Boniface",
  "Wamfasha iki?": "En quoi pouvez-vous m'aider ?",
  "Koresha nimero y'ubutabazi yemewe iri ku rutonde; mu kaga kihutirwa hamagara serivisi z'ubutabazi.": "Utilisez un numéro d'urgence officiel de la liste ; en cas d'urgence, appelez les services de secours.",
  "Ongera ugerageze kumenya aho uri kandi ugenzure ko Location ifunguye muri telefone.": "Réessayez de déterminer votre position et vérifiez que la localisation est activée sur votre téléphone.",
  "Ongera ugenzure Location ya telefone cyangwa utange izina ry'Umudugudu uri gushakiramo umuyobozi.": "Vérifiez à nouveau le réglage de localisation de votre téléphone ou indiquez le nom du village où vous recherchez le responsable.",
  "Tanga izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi.": "Indiquez le nom du lieu et ajoutez le district ou le secteur si vous le connaissez.",
  "Ongera ushakishe umuyobozi ukoresheje izina rye cyangwa aho akorera.": "Recherchez à nouveau le responsable à partir de son nom ou de son lieu de travail.",
  "Ongeraho igice cy'izina, Akarere cyangwa Umurenge uwo muntu akoreramo.": "Ajoutez une partie du nom de la personne, le district ou le secteur où elle travaille.",
  "Tanga amazina y'ahantu habiri atandukanye kugira ngo intera ibarwe.": "Indiquez les noms de deux lieux différents afin de calculer la distance qui les sépare.",
  "Tanga izina cyangwa kode y'ahantu ushaka gusuzuma imbibi zako.": "Indiquez le nom ou le code du lieu dont vous souhaitez vérifier les limites.",
  "Baza urwego rushinzwe imihanda ku rutonde rw'ibyapa n'aho biherereye; IWACU ntirufite urutonde rwabyo rwagenzuwe.": "Demandez à l'autorité routière l'inventaire des panneaux et de leurs emplacements ; IWACU ne dispose pas encore d'un inventaire vérifié.",
  "Tanga izina cyangwa kode y'ahantu ushaka kubarira imibare y'inzego.": "Indiquez le nom ou le code du lieu dont vous souhaitez compter les unités administratives.",
  "Ongera ugerageze nyuma cyangwa ubaze ikibazo kijyanye n'ahantu n'ubuyobozi muri IWACU.": "Réessayez plus tard ou posez une question sur les lieux et l'administration publique dans IWACU.",
  "Baza ikibazo kijyanye n'ahantu, abayobozi cyangwa ubutabazi mu Rwanda.": "Posez une question sur les lieux, les responsables ou les services d'urgence au Rwanda."
});


Object.assign(en, {
  "Ibisobanuro by'ahantu ntibyabonetse.": "The place details were not found.",
  "Koresha nimero y'ubutabazi yemewe iri ku rutonde; mu kaga kihutirwa hamagara serivisi z'ubutabazi": "Use a verified emergency number from the list; in an urgent situation, call the emergency services",
  "Ongera ugerageze kumenya aho uri kandi ugenzure ko Location ifunguye muri telefone": "Try locating yourself again and check that Location is enabled on your phone",
  "Ongera ugenzure Location ya telefone cyangwa utange izina ry'Umudugudu uri gushakiramo umuyobozi": "Check your phone's Location setting again, or provide the name of the village where you are looking for a leader",
  "Tanga izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi": "Enter the place name and add its district or sector if you know it",
  "Ongera ushakishe umuyobozi ukoresheje izina rye cyangwa aho akorera": "Search for the leader again using their name or area of service",
  "Ongeraho igice cy'izina, Akarere cyangwa Umurenge uwo muntu akoreramo": "Add part of the person's name, district or sector where they serve",
  "Ongera utange izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi": "Enter the place name again and add its district or sector if you know it",
  "Tanga amazina y'ahantu habiri atandukanye kugira ngo intera ibarwe": "Provide the names of two different places so the distance can be calculated",
  "Tanga izina cyangwa kode y'ahantu ushaka gusuzuma imbibi zako": "Provide the name or code of the place whose boundaries you want to check",
  "Baza urwego rushinzwe imihanda ku rutonde rw'ibyapa n'aho biherereye; IWACU ntirufite urutonde rwabyo rwagenzuwe": "Ask the road authority for the list of signs and their locations; IWACU does not yet have a verified inventory",
  "Tanga izina cyangwa kode y'ahantu ushaka kubarira imibare y'inzego": "Provide the name or code of the place whose administrative units you want counted",
  "Ongera ugerageze nyuma cyangwa ubaze ikibazo kijyanye n'ahantu n'ubuyobozi muri IWACU": "Try again later, or ask a question about places and administration in IWACU",
  "Baza ikibazo kijyanye n'ahantu, abayobozi cyangwa ubutabazi mu Rwanda": "Ask a question about places, leaders or emergency services in Rwanda",
  "Ongera utange izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi.": "Enter the place name again and add its district or sector if you know it",
});

Object.assign(fr, {
  "Ibisobanuro by'ahantu ntibyabonetse.": "Les informations du lieu n'ont pas été trouvées.",
  "Koresha nimero y'ubutabazi yemewe iri ku rutonde; mu kaga kihutirwa hamagara serivisi z'ubutabazi": "Utilisez un numéro d'urgence vérifié dans la liste ; en cas d'urgence, appelez les services de secours",
  "Ongera ugerageze kumenya aho uri kandi ugenzure ko Location ifunguye muri telefone": "Réessayez de déterminer votre position et vérifiez que la localisation est activée sur votre téléphone",
  "Ongera ugenzure Location ya telefone cyangwa utange izina ry'Umudugudu uri gushakiramo umuyobozi": "Vérifiez à nouveau la localisation de votre téléphone ou indiquez le nom du village où vous recherchez un responsable",
  "Tanga izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi": "Indiquez le nom du lieu et ajoutez le district ou le secteur si vous le connaissez",
  "Ongera ushakishe umuyobozi ukoresheje izina rye cyangwa aho akorera": "Recherchez à nouveau le responsable à partir de son nom ou de son lieu d'affectation",
  "Ongeraho igice cy'izina, Akarere cyangwa Umurenge uwo muntu akoreramo": "Ajoutez une partie du nom de la personne, le district ou le secteur où elle travaille",
  "Ongera utange izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi": "Indiquez à nouveau le nom du lieu et ajoutez le district ou le secteur si vous le connaissez",
  "Tanga amazina y'ahantu habiri atandukanye kugira ngo intera ibarwe": "Indiquez les noms de deux lieux différents afin de calculer la distance",
  "Tanga izina cyangwa kode y'ahantu ushaka gusuzuma imbibi zako": "Indiquez le nom ou le code du lieu dont vous souhaitez vérifier les limites",
  "Baza urwego rushinzwe imihanda ku rutonde rw'ibyapa n'aho biherereye; IWACU ntirufite urutonde rwabyo rwagenzuwe": "Demandez à l'autorité routière la liste des panneaux et leurs emplacements ; IWACU ne dispose pas encore d'un inventaire vérifié",
  "Tanga izina cyangwa kode y'ahantu ushaka kubarira imibare y'inzego": "Indiquez le nom ou le code du lieu dont vous souhaitez compter les unités administratives",
  "Ongera ugerageze nyuma cyangwa ubaze ikibazo kijyanye n'ahantu n'ubuyobozi muri IWACU": "Réessayez plus tard ou posez une question sur les lieux et l'administration dans IWACU",
  "Baza ikibazo kijyanye n'ahantu, abayobozi cyangwa ubutabazi mu Rwanda": "Posez une question sur les lieux, les responsables ou les services d'urgence au Rwanda",
  "Ongera utange izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi.": "Indiquez à nouveau le nom du lieu et ajoutez le district ou le secteur si vous le connaissez",
});

function translateAssistantDynamic(value: string, locale: Exclude<Locale, "rw">): string | null {
  const levelLabels: Record<string, { en: string; fr: string }> = {
    "Intara": { en: "Province", fr: "Province" },
    "Akarere": { en: "District", fr: "District" },
    "Umurenge": { en: "Sector", fr: "Secteur" },
    "Akagari": { en: "Cell", fr: "Cellule" },
    "Umudugudu": { en: "Village", fr: "Village" },
    "intara": { en: "province", fr: "province" },
    "akarere": { en: "district", fr: "district" },
    "umurenge": { en: "sector", fr: "secteur" },
    "akagari": { en: "cell", fr: "cellule" },
    "umudugudu": { en: "village", fr: "village" },
  };
  const level = (raw: string) => levelLabels[raw]?.[locale] ?? raw;
  const levelTitle = (raw: string) => {
    const canonical = raw.charAt(0).toUpperCase() + raw.slice(1);
    return levelLabels[canonical]?.[locale] ?? level(raw);
  };
  const frenchUnitTarget = (rawLevel: string, name: string) =>
    "l'unité administrative (« " + level(rawLevel).toLocaleLowerCase("fr-FR") + " ») " + name;

  const count = value.match(/^U Rwanda rufite (?:(\d[\d,]*) (uturere|intara|imirenge|utugari|imidugudu)|intara (\d[\d,]*))\.(?: Umujyi wa Kigali uri ku rwego rumwe n'intara ariko si intara\.)? Imibare y'ibindi byiciro igaragazwa ku rubuga rwa Guverinoma: (.+)\.$/);
  if (count) {
    const mainNumber = count[1] ?? count[3];
    const mainLevel = count[2] ?? "intara";
    const detailPattern = /Umujyi wa Kigali (\d[\d,]*)|(\d[\d,]*) (intara|uturere|imirenge|utugari|imidugudu)/g;
    const details: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = detailPattern.exec(count[4])) !== null) {
      const rawNumber = (match[1] ?? match[2]).replace(/,$/, "");
      const number = locale === "fr" ? rawNumber.replace(/,/g, " ") : rawNumber;
      if (match[1]) {
        details.push(locale === "en" ? number + " City of Kigali" : number + " Ville de Kigali");
      } else {
        const labels: Record<string, { en: string; fr: string }> = {
          "intara": { en: "provinces", fr: "provinces" },
          "uturere": { en: "districts", fr: "districts" },
          "imirenge": { en: "sectors", fr: "secteurs" },
          "utugari": { en: "cells", fr: "cellules" },
          "imidugudu": { en: "villages", fr: "villages" }
        };
        details.push(number + " " + labels[match[3]][locale]);
      }
    }
    const join = details.length < 2
      ? details.join("")
      : details.slice(0, -1).join(", ") + (locale === "en" ? " and " : " et ") + details[details.length - 1];
    const formattedMain = locale === "fr" ? mainNumber.replace(/,/g, " ") : mainNumber;
    const labels: Record<string, { en: string; fr: string }> = {
      "uturere": { en: "districts", fr: "districts" },
      "intara": { en: "provinces", fr: "provinces" },
      "imirenge": { en: "sectors", fr: "secteurs" },
      "utugari": { en: "cells", fr: "cellules" },
      "imidugudu": { en: "villages", fr: "villages" }
    };
    const mainLabel = labels[mainLevel][locale];
    const headline = locale === "en"
      ? "Rwanda has " + formattedMain + " " + mainLabel + "."
      : "Le Rwanda compte " + formattedMain + " " + mainLabel + ".";
    const cityClarification = mainLevel === "intara"
      ? locale === "en"
        ? " Kigali City is at the same administrative level as a province, but it is not a province."
        : " La Ville de Kigali se situe au même niveau administratif qu'une province, mais ce n'est pas une province."
      : "";
    const detailLead = locale === "en"
      ? " The Government website lists these administrative totals: "
      : " Les chiffres administratifs publiés sur le site du Gouvernement sont : ";
    return headline + cityClarification + detailLead + join + ".";
  }

  const located = value.match(/^Aho IWACU imaze kumenya ni (Intara|Akarere|Umurenge|Akagari|Umudugudu) ya (.+?)\. Inzira y'inzego: (.+)\.$/);
  if (located) {
    return locale === "en"
      ? "IWACU identified your location as " + level(located[1]) + " " + located[2] + ". Administrative path: " + located[3] + "."
      : "IWACU a identifié votre position au niveau administratif suivant : " + level(located[1]) + " — " + located[2] + ". Parcours administratif : " + located[3] + ".";
  }

  const placeFound = value.match(/^Nabonye (.+?)\. Dore aho iherereye mu nzego z'ubuyobozi: (.+)\.$/);
  if (placeFound) {
    return locale === "en"
      ? "I found " + placeFound[1] + ". Its administrative hierarchy is: " + placeFound[2] + "."
      : "J'ai trouvé " + placeFound[1] + ". Sa hiérarchie administrative est : " + placeFound[2] + ".";
  }

  const directLeaders = value.match(/^Abayobozi banditswe kandi bemejwe kuri (intara|akarere|umurenge|akagari|umudugudu) ya (.+):$/);
  if (directLeaders) {
    return locale === "en"
      ? "Verified leaders listed for " + level(directLeaders[1]) + " " + directLeaders[2] + ":"
      : "Responsables vérifiés répertoriés pour " + frenchUnitTarget(directLeaders[1], directLeaders[2]) + " :";
  }

  const noLeaders = value.match(/^Nta muyobozi wemejwe wanditswe kuri (intara|akarere|umurenge|akagari|umudugudu) ya (.+?), kandi nta muyobozi wo ku rwego rwo hejuru wabonetse muri database\. Nta zina cyangwa nimero nshobora guhimba\. Intambwe ikurikira ni ukumenyesha ibiro by'ubuyobozi bw'ako gace ko aya makuru abura\.$/);
  if (noLeaders) {
    return locale === "en"
      ? "No verified leader is listed for " + level(noLeaders[1]) + " " + noLeaders[2] + ", and no leader at the next administrative level was found in the database. I will not invent a name or phone number. The next step is to notify the local administrative office that this information is missing."
      : "Aucun responsable vérifié n'est répertorié pour " + frenchUnitTarget(noLeaders[1], noLeaders[2]) + ", et aucun responsable du niveau administratif supérieur n'a été trouvé dans la base de données. Je n'inventerai ni nom ni numéro de téléphone. L'étape suivante consiste à informer le bureau administratif local que cette information manque.";
  }


  const noLocalPhone = value.match(/^Nta nimero rusange y'umuyobozi wo kuri (.+?) ya (.+?) iri mu bubiko\. Dore umuyobozi wo ku rwego rukurikiyeho ufite nimero yatangajwe:$/);
  if (noLocalPhone) {
    return locale === "en"
      ? "No public phone number is listed for " + levelTitle(noLocalPhone[1]) + " " + noLocalPhone[2] + " in the database. Here is the closest higher-level leader with a published number:"
      : "Aucun numéro public n'est répertorié pour " + frenchUnitTarget(noLocalPhone[1], noLocalPhone[2]) + " dans la base de données. Voici le responsable du niveau supérieur le plus proche dont le numéro est publié :";
  }

  const noPlacePhone = value.match(/^Nta nimero rusange y'umuyobozi wa (.+?) cyangwa iy'abayobozi bo ku nzego zo hejuru iri mu makuru yatangajwe\. Ntabwo mfite nimero yemewe yo kuguha\. Intambwe ikurikira ni ukubaza ibiro by'ubuyobozi bw'ako gace\.$/);
  if (noPlacePhone) {
    return locale === "en"
      ? "No public phone number is listed for a leader in " + noPlacePhone[1] + " or for leaders at higher administrative levels. I do not have a verified number to give you. The next step is to ask the local administrative office."
      : "Aucun numéro public n'est publié pour un responsable de " + noPlacePhone[1] + " ni pour les responsables des niveaux administratifs supérieurs. Je ne dispose d'aucun numéro vérifié à vous communiquer. L'étape suivante consiste à contacter le bureau administratif local.";
  }

  const noDirectLeader = value.match(/^Nta muyobozi wanditswe kuri (intara|akarere|umurenge|akagari|umudugudu) ya (.+)\. Umuyobozi wo ku rwego rwegereye hejuru twabonye ni:$/);
  if (noDirectLeader) {
    return locale === "en"
      ? "No leader is listed for " + level(noDirectLeader[1]) + " " + noDirectLeader[2] + ". The closest higher-level leader found is:"
      : "Aucun responsable n'est répertorié pour " + frenchUnitTarget(noDirectLeader[1], noDirectLeader[2]) + ". Le responsable du niveau supérieur le plus proche trouvé est :";
  }


  const hierarchyCount = value.match(/^(Intara|Akarere|Umurenge|Akagari|Umudugudu) ya (.+?) ifite (\d+) (intara|akarere|umurenge|akagari|umudugudu) mu bubiko bw'inzego\. (?:Iherereye muri (intara|akarere|umurenge|akagari|umudugudu) ya (.+)\.)?$/);
  if (hierarchyCount) {
    const unitLevel = level(hierarchyCount[1]);
    const childLevel = level(hierarchyCount[4]);
    const childPlural: Record<string, { en: string; fr: string }> = {
      "intara": { en: "provinces", fr: "provinces" },
      "akarere": { en: "districts", fr: "districts" },
      "umurenge": { en: "sectors", fr: "secteurs" },
      "akagari": { en: "cells", fr: "cellules" },
      "umudugudu": { en: "villages", fr: "villages" },
    };
    const parentText = hierarchyCount[5] && hierarchyCount[6]
      ? (locale === "en"
        ? " Higher administrative level: " + levelTitle(hierarchyCount[5]) + " — " + hierarchyCount[6] + "."
        : " Niveau administratif supérieur : " + level(hierarchyCount[5]) + " — " + hierarchyCount[6] + ".")
      : "";
    return locale === "en"
      ? hierarchyCount[2] + " " + unitLevel + " has " + hierarchyCount[3] + " " + childPlural[hierarchyCount[4]].en + " in the administrative index." + parentText
      : hierarchyCount[2] + " (" + unitLevel.toLocaleLowerCase("fr-FR") + ") compte " + hierarchyCount[3] + " " + childPlural[hierarchyCount[4]].fr + " dans l'index administratif." + parentText;
  }


  const terminalPlace = value.match(/^(Intara|Akarere|Umurenge|Akagari|Umudugudu) ya (.+?) nta rwego rukurikiyeho mu hierarchy\. (?:Iherereye muri (intara|akarere|umurenge|akagari|umudugudu) ya (.+)\.)?$/);
  if (terminalPlace) {
    const parentText = terminalPlace[3] && terminalPlace[4]
      ? (locale === "en"
        ? " It is located in " + level(terminalPlace[3]) + " " + terminalPlace[4] + "."
        : " Niveau administratif supérieur : " + level(terminalPlace[3]) + " — " + terminalPlace[4] + ".")
      : "";
    return locale === "en"
      ? terminalPlace[2] + " " + level(terminalPlace[1]) + " has no lower administrative level in the hierarchy." + parentText
      : terminalPlace[2] + " (" + level(terminalPlace[1]).toLocaleLowerCase("fr-FR") + ") n'a pas de niveau administratif inférieur dans la hiérarchie." + parentText;
  }


  const notReady = value.match(/^(Kubara intera nyayo muri metero|Kwerekana no gusobanura imbibi|Kumenya ibyapa n'ibimenyetso biri hafi|Kubara imibare, ubuso no kugereranya ahantu|Gushakisha amakuru yo hanze|Iki gikoresho) ntibirahuzwa n'amakuru yagenzuwe muri iki gice\. Ntabwo ngiye gutanga imibare cyangwa ibisobanuro bidafite inkomoko\.$/);
  if (notReady) {
    const capabilityLabels: Record<string, { en: string; fr: string }> = {
      "Kubara intera nyayo muri metero": { en: "Exact distance measurement in metres", fr: "Mesure exacte de distance en mètres" },
      "Kwerekana no gusobanura imbibi": { en: "Showing and explaining boundaries", fr: "Affichage et explication des limites" },
      "Kumenya ibyapa n'ibimenyetso biri hafi": { en: "Finding nearby road signs and traffic signs", fr: "Recherche des panneaux routiers et de signalisation à proximité" },
      "Kubara imibare, ubuso no kugereranya ahantu": { en: "Counting administrative units, calculating area and comparing places", fr: "Décompte des unités administratives, calcul des superficies et comparaison des lieux" },
      "Gushakisha amakuru yo hanze": { en: "External information research", fr: "Recherche d'informations externes" },
      "Iki gikoresho": { en: "This tool", fr: "Cet outil" },
    };
    return locale === "en"
      ? capabilityLabels[notReady[1]].en + " is not connected to verified information in this phase. I will not provide figures or descriptions without a source."
      : capabilityLabels[notReady[1]].fr + " n'est pas encore reliée aux informations vérifiées dans cette phase. Je ne fournirai ni chiffre ni description sans source.";
  }

  const area = value.match(/^Ubuso bwa (.+?) bungana na ([\d,\s]+) m², bubarwa kuri geometry ibitswe muri database ya IWACU RWANDA\.$/);
  if (area) {
    const number = locale === "fr" ? area[2].replace(/,/g, " ").trim() : area[2].trim();
    return locale === "en"
      ? "The mapped area of " + area[1] + " is " + number + " m², calculated from geometry stored in IWACU RWANDA's database."
      : "La superficie cartographique de " + area[1] + " est de " + number + " m², calculée à partir de la géométrie enregistrée dans la base de données d'IWACU RWANDA.";
  }

  const distance = value.match(/^Intera yo mu murongo ugororotse hagati ya (.+?) na (.+?) ni hafi ([\d,\s]+) m\. Ibarwa hagati y'utudomo duhagarariye buri gace, si intera yo mu muhanda\.$/);
  if (distance) {
    const number = locale === "fr" ? distance[3].replace(/,/g, " ").trim() : distance[3].trim();
    return locale === "en"
      ? "The straight-line distance between " + distance[1] + " and " + distance[2] + " is approximately " + number + " m. It is measured between representative points for each area, not along roads."
      : "La distance à vol d'oiseau entre " + distance[1] + " et " + distance[2] + " est d'environ " + number + " m. Elle est mesurée entre des points représentatifs de chaque zone, et non le long des routes.";
  }

  const adjacent = value.match(/^(.+?) hihana imbibi na: (.+?)\. Ibi bishingiye ku mipaka ya polygons ikoranaho muri database\.$/);
  if (adjacent) {
    return locale === "en"
      ? adjacent[1] + " shares a boundary with: " + adjacent[2] + ". This is based on polygon boundaries that touch in the database."
      : adjacent[1] + " partage une limite avec : " + adjacent[2] + ". Cette information repose sur le contact des limites des polygones dans la base de données.";
  }

  const noAdjacent = value.match(/^Nta kandi gace ko ku rwego rumwe kabonetse gahanye imbibi na (.+?) muri geometry iri muri database\.$/);
  if (noAdjacent) {
    return locale === "en"
      ? "No other area at the same administrative level was found sharing a boundary with " + noAdjacent[1] + " in the database geometry."
      : "Aucune autre zone du même niveau administratif partageant une limite avec " + noAdjacent[1] + " n'a été trouvée dans la géométrie de la base de données.";
  }

  return null;
}

export function translateText(value: string, locale: Locale): string {
  if (locale === "rw" || !value) return value;
  const dictionary = dictionaries[locale];
  const trimmed = value.trim();
  const appendedNextStep = trimmed.match(/^([\s\S]+?)\s+Intambwe ikurikira:\s*([\s\S]+)$/);
  if (appendedNextStep) {
    const rawAction = appendedNextStep[2].trim();
    const punctuation = /[.!?]$/.test(rawAction) ? rawAction.slice(-1) : ".";
    const action = punctuation === "." || punctuation === "!" || punctuation === "?"
      ? rawAction.slice(0, -1)
      : rawAction;
    const translatedBase = translateText(appendedNextStep[1].trim(), locale);
    const translatedAction = translateText(action, locale);
    const nextStepLabel = locale === "en" ? "Next step: " : "Étape suivante : ";
    return value.replace(trimmed, translatedBase + " " + nextStepLabel + translatedAction + punctuation);
  }
  const direct = dictionary[trimmed];
  if (direct) return value.replace(trimmed, direct);
  const assistantTranslation = translateAssistantDynamic(trimmed, locale);
  if (assistantTranslation) return value.replace(trimmed, assistantTranslation);

  const emergencyCall = trimmed.match(/^Hamagara (\\d+) (.+)$/);
  if (emergencyCall) {
    const action = locale === "en" ? "Call " : "Appeler le ";
    const number = locale === "fr" ? emergencyCall[1] + " " : emergencyCall[1];
    return value.replace(trimmed, action + number + translateText(emergencyCall[2], locale));
  }

  const confidence = trimmed.match(/^Icyizere:\s*(.+)$/);
  if (confidence) {
    const label = locale === "en" ? "Confidence:" : "Confiance :";
    return value.replace(trimmed, label + " " + confidence[1]);
  }

  const count = trimmed.match(/^Abayobozi babonetse muri aka gace \((\d+)\):?$/);
  if (count) {
    const label = locale === "en" ? "Leaders found in this area" : "Responsables trouvés dans cette zone";
    return value.replace(trimmed, label + " (" + count[1] + "):");
  }

  const precision = trimmed.match(/^Telefone yawe ishobora kuba ifite ikosa rya hafi metero (.+)\.$/);
  if (precision) {
    const sentence = locale === "en"
      ? "Your phone's location may be inaccurate by about " + precision[1] + " metres."
      : "La position de votre téléphone peut présenter une marge d'erreur d'environ " + precision[1] + " mètres.";
    return value.replace(trimmed, sentence);
  }

  const searchLevel = trimmed.match(/^Shakisha (.+) \(ushatse\)…$/);
  if (searchLevel) {
    const level = translateText(searchLevel[1].replace(/^./, (letter) => letter.toUpperCase()), locale).toLocaleLowerCase(locale === "fr" ? "fr-FR" : "en-GB");
    const label = locale === "en" ? "Search " + level + " (optional)…" : "Rechercher " + level + " (facultatif)…";
    return value.replace(trimmed, label);
  }

  const mapBoundaryMany = trimmed.match(/^Imbibi zigaragara: (\d+)\. Kwegera \(zoom\) kugira ngo ubone n'utundi duce n'amazina yabyo\.$/);
  if (mapBoundaryMany) {
    const message = locale === "en"
      ? "Boundaries displayed: " + mapBoundaryMany[1] + ". Zoom in to see additional areas and their names."
      : "Limites affichées : " + mapBoundaryMany[1] + ". Zoomez pour voir d'autres zones et leurs noms.";
    return value.replace(trimmed, message);
  }

  const mapBoundaryCount = trimmed.match(/^Imbibi z'imidugudu zagaragajwe: (\d+)\. Amazina agaragara iyo ikarita iri hafi\.$/);
  if (mapBoundaryCount) {
    const message = locale === "en"
      ? "Village boundaries displayed: " + mapBoundaryCount[1] + ". Names appear when you zoom in."
      : "Limites des villages affichées : " + mapBoundaryCount[1] + ". Les noms apparaissent lorsque vous zoomez.";
    return value.replace(trimmed, message);
  }

  const adminLabel = trimmed.match(/^(Intara|Akarere|Umurenge|Akagari|Umudugudu) ·\s*$/);
  if (adminLabel) {
    return value.replace(trimmed, translateText(adminLabel[1], locale) + " · ");
  }

  const translatePath = (path: string) => path.split(" · ").map((part) => {
    const separator = part.indexOf(":");
    if (separator < 0) return part;
    const label = part.slice(0, separator);
    const place = part.slice(separator + 1).trim();
    return translateText(label, locale) + ": " + place;
  }).join(" · ");

  const welcomeNotice = trimmed.match(/^Murakaza neza!\s*(Ubu uri: .+)$/);
  if (welcomeNotice) {
    const greeting = locale === "en" ? "Welcome! " : "Bienvenue ! ";
    return value.replace(trimmed, greeting + translateText(welcomeNotice[1], locale));
  }

  const approachNotice = trimmed.match(/^Usigaje hafi ya metero (\d+) ngo winjire mu gace muturanye\. (.+)\. GPS accuracy: ±(\d+) m\.$/);
  if (approachNotice) {
    const sentence = locale === "en"
      ? "About " + approachNotice[1] + " metres remain before you enter the neighbouring area. " + translatePath(approachNotice[2]) + ". GPS accuracy: ±" + approachNotice[3] + " m."
      : "Il reste environ " + approachNotice[1] + " mètres avant d'entrer dans la zone voisine. " + translatePath(approachNotice[2]) + ". Précision GPS : ±" + approachNotice[3] + " m.";
    return value.replace(trimmed, sentence);
  }

  const currentLocation = trimmed.match(/^Ubu uri:\s*(.+)\.$/);
  if (currentLocation) {
    const prefix = locale === "en" ? "You are now in: " : "Vous êtes actuellement à : ";
    return value.replace(trimmed, prefix + translatePath(currentLocation[1]) + ".");
  }

  const departedTitle = trimmed.match(/^WASEZETSE:\s*(.+?)\s+(.+)$/);
  if (departedTitle) {
    const label = translateText(departedTitle[1], locale);
    const title = locale === "en" ? "LEFT: " + label + " " + departedTitle[2]
      : "VOUS AVEZ QUITTÉ : " + label + " " + departedTitle[2];
    return value.replace(trimmed, title);
  }

  const departedBody = trimmed.match(/^Wasohotse muri (.+?) ya (.+?)\. Uvuye aho hantu werekeza kuri: (.+)\.$/);
  if (departedBody) {
    const level = translateText(departedBody[1].replace(/^./, (letter) => letter.toUpperCase()), locale);
    const sentence = locale === "en"
      ? "You left " + level + " " + departedBody[2] + ". You are heading towards: " + translatePath(departedBody[3]) + "."
      : "Vous avez quitté " + level.toLocaleLowerCase() + " " + departedBody[2] + ". Vous vous dirigez vers : " + translatePath(departedBody[3]) + ".";
    return value.replace(trimmed, sentence);
  }

  const welcomeTitle = trimmed.match(/^MURAKAZA NEZA:\s*(.+?)\s+(.+)$/);
  if (welcomeTitle) {
    const label = translateText(welcomeTitle[1], locale);
    const title = locale === "en" ? "WELCOME: " + label + " " + welcomeTitle[2]
      : "BIENVENUE : " + label + " " + welcomeTitle[2];
    return value.replace(trimmed, title);
  }

  const welcomeBody = trimmed.match(/^Murakaza neza muri (.+?) ya (.+?)! (.+)$/);
  if (welcomeBody) {
    const levelLabel = translateText(welcomeBody[1].replace(/^./, (letter) => letter.toUpperCase()), locale);
    let details = welcomeBody[3];
    details = details.replace(/^Uvuye muri:\s*/, locale === "en" ? "From: " : "Vous venez de : ");
    details = details.replace(/^Ubu ugeze muri:\s*/, locale === "en" ? "You have now reached: " : "Vous êtes arrivé à : ");
    details = details.replace(/^Ubu uri muri:\s*/, locale === "en" ? "You are now in: " : "Vous êtes maintenant à : ");
    details = details.replace(/(From: |Vous venez de : |You have now reached: |Vous êtes arrivé à : |You are now in: |Vous êtes maintenant à : )([^.!]+)([.!]?)/g,
      (_match, prefix, path, ending) => prefix + translatePath(path) + ending);
    const sentence = locale === "en"
      ? "Welcome to " + levelLabel + " " + welcomeBody[2] + "! " + details
      : "Bienvenue dans " + levelLabel.toLocaleLowerCase() + " " + welcomeBody[2] + " ! " + details;
    return value.replace(trimmed, sentence);
  }

  return value;
}

export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "rw-RW";
}
