"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { SITE_PAGE_KEYS, SITE_PAGE_LABELS, SITE_PAGE_PATHS } from "@/lib/site-pages";

export function AttributionFooter() {
  const { locale } = useI18n();
  const navLabel = locale === "rw" ? "Amakuru ya IWACU" : locale === "en" ? "IWACU information" : "Informations IWACU";

  const summaryLabel = locale === "rw" ? "Amakuru n'ubufasha" : locale === "en" ? "Information and support" : "Informations et assistance";
  const creditsTitle = locale === "rw" ? "Inkomoko y'amakuru n'amafoto" : locale === "en" ? "Data sources and photo credits" : "Sources des données et crédits photo";
  const supportTitle = locale === "rw" ? "Ubufasha bwa IWACU" : locale === "en" ? "IWACU support" : "Assistance IWACU";

  return (
    <footer className="iwacu-attribution mx-auto mb-2 mt-4 w-full max-w-5xl px-4">
      {/* One small opener instead of three stacked cards: everything stays available, nothing is removed. */}
      <details className="rounded-2xl border border-white/70 bg-white/85 shadow-sm backdrop-blur-sm">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]">
          <span className="min-w-0 truncate">
            <span className="font-extrabold tracking-wide text-[#174a31]">IWACU RWANDA</span>
            <span className="font-semibold text-[#31513f]"> · {summaryLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#31513f] iwacu-attribution-chevron" aria-hidden />
        </summary>

        <div className="space-y-3 border-t border-emerald-900/10 px-4 pb-3 pt-2">
          <nav aria-label={navLabel}>
            <p className="text-[10px] text-slate-500">
              {locale === "rw" ? "Amakuru asobanutse, afitiwe inkomoko" : locale === "en" ? "Clear information with traceable sources" : "Des informations claires et sourcées"}
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 sm:grid-cols-4">
              {SITE_PAGE_KEYS.map((key) => (
                <li key={key}>
                  <Link
                    href={SITE_PAGE_PATHS[key] + "?lang=" + locale}
                    className="inline-flex min-h-[44px] items-center text-xs font-semibold text-[#31513f] underline-offset-4 hover:text-[#00A3E0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                  >
                    {SITE_PAGE_LABELS[locale][key]}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={"/ubufasha-buri-wese?lang=" + locale}
                  className="inline-flex min-h-[44px] items-center text-xs font-extrabold text-[#174a31] underline-offset-4 hover:text-[#00A3E0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                >
                  {locale === "rw" ? "IWACU irebera buri wese" : locale === "en" ? "Accessibility and inclusion at IWACU" : "Accessibilité et inclusion chez IWACU"}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex flex-col gap-0.5 border-t border-emerald-900/10 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] font-bold text-[#31513f]">{supportTitle}</span>
            <div className="flex flex-wrap items-center gap-x-4 text-[11px] font-semibold text-[#20603D]">
              <a href="tel:+250792053086" className="inline-flex min-h-[44px] items-center underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]">
                +250 792 053 086
              </a>
              <a href="mailto:izereeddy244@gmail.com" className="inline-flex min-h-[44px] items-center underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]">
                izereeddy244@gmail.com
              </a>
            </div>
          </div>

          <div className="space-y-2 border-t border-emerald-900/10 pt-2 text-[11px] leading-relaxed text-slate-700">
            <p className="text-xs font-semibold text-[#31513f]">{creditsTitle}</p>
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
        </div>
      </details>
    </footer>
  );
}
