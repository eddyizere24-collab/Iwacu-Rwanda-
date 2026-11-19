"use client";

import { Loader2, Compass } from "lucide-react";
import type { LocationStatus } from "@/hooks/useLocation";
import { RwandanSun } from "./RwandanSun";

interface LocationButtonProps {
  status: LocationStatus;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function LocationButton({
  status,
  onClick,
  disabled = false,
  className = "",
}: LocationButtonProps) {
  const isLoading =
    status === "requesting_gps" || status === "locating";

  const label =
    status === "requesting_gps"
      ? "Turimo gusaba uruhushya..."
      : status === "locating"
        ? "Turimo gushaka aho uri..."
        : "Menya aho uri";

  return (
    <div className="w-full flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={label}
        className={`
          group relative inline-flex min-h-[48px] w-full max-w-[320px] items-center justify-center gap-2.5
          rounded-full px-5 py-2.5 text-[15px] font-bold text-[#06231A]
          bg-[#FAD201]
          shadow-[0_4px_12px_rgba(6,35,26,0.16)]
          transition-all duration-300
          hover:scale-[1.02] hover:bg-[#ffdf2e]
          active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70
          disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:scale-100
          ${className}
        `}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#06231A]" aria-hidden />
        ) : (
          <div className="relative">
            <RwandanSun size={22} glow={false} className="group-hover:rotate-45 transition-transform duration-500" />
          </div>
        )}

        <span className="tracking-tight text-[#06231A] text-[15px] sm:text-[15px]">
          {label}
        </span>
      </button>
    </div>
  );
}
