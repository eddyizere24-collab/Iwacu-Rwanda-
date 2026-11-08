"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, HelpCircle } from "lucide-react";
import { RwandanSun, AgasekeEmblem } from "./RwandanSun";
import { HelpModal, PrivacyModal } from "./HelpModal";
import {
  countUnreadNotificationArchive,
  isNotificationArchiveItem,
  NOTIFICATION_ARCHIVE_STORAGE_KEY,
  NOTIFICATION_ARCHIVE_UPDATED_EVENT,
  NOTIFICATION_ARCHIVE_READ_EVENT,
  NOTIFICATION_READ_IDS_STORAGE_KEY,
} from "@/lib/notification-archive";

function readUnreadNotificationCount(): number {
  try {
    const rawItems: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_ARCHIVE_STORAGE_KEY) ?? "[]"
    );
    const rawReadIds: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_READ_IDS_STORAGE_KEY) ?? "[]"
    );
    const items = Array.isArray(rawItems) ? rawItems.filter(isNotificationArchiveItem) : [];
    const readIds = Array.isArray(rawReadIds)
      ? rawReadIds.filter((value): value is string => typeof value === "string")
      : [];
    return countUnreadNotificationArchive(items, readIds);
  } catch {
    return 0;
  }
}

export function AppHeader() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const refreshUnreadCount = () => setUnreadCount(readUnreadNotificationCount());
    refreshUnreadCount();
    window.addEventListener("storage", refreshUnreadCount);
    window.addEventListener(NOTIFICATION_ARCHIVE_UPDATED_EVENT, refreshUnreadCount);
    window.addEventListener(NOTIFICATION_ARCHIVE_READ_EVENT, refreshUnreadCount);
    return () => {
      window.removeEventListener("storage", refreshUnreadCount);
      window.removeEventListener(NOTIFICATION_ARCHIVE_UPDATED_EVENT, refreshUnreadCount);
      window.removeEventListener(NOTIFICATION_ARCHIVE_READ_EVENT, refreshUnreadCount);
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
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-emerald-800 transition-colors hover:bg-muted"
              aria-label={
                unreadCount > 0
                  ? `Amamenyesha yawe: ${unreadCount > 99 ? "99 cyangwa arenga" : unreadCount} atarasomwa`
                  : "Amamenyesha yawe"
              }
              title={unreadCount > 0 ? `${unreadCount} amamenyesha atarasomwa` : "Amamenyesha yawe"}
            >
              <span className="relative inline-flex">
                <Bell className="h-5 w-5" aria-hidden />
                {unreadCount > 0 && (
                  <span
                    aria-label={`${unreadCount} amamenyesha atarasomwa`}
                    className="absolute -right-2 -top-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold leading-none text-white shadow-sm"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
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
