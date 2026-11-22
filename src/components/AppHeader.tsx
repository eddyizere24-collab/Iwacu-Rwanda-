"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, HelpCircle } from "lucide-react";
import { IwacuRwandaLogo } from "./IwacuRwandaLogo";
import { HelpModal, PrivacyModal } from "./HelpModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccessibilitySettings } from "@/components/AccessibilitySettings";
import { IwacuRemoteAgent } from "@/components/IwacuRemoteAgent";
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
  const unreadLabel = "Amamenyesha yawe:";

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
      <header className="iwacu-header sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex min-h-[60px] max-w-5xl items-center justify-between gap-2 px-3 py-1 sm:min-h-[66px] sm:px-6 sm:py-1.5">
          {/* Official IWACU RWANDA logo (concept 03), unchanged, on its own light plate. */}
          <Link
            href="/"
            aria-label="IWACU RWANDA: subira ku ntangiriro"
            title="IWACU RWANDA"
            onClick={(event) => {
              event.preventDefault();
              window.location.assign("/");
            }}
            className="iwacu-brand-link flex shrink-0 items-center select-none"
          >
            <IwacuRwandaLogo className="box-content block h-[44px] w-auto rounded-lg bg-[#FDFCF8] p-1 shadow-[0_1px_6px_rgba(6,35,26,0.28)] sm:h-[46px]" />
          </Link>

          {/* Navigation & Controls */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/amenyesha"
              className="iwacu-header-control inline-flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAD201]"
              aria-label={
                unreadCount > 0
                  ? `${unreadLabel} ${unreadCount > 99 ? "99+" : unreadCount} atarasomwa`
                  : "Amamenyesha yawe"
              }
              title={unreadCount > 0 ? `${unreadCount} amamenyesha atarasomwa` : "Amamenyesha yawe"}
            >
              <span className="relative inline-flex">
                <Bell className="h-5 w-5" aria-hidden />
                {unreadCount > 0 && (
                  <span
                    aria-label={`${unreadCount} ${"amamenyesha atarasomwa"}`}
                    className="absolute -right-2 -top-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold leading-none text-white shadow-sm"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            </Link>

            <IwacuRemoteAgent />
            <AccessibilitySettings />
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="iwacu-help-fab fixed bottom-4 right-4 z-[41] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/30 bg-[#174a31] text-white shadow-[0_8px_24px_rgba(6,35,26,0.32)] transition-transform hover:-translate-y-0.5 hover:bg-[#20603d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAD201]"
        aria-label="Ubufasha"
        title="Ubufasha"
      >
        <HelpCircle className="h-5 w-5" aria-hidden />
      </button>

      {/* Modals */}
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
