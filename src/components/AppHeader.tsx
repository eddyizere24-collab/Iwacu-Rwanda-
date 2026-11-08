"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, HelpCircle } from "lucide-react";
import { RwandanSun, AgasekeEmblem } from "./RwandanSun";
import { HelpModal, PrivacyModal } from "./HelpModal";

const NOTIFICATION_ARCHIVE_STORAGE_KEY = "iwacu-notification-archive-v1";
const NOTIFICATION_LAST_SEEN_STORAGE_KEY = "iwacu-notification-last-seen-v1";
const NOTIFICATIONS_UPDATED_EVENT = "iwacu:notifications-updated";

function countUnreadNotifications(): number {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_ARCHIVE_STORAGE_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return 0;
    const lastSeen = Number(window.localStorage.getItem(NOTIFICATION_LAST_SEEN_STORAGE_KEY) ?? "0");
    return parsed.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const createdAt = Date.parse(String((item as Record<string, unknown>).createdAt ?? ""));
      return Number.isFinite(createdAt) && createdAt > (Number.isFinite(lastSeen) ? lastSeen : 0);
    }).length;
  } catch {
    return 0;
  }
}

export function AppHeader() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const refreshCount = () => setUnreadNotifications(countUnreadNotifications());
    refreshCount();
    window.addEventListener("storage", refreshCount);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshCount);
    return () => {
      window.removeEventListener("storage", refreshCount);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshCount);
    };
  }, []);

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
              className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-emerald-800 transition-colors hover:bg-muted"
              aria-label={unreadNotifications > 0 ? `Amamenyesha yawe, ${unreadNotifications} mashya` : "Amamenyesha yawe"}
              title={unreadNotifications > 0 ? `${unreadNotifications} amamenyesha mashya` : "Amamenyesha yawe"}
            >
              <Bell className="h-5 w-5" aria-hidden />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-extrabold leading-none text-white shadow">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
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
