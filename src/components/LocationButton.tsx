"use client";

import { MapPin, Loader2 } from "lucide-react";
import type { LocationPhase } from "@/hooks/useLocation";
import { t } from "@/lib/i18n";

interface LocationButtonProps {
  status: LocationPhase;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** Optional locale override; default Kinyarwanda */
  locale?: "rw" | "en";
}

export function LocationButton({
  status,
  onClick,
  disabled = false,
  className = "",
  locale = "rw",
}: LocationButtonProps) {
  const isLoading = status === "requesting_gps" || status === "locating";

  const label =
    status === "requesting_gps"
      ? t("locatingGps", locale)
      : status === "locating"
        ? t("locating", locale)
        : t("locateButton", locale);

  const ariaLabel =
    locale === "rw"
      ? `${label} / ${t("locateButton", "en")}`
      : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={ariaLabel}
      className={`
        group relative inline-flex min-h-[56px] w-full max-w-sm items-center justify-center gap-3
        rounded-2xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg
        transition-all duration-200
        hover:bg-blue-700 hover:shadow-xl hover:scale-[1.02]
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/40
        active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100
        dark:bg-blue-600 dark:hover:bg-blue-500
        ${className}
      `}
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      ) : (
        <MapPin className="h-6 w-6 transition-transform group-hover:scale-110" aria-hidden />
      )}
      <span>{label}</span>
    </button>
  );
}
