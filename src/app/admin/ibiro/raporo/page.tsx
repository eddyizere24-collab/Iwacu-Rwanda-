"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { levelKey } from "@/lib/office/i18n";
import { placesHref, unitHref } from "@/components/office/dossier-types";
import { api, PageTitle, StatusChip, useOffice } from "@/components/office/office-ui";

type Row = {
  unit_id: string; scope_code: string; level: string; name: string; leader_name: string | null; leader_status: string;
  units_below: number; cards: number; accounts: number; signed_in: number; verified: number; open_cases: number; overdue_tasks: number; records: number;
};

const NEXT: Record<string, string | null> = { district: "sector", sector: "cell", cell: "village", village: null };

function Num({ href, value, tone }: { href: string; value: number; tone?: "warn" | "ok" }) {
  return (
    <Link href={href} className={"inline-flex min-h-[40px] min-w-[3rem] items-center justify-center rounded-lg px-2 text-base font-extrabold hover:bg-muted " + (tone === "warn" && value > 0 ? "text-red-700" : "text-[#0a6d96]")}>
      {value}
    </Link>
  );
}

function ReportInner() {
  const { t } = useOffice();
  const sp = useSearchParams();
  const scope = sp.get("scope") ?? "";
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    void api<{ rows: Row[] }>("/api/admin/office/report" + (scope ? "?scope=" + encodeURIComponent(scope) : "")).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
      setError(null); setRows(r.data.rows ?? []);
    });
    return () => { alive = false; };
  }, [scope, t]);

  const sum = (k: keyof Row) => (rows ?? []).reduce((n, r) => n + (Number(r[k]) || 0), 0);
  const level = rows?.[0]?.level;
  const totals = rows && rows.length > 0 ? [
    { k: "rp_below", v: sum("units_below") }, { k: "rp_cards", v: sum("cards") }, { k: "rp_accounts", v: sum("accounts") },
    { k: "rp_signed", v: sum("signed_in") }, { k: "rp_verified", v: sum("verified") }, { k: "rp_cases", v: sum("open_cases") },
    { k: "rp_overdue", v: sum("overdue_tasks") }, { k: "rp_records", v: sum("records") },
  ] as const : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title={t("report_title") + (level ? " · " + t(levelKey(level, true)) : "")} hint={t("report_hint")} />
      {scope && <Link href={unitHref(scope)} className="mb-5 inline-flex min-h-[44px] items-center rounded-full bg-muted px-4 text-sm font-bold text-[#0a6d96] hover:bg-muted/70">{scope}</Link>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("rp_none")}</p>}

      {totals.length > 0 && (
        <section aria-label={t("rp_total")} className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {totals.map((x) => (
            <div key={x.k} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-2xl font-extrabold text-[#20603D]">{x.v}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{t(x.k)}</p>
            </div>
          ))}
        </section>
      )}

      {/* Wide screens: a table. Phones: one card per place. Every number is a link. */}
      {rows && rows.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm lg:block">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t(levelKey(rows[0].level))}</th>
                  {(["rp_below", "rp_cards", "rp_accounts", "rp_signed", "rp_verified", "rp_cases", "rp_overdue", "rp_records"] as const).map((k) => <th key={k} className="px-2 py-3 text-center">{t(k)}</th>)}
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.unit_id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link href={unitHref(r.scope_code)} className="font-extrabold text-[#0a6d96] underline underline-offset-2">{r.name}</Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{r.leader_name ?? t("leader_vacant")}<StatusChip status={r.leader_status} /></div>
                    </td>
                    <td className="px-2 text-center"><Num href={placesHref({ under: r.scope_code })} value={r.units_below} /></td>
                    <td className="px-2 text-center"><Num href={placesHref({ under: r.scope_code, vacant: false })} value={r.cards} /></td>
                    <td className="px-2 text-center"><Num href={"/admin/ibiro/konti?under=" + r.scope_code} value={r.accounts} /></td>
                    <td className="px-2 text-center"><Num href={"/admin/ibiro/konti?status=active&under=" + r.scope_code} value={r.signed_in} /></td>
                    <td className="px-2 text-center"><Num href={"/admin/ibiro/isuzuma?state=verified&under=" + r.scope_code} value={r.verified} /></td>
                    <td className="px-2 text-center"><Num href={"/admin/ibiro/ibibazo?status=open&scope=" + r.scope_code} value={r.open_cases} tone="warn" /></td>
                    <td className="px-2 text-center"><Num href="/admin/ibiro/imirimo" value={r.overdue_tasks} tone="warn" /></td>
                    <td className="px-2 text-center"><Num href={"/admin/ibiro/inyandiko?under=" + r.scope_code} value={r.records} /></td>
                    <td className="px-3 py-3 text-right">{NEXT[r.level] && <Link href={"/admin/ibiro/raporo?scope=" + r.scope_code} className="whitespace-nowrap text-sm font-bold text-[#0a6d96] underline underline-offset-2">{t("report_open_below")}</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-4 lg:hidden">
            {rows.map((r) => (
              <li key={r.unit_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={unitHref(r.scope_code)} className="text-lg font-extrabold text-[#0a6d96] underline underline-offset-2">{r.name}</Link>
                  <StatusChip status={r.leader_status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.leader_name ?? t("leader_vacant")}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {([
                    ["rp_below", r.units_below, placesHref({ under: r.scope_code }), undefined],
                    ["rp_cards", r.cards, placesHref({ under: r.scope_code, vacant: false }), undefined],
                    ["rp_accounts", r.accounts, "/admin/ibiro/konti?under=" + r.scope_code, undefined],
                    ["rp_signed", r.signed_in, "/admin/ibiro/konti?status=active&under=" + r.scope_code, undefined],
                    ["rp_verified", r.verified, "/admin/ibiro/isuzuma?state=verified&under=" + r.scope_code, undefined],
                    ["rp_cases", r.open_cases, "/admin/ibiro/ibibazo?status=open&scope=" + r.scope_code, "warn"],
                    ["rp_overdue", r.overdue_tasks, "/admin/ibiro/imirimo", "warn"],
                    ["rp_records", r.records, "/admin/ibiro/inyandiko?under=" + r.scope_code, undefined],
                  ] as const).map(([k, v, href, tone]) => (
                    <div key={k} className="flex items-center justify-between border-b border-border/60 py-1"><dt className="text-muted-foreground">{t(k)}</dt><dd><Num href={href} value={v} tone={tone} /></dd></div>
                  ))}
                </dl>
                {NEXT[r.level] && <Link href={"/admin/ibiro/raporo?scope=" + r.scope_code} className="mt-3 inline-block min-h-[44px] text-sm font-bold text-[#0a6d96] underline underline-offset-2">{t("report_open_below")}</Link>}
              </li>
            ))}
          </ul>
          <details className="mt-6 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-bold text-foreground">{t("def_title")}</summary>
            <p className="mt-2 leading-6">{t("report_def")}</p>
          </details>
        </>
      )}
    </div>
  );
}

export default function ReportPage() {
  return <Suspense fallback={null}><ReportInner /></Suspense>;
}
