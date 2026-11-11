import type { Metadata } from "next";
import { cookies } from "next/headers";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import { getSitePage, SITE_PAGE_PATHS, type SitePageKey } from "@/lib/site-pages";

type SearchParams = Promise<{ lang?: string | string[] }>;

export async function createSitePageMetadata(page: SitePageKey, searchParams: SearchParams): Promise<Metadata> {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const requested = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  const locale: Locale = normalizeLocale(requested ?? cookieStore.get("iwacu-locale")?.value);
  const content = getSitePage(page, locale);
  const path = SITE_PAGE_PATHS[page];
  const localized = (language: Locale) => path + "?lang=" + language;

  return {
    title: content.seoTitle,
    description: content.seoDescription,
    alternates: {
      canonical: localized(locale),
      languages: {
        rw: localized("rw"),
        en: localized("en"),
        fr: localized("fr"),
        "x-default": localized("rw"),
      },
    },
    openGraph: {
      title: content.seoTitle,
      description: content.seoDescription,
      type: "article",
      siteName: "IWACU RWANDA",
      locale: locale === "rw" ? "rw_RW" : locale === "fr" ? "fr_FR" : "en",
    },
  };
}
