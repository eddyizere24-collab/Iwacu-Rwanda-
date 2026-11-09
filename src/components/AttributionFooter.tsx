"use client";

import { ChevronDown } from "lucide-react";

export function AttributionFooter() {

  return (
    <footer className="iwacu-attribution mx-auto mb-2 mt-3 w-full max-w-3xl px-4">
      <details className="rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm">
        <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#31513f]">
          <span>Inkomoko y'amakuru n'amafoto</span>
          <ChevronDown className="h-4 w-4 shrink-0 iwacu-attribution-chevron" aria-hidden />
        </summary>
        <div className="space-y-2 border-t border-emerald-900/10 px-4 py-3 text-[11px] leading-relaxed text-slate-700">
          <p>
            Inkomoko y'imipaka: National Institute of Statistics of Rwanda (CC BY 4.0). Ikarita: © OpenStreetMap contributors (ODbL).
          </p>
          <p>
            Ifoto y'imisozi ya Bigogwe:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Beauty_of_Bigogwe_farms.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Adygrafix250 / Wikimedia Commons</a>{" "}
            (CC BY 4.0; yahinduwe mu mikoreshereze yayo)
          </p>
          <p>
            Ifoto y'inyamaswa zo muri Pariki y'Akagera:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Akagera_National_Park_Giraffes.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Alex shema / Wikimedia Commons</a>{" "}
            (CC BY-SA 4.0; yahinduwe mu bunini no mu mikoreshereze yayo)
          </p>
          <p>
            Ifoto y'ibirunga byo muri Pariki y'Igihugu y'Ibirunga:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Volcanoes_National_Park_Rwanda.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Nina R / Wikimedia Commons</a>{" "}
            (CC BY 2.0; yahinduwe mu bunini no mu mikoreshereze yayo)
          </p>
          <p>
            Ifoto y'imirima y'icyayi mu Karere ka Nyabihu:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Tea_plantation,_Western_Rwanda.jpg" target="_blank" rel="noreferrer" className="font-medium text-[#20603D] underline underline-offset-2">Synkubito / Wikimedia Commons</a>{" "}
            (CC0 1.0; yeguriwe rubanda)
          </p>
          <p>
            Amafoto y'ingagi:{" "}
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
