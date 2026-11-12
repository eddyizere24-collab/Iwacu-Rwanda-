"use client";

import { useI18n } from "@/components/LocaleProvider";
import { getPublishedRslGuides } from "@/lib/accessibility/rsl-guides";

export function RslGuideLibrary() {
  const { locale, t } = useI18n();
  const guides = getPublishedRslGuides();

  // The public guide remains honest and uncluttered until real reviewed clips exist.
  if (guides.length === 0) return null;

  return (
    <section
      aria-labelledby="iwacu-rsl-guides-title"
      className="mt-5 rounded-2xl border border-[#c9ddcf] bg-white/95 p-4 shadow-sm sm:p-5"
    >
      <h2 id="iwacu-rsl-guides-title" className="text-lg font-extrabold text-[#123D2D]">
        {t("Amashusho yemejwe mu Rurimi rw'Amarenga rw'u Rwanda")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#405448]">
        {t("Aya mashusho agaragazwa nyuma yo kugenzurwa n'abakoresha RSL no kwemeza uburenganzira bwo kuyatangaza.")}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {guides.map((guide) => (
          <article key={guide.id} className="min-w-0 rounded-xl border border-[#d7e3da] bg-white p-3">
            <h3 className="text-base font-extrabold text-[#123D2D]">{guide.title[locale]}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#405448]">{guide.description[locale]}</p>

            <video
              className="mt-3 aspect-video w-full rounded-xl bg-black"
              controls
              playsInline
              preload="none"
              poster={guide.posterUrl}
              aria-label={guide.title[locale]}
            >
              <source src={guide.videoUrl} type="video/mp4" />
              <track kind="captions" srcLang="rw-RW" src={guide.captions.rw} label="Kinyarwanda" default={locale === "rw"} />
              <track kind="captions" srcLang="en" src={guide.captions.en} label="English" default={locale === "en"} />
              <track kind="captions" srcLang="fr" src={guide.captions.fr} label="Français" default={locale === "fr"} />
              <p>{t("Browser yawe ntishobora gukina iyi videwo. Soma inyandiko iri hasi.")}</p>
            </video>

            <details className="mt-3 rounded-lg border border-[#d7e3da] bg-[#f7faf7] p-3">
              <summary className="min-h-[44px] cursor-pointer font-bold text-[#17492d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]">
                {t("Soma inyandiko y'iyi videwo")}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[#294c37]" lang={locale === "rw" ? "rw-RW" : locale === "fr" ? "fr-FR" : "en"}>
                {guide.transcript[locale]}
              </p>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
