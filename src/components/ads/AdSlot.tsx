"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/LocaleProvider";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
    __IWACU_ADSENSE_READY?: boolean;
  }
}

const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const EDITORIAL_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_EDITORIAL ?? "";

export function AdSlot({ placement }: { placement: "editorial" }) {
  const { locale } = useI18n();
  const adRef = useRef<HTMLModElement>(null);
  const slot = placement === "editorial" ? EDITORIAL_SLOT : "";

  useEffect(() => {
    if (
      locale === "rw" ||
      !ADSENSE_ENABLED ||
      !/^ca-pub-\d{16}$/.test(ADSENSE_CLIENT) ||
      !/^\d+$/.test(slot) ||
      !adRef.current
    ) return;

    let requested = false;
    const requestAd = () => {
      if (requested || !adRef.current || !window.__IWACU_ADSENSE_READY) return;
      requested = true;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        requested = false;
      }
    };

    if (window.__IWACU_ADSENSE_READY) requestAd();
    window.addEventListener("iwacu-adsense-ready", requestAd);
    return () => window.removeEventListener("iwacu-adsense-ready", requestAd);
  }, [locale, slot]);

  if (
    locale === "rw" ||
    !ADSENSE_ENABLED ||
    !/^ca-pub-\d{16}$/.test(ADSENSE_CLIENT) ||
    !/^\d+$/.test(slot)
  ) return null;

  return (
    <section aria-label="Advertisement" className="my-5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {locale === "en" ? "Advertisement" : "Publicité"}
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: "90px" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
