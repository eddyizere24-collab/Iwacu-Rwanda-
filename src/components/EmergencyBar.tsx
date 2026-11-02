"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Phone } from "lucide-react";
import { emergencyTel } from "@/lib/emergency/public";
import type { EmergencyNumber } from "@/types/emergency";

const CACHE_KEY = "iwacu:emergency:v1";

function readCache(): EmergencyNumber[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as EmergencyNumber[]) : null;
  } catch { return null; }
}
function writeCache(items: EmergencyNumber[]) {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(items)); } catch { /* storage may be unavailable */ }
}

/**
 * Emergency numbers, shown on the first screen before anything else.
 */
export function EmergencyBar({ extra = [] }: { extra?: EmergencyNumber[] }) {
  const [items, setItems] = useState<EmergencyNumber[]>([]);
  const [offlineCopy, setOfflineCopy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const cached = readCache();
    if (cached && alive) setItems(cached);

    (async () => {
      try {
        const res = await fetch("/api/emergency", { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("bad status");
        const body = (await res.json()) as { items?: EmergencyNumber[] };
        if (alive && Array.isArray(body.items) && body.items.length > 0) {
          setItems(body.items); setOfflineCopy(false); writeCache(body.items);
          return;
        }
        throw new Error("empty");
      } catch {
        if (cached && cached.length > 0) { if (alive) setOfflineCopy(true); return; }
        try {
          const res = await fetch("/emergency-national.json");
          const body = (await res.json()) as { items?: EmergencyNumber[] };
          if (alive && Array.isArray(body.items)) { setItems(body.items); setOfflineCopy(true); }
        } catch { /* nothing more to try */ }
      }
    })();
    return () => { alive = false; };
  }, []);

  const all = [...items, ...extra.filter((e) => !items.some((i) => i.number === e.number && (i.scope_code ?? null) === (e.scope_code ?? null)))];
  if (all.length === 0) return null;
  const main = all.find((i) => i.number === "112") ?? all[0];
  const mainTel = emergencyTel(main.number);

  return (
    <section aria-label="Nimero z'ubutabazi" className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" aria-hidden />
          <span>Ubutabazi</span>
        </div>
        {mainTel && (
          <a
            href={mainTel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Hamagara {main.number}
          </a>
        )}
      </div>
      <p className="mt-1 text-xs text-red-800/80 dark:text-red-200/80">{main.label_kiny}</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 min-h-[44px] text-sm font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-300"
      >
        {open ? "Hisha izindi nimero" : "Reba izindi nimero z'ubutabazi"}
      </button>

      {open && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {all.map((e) => {
            const tel = emergencyTel(e.number);
            return (
              <li key={`${e.scope_code ?? "RW"}|${e.number}`}>
                {tel ? (
                  <a href={tel} className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm dark:border-red-900 dark:bg-background">
                    <span className="min-w-0">{e.label_kiny}</span>
                    <span className="shrink-0 font-semibold text-red-700 dark:text-red-300">{e.number}</span>
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {offlineCopy && <p className="mt-2 text-xs text-muted-foreground">Ibi bigaragaye bivuye ku nyandiko iri kuri telefone (nta interineti).</p>}
    </section>
  );
}
