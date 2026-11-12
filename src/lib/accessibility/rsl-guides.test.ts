import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublishedRslGuides,
  isApprovedRslGuide,
  type RslGuideRecord,
} from "./rsl-guides";

const approvedFixture: RslGuideRecord = {
  id: "find-location",
  status: "approved",
  title: {
    rw: "Menya aho uri",
    en: "Find your location",
    fr: "Trouver votre position",
  },
  description: {
    rw: "Amabwiriza yagenzuwe n'abakoresha RSL.",
    en: "Instructions reviewed by RSL users.",
    fr: "Instructions vérifiées par des utilisateurs de la RSL.",
  },
  videoUrl: "/media/rsl/find-location.mp4",
  posterUrl: "/media/rsl/find-location.webp",
  captions: {
    rw: "/media/rsl/find-location.rw.vtt",
    en: "/media/rsl/find-location.en.vtt",
    fr: "/media/rsl/find-location.fr.vtt",
  },
  transcript: {
    rw: "Kanda Menya aho uri.",
    en: "Select Find my location.",
    fr: "Sélectionnez Trouver ma position.",
  },
  durationSeconds: 42,
  consent: {
    granted: true,
    publicUseAllowed: true,
    recordedAt: "2026-11-10",
  },
  reviewers: [
    {
      reviewerRef: "reviewer-a",
      role: "deaf_rsl_reviewer",
      approved: true,
      approvedAt: "2026-11-10",
    },
    {
      reviewerRef: "reviewer-b",
      role: "fluent_rsl_contributor",
      approved: true,
      approvedAt: "2026-11-11",
    },
  ],
  publishedAt: "2026-11-11",
};

test("an RSL guide is publishable only with consent, captions, transcript and two independent reviewer roles", () => {
  assert.equal(isApprovedRslGuide(approvedFixture), true);
  assert.deepEqual(getPublishedRslGuides([approvedFixture]), [approvedFixture]);
});

test("draft, missing consent, or one reviewer cannot publish an RSL guide", () => {
  assert.equal(isApprovedRslGuide({ ...approvedFixture, status: "draft" }), false);
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    consent: { ...approvedFixture.consent, publicUseAllowed: false },
  }), false);
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    reviewers: [approvedFixture.reviewers[0]],
  }), false);
});

test("duplicate reviewer references do not satisfy independent review", () => {
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    reviewers: [
      approvedFixture.reviewers[0],
      { ...approvedFixture.reviewers[1], reviewerRef: approvedFixture.reviewers[0].reviewerRef },
    ],
  }), false);
});

test("incomplete translations, captions and transcripts block publication", () => {
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    title: { ...approvedFixture.title, fr: "" },
  }), false);
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    captions: { ...approvedFixture.captions, en: "" },
  }), false);
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    transcript: { ...approvedFixture.transcript, rw: "" },
  }), false);
});

test("external, traversal and wrong-format media paths are rejected", () => {
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    videoUrl: "https://example.com/signs.mp4",
  }), false);
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    posterUrl: "/media/rsl/../private/poster.webp",
  }), false);
  assert.equal(isApprovedRslGuide({
    ...approvedFixture,
    captions: { ...approvedFixture.captions, fr: "/media/rsl/captions.txt" },
  }), false);
});

test("the public manifest has no placeholder or unreviewed RSL clips", () => {
  assert.deepEqual(getPublishedRslGuides(), []);
});
