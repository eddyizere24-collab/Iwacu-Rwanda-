"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { placesHref, unitHref } from "@/components/office/dossier-types";
import { levelsBelow, tierOf } from "@/lib/office/tier";
import { api, fieldClass, LeaderPhoto, PageTitle, StatusChip, useOffice } from "@/components/office/office-ui";

type Row = {
  unit_id: string; scope_code: string; level: string; name: string; parent_name: string | null;
  leader_name: string | null; leader_title: string | null; leader_phone: string | null; leader_photo: string | null; status: string;
};
const PAGE = 30;

function PlacesInner() {
  const { t, workspace } = useOffice();
  const levels = workspace ? levelsBelow(tierOf(workspace.scope.level)) : [];
  const router = useRouter();
  const sp = useSearchParams();
  const level = sp.get("level") ?? "";
  const under = sp.get("under") ?? "";
  const vacant = sp.get("vacant");
  const urlQ = sp.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setQ(urlQ); }, [urlQ]);
  useEffect(() => { setOffset(0); }, [level, under, vacant, urlQ]);

  useEffect(() => {
    let alive = true;
    const handle = setTimeout(() => {
      const qs = new URLSearchParams();
      if (urlQ) qs.set("q", urlQ);
      if (level) qs.set("level", level);
      if (under) qs.set("under", under);
      if (vacant === "1" || vacant === "0") qs.set("vacant", vacant);
      qs.set("limit", String(PAGE));
      qs.set("offset", String(offset));
      void api<{ units: Row[]; total: number }>("/api/admin/office/search?" + qs.toString()).then((r) => {
        if (!alive) return;
        if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
        setError(null); setRows(r.data.units ?? []); setTotal(r.data.total ?? 0);
      });
    }, 150);
    return () => { alive = false; clearTimeout(handle); };
  }, [urlQ, level, under, vacant, offset, t]);

  useEffect(() => {
    if (q === urlQ) return;
    const h = setTimeout(() => router.replace(placesHref({ level: level || undefined, under: under || undefined, vacant: vacant === "1" ? true : vacant === "0" ? false : undefined, q: q.trim() || undefined })), 350);
    return () => clearTimeout(h);
  }, [q, urlQ, level, under, vacant, router]);

  const chip = (active: boolean) => "min-h-[44px] inline-flex items-center rounded-full px-5 text-sm font-bold " + (active ? "bg-[#20603D] text-white" : "bg-muted text-foreground hover:bg-muted/70");
  const v = vacant === "1" ? true : vacant === "0" ? false : undefined;

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("nav_units")} />

      <input className={fieldClass + " mb-5"} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />

      <div className="mb-3 flex flex-wrap gap-2">
        {["", ...levels].map((l) => (
          <Link key={l || "all"} href={placesHref({ level: l || undefined, under: under || undefined, vacant: v, q: urlQ || undefined })} className={chip(level === l)}>
            {l ? t(levelKey(l, true)) : t("all")}
          </Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href={placesHref({ level: level || undefined, under: under || undefined, q: urlQ || undefined })} className={chip(v === undefined)}>{t("all")}</Link>
        <Link href={placesHref({ level: level || undefined, under: under || undefined, vacant: true, q: urlQ || undefined })} className={chip(v === true)}>{t("filter_vacant")}</Link>
        <Link href={placesHref({ level: level || undefined, under: under || undefined, vacant: false, q: urlQ || undefined })} className={chip(v === false)}>{t("filter_has")}</Link>
        {under && (
          <Link href={placesHref({ level: level || undefined, vacant: v, q: urlQ || undefined })} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#dff2fb] px-4 text-sm font-bold text-[#0a6d96]">
            {t("under")} {under} <X className="h-4 w-4" aria-label={t("clear")} />
          </Link>
        )}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("empty_units")}</p>}
      {rows && rows.length > 0 && <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("results")}: {total}</p>}

      <ul className="space-y-3">
        {(rows ?? []).map((r) => (
          <li key={r.unit_id}>
            <Link href={unitHref(r.scope_code)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm hover:bg-muted/40">
              <LeaderPhoto name={r.leader_name} path={r.leader_photo} size={52} tone={r.status === "vacant" ? "sun" : "forest"} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-[#20603D]">{t(levelKey(r.level))}{r.parent_name ? " · " + r.parent_name : ""}</span>
                <span className="block truncate text-lg font-extrabold text-foreground">{r.name}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {r.level === "province" ? "" : r.leader_name ? [r.leader_name, r.leader_title].filter(Boolean).join(" · ") : t("leader_vacant")}
                </span>
              </span>
              {r.level !== "province" && <StatusChip status={r.status} />}
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {total > PAGE && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className={chip(false) + " disabled:opacity-40"}>{t("prev")}</button>
          <span className="text-sm text-muted-foreground">{offset + 1}–{Math.min(offset + PAGE, total)} {t("of")} {total}</span>
          <button type="button" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)} className={chip(false) + " disabled:opacity-40"}>{t("next")}</button>
        </div>
      )}
    </div>
  );
}

export default function PlacesPage() {
  return <Suspense fallback={null}><PlacesInner /></Suspense>;
}
