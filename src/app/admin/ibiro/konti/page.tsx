"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, ShieldCheck, ShieldOff, X } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { unitHref } from "@/components/office/dossier-types";
import { api, fieldClass, LeaderPhoto, PageTitle, quietBtn, Sheet, StatusChip, useOffice } from "@/components/office/office-ui";

type Account = {
  user_id: string; display_name: string; job_title: string | null; phone: string | null; login_name: string; role_code: string;
  unit_id: string; scope_code: string; unit_level: string; unit_name: string; parent_name: string | null; status: string; created_at: string;
};
const STATUSES = ["", "invited", "active", "suspended"] as const;
const PAGE = 30;

function PeopleInner() {
  const { t } = useOffice();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "";
  const under = sp.get("under") ?? "";
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Account[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<{ name: string; value: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { setOffset(0); }, [status, under, q]);

  useEffect(() => {
    let alive = true;
    const handle = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (status) qs.set("status", status);
      if (under) qs.set("under", under);
      qs.set("limit", String(PAGE));
      qs.set("offset", String(offset));
      void api<{ accounts: Account[]; total: number }>("/api/admin/office/people?" + qs.toString()).then((r) => {
        if (!alive) return;
        if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
        setError(null); setRows(r.data.accounts ?? []); setTotal(r.data.total ?? 0);
      });
    }, 200);
    return () => { alive = false; clearTimeout(handle); };
  }, [q, status, under, offset, tick, t]);

  const act = useCallback(async (a: Account, action: "suspend" | "resume" | "reset") => {
    if (action === "reset" && !window.confirm(t("confirm_reset"))) return;
    if (action === "suspend" && !window.confirm(t("confirm_suspend"))) return;
    setBusy(a.user_id);
    const res = await api<{ temp_password?: string }>("/api/admin/office/people/" + a.user_id, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!res.ok) { setError(res.data.message_kiny || t("error_generic")); return; }
    if (res.data.temp_password) setPassword({ name: a.display_name, value: res.data.temp_password });
    setTick((n) => n + 1);
  }, [t]);

  const href = (s: string, u: string) => {
    const qs = new URLSearchParams();
    if (s) qs.set("status", s);
    if (u) qs.set("under", u);
    const str = qs.toString();
    return "/admin/ibiro/konti" + (str ? "?" + str : "");
  };
  const chip = (active: boolean) => "min-h-[44px] inline-flex items-center rounded-full px-5 text-sm font-bold " + (active ? "bg-[#20603D] text-white" : "bg-muted text-foreground hover:bg-muted/70");
  const label = (s: string) => (s === "" ? t("all") : s === "invited" ? t("filter_invited") : s === "active" ? t("filter_signed") : t("filter_suspended"));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("nav_accounts")} hint={t("manage_access")} />
      <input className={fieldClass + " mb-5"} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => <Link key={s || "all"} href={href(s, under)} className={chip(status === s)}>{label(s)}</Link>)}
        {under && (
          <Link href={href(status, "")} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#dff2fb] px-4 text-sm font-bold text-[#0a6d96]">
            {t("under")} {under} <X className="h-4 w-4" aria-label={t("clear")} />
          </Link>
        )}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("empty_people")}</p>}
      {rows && rows.length > 0 && <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("results")}: {total}</p>}

      <ul className="space-y-3">
        {(rows ?? []).map((a) => (
          <li key={a.user_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <LeaderPhoto name={a.display_name} path={null} size={52} />
              <div className="min-w-0 flex-1 basis-52">
                <p className="truncate text-lg font-extrabold">{a.display_name}</p>
                <Link href={unitHref(a.scope_code)} className="block truncate text-sm font-semibold text-[#0a6d96] underline underline-offset-2">
                  {t(levelKey(a.unit_level))} · {a.unit_name}{a.parent_name ? " · " + a.parent_name : ""}
                </Link>
                <p className="text-xs text-muted-foreground">{t("login_name")}: <span className="font-mono">{a.login_name}</span></p>
              </div>
              <StatusChip status={a.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {a.phone && <a href={"tel:" + a.phone.replace(/\s/g, "")} className={quietBtn + " !min-h-[44px] text-sm"}>{t("call")} · {a.phone}</a>}
              <button type="button" disabled={busy === a.user_id} onClick={() => void act(a, "reset")} className={quietBtn + " !min-h-[44px] text-sm"}><KeyRound className="h-4 w-4" /> {t("reset_access")}</button>
              {a.status === "suspended"
                ? <button type="button" disabled={busy === a.user_id} onClick={() => void act(a, "resume")} className={quietBtn + " !min-h-[44px] text-sm"}><ShieldCheck className="h-4 w-4" /> {t("resume")}</button>
                : <button type="button" disabled={busy === a.user_id} onClick={() => void act(a, "suspend")} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold text-red-700 hover:bg-red-50"><ShieldOff className="h-4 w-4" /> {t("suspend")}</button>}
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

      {password && (
        <Sheet title={t("new_password") + " · " + password.name} onClose={() => setPassword(null)}>
          <div className="space-y-4">
            <p className="select-all rounded-2xl bg-[#e3ede4] p-5 font-mono text-xl font-extrabold tracking-wider">{password.value}</p>
            <p className="text-sm text-muted-foreground">{t("shown_once")}</p>
            <button type="button" onClick={() => setPassword(null)} className={quietBtn + " w-full"}>{t("close")}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return <Suspense fallback={null}><PeopleInner /></Suspense>;
}
