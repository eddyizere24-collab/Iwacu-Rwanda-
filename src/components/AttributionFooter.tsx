"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { SITE_PAGE_KEYS, SITE_PAGE_LABELS, SITE_PAGE_PATHS } from "@/lib/site-pages";

export function AttributionFooter() {
  const { locale } = useI18n();
  const navLabel = locale === "rw" ? "Amakuru ya IWACU" : locale === "en" ? "IWACU information" : "Informations IWACU";

  return (
    <footer className="iwacu-attribution mx-auto mb-2 mt-5 w-full max-w-5xl px-4">
      <nav aria-label={navLabel} className="mb-3 rounded-2xl border border-white/70 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#174a31]">IWACU RWANDA</span>
          <span className="text-[10px] text-slate-500">
            {locale === "rw" ? "Amakuru asobanutse, afitiwe inkomoko" : locale === "en" ? "Clear information with traceable sources" : "Des informations claires et sourcées"}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {SITE_PAGE_KEYS.map((key) => (
            <li key={key}>
              <Link
                href={SITE_PAGE_PATHS[key] + "?lang=" + locale}
                className="inline-flex min-h-[36px] items-center text-xs font-semibold text-[#31513f] underline-offset-4 hover:text-[#00A3E0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
              >
                {SITE_PAGE_LABELS[locale][key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <details className="rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm">
        <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#31513f]">
          <span>{locale === "rw" ? "Inkomoko y'amakuru n'amafoto" : locale === "en" ? "Data sources and photo credits" : "Sources des données et crédits photo"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 iwacu-attribution-chevron" aria-hidden />
        </summary>
        <div className="space-y-2 border-t border-emerald-900/10 px-4 py-3 text-[11px] leading-relaxed text-slate-700">
          <p>
            {locale === "rw" ? "Inkomoko y'imipaka: National Institute of Statistics of Rwanda (CC BY 4.0). Ikarita: © OpenStreetMap contributors (ODbL)." : locale === "en" ? "Boundary source: National Institute of Statistics of Rwanda (CC BY 4.0). Map: © OpenStreetMap contributors (ODbL)." : "Source des limites : National Institute of Statistics of Rwanda (CC BY 4.0). Carte : © contributeurs OpenStreetMap (ODbL)."}
          </p>
          <p>
            {locale === "rw" ? "Ifoto y'imisozi ya Bigogwe: " : locale === "en" ? "Bigogwe hills photo: " : "Photo des collines de Bigogwe : "}
            <a href="https://commons.wikimedia.org/wiki/File:Beauty_of_Bigogwe_farms.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Adygrafix250 / Wikimedia Commons</a>
            {" "}(CC BY 4.0; {locale === "rw" ? "yahinduwe mu mikoreshereze yayo" : locale === "en" ? "adapted for this use" : "adaptée pour cet usage"})
          </p>
          <p>
            {locale === "rw" ? "Ifoto y'inyamaswa zo muri Pariki y'Akagera: " : locale === "en" ? "Akagera National Park wildlife photo: " : "Photo de la faune du parc national de l'Akagera : "}
            <a href="https://commons.wikimedia.org/wiki/File:Akagera_National_Park_Giraffes.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Alex shema / Wikimedia Commons</a>
            {" "}(CC BY-SA 4.0; {locale === "rw" ? "yahinduwe mu bunini no mu mikoreshereze yayo" : locale === "en" ? "resized and adapted for this use" : "redimensionnée et adaptée pour cet usage"})
          </p>
          <p>
            {locale === "rw" ? "Ifoto y'ibirunga byo muri Pariki y'Igihugu y'Ibirunga: " : locale === "en" ? "Volcanoes National Park photo: " : "Photo du parc national des Volcans : "}
            <a href="https://commons.wikimedia.org/wiki/File:Volcanoes_National_Park_Rwanda.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Nina R / Wikimedia Commons</a>
            {" "}(CC BY 2.0; {locale === "rw" ? "yahinduwe mu bunini no mu mikoreshereze yayo" : locale === "en" ? "resized and adapted for this use" : "redimensionnée et adaptée pour cet usage"})
          </p>
          <p>
            {locale === "rw" ? "Ifoto y'imirima y'icyayi mu Karere ka Nyabihu: " : locale === "en" ? "Tea fields in Nyabihu District photo: " : "Photo des plantations de thé du district de Nyabihu : "}
            <a href="https://commons.wikimedia.org/wiki/File:Tea_plantation,_Western_Rwanda.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Synkubito / Wikimedia Commons</a>
            {" "}(CC0 1.0)
          </p>
          <p>
            {locale === "rw" ? "Amafoto y'ingagi: " : locale === "en" ? "Gorilla photographs: " : "Photos de gorilles : "}
            <a href="https://commons.wikimedia.org/wiki/File:Mountain_gorilla_(Gorilla_beringei_beringei)_female_with_baby.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Charlesjsharp / Wikimedia Commons</a>
            {" "}(CC BY-SA 4.0) ·
            <a href="https://commons.wikimedia.org/wiki/File:Mountain_gorilla_(Gorilla_beringei_beringei)_female_3.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Charlesjsharp / Wikimedia Commons</a>
            {" "}(CC BY-SA 4.0).
          </p>
        </div>
      </details>
    </footer>
  );
}
