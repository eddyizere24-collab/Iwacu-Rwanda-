import test from "node:test";
import assert from "node:assert/strict";
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
