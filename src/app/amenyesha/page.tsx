"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Clock3, RefreshCw } from "lucide-react";
import {
  isNotificationArchiveItem,
  NOTIFICATION_ARCHIVE_STORAGE_KEY,
  NOTIFICATION_ARCHIVE_UPDATED_EVENT,
  NOTIFICATION_ARCHIVE_READ_EVENT,
  NOTIFICATION_READ_IDS_STORAGE_KEY,
  type NotificationArchiveItem,
} from "@/lib/notification-archive";

type NotificationItem = NotificationArchiveItem;

function readLocalArchive(): NotificationItem[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_ARCHIVE_STORAGE_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isNotificationArchiveItem)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}


function markArchiveItemsRead(items: readonly NotificationItem[]): void {
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_READ_IDS_STORAGE_KEY) ?? "[]"
    );
    const previous = Array.isArray(stored)
      ? stored.filter((value): value is string => typeof value === "string")
      : [];
    const next = Array.from(new Set([...previous, ...items.map((item) => item.id)])).slice(-500);
    window.localStorage.setItem(NOTIFICATION_READ_IDS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NOTIFICATION_ARCHIVE_READ_EVENT));
  } catch {
    // The archive remains viewable if browser storage is restricted.
  }
}

function dateKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
  }).format(new Date(value));
}

function dateHeading(value: string): string {
  return new Intl.DateTimeFormat("rw-RW", {
    timeZone: "Africa/Kigali",
    dateStyle: "full",
  }).format(new Date(value));
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat("rw-RW", {
    timeZone: "Africa/Kigali",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationArchivePage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const current = readLocalArchive();
    setItems(current);
    markArchiveItemsRead(current);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const handleArchiveUpdate = () => {
      // A notice arriving after the archive was opened must remain unread.
      // Only the initial load or an explicit refresh marks the current snapshot read.
      const current = readLocalArchive();
      setItems(current);
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === NOTIFICATION_ARCHIVE_STORAGE_KEY ||
        event.key === NOTIFICATION_READ_IDS_STORAGE_KEY ||
        event.key === null
      ) {
        handleArchiveUpdate();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(NOTIFICATION_ARCHIVE_UPDATED_EVENT, handleArchiveUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(NOTIFICATION_ARCHIVE_UPDATED_EVENT, handleArchiveUpdate);
    };
  }, [refresh]);

  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; items: NotificationItem[] }> = [];
    for (const item of items) {
      const key = dateKey(item.createdAt);
      let group = result.find((candidate) => candidate.key === key);
      if (!group) {
        group = { key, label: dateHeading(item.createdAt), items: [] };
        result.push(group);
      }
      group.items.push(item);
    }
    return result;
  }, [items]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="photo-surface photo-road overflow-hidden rounded-[26px] p-5 shadow-lg sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Subira
          </Link>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Vugurura
          </button>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Bell className="h-6 w-6 text-[#FAD201]" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FAD201]">
              IWACU RWANDA
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Amamenyesha yawe
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85">
          Aha ni ho usubira kureba ubutumwa wigeze kwakira, harimo igihe wabwakiriye n'aho bwavugaga.
        </p>
      </header>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-xs leading-relaxed text-slate-700 shadow-sm">
        Amamenyesha abikwa muri iyi telefone. Ushobora kuyasubiramo hano n'igihe utari kuri paji y'ibanze. Kuyasiba mu makuru ya browser bishobora kuyakuraho.
      </div>

      {loading && items.length === 0 ? (
        <div role="status" className="mt-8 rounded-2xl bg-white/95 p-6 text-center text-sm text-slate-600 shadow">
          Turimo gufungura amamenyesha yawe...
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white/95 p-7 text-center shadow">
          <Clock3 className="mx-auto h-8 w-8 text-emerald-700" aria-hidden />
          <h2 className="mt-3 text-base font-bold text-slate-900">Nta menyesha urakira arabikwa</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Nimara gukoresha “Menya aho uri” no kwemerera amamenyesha, ubutumwa bwawe buzatangira kugaragara hano.
          </p>
          <Link href="/" className="mt-4 inline-flex items-center justify-center rounded-full bg-[#20603D] px-5 py-2.5 text-sm font-bold text-white">
            Menya aho uri
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-7">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="mb-3 px-1 text-sm font-bold text-[#174a31]">{group.label}</h2>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-white bg-white/95 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold leading-relaxed text-slate-900">{item.title}</h3>
                      <time
                        dateTime={item.createdAt}
                        className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
                      >
                        {timeLabel(item.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Byabitswe muri iyi telefone
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
