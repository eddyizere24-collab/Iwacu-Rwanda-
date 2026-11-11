"use client";

import Link from "next/link";
import { Accessibility, Ear, Eye, Hand, Mail, Mic, Wifi } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";

const copy = {
  rw: {
    eyebrow: "IWACU RWANDA · SERIVISI ZIGENEWE BOSE",
    title: "Iwacu ni urugo rwa buri wese.",
    intro: "IWACU RWANDA yiyemeje korohereza abantu bose kubona amakuru n’serivisi zayo. Ushobora guhitamo uburyo bukubereye, utabangamiye imikorere isanzwe y’urubuga.",
    how: "Uko wakoresha uburyo bwo korohereza",
    open: "Kanda akamenyetso k’ijisho kari hejuru ku rubuga. Aho ni ho uhitamo uko inyandiko ikugaragarira.",
    visualTitle: "Ku batabona neza cyangwa batabona",
    visual: [
      "Hitamo inyuguti nini, kugeza kuri 200%, cyangwa amabara arushijeho gutandukana.",
      "Telefoni za Android zifite TalkBack zishobora gusoma ibiri ku rubuga no kuyobora umuntu mu buto.",
      "Ushobora gukoresha urutonde rw’imidugudu aho gukoresha ikarita. Nta serivisi y’ingenzi igomba gusaba gukurura ikarita gusa."
    ],
    hearingTitle: "Ku batumva cyangwa batumva neza",
    hearing: [
      "Amakuru y’ingenzi agaragazwa mu nyandiko, harimo n’amakuru y’ubutabazi.",
      "Amabwiriza y’urubuga ntiyishingikiriza ku majwi gusa.",
      "Turimo gutegura ibikoresho by’amashusho mu Rurimi rw’Amarenga rw’u Rwanda (RSL), bizabanza kugenzurwa n’abarukoresha n’abarwigisha. Ntituratangaza ko ayo mashusho yamaze kuboneka."
    ],
    readingTitle: "Ku batabasha gusoma cyangwa kwandika neza",
    reading: [
      "Fungura “Uburyo bworoshye” mu igenamiterere kugira ngo ubone utubuto tunini tw’ikorwa ry’ingenzi.",
      "Kuri Iwacu AI, ushobora gukanda “Vuga ikibazo” aho kwandika, iyo telefoni na browser bishyigikiye urwo rurimi. Amagambo yumviswe abanza kugaragara kugira ngo uyagenzure mbere yo kohereza.",
      "Ushobora gukanda “Soma igisubizo” ku gisubizo cya AI, ariko bisaba ko telefoni iba ifite ijwi rihuye n’ururimi wahisemo. Nta jwi ry’Ikinyarwanda? Koresha TalkBack cyangwa usome inyandiko."
    ],
    mobilityTitle: "Ku bafite ubumuga bwo gukoresha amaboko cyangwa kugenda",
    mobility: [
      "Ushobora gukoresha keyboard, touch cyangwa uburyo bwo kugenzura telefoni bwagenewe ubufasha.",
      "Dukomeza kongeramo ubundi buryo bwo gukora ibikorwa bisaba gukurura cyangwa kwimura ikintu."
    ],
    ruralTitle: "Ku batuye mu cyaro cyangwa bafite internet nke",
    rural: [
      "Urutonde rw’ahantu n’imibare y’ubutabazi bishobora kuboneka kuri telefoni no mu gihe internet idahari, igihe amakuru yabitswe.",
      "Hitamo “Kubika internet” kugira ngo ikarita ikoreshe amakuru make kandi ntikurure imbibi z’imidugudu. Urutonde rw’imidugudu rukomeza kuba ubundi buryo.",
      "Amafoto yose ya IWACU RWANDA agumaho. Ntituyasiba cyangwa ngo tuyahishe muri ubu buryo.",
      "Ishakiro rya AI, amakuru mashya ava kuri server n’amakarita bisaba internet."
    ],
    privacyTitle: "Umutekano n’ibanga ryawe",
    privacy: [
      "Microphone ntisabwa uruhushya igihe ufunguye urubuga. Uruhushya rusabwa gusa iyo ukanze “Vuga ikibazo” kandi telefoni ikabigusaba.",
      "Aho uherereye hazwi iyo uhisemo gukoresha “Menya aho uri” kandi wemeye ubusabe bwa telefoni.",
      "Igenamiterere ryo korohereza ribikwa muri browser ya telefone yawe; ntirihindura uko abandi babona urubuga.",
      "Iyo ukoresheje ijwi, browser cyangwa serivisi y'ijwi ya telefone ishobora kuritunganya hakurikijwe amabwiriza yayo. IWACU yohereza inyandiko gusa iyo ukanze Ohereza."
    ],
    honest: "Icyitonderwa: ubushobozi bwo kumva no gusoma mu ijwi buterwa na telefoni, browser n’indimi bishyigikiwe. Ntabwo twemeza ko ijwi ry’Ikinyarwanda cyangwa amashusho ya RSL byamaze kuboneka kuri buri gikoresho. Dukomeza kubigerageza no kubinoza.",
    feedback: "Tubwire aho utarabasha gukoresha serivisi",
    feedbackText: "Niba hari aho uru rubuga ruguteye ikibazo cyangwa serivisi utabasha kugeraho, twandikire. Ibitekerezo by’abaturage bifasha kurushaho kurubaka ku buryo rwakira buri wese.",
    back: "Subira ku rubuga",
    contact: "Twandikire"
  },
  en: {
    eyebrow: "IWACU RWANDA · SERVICES FOR EVERYONE",
    title: "IWACU is a home for everyone.",
    intro: "IWACU RWANDA is committed to helping everyone reach its information and services. Choose the experience that works for you without changing the normal experience for other visitors.",
    how: "How to turn on accessibility options",
    open: "Select the eye icon in the website header. There you can choose how information is displayed.",
    visualTitle: "For blind and low-vision visitors",
    visual: [
      "Choose larger text, up to 200%, or higher contrast.",
      "Android phones with TalkBack can read website content and help navigate controls.",
      "You can use the village list instead of the map. Essential services must not require dragging a map."
    ],
    hearingTitle: "For Deaf and hard-of-hearing visitors",
    hearing: [
      "Important information, including emergency details, is shown in text.",
      "Website instructions do not rely on sound alone.",
      "We are preparing visual guidance in Rwanda Sign Language (RSL). It will be reviewed with Deaf RSL users and fluent contributors before publication. We are not claiming those videos are already available."
    ],
    readingTitle: "For people who find reading or writing difficult",
    reading: [
      "Turn on “Easy-use mode” in accessibility settings to show large buttons for the main services.",
      "In Iwacu AI, select “Speak your question” instead of typing when your phone and browser support the selected language. The recognized words appear for review before you send them.",
      "You can select “Read answer aloud” on an AI reply, provided your phone has a voice for the selected language. If a Kinyarwanda voice is unavailable, use TalkBack or read the text."
    ],
    mobilityTitle: "For people with limited mobility or dexterity",
    mobility: [
      "You can use a keyboard, touch, or your phone's supported assistive controls.",
      "We are continuing to add alternatives to actions that would otherwise require dragging or moving an object."
    ],
    ruralTitle: "For rural communities and people with limited data",
    rural: [
      "The location list and emergency numbers can be available on your phone when there is no connection, provided the required data has been cached.",
      "Choose “Save mobile data” to reduce map tiles and skip downloading village-boundary overlays. The village list remains an alternative.",
      "All IWACU RWANDA photographs stay in place. This mode does not remove or hide them.",
      "Iwacu AI searches, live server updates and map tiles require an internet connection."
    ],
    privacyTitle: "Your privacy and control",
    privacy: [
      "The microphone is not requested when you open the website. Permission is requested only after you select “Speak your question” and the phone asks for it.",
      "Your location is requested when you choose “Find my location” and approve the phone's request.",
      "Accessibility preferences are stored in your phone's browser and do not change how other visitors see the site.",
      "When you use speech input, your browser or phone's speech service may process the audio under its own privacy terms. IWACU sends the recognized text only when you select Send."
    ],
    honest: "Please note: speech recognition and read-aloud depend on your phone, browser and available languages. We do not claim that Kinyarwanda speech voices or RSL videos are already available on every device. We continue to test and improve these features.",
    feedback: "Tell us what you still cannot access",
    feedbackText: "Contact us when a part of the site is difficult to use or a service is out of reach. Residents' feedback helps us make IWACU more welcoming to everyone.",
    back: "Back to IWACU",
    contact: "Contact us"
  },
  fr: {
    eyebrow: "IWACU RWANDA · DES SERVICES POUR TOUS",
    title: "IWACU est un foyer pour chacun.",
    intro: "IWACU RWANDA s’engage à permettre à tous d’accéder à ses informations et à ses services. Choisissez les options qui vous conviennent sans modifier l’expérience habituelle des autres visiteurs.",
    how: "Comment activer les options d’accessibilité",
    open: "Sélectionnez l’icône en forme d’œil dans l’en-tête du site. Vous pourrez choisir la manière dont les informations s’affichent.",
    visualTitle: "Pour les personnes aveugles ou malvoyantes",
    visual: [
      "Choisissez un texte plus grand, jusqu’à 200 %, ou un contraste renforcé.",
      "Les téléphones Android équipés de TalkBack peuvent lire le contenu du site et faciliter la navigation.",
      "Vous pouvez utiliser la liste des villages au lieu de la carte. Les services essentiels ne doivent pas dépendre du déplacement d’un repère sur la carte."
    ],
    hearingTitle: "Pour les personnes sourdes ou malentendantes",
    hearing: [
      "Les informations importantes, notamment les urgences, sont présentées sous forme de texte.",
      "Les instructions du site ne reposent pas uniquement sur le son.",
      "Nous préparons des supports visuels en langue des signes rwandaise (RSL). Ils seront vérifiés avec des personnes sourdes qui utilisent cette langue et des contributeurs qualifiés avant publication. Nous ne prétendons pas que ces vidéos sont déjà disponibles."
    ],
    readingTitle: "Pour les personnes qui ont des difficultés à lire ou à écrire",
    reading: [
      "Activez le « Mode simplifié » dans les options d’accessibilité pour afficher de grands boutons donnant accès aux services principaux.",
      "Dans Iwacu AI, choisissez « Dicter votre question » au lieu de la taper lorsque le téléphone et le navigateur prennent en charge la langue choisie. Le texte reconnu s’affiche pour vérification avant l’envoi.",
      "Vous pouvez choisir « Lire la réponse » sur une réponse de l’IA, à condition que votre téléphone dispose d’une voix dans la langue choisie. Si aucune voix en kinyarwanda n’est disponible, utilisez TalkBack ou lisez le texte."
    ],
    mobilityTitle: "Pour les personnes ayant une mobilité ou une dextérité réduite",
    mobility: [
      "Vous pouvez utiliser un clavier, l’écran tactile ou les commandes d’assistance disponibles sur votre téléphone.",
      "Nous continuons à ajouter des alternatives aux actions qui exigeraient autrement de faire glisser ou déplacer un objet."
    ],
    ruralTitle: "Pour les zones rurales et les personnes ayant peu de données mobiles",
    rural: [
      "La liste des lieux et les numéros d’urgence peuvent être disponibles sur le téléphone sans connexion, si les données nécessaires ont été mises en cache.",
      "Choisissez « Économiser les données mobiles » pour réduire les tuiles cartographiques et éviter de télécharger les limites des villages. La liste des villages reste une autre solution.",
      "Toutes les photos d’IWACU RWANDA sont conservées. Ce mode ne les supprime ni ne les masque.",
      "Les recherches Iwacu AI, les mises à jour en direct et les tuiles cartographiques nécessitent une connexion Internet."
    ],
    privacyTitle: "Votre confidentialité et votre contrôle",
    privacy: [
      "Le microphone n’est pas sollicité à l’ouverture du site. L’autorisation n’est demandée qu’après avoir choisi « Dicter votre question », si le téléphone l’exige.",
      "La position est demandée lorsque vous choisissez « Trouver ma position » et acceptez la demande du téléphone.",
      "Les préférences d’accessibilité sont enregistrées dans le navigateur de votre téléphone et ne changent pas l’affichage pour les autres visiteurs.",
      "Lorsque vous utilisez la saisie vocale, votre navigateur ou le service vocal du téléphone peut traiter l’audio selon ses propres règles de confidentialité. IWACU n’envoie le texte reconnu que lorsque vous choisissez Envoyer."
    ],
    honest: "À noter : la reconnaissance vocale et la lecture à voix haute dépendent du téléphone, du navigateur et des langues disponibles. Nous ne prétendons pas que les voix en kinyarwanda ou les vidéos RSL sont déjà disponibles sur tous les appareils. Nous continuons à tester et à améliorer ces fonctions.",
    feedback: "Signalez-nous ce qui reste inaccessible",
    feedbackText: "Contactez-nous lorsqu’une partie du site est difficile à utiliser ou qu’un service vous reste inaccessible. Les avis des habitants nous aident à rendre IWACU plus accueillant pour tous.",
    back: "Retour à IWACU",
    contact: "Nous contacter"
  }
} as const;

