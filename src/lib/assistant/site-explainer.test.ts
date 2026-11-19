import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_PAGES, type SitePageKey } from "../site-pages";
import { classifyAssistantIntent } from "./intent";
import {
  getSiteExplainerReply,
  isSiteExplanationQuestion,
  resolveSiteExplainerTopic,
  type SiteExplainerTopic,
} from "./site-explainer";

const questions: Array<[string, SiteExplainerTopic]> = [
  ["Urubuga rumenya rute aho ndi?", "site_location"],
  ["Mumenya mute aho ndi?", "site_location"],
  ["How does IWACU know where I am?", "site_location"],
  ["Comment IWACU sait-il où je suis ?", "site_location"],
  ["IWACU ibika ite amakuru yanjye bwite?", "site_privacy"],
  ["Mubika aho ndi?", "site_privacy"],
  ["What does this site do with my personal data?", "site_privacy"],
  ["Que fait IWACU de mes données personnelles ?", "site_privacy"],
  ["Amakuru y'abayobozi mukura he?", "site_leaders"],
  ["Mubungabunga mute amakuru y'abayobozi kandi akaba ay'ukuri?", "site_leaders"],
  ["How do you keep the leaders' information accurate?", "site_leaders"],
  ["D'où viennent les informations sur les dirigeants sur ce site ?", "site_leaders"],
  ["Inkomoko y'amakuru ya IWACU ni izihe?", "site_sources"],
  ["Where does the map data come from?", "site_sources"],
  ["Ukuri kw'ibisubizo bya IWACU bingana iki?", "site_accuracy"],
  ["Is IWACU accurate inside buildings?", "site_accuracy"],
  ["IWACU ni urubuga rwa Leta?", "site_scope"],
  ["Who made IWACU?", "site_scope"],
  ["Ishakiro rikora rite? Rirahimba?", "site_ai"],
  ["Does the assistant make things up?", "site_ai"],
];

describe("Ishakiro explains the site to anyone", () => {
  for (const [query, topic] of questions) {
    it(query, () => {
      assert.equal(resolveSiteExplainerTopic(query), topic);
      const result = classifyAssistantIntent(query, null, null);
      assert.equal(result.intent, "general_knowledge");
      assert.equal(result.knowledgeTopic, topic);
    });
  }

  it("does not hijack place, leader, emergency or own-location requests", () => {
    for (const query of [
      "Ninde uyobora umurenge wa Kacyiru?",
      "Ninde uyobora aho ndi?",
      "Meya w'Akarere ka Gasabo ni nde?",
      "Mpa nimero z'ubutabazi.",
      "Menya aho ndi",
      "U Rwanda rufite uturere tungahe?",
      "IWACU RWANDA ni iki?",
      "Kigali ni iki?",
    ]) {
      assert.equal(resolveSiteExplainerTopic(query), null, query);
      assert.equal(isSiteExplanationQuestion(query), false, query);
    }
  });

  it("answers every topic in Kinyarwanda, English and French from the site's own pages", () => {
    const asks: Record<string, string> = {
      rw: "Urubuga rumenya rute aho ndi?",
      en: "How does IWACU know where I am?",
      fr: "Comment IWACU sait-il où je suis ?",
    };
    const topics = new Set(questions.map(([, topic]) => topic));
    for (const topic of topics) {
      for (const language of ["rw", "en", "fr"] as const) {
        const reply = getSiteExplainerReply(topic, asks[language]);
        assert.ok(reply.answer.length > 80, topic + "/" + language + " has an answer");
        assert.ok(reply.sources.length > 0 && reply.sources.every((s) => s.url?.startsWith("https://iwacu-rwanda-2.vercel.app/")));
        assert.ok(reply.suggestions.length >= 2);
        assert.ok(reply.confidenceLabel.length > 20);
      }
    }
  });

  it("is not written for one organisation and makes no registration or compliance claims", () => {
    const topics = new Set(questions.map(([, topic]) => topic));
    for (const topic of topics) {
      for (const query of ["Urubuga rumenya rute aho ndi?", "How does IWACU know where I am?", "Comment IWACU sait-il où je suis ?"]) {
        const reply = getSiteExplainerReply(topic, query);
        const all = [reply.answer, reply.confidenceLabel, ...reply.sources.map((s) => s.label), ...reply.suggestions].join(" ");
        assert.doesNotMatch(all, /\bRDB\b|Rwanda Development Board/i, topic);
        assert.doesNotMatch(all, /fully compliant|entièrement conforme|yubahirije amategeko yose/i, topic);
      }
    }
  });

  it("only quotes sections that exist in all three languages of the site pages", () => {
    const pages = Object.keys(SITE_PAGES.rw) as SitePageKey[];
    for (const page of pages) {
      assert.equal(SITE_PAGES.en[page].sections.length, SITE_PAGES.rw[page].sections.length, page + " en");
      assert.equal(SITE_PAGES.fr[page].sections.length, SITE_PAGES.rw[page].sections.length, page + " fr");
    }
  });

  it("states honest limits where they matter", () => {
    const location = getSiteExplainerReply("site_location", "How does IWACU know where I am?").answer;
    assert.match(location, /GPS/);
    assert.match(location, /indoors/i);
    const leaders = getSiteExplainerReply("site_leaders", "How do you keep the leaders' information accurate?").answer;
    assert.match(leaders, /invented name/i);
  });
});
