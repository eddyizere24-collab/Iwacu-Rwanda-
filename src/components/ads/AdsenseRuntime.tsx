"use client";

import { useEffect } from "react";
import { useI18n } from "@/components/LocaleProvider";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
    __IWACU_ADSENSE_READY?: boolean;
  }
}

const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const VALID_CLIENT = /^ca-pub-\d{16}$/.test(ADSENSE_CLIENT);

export function AdsenseRuntime() {
  const { locale } = useI18n();

  useEffect(() => {
    // Kinyarwanda is not currently listed by Google as a supported primary ad language.
    // Never load the ad library for the Kinyarwanda interface.
    if (locale === "rw" || !ADSENSE_ENABLED || !VALID_CLIENT) return;

    if (window.__IWACU_ADSENSE_READY) {
      window.dispatchEvent(new Event("iwacu-adsense-ready"));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-iwacu-adsense='true']");
    if (existing) return;

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.iwacuAdsense = "true";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADSENSE_CLIENT;
    script.onload = () => {
      window.__IWACU_ADSENSE_READY = true;
      window.dispatchEvent(new Event("iwacu-adsense-ready"));
    };
    document.head.appendChild(script);
  }, [locale]);

  return null;
}
