"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { levelKey, type Key } from "@/lib/office/i18n";
import { unitHref } from "@/components/office/dossier-types";
import { api, PageTitle, useOffice, when } from "@/components/office/office-ui";

type Case = {
  id: string; category: string; message: string; status: string; created_at: string; scope_code: string; level: string;
  unit_name: string; parent_name: string | null; leader_name: string | null;
};
const STATUSES = ["open", "new", "reviewing", "resolved", "rejected"] as const;
const PAGE = 20;
const TONE: Record<string, string> = {
  new: "bg-[#fdf3c2] text-[#6b5600]", reviewing: "bg-[#dff2fb] text-[#0a6d96]", resolved: "bg-[#e3ede4] text-[#20603D]", rejected: "bg-muted text-muted-foreground",
};

function CasesInner() {
  const { t } = useOffice();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "open";
  const scope = sp.get("scope") ?? "";
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Case[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { setOffset(0); }, [status, scope]);
  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams();
    qs.set("status", status);
    if (scope) qs.set("scope", scope);
    qs.set("limit", String(PAGE));
    qs.set("offset", String(offset));
    void api<{ cases: Case[]; total: number }>("/api/admin/office/cases?" + qs.toString()).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
      setError(null); setRows(r.data.cases ?? []); setTotal(r.data.total ?? 0);
    });
    return () => { alive = false; };
  }, [status, scope, offset, tick, t]);

  async function setStatus(id: string, next: string) {
    const res = await api<{ status: string }>("/api/admin/office/cases", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }),
    });
    if (!res.ok) { setError(res.data.message_kiny || t("error_generic")); return; }
    setTick((n) => n + 1);
  }

  const href = (s: string, sc: string) => "/admin/ibiro/ibibazo?status=" + s + (sc ? "&scope=" + sc : "");
  const chip = (active: boolean) => "min-h-[44px] inline-flex items-center rounded-full px-5 text-sm font-bold " + (active ? "bg-[#20603D] text-white" : "bg-muted text-foreground hover:bg-muted/70");
  const statusLabel = (s: string) => (s === "open" ? t("case_open") : t(("cs_" + s) as Key));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("cases_title")} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => <Link key={s} href={href(s, scope)} className={chip(status === s)}>{statusLabel(s)}</Link>)}
        {scope && (
          <Link href={href(status, "")} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#dff2fb] px-4 text-sm font-bold text-[#0a6d96]">
            {t("under")} {scope} <X className="h-4 w-4" aria-label={t("clear")} />
          </Link>
        )}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("empty_cases")}</p>}
      {rows && rows.length > 0 && <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("results")}: {total}</p>}

      <ul className="space-y-4">
        {(rows ?? []).map((c) => (
          <li key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[#20603D]">{t(("cat_" + c.category) as Key)}</span>
              <span className={"rounded-full px-3 py-1 text-xs font-bold " + (TONE[c.status] ?? TONE.new)}>{t(("cs_" + c.status) as Key)}</span>
              <span className="ml-auto text-xs text-muted-foreground">{when(c.created_at)}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-foreground">{c.message}</p>
            <Link href={unitHref(c.scope_code)} className="mt-3 inline-block text-sm font-semibold text-[#0a6d96] underline underline-offset-2">
              {t(levelKey(c.level))} · {c.unit_name}{c.parent_name ? " · " + c.parent_name : ""}{c.leader_name ? " · " + c.leader_name : ""}
            </Link>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["reviewing", "resolved", "rejected", "new"] as const).filter((s) => s !== c.status).map((s) => (
                <button key={s} type="button" onClick={() => void setStatus(c.id, s)} className="min-h-[44px] rounded-xl bg-muted px-4 text-sm font-bold hover:bg-muted/70">{t(("cs_" + s) as Key)}</button>
              ))}
            </div>
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

export default function CasesPage() {
  return <Suspense fallback={null}><CasesInner /></Suspense>;
}
