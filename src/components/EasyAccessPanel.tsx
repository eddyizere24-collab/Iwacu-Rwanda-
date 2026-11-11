"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, List, MessageCircle, Phone, Users, X } from "lucide-react";
import { useAccessibilitySettings } from "@/components/AccessibilityProvider";
import { useI18n } from "@/components/LocaleProvider";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog";

export function EasyAccessPanel({
  onFindLocation,
  onFindLeaders,
  onChooseVillage,
}: {
  onFindLocation: () => void;
  onFindLeaders: () => void;
  onChooseVillage: () => void;
}) {
  const { easyUseMode, reducedMotion } = useAccessibilitySettings();
  const { t } = useI18n();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const guideHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const guideDialogRef = useAccessibleDialog(guideOpen, () => setGuideOpen(false));

  const spokenInstructions = [
    t("Serivisi z'ingenzi"),
    t("Hitamo icyo ushaka gukora. Kuri buri serivisi hari n'ubundi buryo bwo kuyikoresha."),
    t("Menya aho uherereye."),
    t("Banza umenye aho uri. Amakuru mashya y'abayobozi asaba internet."),
    t("Urutonde rwabitswe kuri telefone rushobora gukora nta internet. Ntukeneye ikarita."),
    t("Iwacu AI ikenera internet. Ushobora kwandika cyangwa kuvuga ikibazo niba telefone ibishyigikira."),
    t("Nimero zibitswe kuri telefone. Guhamagara ntibisaba internet."),
  ].join(". ");

  const guideSteps = [
    {
      title: t("1. Menya aho uri"),
      description: t("Kanda Menya aho ndi. Telefone ishobora kukubaza uruhushya rwo kumenya aho uri. Wemere gusa niba ubishaka. Ushobora gukomeza ukoresheje urutonde rw'imidugudu."),
      Icon: Compass,
    },
    {
      title: t("2. Hitamo umudugudu"),
      description: t("Niba aho urubuga rwerekanye atari ho uri, kanda Hitamo umudugudu ku rutonde. Hitamo Intara, Akarere, Umurenge, Akagari n'Umudugudu. Ntukeneye ikarita."),
      Icon: List,
    },
    {
      title: t("3. Bona abayobozi"),
      description: t("Kanda Bona abayobozi. Reba amazina n'imyanya y'abayobozi babonetse mu makuru yemejwe. Hitamo guhamagara cyangwa ubundi buryo bwo kuvugana bugaragajwe."),
      Icon: Users,
    },
    {
      title: t("4. Baza Iwacu AI"),
      description: t("Kanda Baza Iwacu AI. Ushobora kwandika ikibazo cyangwa gukanda Vuga igihe telefone na browser bishyigikira ururimi wahisemo. Genura amagambo telefone yumvise mbere yo kohereza."),
      Icon: MessageCircle,
    },
    {
      title: t("5. Ubutabazi"),
      description: t("Iyo ari ikibazo cy'ubutabazi bwihuse, koresha nimero iboneye iri ku rutonde rw'ubutabazi. Kanda Hamagara 112 igihe ukeneye ubutabazi bwa Polisi."),
      Icon: Phone,
    },
  ];
  const activeGuideStep = guideSteps[guideStep];
  const GuideIcon = activeGuideStep.Icon;

  useEffect(() => {
    if (!guideOpen) return;
    const frame = window.requestAnimationFrame(() => {
      guideHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guideOpen, guideStep]);

  if (!easyUseMode) return null;

  function openAssistant() {
    const assistant = document.getElementById("iwacu-ai-assistant");
    const motionReduced = reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    assistant?.scrollIntoView({ behavior: motionReduced ? "auto" : "smooth", block: "center" });
    const focusQuestion = () => {
      const input = document.getElementById("iwacu-assistant-question");
      if (input instanceof HTMLTextAreaElement) input.focus({ preventScroll: true });
    };
    if (motionReduced) window.requestAnimationFrame(focusQuestion);
    else window.setTimeout(focusQuestion, 250);
  }

  return (
    <section
      aria-labelledby="iwacu-easy-access-title"
      className="my-6 rounded-[24px] border border-[#c9ddcf] bg-white/95 p-4 shadow-[0_10px_30px_rgba(6,35,26,0.10)] sm:p-5"
    >
      <div className="mb-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#20603D]">{t("IWACU RWANDA")}</p>
        <h2 id="iwacu-easy-access-title" className="mt-1 text-xl font-extrabold text-[#123D2D]">
          {t("Serivisi z'ingenzi")}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[#405448]">
          {t("Hitamo icyo ushaka gukora. Kuri buri serivisi hari n'ubundi buryo bwo kuyikoresha.")}
        </p>
        <div className="mt-3">
          <ReadAloudButton text={spokenInstructions} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onFindLocation}
          className="flex min-h-[76px] items-center gap-4 rounded-2xl border-2 border-[#20603D] bg-[#edf6f0] p-4 text-left text-[#123D2D] shadow-sm hover:bg-[#e1f0e6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00A3E0]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#20603D] text-white">
            <Compass className="h-7 w-7" aria-hidden />
          </span>
          <span>
            <span className="block text-base font-extrabold">{t("Menya aho ndi")}</span>
            <span className="mt-1 block text-xs font-medium">{t("Menya aho uherereye.")}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onFindLeaders}
          className="flex min-h-[76px] items-center gap-4 rounded-2xl border-2 border-[#c9ddcf] bg-white p-4 text-left text-[#123D2D] shadow-sm hover:border-[#20603D] hover:bg-[#f5faf6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00A3E0]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e5f2e9] text-[#20603D]">
            <Users className="h-7 w-7" aria-hidden />
          </span>
          <span>
            <span className="block text-base font-extrabold">{t("Bona abayobozi")}</span>
            <span className="mt-1 block text-xs font-medium">{t("Banza umenye aho uri kugira ngo tubone abayobozi baho.")}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onChooseVillage}
          className="flex min-h-[76px] items-center gap-4 rounded-2xl border-2 border-[#c9ddcf] bg-white p-4 text-left text-[#123D2D] shadow-sm hover:border-[#20603D] hover:bg-[#f5faf6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00A3E0]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff6d5] text-[#6b5600]">
            <List className="h-7 w-7" aria-hidden />
          </span>
          <span>
            <span className="block text-base font-extrabold">{t("Hitamo umudugudu ku rutonde")}</span>
            <span className="mt-1 block text-xs font-medium">{t("Hitamo Intara, Akarere, Umurenge, Akagari n'Umudugudu ku rutonde. Ntukeneye ikarita.")}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={openAssistant}
          className="flex min-h-[76px] items-center gap-4 rounded-2xl border-2 border-[#c9ddcf] bg-white p-4 text-left text-[#123D2D] shadow-sm hover:border-[#20603D] hover:bg-[#f5faf6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00A3E0]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e7f3fb] text-[#006b9d]">
            <MessageCircle className="h-7 w-7" aria-hidden />
          </span>
          <span>
            <span className="block text-base font-extrabold">{t("Baza Iwacu AI")}</span>
            <span className="mt-1 block text-xs font-medium">{t("Andika cyangwa uvuge ikibazo niba telefone ibishyigikira.")}</span>
          </span>
        </button>

        <a
          href="tel:112"
          className="flex min-h-[76px] items-center gap-4 rounded-2xl border-2 border-[#f0c9c9] bg-[#fff8f8] p-4 text-left text-[#702626] shadow-sm hover:bg-[#fff0f0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc2626]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#b91c1c] text-white">
            <Phone className="h-7 w-7" aria-hidden />
          </span>
          <span>
            <span className="block text-base font-extrabold">{t("Ubutabazi")}</span>
            <span className="mt-1 block text-xs font-medium">{t("Hamagara 112 mu gihe cy'ubutabazi bwihuse.")}</span>
          </span>
        </a>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setGuideStep(0);
            setGuideOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#20603D] bg-white px-4 py-2 text-sm font-bold text-[#174a31] hover:bg-[#edf6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
        >
          <Compass className="h-4 w-4" aria-hidden />
          {t("Mfasha intambwe ku yindi")}
        </button>
      </div>

      <p className="mt-4 rounded-xl bg-[#f3f7f4] p-3 text-xs leading-relaxed text-[#405448]">
        {t("Ikarita ni amahitamo gusa. Ushobora gukoresha urutonde rw'imidugudu utayirebye.")}
      </p>

      {guideOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#061b12]/65 p-3 backdrop-blur-sm">
          <section
            ref={guideDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="iwacu-easy-guide-title"
            tabIndex={-1}
            className="max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto rounded-[24px] border border-emerald-900/15 bg-[#fbfdfb] p-4 text-[#10261c] shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3 border-b border-emerald-900/10 pb-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#20603D]">{t("IWACU RWANDA")}</p>
                <p className="mt-1 text-xs font-semibold text-[#52665A]" aria-live="polite">
                  {t("Intambwe")} {guideStep + 1} {t("kuri")} {guideSteps.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[#B9CBBF] bg-white text-[#173F2C] hover:bg-[#edf6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
                aria-label={t("Funga")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="py-5" aria-live="polite">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf6f0] text-[#20603D]">
                <GuideIcon className="h-9 w-9" aria-hidden />
              </div>
              <h3
                id="iwacu-easy-guide-title"
                ref={guideHeadingRef}
                tabIndex={-1}
                className="text-xl font-extrabold text-[#123D2D] focus:outline-none sm:text-2xl"
              >
                {activeGuideStep.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[#294c37]">
                {activeGuideStep.description}
              </p>
              <div className="mt-4">
                <ReadAloudButton text={activeGuideStep.description} label={t("Umva iyi ntambwe")} />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-emerald-900/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setGuideStep((current) => Math.max(0, current - 1))}
                disabled={guideStep === 0}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#B9CBBF] bg-white px-4 py-2 text-sm font-bold text-[#294c37] hover:bg-[#edf6f0] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20603D]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {t("Subira")}
              </button>
              {guideStep < guideSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setGuideStep((current) => Math.min(guideSteps.length - 1, current + 1))}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#20603D] px-5 py-2 text-sm font-extrabold text-white hover:bg-[#17492d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                >
                  {t("Komeza")}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#20603D] px-5 py-2 text-sm font-extrabold text-white hover:bg-[#17492d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                >
                  {t("Nabyumvise")}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
