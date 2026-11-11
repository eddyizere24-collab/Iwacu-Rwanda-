import assert from "node:assert/strict";
import test from "node:test";
import { intlLocale, normalizeLocale, translateText } from "./i18n";

test("defaults unknown and missing language preferences to Kinyarwanda", () => {
  assert.equal(normalizeLocale(undefined), "rw");
  assert.equal(normalizeLocale("rw"), "rw");
  assert.equal(normalizeLocale("xx"), "rw");
});

test("recognizes the three supported locales", () => {
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("fr"), "fr");
  assert.equal(intlLocale("rw"), "rw-RW");
  assert.equal(intlLocale("en"), "en-GB");
  assert.equal(intlLocale("fr"), "fr-FR");
});

test("translates the headline and primary location action", () => {
  assert.equal(translateText("Menya aho uri.", "rw"), "Menya aho uri.");
  assert.equal(translateText("Menya aho uri.", "en"), "Find your location.");
  assert.equal(translateText("Menya aho uri.", "fr"), "Trouvez votre position.");
  assert.equal(translateText("Menya aho uri", "en"), "Find your location");
});

test("translates notification archive and emergency controls", () => {
  assert.equal(translateText("Amamenyesha yawe", "en"), "Your notifications");
  assert.equal(translateText("Amamenyesha yawe", "fr"), "Vos notifications");
  assert.equal(translateText("Hamagara 112", "en"), "Call 112");
  assert.equal(translateText("Hamagara 112", "fr"), "Appeler le 112");
});

test("translates dynamic confidence, leader count and search-level text", () => {
  assert.equal(translateText("Icyizere: 87%", "en"), "Confidence: 87%");
  assert.equal(translateText("Icyizere: 87%", "fr"), "Confiance : 87%");
  assert.equal(translateText("Abayobozi babonetse muri aka gace (3):", "en"), "Leaders found in this area (3):");
  assert.equal(translateText("Shakisha Akarere (ushatse)…", "en"), "Search district (optional)…");
});

test("translates dynamic location transition messages but preserves place names", () => {
  const current = "Ubu uri: Akarere: Gasabo · Umurenge: Kacyiru.";
  assert.equal(translateText(current, "en"), "You are now in: District: Gasabo · Sector: Kacyiru.");
  assert.equal(translateText(current, "fr"), "Vous êtes actuellement à : District: Gasabo · Secteur: Kacyiru.");
});

test("does not translate proper place names in administrative paths", () => {
  const path = "Intara: Intara y'Amajyaruguru · Akarere: Musanze";
  assert.equal(translateText("Ubu uri: " + path + ".", "en"), "You are now in: Province: Intara y'Amajyaruguru · District: Musanze.");
});

test("translates saved welcome and approach notifications", () => {
  assert.equal(
    translateText("Murakaza neza! Ubu uri: Akarere: Gasabo.", "en"),
    "Welcome! You are now in: District: Gasabo."
  );
  assert.equal(
    translateText("Usigaje hafi ya metero 250 ngo winjire mu gace muturanye. Umurenge: Kacyiru. GPS accuracy: ±20 m.", "en"),
    "About 250 metres remain before you enter the neighbouring area. Sector: Kacyiru. GPS accuracy: ±20 m."
  );
  assert.equal(
    translateText("IWACU RWANDA — Uri hafi y'imbibi", "fr"),
    "IWACU RWANDA — À proximité d'une limite"
  );
});


