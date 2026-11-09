"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Phone } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { unitHref } from "@/components/office/dossier-types";
import { api, LeaderPhoto, PageTitle, StatusChip, useOffice, when } from "@/components/office/office-ui";

type Item = {
  unit_id: string; scope_code: string; level: string; unit_name: string; parent_name: string | null; leader_name: string; leader_title: string | null;
  leader_phone: string | null; leader_photo: string | null; status: string; verified_at: string | null; verified_by_name: string | null; updated_at: string;
};
const STATES = ["pending", "verified", "all"] as const;
const LEVELS = ["", "district", "sector", "cell", "village"] as const;
const PAGE = 20;

function VerifyInner() {
  const { t, workspace } = useOffice();
  const sp = useSearchParams();
  const state = (STATES as readonly string[]).includes(sp.get("state") ?? "") ? (sp.get("state") as (typeof STATES)[number]) : "pending";
  const under = sp.get("under") ?? "";
  const [level, setLevel] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ state, limit: String(PAGE), offset: String(offset) });
    if (under) qs.set("under", under);
    if (level) qs.set("level", level);
    const r = await api<{ items: Item[]; total: number }>("/api/admin/office/verification?" + qs.toString());
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setItems([]); return; }
    setError(null); setItems(r.data.items ?? []); setTotal(r.data.total ?? 0);
  }, [state, under, level, offset, t]);
  useEffect(() => { setItems(null); void load(); }, [load]);
  useEffect(() => { setOffset(0); }, [state, under, level]);

  async function toggle(it: Item) {
    setBusy(it.unit_id);
    const r = await api("/api/admin/office/verification", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unit_id: it.unit_id, verified: !it.verified_at }),
    });
    setBusy(null);
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return; }
    await load();
  }

  const href = (s: string) => "/admin/ibiro/isuzuma?state=" + s + (under ? "&under=" + under : "");
  const chip = (a: boolean) => "inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-bold " + (a ? "bg-[#20603D] text-white" : "bg-muted hover:bg-muted/70");
  const myLevel = workspace?.scope.level;

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("vf_title")} hint={t("vf_hint")} />
      <div className="mb-3 flex flex-wrap gap-2">
        {STATES.map((s) => <Link key={s} href={href(s)} className={chip(state === s)}>{t(("vf_" + s) as "vf_pending")}</Link>)}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {LEVELS.filter((l) => l === "" || l !== myLevel).map((l) => (
          <button key={l || "all"} type="button" onClick={() => setLevel(l)} aria-pressed={level === l} className={"min-h-[40px] rounded-full px-4 text-sm font-bold " + (level === l ? "bg-[#06231A] text-white" : "bg-muted hover:bg-muted/70")}>
            {l ? t(levelKey(l, true)) : t("all")}
          </button>
        ))}
        {under && <Link href={href(state).replace("&under=" + under, "")} className="inline-flex min-h-[40px] items-center rounded-full bg-[#dff2fb] px-4 text-sm font-bold text-[#0a6d96]">{t("under")} {under} ×</Link>}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {items === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {items && items.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("vf_empty")}</p>}
      {items && items.length > 0 && <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("results")}: {total}</p>}

      <ul className="space-y-4">
        {(items ?? []).map((it) => (
          <li key={it.unit_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <LeaderPhoto name={it.leader_name} path={it.leader_photo} size={64} />
              <div className="min-w-0 flex-1 basis-56">
                <Link href={unitHref(it.scope_code)} className="block text-lg font-extrabold text-[#0a6d96] underline underline-offset-2">{it.leader_name}</Link>
                {it.leader_title && <p className="text-sm text-muted-foreground">{it.leader_title}</p>}
                <p className="mt-1 text-sm text-foreground">{t(levelKey(it.level))} · <Link href={unitHref(it.scope_code)} className="font-semibold underline underline-offset-2">{it.unit_name}</Link>{it.parent_name ? " · " + it.parent_name : ""}</p>
                {it.leader_phone && <a href={"tel:" + it.leader_phone.replace(/\s/g, "")} className="mt-1 inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-[#0a6d96]"><Phone className="h-4 w-4" />{it.leader_phone}</a>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusChip status={it.status} />
                <span className={"inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold " + (it.verified_at ? "bg-[#e3ede4] text-[#20603D]" : "bg-[#fdf3c2] text-[#6b5600]")}>
                  {it.verified_at && <BadgeCheck className="h-4 w-4" />}{it.verified_at ? t("vf_badge_yes") : t("vf_badge_no")}
                </span>
              </div>
            </div>
            {it.verified_at && <p className="mt-3 text-xs text-muted-foreground">{t("vf_by")} {it.verified_by_name ?? "—"} · {when(it.verified_at)}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" disabled={busy === it.unit_id} onClick={() => void toggle(it)}
                className={"inline-flex min-h-[48px] items-center rounded-xl px-5 text-base font-bold disabled:opacity-60 " + (it.verified_at ? "bg-muted hover:bg-muted/70" : "bg-[#20603D] text-white hover:bg-[#1b5234]")}>
                {it.verified_at ? t("vf_unconfirm") : t("vf_confirm")}
              </button>
              <Link href={unitHref(it.scope_code)} className="inline-flex min-h-[48px] items-center rounded-xl bg-muted px-5 text-base font-bold hover:bg-muted/70">{t("open")}</Link>
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

export default function VerifyPage() {
  return <Suspense fallback={null}><VerifyInner /></Suspense>;
}
