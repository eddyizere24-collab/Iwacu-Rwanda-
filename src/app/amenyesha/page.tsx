"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Clock3, RefreshCw } from "lucide-react";

const VISITOR_ID_STORAGE_KEY = "iwacu-push-visitor-id-v1";
const NOTIFICATION_ARCHIVE_STORAGE_KEY = "iwacu-notification-archive-v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
  deliveryStatus?: string;
};

type ArchiveResponse = {
  status?: string;
  items?: NotificationItem[];
  nextBefore?: string | null;
};

function readLocalArchive(): NotificationItem[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_ARCHIVE_STORAGE_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is NotificationItem =>
      Boolean(
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.body === "string" &&
        typeof item.createdAt === "string"
      )
    );
  } catch {
    return [];
  }
}

function mergeNotifications(
  first: NotificationItem[],
  second: NotificationItem[]
): NotificationItem[] {
  const byId = new Map<string, NotificationItem>();
  for (const item of first) byId.set(item.id, item);
  for (const item of second) byId.set(item.id, item);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(true);

  const loadArchive = useCallback(async (before?: string) => {
    const visitorId = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY) ?? "";
    if (!UUID_PATTERN.test(visitorId)) {
      setServerAvailable(false);
      setNextBefore(null);
      return;
    }

    const query = new URLSearchParams({ visitorId });
    if (before) query.set("before", before);

    const response = await fetch(`/api/push/events?${query.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => null) as ArchiveResponse | null;
    if (!response.ok || !payload || !Array.isArray(payload.items)) {
      setServerAvailable(false);
      return;
    }

    setServerAvailable(true);
    setItems((current) => mergeNotifications(current, payload.items ?? []));
    setNextBefore(payload.nextBefore ?? null);
  }, []);

  useEffect(() => {
    setItems(readLocalArchive());
    void loadArchive().catch(() => setServerAvailable(false)).finally(() => setLoading(false));
  }, [loadArchive]);

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

  async function refresh() {
    setLoading(true);
    setItems(readLocalArchive());
    try {
      await loadArchive();
    } catch {
      setServerAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadArchive(nextBefore);
    } catch {
      setServerAvailable(false);
    } finally {
      setLoadingMore(false);
    }
  }

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
            onClick={() => void refresh()}
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
          Aha ni ho usubira kureba ubutumwa wigeze kwakira, harimo igihe wabwinjiriyeho n'aho ubutumwa bwavugaga.
        </p>
      </header>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-xs leading-relaxed text-slate-700 shadow-sm">
        {serverAvailable
          ? "Amamenyesha abikwa kuri server no kuri telefone yawe. Ushobora kuyasubiramo n'igihe utari kuri paji y'ibanze."
          : "Kuri ubu turerekana amamenyesha abitswe muri iyi telefone. Server archive izagaragara igihe ububiko bwa server buzaba bwamaze gushyirwaho."}
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
            Nimara gukoresha “Menya aho ndi” no kwemerera amamenyesha, ubutumwa bwawe buzatangira kugaragara hano.
          </p>
          <Link href="/" className="mt-4 inline-flex items-center justify-center rounded-full bg-[#20603D] px-5 py-2.5 text-sm font-bold text-white">
            Menya aho ndi
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
                      Byabitswe muri IWACU
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {nextBefore && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="min-h-[46px] w-full rounded-full border border-emerald-700 bg-white/95 px-4 py-3 text-sm font-bold text-emerald-800 disabled:opacity-60"
            >
              {loadingMore ? "Turimo kuzana andi..." : "Erekana amamenyesha ashaje"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
