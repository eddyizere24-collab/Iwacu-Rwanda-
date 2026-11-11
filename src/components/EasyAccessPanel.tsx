"use client";

import { Compass, MessageCircle, Phone, Users } from "lucide-react";
import { useAccessibilitySettings } from "@/components/AccessibilityProvider";
import { useI18n } from "@/components/LocaleProvider";

export function EasyAccessPanel({
  onFindLocation,
}: {
  onFindLocation: () => void;
}) {
  const { easyUseMode } = useAccessibilitySettings();
  const { t } = useI18n();

  if (!easyUseMode) return null;

  function openAssistant() {
    const assistant = document.getElementById("iwacu-ai-assistant");
    assistant?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const input = document.getElementById("iwacu-assistant-question");
      if (input instanceof HTMLTextAreaElement) input.focus();
    }, 250);
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
          onClick={onFindLocation}
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

      <p className="mt-4 rounded-xl bg-[#f3f7f4] p-3 text-xs leading-relaxed text-[#405448]">
        {t("Ushobora no gukoresha urutonde rw'imidugudu. Ikarita si yo nzira yonyine.")}
      </p>
    </section>
  );
}
