"use client";

import { useState } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n";
import { useI18n } from "@/components/LocaleProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="iwacu-language-switcher relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Hitamo ururimi"
        aria-haspopup="menu"
        aria-expanded={open}
        className="iwacu-header-control inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-2.5 text-white"
      >
        <Globe2 className="h-4 w-4" aria-hidden />
        <span className="text-xs font-extrabold tracking-wide">{LOCALE_LABELS[locale].short}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Funga"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Hitamo ururimi"
            className="iwacu-language-menu absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-1.5 text-[#10261C] shadow-[0_16px_42px_rgba(6,35,26,0.24)]"
          >
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#718077]">
              {locale === "rw" ? "Ururimi" : locale === "en" ? "Language" : "Langue"}
            </p>
            {SUPPORTED_LOCALES.map((item) => (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={locale === item}
                onClick={() => {
                  setLocale(item);
                  setOpen(false);
                }}
                className="flex min-h-[42px] w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
              >
                <span>{LOCALE_LABELS[item].name}</span>
                {locale === item && <Check className="h-4 w-4 text-[#20603D]" aria-hidden />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
