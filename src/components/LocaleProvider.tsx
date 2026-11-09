"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { intlLocale, normalizeLocale, translateText, type Locale } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: string) => string;
  dateLocale: string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem("iwacu-locale", next);
      document.cookie = "iwacu-locale=" + next + "; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
      document.documentElement.lang = next;
    } catch {
      // The selected language still applies to the current page if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    // Cookie value is also read on the server, preventing a language flash on return visits.
    const saved = window.localStorage.getItem("iwacu-locale");
    if (saved && normalizeLocale(saved) !== locale) setLocaleState(normalizeLocale(saved));
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((value: string) => translateText(value, locale), [locale]);
  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    dateLocale: intlLocale(locale),
  }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LocaleProvider");
  return context;
}
