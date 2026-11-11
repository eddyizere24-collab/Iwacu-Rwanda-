"use client";

import { useState } from "react";
import { Phone, X, AlertCircle, ShieldAlert, HeartPulse, Flame, Car, HelpCircle, Users } from "lucide-react";
import { VERIFIED_EMERGENCY_NUMBERS, type EmergencyContact } from "@/lib/rwanda-geo";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog";

interface EmergencyStripProps {
  className?: string;
}

export function EmergencyStrip({ className = "" }: EmergencyStripProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useAccessibleDialog(isOpen, () => setIsOpen(false));

  function getCategoryIcon(cat: EmergencyContact["category"]) {
    switch (cat) {
      case "police":
        return <ShieldAlert className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />;
      case "medical":
        return <HeartPulse className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden />;
      case "fire":
        return <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />;
      case "traffic":
        return <Car className="h-4 w-4 text-blue-700 dark:text-blue-300" aria-hidden />;
      case "protection":
        return <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden />;
    }
  }

  return (
    <>
      {/* Fixed bottom emergency strip */}
      <aside
        aria-label="Ubutabazi bwihuse"
        className={`mx-auto mb-3 mt-2 w-full max-w-5xl px-4 ${className}`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 rounded-2xl border border-amber-500/25 bg-card/95 px-3 py-2 shadow-sm sm:gap-3 sm:px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600/10 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Phone className="h-4 w-4 animate-pulse" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground tracking-tight">
                  Ubutabazi
                </span>
                <span className="hidden sm:inline-block text-[11px] text-muted-foreground">
                  · Zikora nta interineti
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Polisi — ubutabazi bwihuse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Action: Direct Call 112 */}
            <a
              href="tel:112"
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-transform active:scale-95 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              aria-label="Hamagara 112 ubutabazi bwa Polisi"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              <span>Hamagara 112</span>
            </a>

            {/* Open full list */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-expanded={isOpen}
              aria-haspopup="dialog"
            >
              Izindi nimero
            </button>
          </div>
        </div>
      </aside>

      {/* Emergency Sheet Modal */}
      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-sheet-title"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl">
            {/* Header photo of Rwanda tea plantations */}
            <div className="photo-surface photo-tea -mx-5 -mt-5 mb-4 flex items-start justify-between gap-3 rounded-t-3xl px-5 pb-5 pt-6 sm:-mx-6 sm:-mt-6 sm:px-6">
              <div>
                <h2 id="emergency-sheet-title" className="text-lg font-bold text-white drop-shadow">
                  Nimero z&apos;ubutabazi
                </h2>
                <p className="mt-1 text-xs text-white/90 drop-shadow">
                  Izi nimero ziri kuri telefone yawe. Zikora nta interineti.
                </p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white hover:bg-white/25" aria-label="Funga">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List of Numbers */}
            <div className="space-y-2.5">
              {VERIFIED_EMERGENCY_NUMBERS.map((em) => (
                <div
                  key={em.number}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-3 transition-colors hover:border-blue-600/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {getCategoryIcon(em.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {em.name_kiny}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {em.source}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`tel:${em.number}`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600/10 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-colors dark:text-blue-300 shrink-0"
                    aria-label={`Hamagara ${em.number} ${em.name_kiny}`}
                  >
                    <Phone className="h-3 w-3" aria-hidden />
                    <span>{em.number}</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-border pt-4 text-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full min-h-[44px] rounded-xl border border-border bg-muted/60 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