export function AccessibilityInfoPage() {
  const { locale } = useI18n();
  const text = copy[locale];

  const sections = [
    { title: text.visualTitle, icon: Eye, items: text.visual },
    { title: text.hearingTitle, icon: Ear, items: text.hearing },
    { title: text.readingTitle, icon: Mic, items: text.reading },
    { title: text.mobilityTitle, icon: Hand, items: text.mobility },
    { title: text.ruralTitle, icon: Wifi, items: text.rural },
    { title: text.privacyTitle, icon: Accessibility, items: text.privacy }
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="photo-surface photo-hills relative overflow-hidden rounded-[28px] p-6 shadow-[0_18px_48px_rgba(6,35,26,0.18)] sm:p-10">
        <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#FAD201]">{text.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">{text.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/95 sm:text-base">{text.intro}</p>
      </header>

      <section className="mt-5 rounded-2xl border border-[#c9ddcf] bg-white/95 p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-extrabold text-[#123D2D]">{text.how}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#405448]">{text.open}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/" className="inline-flex min-h-[44px] items-center rounded-xl bg-[#20603D] px-4 py-2 text-sm font-bold text-white hover:bg-[#17492d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]">{text.back}</Link>
          <Link href="/contact" className="inline-flex min-h-[44px] items-center rounded-xl border border-[#20603D] px-4 py-2 text-sm font-bold text-[#20603D] hover:bg-[#edf6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]">{text.contact}</Link>
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {sections.map(({ title, icon: Icon, items }) => (
          <section key={title} className="rounded-2xl border border-[#d7e3da] bg-white/95 p-4 shadow-sm sm:p-5">
            <h2 className="flex items-center gap-3 text-base font-extrabold text-[#123D2D]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf6f0] text-[#20603D]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {title}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#405448]">
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-5 rounded-2xl border border-[#ead9a4] bg-[#fffbed] p-4 text-sm leading-relaxed text-[#57461b]">
        {text.honest}
      </p>

      <section className="mt-5 rounded-2xl border border-[#c9ddcf] bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#123D2D]">{text.feedback}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#405448]">{text.feedbackText}</p>
        <a href="mailto:izereeddy244@gmail.com" className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#20603D] px-4 py-2 text-sm font-bold text-white hover:bg-[#17492d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]">
          <Mail className="h-4 w-4" aria-hidden />
          {text.contact}
        </a>
      </section>
    </div>
  );
}
