"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe2 } from "lucide-react";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n";
import { useI18n } from "@/components/LocaleProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on an outside tap or Escape. A full-screen "fixed" click-away layer cannot be used here:
  // the header has backdrop-filter, so a fixed child only covers the header, not the page.
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="iwacu-language-switcher relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Hitamo ururimi"
        aria-haspopup="menu"
        aria-expanded={open}
        className="iwacu-header-control inline-flex flex-col items-center justify-center gap-0.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAD201]"
      >
        <Globe2 className="h-[18px] w-[18px]" aria-hidden />
        <span className="text-[10px] font-extrabold leading-none tracking-wide">{LOCALE_LABELS[locale].short}</span>
      </button>
      {open && (
        <>
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
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
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
