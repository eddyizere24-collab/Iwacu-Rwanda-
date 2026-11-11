"use client";

import { useState } from "react";
import { Eye, RotateCcw, X } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { useAccessibilitySettings, type TextScale } from "@/components/AccessibilityProvider";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog";

export function AccessibilitySettings() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const {
    textScale,
    highContrast,
    reducedMotion,
    lowDataMode,
    easyUseMode,
    setTextScale,
    setHighContrast,
    setReducedMotion,
    setLowDataMode,
    setEasyUseMode,
    resetAccessibilitySettings,
  } = useAccessibilitySettings();
  const dialogRef = useAccessibleDialog(open, () => setOpen(false));

  const scaleOptions: TextScale[] = ["100", "125", "150", "200"];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="iwacu-header-control inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-2.5 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAD201]"
        aria-label={t("Korohereza gukoresha urubuga")}
        title={t("Korohereza gukoresha urubuga")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Eye className="h-5 w-5" aria-hidden />
        <span className="sr-only">{t("Korohereza")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#061b12]/65 p-3 backdrop-blur-sm">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="iwacu-accessibility-title"
            aria-describedby="iwacu-accessibility-description"
            tabIndex={-1}
            className="max-h-[min(90dvh,760px)] w-full max-w-xl overflow-y-auto rounded-[24px] border border-emerald-900/15 bg-[#fbfdfb] p-4 text-[#10261c] shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-emerald-900/10 pb-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#20603D]">{t("IWACU RWANDA")}</p>
                <h2 id="iwacu-accessibility-title" className="mt-1 text-xl font-extrabold sm:text-2xl">
                  {t("Korohereza gukoresha urubuga")}
                </h2>
                <p id="iwacu-accessibility-description" className="mt-2 max-w-lg text-sm leading-relaxed text-[#405448]">
                  {t("Hitamo uko amakuru akugaragarira. Ibyo wahisemo bibikwa muri iyi telefone kandi ntibihindura uko abandi babona urubuga.")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[#B9CBBF] bg-white text-[#173F2C] hover:bg-[#edf6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                aria-label={t("Funga")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <fieldset>
                <legend className="text-sm font-extrabold text-[#173F2C]">{t("Ingano y'inyuguti")}</legend>
                <p className="mt-1 text-xs leading-relaxed text-[#52665A]">{t("Wongera inyuguti ku rugero ukeneye. Ushobora guhitamo 200%.")}</p>
                <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label={t("Hitamo ingano y'inyuguti")}>
                  {scaleOptions.map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      role="radio"
                      aria-checked={textScale === scale}
                      onClick={() => setTextScale(scale)}
                      className={"min-h-[48px] rounded-xl border-2 px-2 py-2 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0] " + (
                        textScale === scale
                          ? "border-[#20603D] bg-[#e9f4ec] text-[#123e2a]"
                          : "border-[#cbd8cf] bg-white text-[#405448] hover:border-[#20603D]"
                      )}
                    >
                      {scale}%
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-[64px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#d5e1d8] bg-white p-3">
                  <span>
                    <span className="block text-sm font-bold">{t("Amabara asobanutse kurushaho")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#52665A]">{t("Byongera itandukaniro ry'inyandiko n'aho yanditse.")}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(event) => setHighContrast(event.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#20603D]"
                  />
                </label>

                <label className="flex min-h-[64px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#d5e1d8] bg-white p-3">
                  <span>
                    <span className="block text-sm font-bold">{t("Kugabanya inyeganyeza")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#52665A]">{t("Bigabanya animation n'ibihinduka byihuta.")}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(event) => setReducedMotion(event.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#20603D]"
                  />
                </label>

                <label className="flex min-h-[64px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#d5e1d8] bg-white p-3">
                  <span>
                    <span className="block text-sm font-bold">{t("Uburyo bworoshye")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#52665A]">{t("Hagaragaza inzira eshatu z'ingenzi mu buryo bworoshye.")}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={easyUseMode}
                    onChange={(event) => setEasyUseMode(event.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#20603D]"
                  />
                </label>

                <label className="flex min-h-[64px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#d5e1d8] bg-white p-3">
                  <span>
                    <span className="block text-sm font-bold">{t("Kubika internet")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#52665A]">{t("Ikarita izafunguka ari uko uyisabye kandi igabanye tiles.")}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={lowDataMode}
                    onChange={(event) => setLowDataMode(event.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#20603D]"
                  />
                </label>
              </div>

              <p className="rounded-xl border border-[#d7e5dc] bg-[#f1f7f3] p-3 text-xs leading-relaxed text-[#294c37]">
                {t("Amafoto meza ya IWACU RWANDA yose agumaho. Iyi gahunda yo kubika internet ntisiba amafoto; igabanya gusa amakuru y'ikarita igihe uyikoresheje.")}
              </p>

              <div className="flex flex-col-reverse gap-2 border-t border-emerald-900/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={resetAccessibilitySettings}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#b9cbbf] bg-white px-4 py-2 text-sm font-bold text-[#294c37] hover:bg-[#edf6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  {t("Subiza uko byari bisanzwe")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#20603D] px-5 py-2 text-sm font-extrabold text-white hover:bg-[#17492d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                >
                  {t("Bika kandi ufunge")}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
