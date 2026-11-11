"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { AdSlot } from "@/components/ads/AdSlot";
import {
  getSitePage,
  SITE_PAGE_LABELS,
  SITE_PAGE_PATHS,
  type SitePageKey,
} from "@/lib/site-pages";

type Props = { page: SitePageKey };

function localizedHref(href: string, locale: "rw" | "en" | "fr"): string {
  if (!href.startsWith("/") || href.includes("?")) return href;
  return href + "?lang=" + locale;
}

export function InfoPage({ page: pageKey }: Props) {
  const { locale } = useI18n();
  const page = getSitePage(pageKey, locale);
  const homeLabel = locale === "rw" ? "Ahabanza" : locale === "en" ? "Home" : "Accueil";
  const referencesLabel = locale === "rw" ? "Inkomoko n'izindi nyandiko" : locale === "en" ? "Sources and related information" : "Sources et informations associées";
  const showAdSlot = pageKey === "how-it-works" || pageKey === "rwanda-administration" || pageKey === "data-sources";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <nav aria-label={locale === "rw" ? "Aho uri" : locale === "en" ? "Breadcrumb" : "Navigation"} className="mb-4 flex items-center gap-2 text-xs font-semibold text-[#486354]">
        <Link href={"/?lang=" + locale} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {homeLabel}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate">{SITE_PAGE_LABELS[locale][pageKey]}</span>
      </nav>

      <article className="overflow-hidden rounded-[28px] border border-emerald-950/10 bg-white/95 shadow-[0_18px_55px_rgba(6,35,26,0.10)]">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#0d4d35] via-[#174a31] to-[#103b32] px-5 py-7 text-white sm:px-9 sm:py-10">
          <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
          <div className="relative max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#FAD201]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              IWACU RWANDA
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{page.eyebrow}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">{page.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/90 sm:text-base">{page.lead}</p>
            <p className="mt-4 text-[11px] font-medium text-white/65">{page.updated}</p>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-9 sm:py-8">
          <div className="mx-auto max-w-3xl space-y-5">
            {page.sections.map((section, index) => (
              <div key={section.title}>
                <section className="rounded-2xl border border-emerald-950/10 bg-[#fbfcfa] p-4 sm:p-5">
                  <h2 className="font-display text-xl font-semibold leading-snug text-[#153b2c]">{section.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[#40564b]">{section.body}</p>
                  {section.items && section.items.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2 text-sm leading-6 text-[#40564b]">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#20603D]" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                {showAdSlot && index === 1 && <AdSlot placement="editorial" />}
              </div>
            ))}

            {page.notice && (
              <aside className="rounded-2xl border border-[#E5C65B]/70 bg-[#FFF9E5] px-4 py-4">
                <h2 className="text-sm font-extrabold text-[#5B4A12]">{page.notice.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#655729]">{page.notice.body}</p>
              </aside>
            )}

            {page.links && page.links.length > 0 && (
              <section className="rounded-2xl border border-emerald-950/10 bg-white p-4 sm:p-5">
                <h2 className="text-sm font-extrabold text-[#153b2c]">{referencesLabel}</h2>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {page.links.map((item) => (
                    <li key={item.href + item.label}>
                      {item.href.startsWith("tel:") || item.href.startsWith("mailto:") ? (
                        <a
                          href={item.href}
                          className="flex min-h-[42px] items-center justify-between gap-2 rounded-xl bg-[#f3f7f2] px-3 py-2 text-xs font-semibold text-[#20603D] hover:bg-[#e8f1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                        >
                          <span>{item.label}</span>
                          <ArrowLeft className="h-3.5 w-3.5 shrink-0 rotate-180" aria-hidden />
                        </a>
                      ) : item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-[42px] items-center justify-between gap-2 rounded-xl bg-[#f3f7f2] px-3 py-2 text-xs font-semibold text-[#20603D] hover:bg-[#e8f1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                        >
                          <span>{item.label}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        </a>
                      ) : (
                        <Link
                          href={localizedHref(item.href, locale)}
                          className="flex min-h-[42px] items-center justify-between gap-2 rounded-xl bg-[#f3f7f2] px-3 py-2 text-xs font-semibold text-[#20603D] hover:bg-[#e8f1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                        >
                          <span>{item.label}</span>
                          <ArrowLeft className="h-3.5 w-3.5 shrink-0 rotate-180" aria-hidden />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="text-center text-[10px] leading-5 text-slate-400">IWACU RWANDA · {page.updated}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
