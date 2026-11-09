"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { levelKey, type Key } from "@/lib/office/i18n";
import { unitHref } from "@/components/office/dossier-types";
import { api, PageTitle, useOffice } from "@/components/office/office-ui";

type Ev = { at: string; kind: string; who: string; unit_name: string; level: string; scope_code: string; detail: string | null };
const PAGE = 40;

export default function AuditPage() {
  const { t, lang } = useOffice();
  const [rows, setRows] = useState<Ev[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void api<{ events: Ev[]; total: number }>("/api/admin/office/audit?limit=" + PAGE + "&offset=" + offset).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
      setError(null); setRows(r.data.events ?? []); setTotal(r.data.total ?? 0);
    });
    return () => { alive = false; };
  }, [offset, t]);

  const fmt = (iso: string) => new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const chip = "min-h-[44px] inline-flex items-center rounded-full bg-muted px-5 text-sm font-bold hover:bg-muted/70 disabled:opacity-40";

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("nav_audit")} />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("empty_audit")}</p>}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {(rows ?? []).map((e, i) => (
          <li key={e.at + i}>
            <Link href={unitHref(e.scope_code)} className="block px-5 py-4 hover:bg-muted/40">
              <span className="block text-base font-bold text-foreground">{t(("ev_" + e.kind) as Key)}</span>
              <span className="block text-base text-foreground">{e.detail ? e.detail + " · " : ""}{t(levelKey(e.level))} {e.unit_name}</span>
              <span className="block text-xs text-muted-foreground">{t("by")} {e.who} · {fmt(e.at)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {total > PAGE && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className={chip}>{t("prev")}</button>
          <span className="text-sm text-muted-foreground">{offset + 1}–{Math.min(offset + PAGE, total)} {t("of")} {total}</span>
          <button type="button" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)} className={chip}>{t("next")}</button>
        </div>
      )}
    </div>
  );
}