test("translates core Ishakiro identity and capability answers", () => {
  const identity = "Ndi Ishakiro ry'Ubuhanga rya IWACU RWANDA, umufasha wa AI wagenewe kugufasha kubona no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi mu Rwanda, abayobozi n'amakuru y'ubutabazi. Nshobora gusubiza ibyo amakuru yagenzuwe ashyigikira; iyo amakuru abuze cyangwa ntizeye igisubizo, ndabikubwira aho kugira ngo mpimbe.";
  const english = translateText(identity, "en");
  const french = translateText(identity, "fr");
  assert.match(english, /^I am Ishakiro/);
  assert.match(english, /verified information/);
  assert.match(english, /rather than inventing it/);
  assert.match(french, /^Je suis Ishakiro/);
  assert.match(french, /informations vérifiées/);
  assert.match(french, /au lieu de les inventer/);

  const help = "Nshobora kugufasha kumenya aho uri, gushaka ahantu mu Rwanda, kubona abayobozi n'itumanaho ryabo igihe amakuru yabo yemejwe abitswe, kubona nimero z'ubutabazi, kumenya umubare w'inzego z'ubuyobozi, kubara ubuso bw'ahantu, kureba ahantu hahana imbibi no kugereranya intera yo mu murongo ugororotse hagati y'ahantu habiri. Ibyapa biri hafi y'aho uri ntibiraboneka kuko nta rutonde rw'ibyapa n'imyanya yabyo rwemejwe turafite. Ubushakashatsi bwo hanze buracyafunze. Igihe amakuru cyangwa igikoresho bitabonetse, ndabikubwira aho guhanga igisubizo.";
  assert.match(translateText(help, "en"), /Nearby road-sign lookup is not available/);
  assert.match(translateText(help, "fr"), /La recherche des panneaux routiers à proximité n'est pas disponible/);
});

test("keeps the Iwacu AI brand and identity reply consistent in all supported languages", () => {
  assert.equal(translateText("Iwacu AI", "en"), "Iwacu AI");
  assert.equal(translateText("Iwacu AI", "fr"), "Iwacu AI");
  assert.equal(translateText("Muraho, ndi Iwacu AI.", "en"), "Hello, I am Iwacu AI.");
  assert.equal(translateText("Muraho, ndi Iwacu AI.", "fr"), "Bonjour, je suis Iwacu AI.");

  const identity = "Ndi Iwacu AI, umufasha wa AI wa IWACU RWANDA. Nagenewe kugufasha kubona no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi mu Rwanda, abayobozi n'amakuru y'ubutabazi. Nsubiza gusa iyo amakuru yagenzuwe ashyigikiye igisubizo; iyo amakuru abuze cyangwa atizewe, ndabikubwira aho kugira ngo mpimbe.";
  assert.match(translateText(identity, "en"), /^I am Iwacu AI/);
  assert.match(translateText(identity, "fr"), /^Je suis Iwacu AI/);

  const unavailable = "Ububiko bw'amakuru ntibwashoboye kuboneka ubu. Sinshobora kugenzura amakuru y'abayobozi muri iki gihe; ibi ntibihamya ko nta bayobozi bahari. Ongera ugerageze nyuma.";
  assert.match(translateText(unavailable, "en"), /this does not mean that no leaders exist/);
  assert.match(translateText(unavailable, "fr"), /cela ne signifie pas qu'aucun responsable n'existe/);
});

test("translates national administrative totals and preserves Kigali City as separate from provinces", () => {
  const districtCount = "U Rwanda rufite 30 uturere. Imibare y'ibindi byiciro igaragazwa ku rubuga rwa Guverinoma: 4 intara, Umujyi wa Kigali 1, 30 uturere, 416 imirenge, 2,148 utugari, 14,837 imidugudu.";
  const english = translateText(districtCount, "en");
  const french = translateText(districtCount, "fr");
  assert.equal(english, "Rwanda has 30 districts. The Government website lists these administrative totals: 4 provinces, 1 City of Kigali, 30 districts, 416 sectors, 2,148 cells and 14,837 villages.");
  assert.equal(french, "Le Rwanda compte 30 districts. Les chiffres administratifs publiés sur le site du Gouvernement sont : 4 provinces, 1 Ville de Kigali, 30 districts, 416 secteurs, 2 148 cellules et 14 837 villages.");

  const provinceCount = "U Rwanda rufite intara 4. Umujyi wa Kigali uri ku rwego rumwe n'intara ariko si intara. Imibare y'ibindi byiciro igaragazwa ku rubuga rwa Guverinoma: 4 intara, Umujyi wa Kigali 1, 30 uturere, 416 imirenge, 2,148 utugari, 14,837 imidugudu.";
  assert.match(translateText(provinceCount, "en"), /Kigali City is at the same administrative level as a province, but it is not a province/);
  assert.match(translateText(provinceCount, "fr"), /La Ville de Kigali se situe au même niveau administratif qu'une province, mais ce n'est pas une province/);
});

test("translates Gasabo's parent relationship with Kigali City in English and French", () => {
  const answer = "Akarere ka Gasabo kari mu Mujyi wa Kigali.";
  assert.equal(translateText(answer, "en"), "Gasabo District is within the City of Kigali.");
  assert.equal(translateText(answer, "fr"), "le district de Gasabo se trouve dans la Ville de Kigali.");
});

test("translates dynamic Ishakiro place and leader answers while preserving verified place names", () => {
  const place = "Nabonye Gasabo. Dore aho iherereye mu nzego z'ubuyobozi: Kigali City / Gasabo.";
  assert.equal(translateText(place, "en"), "I found Gasabo. Its administrative hierarchy is: Kigali City / Gasabo.");
  assert.equal(translateText(place, "fr"), "J'ai trouvé Gasabo. Sa hiérarchie administrative est : Kigali City / Gasabo.");

  const noLeader = "Nta muyobozi wemejwe wanditswe kuri akarere ya Gasabo, kandi nta muyobozi wo ku rwego rwo hejuru wabonetse muri database. Nta zina cyangwa nimero nshobora guhimba. Intambwe ikurikira ni ukumenyesha ibiro by'ubuyobozi bw'ako gace ko aya makuru abura.";
  assert.match(translateText(noLeader, "en"), /^No verified leader is listed for district Gasabo/);
  assert.match(translateText(noLeader, "en"), /I will not invent a name or phone number/);
  assert.match(translateText(noLeader, "fr"), /^Aucun responsable vérifié n'est répertorié pour l'unité administrative \(« district »\) Gasabo/);
  assert.match(translateText(noLeader, "fr"), /Je n'inventerai ni nom ni numéro de téléphone/);
});


test("translates hierarchy counts and marks the administrative index as the source", () => {
  const count = "Akarere ka Gasabo gafite imirenge 15 mu bubiko bw'inzego. Aho iri mu nzego: Umujyi wa Kigali.";
  assert.equal(
    translateText(count, "en"),
    "Gasabo District has 15 sectors in the administrative index. Higher administrative level: the City of Kigali."
  );
  assert.equal(
    translateText(count, "fr"),
    "Gasabo (district) compte 15 secteurs dans l'index administratif. Niveau administratif supérieur : la Ville de Kigali."
  );
const kigaliCount = "Umujyi wa Kigali ufite uturere 3 mu bubiko bw'inzego.";
  assert.equal(
    translateText(kigaliCount, "en"),
    "The City of Kigali has 3 districts in the administrative index."
  );
  assert.equal(
    translateText(kigaliCount, "fr"),
    "La Ville de Kigali compte 3 districts dans l'index administratif."
  );
  assert.equal(
    translateText("Icyizere kiri hagati: umubare uva ku index y'inzego z'ubuyobozi iri muri application; ntabwo ari official census count.", "en"),
    "Medium confidence: this count comes from the administrative index bundled with the application; it is not an official census count."
  );
});

test("translates geometry-backed area and straight-line distance without changing measured values", () => {
  const area = "Ubuso bwa Gasabo bungana na 429,181,085 m², bubarwa kuri geometry ibitswe muri database ya IWACU RWANDA.";
  assert.equal(
    translateText(area, "en"),
    "The mapped area of Gasabo is 429,181,085 m², calculated from geometry stored in IWACU RWANDA's database."
  );
  assert.equal(
    translateText(area, "fr"),
    "La superficie cartographique de Gasabo est de 429 181 085 m², calculée à partir de la géométrie enregistrée dans la base de données d'IWACU RWANDA."
  );

  const distance = "Intera yo mu murongo ugororotse hagati ya Gasabo na Kicukiro ni hafi 14,862 m. Ibarwa hagati y'utudomo duhagarariye buri gace, si intera yo mu muhanda.";
  assert.equal(
    translateText(distance, "en"),
    "The straight-line distance between Gasabo and Kicukiro is approximately 14,862 m. It is measured between representative points for each area, not along roads."
  );
  assert.equal(
    translateText(distance, "fr"),
    "La distance à vol d'oiseau entre Gasabo et Kicukiro est d'environ 14 862 m. Elle est mesurée entre des points représentatifs de chaque zone, et non le long des routes."
  );
});

test("translates shared-boundary results while preserving place names", () => {
  const adjacent = "Gasabo hihana imbibi na: Kicukiro, Nyarugenge. Ibi bishingiye ku mipaka ya polygons ikoranaho muri database.";
  assert.equal(
    translateText(adjacent, "en"),
    "Gasabo shares a boundary with: Kicukiro, Nyarugenge. This is based on polygon boundaries that touch in the database."
  );
  assert.equal(
    translateText(adjacent, "fr"),
    "Gasabo partage une limite avec : Kicukiro, Nyarugenge. Cette information repose sur le contact des limites des polygones dans la base de données."
  );
});

test("translates the metadata source label and publication-date limitation", () => {
  assert.equal(translateText("Inkomoko:", "en"), "Source:");
  assert.equal(translateText("Inkomoko:", "fr"), "Source :");
  assert.equal(translateText("Itariki yo gutangaza ntiyatangajwe.", "en"), "Publication date not stated.");
  assert.equal(translateText("Itariki yo gutangaza ntiyatangajwe.", "fr"), "Date de publication non indiquée.");
});


test("translates a missing local leader number without implying an unverified phone number", () => {
  const noPhone = "Nta nimero rusange y'umuyobozi wo kuri akarere ya Gasabo iri mu bubiko. Dore umuyobozi wo ku rwego rukurikiyeho ufite nimero yatangajwe:";
  assert.equal(
    translateText(noPhone, "en"),
    "No public phone number is listed for District Gasabo in the database. Here is the closest higher-level leader with a published number:"
  );
  assert.equal(
    translateText(noPhone, "fr"),
    "Aucun numéro public n'est répertorié pour l'unité administrative (« district ») Gasabo dans la base de données. Voici le responsable du niveau supérieur le plus proche dont le numéro est publié :"
  );
});

test("translates emergency contact labels and external research limitations", () => {
  assert.equal(translateText("Polisi — ubutabazi bwihuse", "en"), "Police — emergency assistance");
  assert.equal(translateText("Polisi — ubutabazi bwihuse", "fr"), "Police — secours d'urgence");
  assert.equal(translateText("Imbangukiragutabara (SAMU)", "en"), "Ambulance (SAMU)");
  assert.equal(translateText("Imbangukiragutabara (SAMU)", "fr"), "Ambulance (SAMU)");

  const disabled = "Ubushakashatsi bwo hanze ntabwo bwemewe ubu. Nta makuru yo kuri internet nzahimba.";
  assert.match(translateText(disabled, "en"), /External research is currently disabled/);
  assert.match(translateText(disabled, "fr"), /La recherche externe est actuellement désactivée/);
});

test("translates road-sign capability limits without changing the cited legal article", () => {
  const signNotice = "Itegeko n° 014/2026 ryo ku wa 06/03/2026, ryasohotse mu Igazeti ya Leta yo ku wa 10/03/2026, mu ngingo ya 5(1)(g) rivuga ko ibimenyetso bigenga ikoreshwa ry'umuhanda biri mu mategeko agenga umuhanda. Ingingo ya 5(2) ivuga ko ibisobanuro birambuye bizashyirwaho n'Iteka rya Minisitiri. Ariko IWACU ntirafite urutonde rw'ibyapa rwemejwe rugaragaza buri cyapa n'aho giherereye. Ntabwo nshobora kwemeza icyapa kiri hafi yawe cyangwa kuguhereza urutonde rwacyo ntashingiye ku makuru yagenzuwe.";
  const english = translateText(signNotice, "en");
  const french = translateText(signNotice, "fr");
  assert.match(english, /Article 5\(1\)\(g\)/);
  assert.match(english, /Article 5\(2\)/);
  assert.match(english, /does not yet have a verified inventory/);
  assert.match(french, /article 5\(1\)\(g\)/);
  assert.match(french, /L'article 5\(2\)/);
  assert.match(french, /inventaire vérifié/);
});

test("translates not-ready capability replies while retaining their honest availability status", () => {
  const notReady = "Kumenya ibyapa n'ibimenyetso biri hafi ntibirahuzwa n'amakuru yagenzuwe muri iki gice. Ntabwo ngiye gutanga imibare cyangwa ibisobanuro bidafite inkomoko.";
  assert.equal(
    translateText(notReady, "en"),
    "Finding nearby road signs and traffic signs is not connected to verified information in this phase. I will not provide figures or descriptions without a source."
  );
  assert.equal(
    translateText(notReady, "fr"),
    "Recherche des panneaux routiers et de signalisation à proximité n'est pas encore reliée aux informations vérifiées dans cette phase. Je ne fournirai ni chiffre ni description sans source."
  );
});


test("translates the leader-card labels used by the Ishakiro interface", () => {
  assert.equal(translateText("Mu makuru rusange", "en"), "In the public directory");
  assert.equal(translateText("Mu makuru rusange", "fr"), "Dans l'annuaire public");
  assert.equal(translateText("Reba amakuru y'uyu muyobozi", "en"), "View this leader's details");
  assert.equal(translateText("Reba amakuru y'uyu muyobozi", "fr"), "Voir les informations de ce responsable");
  assert.equal(translateText("Umwanya ntiwanditswe", "en"), "Position not listed");
  assert.equal(translateText("Umwanya ntiwanditswe", "fr"), "Fonction non renseignée");
});


test("translates the complete visible Ishakiro panel chrome", () => {
  const phrases = [
    "Baza, ganira, ushake amakuru y'ubuyobozi.",
    "Tangira ikiganiro gishya",
    "Tangira bundi bushya",
    "Ntabwo mpimba amakuru",
    "Amakuru aturuka mu bubiko bwemewe",
    "Muraho, ndi Ishakiro ry'Ubuhanga.",
    "Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.",
    "Icyuho cy'amakuru cyanditswe kugira ngo kizakurikiranwe.",
    "Turimo kumenya aho uri kugira ngo dushake umuyobozi...",
    "Turimo kugenzura amakuru...",
    "Andika ikibazo cyawe",
    "Andika ikibazo cyawe hano...",
    "Ohereza ikibazo",
    "Ohereza",
    "Ntukandike amakuru y'ibanga.",
  ];

  for (const phrase of phrases) {
    assert.notEqual(translateText(phrase, "en"), phrase, "English translation missing: " + phrase);
    assert.notEqual(translateText(phrase, "fr"), phrase, "French translation missing: " + phrase);
  }

  assert.equal(translateText("Leta", "en"), "Government");
  assert.equal(translateText("Leta", "fr"), "Gouvernement");
  assert.equal(translateText("Umuryango mpuzamahanga / uburezi", "en"), "International or academic organization");
  assert.equal(translateText("Umuryango mpuzamahanga / uburezi", "fr"), "Organisation internationale ou universitaire");
  assert.equal(translateText("Itangazamakuru", "en"), "Publisher");
  assert.equal(translateText("Irindi soko", "fr"), "Autre source");
});


test("translates every current Ishakiro follow-up suggestion in English and French", () => {
  const kinyarwandaSuggestions = [
    "Akarere ka Gasabo gafite imirenge ingahe?",
    "Akarere ka Gasabo kari mu Ntara iyihe?",
    "Baza ibiro by'ubuyobozi",
    "Baza umuyobozi w'aho uri",
    "Gerageza andi mazina",
    "Hitamo ahantu hagaragara hano",
    "Imbibi z'Akarere ka Gasabo ziri he?",
    "Intera iri hagati ya Gasabo na Huye ingana iki?",
    "Menya aho ndi",
    "Meya w'Akarere ka Gasabo ni nde?",
    "Mpa nimero y'umuyobozi",
    "Mpa nimero y'umuyobozi w'aha",
    "Mpa nimero z'ubutabazi",
    "Mu Rwanda hari uturere tungahe?",
    "Nimero ye",
    "Ninde uyobora aha?",
    "Ninde uyobora aho ndi?",
    "Ninde uyobora umurenge wa Kacyiru?",
    "Ongera ugerageze",
    "Ongera ugerageze kumenya aho ndi",
    "Ongera ushakishe umuyobozi",
    "Ongeraho Akarere cyangwa Umurenge",
    "Ongeraho Akarere, Umurenge cyangwa umwanya afite",
    "Reba abayobozi bo ku nzego zo hejuru",
    "Reba abayobozi bo ku rwego rwo hejuru",
    "Reba aho aka gace gaherereye",
    "Reba amakuru y'aho akorera",
    "Reba amakuru y'akarere",
    "Reba imbibi z'aho ndi",
    "Reba nimero z'ubutabazi",
    "Reba urwego rw'ubuyobozi rumwegereye",
    "Shaka ahantu",
    "Shaka ahantu mu Rwanda",
    "Shaka amakuru y'akarere",
    "Shaka ibiro by'ubuyobozi bw'ako gace",
    "Shaka umuyobozi w'ahantu",
    "Shaka umuyobozi w'aho ndi",
    "Shaka umuyobozi w'aho uri",
    "Shaka umuyobozi witwa Muhire Boniface",
    "Shaka undi muyobozi",
    "Shakisha amakuru ku yindi ngingo",
    "Shakisha irindi zina",
    "U Rwanda rufite uturere tungahe?",
    "Umurenge wa Kacyiru ufite utugari tungahe?",
    "Wamfasha iki?"
  ];

  for (const phrase of kinyarwandaSuggestions) {
    assert.notEqual(translateText(phrase, "en"), phrase, "English suggestion missing: " + phrase);
    assert.notEqual(translateText(phrase, "fr"), phrase, "French suggestion missing: " + phrase);
  }

  assert.equal(
    translateText("How far is Kacyiru from Gasabo?", "fr"),
    "Quelle est la distance entre Kacyiru et Gasabo ?"
  );
  assert.equal(
    translateText("Show the boundaries of Gasabo", "fr"),
    "Afficher les limites de Gasabo"
  );
});


test("translates the visible next-step suffix appended by the assistant guardrail", () => {
  const answer = "Ibisobanuro by'ahantu ntibyabonetse. Intambwe ikurikira: Tanga izina cyangwa kode y'ahantu ushaka kubarira imibare y'inzego.";
  assert.equal(
    translateText(answer, "en"),
    "The place details were not found. Next step: Provide the name or code of the place whose administrative units you want counted."
  );
  assert.equal(
    translateText(answer, "fr"),
    "Les informations du lieu n'ont pas été trouvées. Étape suivante : Indiquez le nom ou le code du lieu dont vous souhaitez compter les unités administratives."
  );
});

test("translates every default next step for incomplete assistant replies", () => {
  const actions = [
    "Koresha nimero y'ubutabazi yemewe iri ku rutonde; mu kaga kihutirwa hamagara serivisi z'ubutabazi.",
    "Ongera ugerageze kumenya aho uri kandi ugenzure ko Location ifunguye muri telefone.",
    "Ongera ugenzure Location ya telefone cyangwa utange izina ry'Umudugudu uri gushakiramo umuyobozi.",
    "Tanga izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi.",
    "Ongera ushakishe umuyobozi ukoresheje izina rye cyangwa aho akorera.",
    "Ongeraho igice cy'izina, Akarere cyangwa Umurenge uwo muntu akoreramo.",
    "Ongera utange izina ry'ahantu, wongereho Akarere cyangwa Umurenge niba uhabizi.",
    "Tanga amazina y'ahantu habiri atandukanye kugira ngo intera ibarwe.",
    "Tanga izina cyangwa kode y'ahantu ushaka gusuzuma imbibi zako.",
    "Baza urwego rushinzwe imihanda ku rutonde rw'ibyapa n'aho biherereye; IWACU ntirufite urutonde rwabyo rwagenzuwe.",
    "Tanga izina cyangwa kode y'ahantu ushaka kubarira imibare y'inzego.",
    "Ongera ugerageze nyuma cyangwa ubaze ikibazo kijyanye n'ahantu n'ubuyobozi muri IWACU.",
    "Baza ikibazo kijyanye n'ahantu, abayobozi cyangwa ubutabazi mu Rwanda.",
  ];

  for (const action of actions) {
    assert.notEqual(translateText(action, "en"), action, "English action translation missing: " + action);
    assert.notEqual(translateText(action, "fr"), action, "French action translation missing: " + action);
  }
});

test("translates the first-level picker without calling Kigali a fifth Province", () => {
  const source = "Intara 4 n'Umujyi wa Kigali";
  assert.equal(translateText(source, "en"), "4 provinces and the City of Kigali");
  assert.equal(translateText(source, "fr"), "4 provinces et la Ville de Kigali");
});


test("translates Iwacu AI full-screen and minimize controls", () => {
  assert.equal(translateText("Fungura Iwacu AI kuri ecran yose", "en"), "Open Iwacu AI full screen");
  assert.equal(translateText("Subiza Iwacu AI hasi", "en"), "Minimize Iwacu AI");
  assert.equal(translateText("Fungura Iwacu AI kuri ecran yose", "fr"), "Ouvrir Iwacu AI en plein écran");
  assert.equal(translateText("Subiza Iwacu AI hasi", "fr"), "Réduire Iwacu AI");
});


test("translates accessibility controls and the inclusion entry points", () => {
  assert.equal(translateText("Korohereza gukoresha urubuga", "en"), "Accessibility settings");
  assert.equal(translateText("Korohereza gukoresha urubuga", "fr"), "Options d’accessibilité");
  assert.equal(translateText("Bona abayobozi", "en"), "Find local leaders");
  assert.equal(translateText("Bona abayobozi", "fr"), "Trouver les responsables locaux");
  assert.equal(translateText("Vuga ikibazo", "en"), "Speak your question");
  assert.equal(translateText("Vuga ikibazo", "fr"), "Dicter votre question");
  assert.equal(translateText("Soma igisubizo", "en"), "Read answer aloud");
  assert.equal(translateText("Soma igisubizo", "fr"), "Lire la réponse");
  assert.equal(translateText("Jya ku bikubiye muri uru rubuga", "en"), "Skip to main content");
  assert.equal(translateText("Jya ku bikubiye muri uru rubuga", "fr"), "Aller au contenu principal");
  assert.match(translateText("Amafoto meza ya IWACU RWANDA yose agumaho. Iyi gahunda yo kubika internet ntisiba amafoto; igabanya gusa amakuru y'ikarita igihe uyikoresheje.", "en"), /photographs stay exactly as they are/);
});


test("translates the direct text-only village picker action", () => {
  assert.equal(translateText("Hitamo umudugudu ku rutonde", "en"), "Choose a village from the list");
  assert.equal(translateText("Hitamo umudugudu ku rutonde", "fr"), "Choisir un village dans la liste");
  assert.equal(
    translateText("Ikarita ni amahitamo gusa. Ushobora gukoresha urutonde rw'imidugudu utayirebye.", "en"),
    "The map is optional. You can use the village list without viewing it."
  );
  assert.equal(
    translateText("Ikarita ni amahitamo gusa. Ushobora gukoresha urutonde rw'imidugudu utayirebye.", "fr"),
    "La carte est facultative. Vous pouvez utiliser la liste des villages sans la consulter."
  );
});


test("translates screen-reader announcements and browser voice privacy information", () => {
  assert.equal(translateText("Abayobozi bo muri aka gace", "en"), "Leaders in this area");
  assert.equal(translateText("Abayobozi bo muri aka gace", "fr"), "Responsables de cette zone");
  assert.equal(translateText("Amagambo telefone yumvise:", "en"), "Words recognized by your phone:");
  assert.equal(translateText("Amagambo telefone yumvise:", "fr"), "Mots reconnus par votre téléphone :");

  const lowData = "Uburyo bwo kubika internet burakora. Imbibi ntizikururwa; koresha urutonde rw'imidugudu.";
  assert.equal(translateText(lowData, "en"), "Mobile data saving is on. Village boundaries are not downloaded; use the village list.");
  assert.equal(translateText(lowData, "fr"), "L’économie de données mobiles est activée. Les limites des villages ne sont pas téléchargées ; utilisez la liste des villages.");

  const voicePrivacy = "Iyo ukoresheje “Vuga ikibazo”, browser cyangwa serivisi y'ijwi ya telefone ishobora gutunganya amajwi yawe hakurikijwe amabwiriza yayo. IWACU yakira inyandiko igaragara mu mwanya wo kwandika gusa iyo ukanze “Ohereza”.";
  assert.match(translateText(voicePrivacy, "en"), /speech service may process your audio under its own privacy terms/);
  assert.match(translateText(voicePrivacy, "fr"), /peut traiter l’audio selon ses propres règles de confidentialité/);
});
