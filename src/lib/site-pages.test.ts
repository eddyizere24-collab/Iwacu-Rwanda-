import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE_PAGE_KEYS, SITE_PAGES } from "./site-pages";

const locales = ["rw", "en", "fr"] as const;

test("all public information pages have complete content in all three supported interface languages", () => {
  for (const locale of locales) {
    for (const key of SITE_PAGE_KEYS) {
      const page = SITE_PAGES[locale][key];
      assert.ok(page.title.trim().length > 8, locale + "/" + key + " title");
      assert.ok(page.seoTitle.trim().length > 8, locale + "/" + key + " SEO title");
      assert.ok(page.seoDescription.trim().length > 25, locale + "/" + key + " SEO description");
      assert.ok(page.lead.trim().length > 60, locale + "/" + key + " lead");
      assert.ok(page.sections.length >= 3, locale + "/" + key + " sections");
      for (const section of page.sections) {
        assert.ok(section.title.trim().length > 2, locale + "/" + key + " section title");
        assert.ok(section.body.trim().length > 30, locale + "/" + key + " section body");
      }
    }
  }
});

test("administrative information distinguishes four provinces from the City of Kigali", () => {
  assert.match(SITE_PAGES.rw["rwanda-administration"].sections[0].items?.[1] ?? "", /Intara 4 n'Umujyi wa Kigali/);
  assert.match(SITE_PAGES.en["rwanda-administration"].sections[0].items?.[1] ?? "", /4 Provinces and the City of Kigali/);
  assert.match(SITE_PAGES.fr["rwanda-administration"].sections[0].items?.[1] ?? "", /4 provinces et la Ville de Kigali/);
});

test("no page contains placeholder contact details or fabricated email addresses", () => {
  for (const locale of locales) {
    for (const key of SITE_PAGE_KEYS) {
      const allText = JSON.stringify(SITE_PAGES[locale][key]);
      assert.doesNotMatch(allText, /lorem ipsum|example\.com|hello@|contact@/i);
    }
  }
});

test("owner-provided support phone and email are published on Contact and Privacy pages in all locales", () => {
  for (const locale of locales) {
    for (const key of ["contact", "privacy"] as const) {
      const allText = JSON.stringify(SITE_PAGES[locale][key]);
      assert.ok(allText.includes("+250 792 053 086"), locale + "/" + key + " support phone");
      assert.ok(allText.includes("izereeddy244@gmail.com"), locale + "/" + key + " support email");
      if (key === "contact") {
        const links = SITE_PAGES[locale].contact.links ?? [];
        assert.ok(links.some((link) => link.href === "tel:+250792053086"), locale + "/contact tap-to-call link");
        assert.ok(links.some((link) => link.href === "mailto:izereeddy244@gmail.com"), locale + "/contact tap-to-email link");
      }
    }
  }
});


test("canonical metadata, sitemap and robots use the primary Production hostname", () => {
  const primaryHost = "https://iwacu-rwanda-2.vercel.app";
  const legacyHost = "https://iwacu-rwanda-2-ahabona.vercel.app";
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
  for (const [name, source] of [["layout", layout], ["sitemap", sitemap], ["robots", robots]] as const) {
    assert.ok(source.includes(primaryHost), name + " primary hostname");
    assert.ok(!source.includes(legacyHost), name + " must not publish legacy hostname");
  }
});
