"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, HelpCircle } from "lucide-react";
import { RwandanSun, AgasekeEmblem } from "./RwandanSun";
import { HelpModal, PrivacyModal } from "./HelpModal";

export function AppHeader() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
          {/* Logo & Brand with Agaseke and Rwandan Sun */}
          <Link href="/" className="flex items-center gap-2.5 group select-none">
            <div className="relative">
              <AgasekeEmblem size={38} className="group-hover:scale-105 transition-transform" />
              <div className="absolute -top-1.5 -right-1.5 pointer-events-none">
                <RwandanSun size={18} glow={false} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-[-0.035em] text-foreground text-base sm:text-lg">
                  IWACU RWANDA
                </span>
                <span className="inline-block h-2 w-2 rounded-full bg-[#00A3E0]" aria-hidden />
                <span className="inline-block h-2 w-2 rounded-full bg-[#FAD201]" aria-hidden />
                <span className="inline-block h-2 w-2 rounded-full bg-[#20603D]" aria-hidden />
              </div>
              <span className="block text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Menya abayobozi b&apos;aho uri
              </span>
            </div>
          </Link>

          {/* Navigation & Controls */}
          <nav className="flex items-center gap-2">
            <Link
              href="/amenyesha"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-emerald-800 transition-colors hover:bg-muted"
              aria-label="Amamenyesha yawe"
              title="Amamenyesha yawe"
            >
              <Bell className="h-5 w-5" aria-hidden />
            </Link>

            {/* Help Button ('?') per D1 A6 */}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Ubufasha (Help)"
              title="Ubufasha"
            >
              <HelpCircle className="h-5 w-5" aria-hidden />
            </button>


          </nav>
        </div>
      </header>

      {/* Modals */}
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
