"use client";

// PREVIEW-ONLY demo of the entry flow with INVENTED places and the demo key "demo". Remove with /demo-ibiro before merging.
import { useState } from "react";
import { PlaceEntry, type EntryTier } from "@/components/office/PlaceEntry";

type P = { scope_code: string; level: string; name: string; parent_name: string | null };
const PLACES: P[] = [
  { scope_code: "RW-01-01", level: "district", name: "Ikitegererezo A", parent_name: null },
  { scope_code: "RW-02-01", level: "district", name: "Ikitegererezo B", parent_name: null },
  { scope_code: "RW-01-01-01", level: "sector", name: "Umurenge wa Mbere", parent_name: "Ikitegererezo A" },
  { scope_code: "RW-01-01-02", level: "sector", name: "Umurenge wa Kabiri", parent_name: "Ikitegererezo A" },
  { scope_code: "RW-02-01-01", level: "sector", name: "Umurenge wa Gatatu", parent_name: "Ikitegererezo B" },
  { scope_code: "RW-01-01-01-01", level: "cell", name: "Akagari ka Mbere", parent_name: "Umurenge wa Mbere" },
  { scope_code: "RW-01-01-01-02", level: "cell", name: "Akagari ka Kabiri", parent_name: "Umurenge wa Mbere" },
];

const mock = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), "http://x");
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
  if (url.pathname.endsWith("/entry/places")) {
    const level = url.searchParams.get("level"); const parent = url.searchParams.get("parent"); const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return json({ places: PLACES.filter((p) => p.level === level && (level === "district" || (parent && p.scope_code.startsWith(parent + "-"))) && p.name.toLowerCase().includes(q)) });
  }
  const body = JSON.parse(String(init?.body ?? "{}")) as { scope: string; key: string };
  if (body.key === "demo") {
    const lvl = body.scope.split("-").length;
    return json({ next: `tier=${lvl === 3 ? "district" : lvl === 4 ? "sector" : "cell"}` });
  }
  return json({ message_kiny: "Urufunguzo si rwo, cyangwa aho hantu nta konti ihari." }, 401);
}) as typeof fetch;

export default function Page() {
  const [tier, setTier] = useState<EntryTier>("cell");
  return (
    <main className="flex min-h-screen items-center justify-center bg-rwandan-gradient px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-sky-100 bg-card p-6 shadow-2xl sm:p-9">
        <div className="mb-5 flex gap-2">
          {(["district", "sector", "cell"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTier(t)}
              className={`min-h-[40px] flex-1 rounded-xl border text-xs font-bold ${tier === t ? "border-[#20603D] bg-[#20603D] text-white" : "border-input"}`}>
              {t === "district" ? "Akarere" : t === "sector" ? "Umurenge" : "Akagari"}
            </button>
          ))}
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">Urugero: ahantu ni ibitekerezo. Urufunguzo rw&apos;ikitegererezo: demo</p>
        <PlaceEntry key={tier} tier={tier} onBack={() => undefined} fetcher={mock}
          goto={(n) => { window.location.href = `/demo-ibiro?${n}`; }} />
      </section>
    </main>
  );
}
