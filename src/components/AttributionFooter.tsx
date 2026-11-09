"use client";

import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";

export function AttributionFooter() {
  const { t } = useI18n();

  return (
    <footer className="iwacu-attribution mx-auto mb-2 mt-3 w-full max-w-3xl px-4">
      <details className="rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm">
        <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#31513f]">
          <span>{t("Inkomoko y'amakuru n'amafoto")}</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform [details[open]>&]:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-2 border-t border-emerald-900/10 px-4 py-3 text-[11px] leading-relaxed text-slate-700">
          <p>
            {t("Inkomoko y'imipaka:")} National Institute of Statistics of Rwanda (CC BY 4.0). {t("Ikarita:")} © OpenStreetMap contributors (ODbL).
          </p>
          <p>
            {t("Ifoto y'imisozi ya Bigogwe:")}{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Beauty_of_Bigogwe_farms.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Adygrafix250 / Wikimedia Commons</a>{" "}
            (CC BY 4.0; {t("yahinduwe mu mikoreshereze yayo")})
          </p>
          <p>
            {t("Ifoto y'inyamaswa zo muri Pariki y'Akagera:")}{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Akagera_National_Park_Giraffes.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Alex shema / Wikimedia Commons</a>{" "}
            (CC BY-SA 4.0; {t("yahinduwe mu bunini no mu mikoreshereze yayo")})
          </p>
          <p>
            {t("Ifoto y'ibirunga byo muri Pariki y'Igihugu y'Ibirunga:")}{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Volcanoes_National_Park_Rwanda.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Nina R / Wikimedia Commons</a>{" "}
            (CC BY 2.0; {t("yahinduwe mu bunini no mu mikoreshereze yayo")})
          </p>
          <p>
            {t("Ifoto y'imirima y'icyayi mu Karere ka Nyabihu:")}{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Tea_plantation,_Western_Rwanda.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Synkubito / Wikimedia Commons</a>{" "}
            (CC0 1.0; {t("yeguriwe rubanda")})
          </p>
          <p>
            {t("Amafoto y'ingagi:")}{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Mountain_gorilla_(Gorilla_beringei_beringei)_female_with_baby.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Charlesjsharp / Wikimedia Commons</a>{" "}
            (CC BY-SA 4.0) ·{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Mountain_gorilla_(Gorilla_beringei_beringei)_female_3.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Charlesjsharp / Wikimedia Commons</a>{" "}
            (CC BY-SA 4.0).
          </p>
        </div>
      </details>
    </footer>
  );
}
