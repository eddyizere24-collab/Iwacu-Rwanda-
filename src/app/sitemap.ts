import type { MetadataRoute } from "next";
import { SITE_PAGE_KEYS, SITE_PAGE_PATHS } from "@/lib/site-pages";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://iwacu-rwanda-2-ahabona.vercel.app").replace(/\/$/, "");
const LANGUAGES = ["rw", "en", "fr"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const reviewedAt = new Date("2026-11-10T00:00:00.000Z");
  const pages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL + "/",
      lastModified: reviewedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...SITE_PAGE_KEYS.map((key) => {
      const path = SITE_PAGE_PATHS[key];
      const languages = Object.fromEntries(
        LANGUAGES.map((language) => [language, SITE_URL + path + "?lang=" + language])
      );
      return {
        url: SITE_URL + path + "?lang=rw",
        lastModified: reviewedAt,
        changeFrequency: "monthly" as const,
        priority: key === "about" || key === "rwanda-administration" ? 0.8 : 0.6,
        alternates: { languages },
      };
    }),
  ];
  return pages;
}
