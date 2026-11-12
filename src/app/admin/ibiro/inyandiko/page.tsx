"use client";

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { levelKey, type Key } from "@/lib/office/i18n";
import { unitHref } from "@/components/office/dossier-types";
import { api, fieldClass, PageTitle, primaryBtn, quietBtn, Sheet, useOffice, when } from "@/components/office/office-ui";

type Rec = {
  id: string; title: string; kind: string; note: string | null; file_name: string | null; size_bytes: number | null; has_file: boolean;
  created_at: string; created_by_name: string | null; unit_id: string; scope_code: string; level: string; unit_name: string; can_archive: boolean;
};
const KINDS = ["decision", "report", "minutes", "circular", "other"] as const;
const PAGE = 20;
const size = (n: number | null) => (n ? (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB") : "");

function RecordsInner() {
  const { t } = useOffice();
  const sp = useSearchParams();
  const under = sp.get("under") ?? "";
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Rec[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (kind) qs.set("kind", kind);
    if (q.trim()) qs.set("q", q.trim());
    if (under) qs.set("under", under);
    const r = await api<{ records: Rec[]; total: number }>("/api/admin/office/records?" + qs.toString());
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
    setError(null); setRows(r.data.records ?? []); setTotal(r.data.total ?? 0);
  }, [kind, q, under, offset, t]);
  useEffect(() => { const h = setTimeout(() => void load(), 250); return () => clearTimeout(h); }, [load]);
  useEffect(() => { setOffset(0); }, [kind, q, under]);

  async function openFile(id: string) {
    const r = await api<{ url?: string }>("/api/admin/office/records/" + id + "/file");
    if (!r.ok || !r.data.url) { setError(r.data.message_kiny || t("error_generic")); return; }
    window.open(r.data.url, "_blank", "noopener");
  }
  async function archive(id: string) {
    if (!window.confirm(t("confirm_archive"))) return;
    const r = await api("/api/admin/office/records/" + id, { method: "DELETE" });
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return; }
    await load();
  }

  const chip = (a: boolean) => "inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-bold " + (a ? "bg-[#20603D] text-white" : "bg-muted hover:bg-muted/70");

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("rec_title")} hint={t("rec_hint")} action={<button type="button" onClick={() => setAdding(true)} className={primaryBtn}><Plus className="h-5 w-5" />{t("rec_new")}</button>} />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rec_search")} aria-label={t("rec_search")} className={fieldClass + " mb-4"} />
      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setKind("")} aria-pressed={kind === ""} className={chip(kind === "")}>{t("rec_kinds_all")}</button>
        {KINDS.map((k) => <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={chip(kind === k)}>{t(("rk_" + k) as Key)}</button>)}
        {under && <Link href="/admin/ibiro/inyandiko" className="inline-flex min-h-[44px] items-center rounded-full bg-[#dff2fb] px-4 text-sm font-bold text-[#0a6d96]">{t("under")} {under} ×</Link>}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("rec_empty")}</p>}
      {rows && rows.length > 0 && <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("results")}: {total}</p>}

      <ul className="space-y-4">
        {(rows ?? []).map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#e3ede4] px-3 py-1 text-xs font-bold text-[#20603D]">{t(("rk_" + r.kind) as Key)}</span>
              <span className="ml-auto text-xs text-muted-foreground">{when(r.created_at)}{r.created_by_name ? " · " + r.created_by_name : ""}</span>
            </div>
            <h2 className="mt-2 text-lg font-extrabold text-foreground">{r.title}</h2>
            {r.note && <p className="mt-1 whitespace-pre-wrap text-base leading-7 text-foreground">{r.note}</p>}
            <p className="mt-2 text-sm text-muted-foreground">{t("rec_unit")}: <Link href={unitHref(r.scope_code)} className="font-semibold text-[#0a6d96] underline underline-offset-2">{t(levelKey(r.level))} · {r.unit_name}</Link></p>
            <div className="mt-4 flex flex-wrap gap-3">
              {r.has_file && <button type="button" onClick={() => void openFile(r.id)} className={quietBtn}><FileText className="h-4 w-4" />{t("rec_open")} {r.file_name ? "· " + r.file_name : ""} {size(r.size_bytes) ? "(" + size(r.size_bytes) + ")" : ""}</button>}
              {r.can_archive && <button type="button" onClick={() => void archive(r.id)} className="inline-flex min-h-[48px] items-center rounded-xl px-5 text-base font-bold text-red-700 hover:bg-red-50">{t("rec_archive")}</button>}
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
      {adding && <AddSheet onClose={() => setAdding(false)} onDone={() => { setAdding(false); void load(); }} />}
    </div>
  );
}

function AddSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t, workspace } = useOffice();
  const own = workspace?.scope;
  const [places, setPlaces] = useState<{ id: string; label: string }[]>(own ? [{ id: own.unit_id, label: t(levelKey(own.level)) + " · " + (own.name_kiny || own.name_eng || "") }] : []);
  const [unit, setUnit] = useState(own?.unit_id ?? "");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("report");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void api<{ units: { unit_id: string; name_kiny: string | null; name_eng: string | null; level: string }[] }>("/api/admin/office/units").then((r) => {
      if (!r.ok || !own || own.level === "country") return;
      setPlaces([{ id: own.unit_id, label: t(levelKey(own.level)) + " · " + (own.name_kiny || own.name_eng || "") }, ...(r.data.units ?? []).map((u) => ({ id: u.unit_id, label: t(levelKey(u.level)) + " · " + (u.name_kiny || u.name_eng || "") }))]);
    });
  }, [own, t]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    const fd = new FormData();
    fd.set("unit_id", unit); fd.set("title", title); fd.set("kind", kind); fd.set("note", note);
    if (file) fd.set("file", file);
    const r = await api("/api/admin/office/records", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) { setErr(r.data.message_kiny || t("error_generic")); return; }
    onDone();
  }

  return (
    <Sheet title={t("rec_new")} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("rec_name")}</span>
          <input required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-bold">{t("rec_kind")}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={fieldClass}>{KINDS.map((k) => <option key={k} value={k}>{t(("rk_" + k) as Key)}</option>)}</select></label>
          {places.length > 1 && (
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("rec_unit")}</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={fieldClass}>{places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
          )}
        </div>
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("rec_note")}</span>
          <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass + " py-3"} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("rec_attach")}</span>
          <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={fieldClass + " py-2"} /></label>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button type="submit" disabled={busy || !unit} className={primaryBtn + " w-full"}>{busy ? t("saving") : t("save")}</button>
      </form>
    </Sheet>
  );
}

export default function RecordsPage() {
  return <Suspense fallback={null}><RecordsInner /></Suspense>;
}
