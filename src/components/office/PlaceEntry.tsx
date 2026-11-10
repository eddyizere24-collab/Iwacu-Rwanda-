"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";

export type EntryTier = "district" | "sector" | "cell";
type Place = { scope_code: string; level: string; name: string; parent_name: string | null };

const INPUT = "min-h-[48px] w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#00A3E0]";
const BTN = "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 text-sm font-bold text-white transition hover:bg-[#1b5234] disabled:cursor-not-allowed disabled:opacity-60";

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-4 inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Subira inyuma
    </button>
  );
}


/** Pick a place from a list, one step at a time, so people only ever see their own area to choose from. */
export function PlaceEntry({ tier, onBack, fetcher = fetch, goto }: { tier: EntryTier; onBack: () => void; fetcher?: typeof fetch; goto?: (next: string) => void }) {
  const router = useRouter();
  // Steps above the final place: Umurenge starts at its district; Akagari at district then sector.
  const chain: ("district" | "sector" | "cell")[] = tier === "district" ? ["district"] : tier === "sector" ? ["district", "sector"] : ["district", "sector", "cell"];
  const [picked, setPicked] = useState<Place[]>([]);
  const step = chain[picked.length];
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const done = picked.length === chain.length;
  const final = done ? picked[picked.length - 1] : null;

  const load = useCallback(async () => {
    if (!step) return;
    setPlaces(null);
    const parent = picked.length ? picked[picked.length - 1].scope_code : "";
    const url = `/api/admin/office/entry/places?level=${step}${parent ? `&parent=${encodeURIComponent(parent)}` : ""}`;
    try {
      const res = await fetcher(url, { cache: "no-store" });
      const json = await res.json().catch(() => null) as { places?: Place[] } | null;
      setPlaces(res.ok ? json?.places ?? [] : []);
    } catch {
      setPlaces([]);
    }
  }, [step, picked]);

  useEffect(() => {
    void load();
  }, [load]);

  const WORD = { district: "Akarere", sector: "Umurenge", cell: "Akagari" } as const;

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!final) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetcher("/api/admin/office/enter", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: final.scope_code, key }),
      });
      const json = await res.json().catch(() => null) as { next?: string; message_kiny?: string } | null;
      if (!res.ok || !json?.next) {
        setError(json?.message_kiny || "Ntibyashobotse. Ongera ugerageze.");
        setKey("");
        return;
      }
      if (goto) { goto(json.next); return; }
      router.replace(json.next);
      router.refresh();
    } catch {
      setError("Serivisi yo kwinjira ntiyabonetse. Ongera ugerageze.");
    } finally {
      setLoading(false);
    }
  }

  function back() {
    setError(null); setKey("");
    if (picked.length === 0) onBack();
    else setPicked(picked.slice(0, -1));
  }

  return (
    <>
      <BackButton onClick={back} />
      {picked.length > 0 && (
        <p className="mb-3 text-xs font-semibold text-muted-foreground">{picked.map((p) => p.name).join(" › ")}</p>
      )}
      {!done && step && (
        <div>
          <p className="mb-3 text-sm font-bold text-foreground">Hitamo {WORD[step].toLowerCase()}</p>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {places === null && <li className="p-3 text-xs text-muted-foreground">Dutegereje…</li>}
            {places?.length === 0 && <li className="p-3 text-xs text-muted-foreground">Nta cyabonetse.</li>}
            {places?.map((p) => (
              <li key={p.scope_code}>
                <button type="button" onClick={() => setPicked([...picked, p])}
                  className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-input bg-background px-4 text-left text-base font-semibold hover:border-[#00A3E0]">
                  <span>{p.name}</span>
                  {p.parent_name && step !== "district" && <span className="text-[11px] font-normal text-muted-foreground">{p.parent_name}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {done && final && (
        <form onSubmit={enter} className="space-y-4">
          <div className="rounded-xl bg-[#20603D]/10 p-3 text-sm font-bold text-[#20603D]">{WORD[final.level as "district" | "sector" | "cell"]} {final.name}</div>
          <div>
            <label htmlFor="place-key" className="mb-1.5 block text-xs font-semibold text-foreground">Urufunguzo</label>
            <input id="place-key" type="password" required autoFocus autoComplete="off" autoCapitalize="none" autoCorrect="off"
              value={key} onChange={(e) => setKey(e.target.value)} className={INPUT} placeholder="Andika urufunguzo" />
          </div>
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>
          )}
          <button type="submit" disabled={loading || !key} className={BTN}>
            <KeyRound className="h-4 w-4" /> {loading ? "Turimo kugenzura…" : "Injira"}
          </button>
        </form>
      )}
    </>
  );
}

