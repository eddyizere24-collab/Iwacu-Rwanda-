/**
 * Lightweight bilingual strings (Kinyarwanda primary, English secondary).
 * The UI defaults to Kinyarwanda; English is shown alongside or via lang toggle where needed.
 */

export type Locale = "rw" | "en";

export const messages = {
  appName: { rw: "IWACU RWANDA", en: "IWACU RWANDA" },
  tagline: {
    rw: "Menya aho uri n'abayobozi bawe",
    en: "Discover where you are and your local leaders",
  },
  locateButton: {
    rw: "Menya aho ndi",
    en: "Find my location",
  },
  locatingGps: {
    rw: "Turimo gusaba GPS...",
    en: "Requesting GPS...",
  },
  locating: {
    rw: "Turimo gushakisha...",
    en: "Looking up location...",
  },
  offlineBanner: {
    rw: "Uri offline. Dukoresha imipaka yabitswe kuri telefone yawe; abayobozi ntibagaragara.",
    en: "You are offline. Using cached boundaries on your device; leaders are unavailable.",
  },
  yourLocation: {
    rw: "Aho uri",
    en: "Your location",
  },
  gpsAccuracy: {
    rw: "Ukuri kwa GPS",
    en: "GPS accuracy",
  },
  leadersTitle: {
    rw: "Abayobozi bawe",
    en: "Your leaders",
  },
  emergencyTitle: {
    rw: "Ubutabazi",
    en: "Emergency",
  },
  call: {
    rw: "Hamagara",
    en: "Call",
  },
  retry: {
    rw: "Ongera ugerageze",
    en: "Try again",
  },
  backToStart: {
    rw: "Subira ku ntangiriro",
    en: "Back to start",
  },
  privacyNote: {
    rw: "Ntacyo dukusanya ku bwite bwawe. GPS ikoreshwa gusa muri browser yawe.",
    en: "We collect no personal data. GPS is used only in your browser.",
  },
  adminLogin: {
    rw: "Injira nka admin",
    en: "Admin login",
  },
  skipToContent: {
    rw: "Simbira ku mubare nyamukuru",
    en: "Skip to main content",
  },
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey, locale: Locale = "rw"): string {
  return messages[key][locale] ?? messages[key].rw;
}

/** Return both languages for dual-display UI elements. */
export function tBoth(key: MessageKey): { rw: string; en: string } {
  return { rw: messages[key].rw, en: messages[key].en };
}
