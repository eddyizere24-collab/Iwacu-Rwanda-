import type { Locale } from "@/lib/i18n";

export type RslReviewerRole = "deaf_rsl_reviewer" | "fluent_rsl_contributor";

export interface RslGuideRecord {
  id: string;
  status: "draft" | "approved";
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  videoUrl: string;
  posterUrl: string;
  captions: Record<Locale, string>;
  transcript: Record<Locale, string>;
  durationSeconds: number;
  consent: {
    granted: boolean;
    publicUseAllowed: boolean;
    recordedAt: string;
  };
  reviewers: Array<{
    reviewerRef: string;
    role: RslReviewerRole;
    approved: boolean;
    approvedAt: string;
  }>;
  publishedAt: string;
}

const LOCALES: readonly Locale[] = ["rw", "en", "fr"];

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function hasAllLocaleText(value: Record<Locale, string>): boolean {
  return LOCALES.every((locale) => typeof value?.[locale] === "string" && value[locale].trim().length > 0);
}

function isSafeAssetPath(value: string, prefix: string, extension: RegExp): boolean {
  return typeof value === "string" &&
    value.startsWith(prefix) &&
    !value.startsWith("//") &&
    !value.includes("..") &&
    extension.test(value);
}

/**
 * A clip is public only after explicit consent, complete caption/transcript
 * fallbacks, a public asset path, and two independent RSL approvals:
 * one Deaf RSL reviewer and one fluent RSL contributor.
 */
export function isApprovedRslGuide(guide: RslGuideRecord): boolean {
  if (!guide || guide.status !== "approved") return false;
  if (!guide.id || !hasAllLocaleText(guide.title) || !hasAllLocaleText(guide.description)) return false;
  if (!isSafeAssetPath(guide.videoUrl, "/media/rsl/", /\.mp4$/i)) return false;
  if (!isSafeAssetPath(guide.posterUrl, "/media/rsl/", /\.(webp|png|jpe?g)$/i)) return false;
  if (!Number.isInteger(guide.durationSeconds) || guide.durationSeconds <= 0) return false;
  if (!guide.consent?.granted || !guide.consent.publicUseAllowed || !isDate(guide.consent.recordedAt)) return false;
  if (!isDate(guide.publishedAt)) return false;
  if (!hasAllLocaleText(guide.transcript)) return false;

  const captionsReady = LOCALES.every((locale) =>
    isSafeAssetPath(guide.captions?.[locale], "/media/rsl/", /\.vtt$/i)
  );
  if (!captionsReady) return false;

  const approvedReviewers = (guide.reviewers ?? []).filter((reviewer) =>
    reviewer.approved &&
    reviewer.reviewerRef.trim().length > 0 &&
    isDate(reviewer.approvedAt)
  );
  const independentRefs = new Set(approvedReviewers.map((reviewer) => reviewer.reviewerRef));
  const hasDeafReviewer = approvedReviewers.some((reviewer) => reviewer.role === "deaf_rsl_reviewer");
  const hasFluentContributor = approvedReviewers.some((reviewer) => reviewer.role === "fluent_rsl_contributor");

  return independentRefs.size >= 2 && hasDeafReviewer && hasFluentContributor;
}

/** Empty until real, consented and community-approved recordings are supplied. */
export const RSL_GUIDES: readonly RslGuideRecord[] = [];

export function getPublishedRslGuides(
  records: readonly RslGuideRecord[] = RSL_GUIDES,
): RslGuideRecord[] {
  return records.filter(isApprovedRslGuide);
}
