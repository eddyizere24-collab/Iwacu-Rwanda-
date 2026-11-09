"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { levelKey, type Key } from "@/lib/office/i18n";
import { api, fieldClass, PageTitle, primaryBtn, Sheet, useOffice, when } from "@/components/office/office-ui";

type Task = {
  id: string; reference: string; title: string; priority: string; due_at: string; status: string; issuer_name: string;
  targets: number; acknowledged: number; in_progress: number; submitted: number; approved: number; returned: number; overdue: number; my_status: string | null;
};
type Target = { unit_id: string; name: string; parent_name: string | null; level: string; leader_name: string | null };
const PRIO: Record<string, string> = { normal: "bg-muted text-foreground", high: "bg-[#fdf3c2] text-[#6b5600]", critical: "bg-red-100 text-red-700" };

export default function TasksPage() {
  const { t, workspace } = useOffice();
  const canIssue = !!workspace?.child_level;
  const [view, setView] = useState<"issued" | "assigned">(canIssue ? "issued" : "assigned");
  const [rows, setRows] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ tasks: Task[] }>("/api/admin/office/tasks?view=" + view);
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
    setError(null); setRows(r.data.tasks ?? []);
  }, [view, t]);
  useEffect(() => { setRows(null); void load(); }, [load]);

  const tab = (a: boolean) => "min-h-[44px] inline-flex items-center rounded-full px-5 text-sm font-bold " + (a ? "bg-[#20603D] text-white" : "bg-muted hover:bg-muted/70");

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("tasks_title")} action={canIssue ? (
        <button type="button" onClick={() => setCreating(true)} className={primaryBtn}><Plus className="h-5 w-5" />{t("new_task")}</button>
      ) : undefined} />
      <div className="mb-6 flex flex-wrap gap-2">
        {canIssue && <button type="button" onClick={() => setView("issued")} className={tab(view === "issued")}>{t("tasks_issued")}</button>}
        <button type="button" onClick={() => setView("assigned")} className={tab(view === "assigned")}>{t("tasks_assigned")}</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("empty_tasks")}</p>}
      <ul className="space-y-4">
        {(rows ?? []).map((k) => {
          const done = k.targets ? Math.round((k.approved / k.targets) * 100) : 0;
          return (
            <li key={k.id}>
              <Link href={"/admin/ibiro/imirimo/" + k.id} className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-[#20603D]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">{k.reference}</span>
                  <span className={"rounded-full px-3 py-1 text-xs font-bold " + (PRIO[k.priority] ?? PRIO.normal)}>{t(("pr_" + k.priority) as Key)}</span>
                  {k.status === "cancelled" && <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{t("task_cancelled")}</span>}
                  {k.overdue > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{t("tasks_overdue")}: {k.overdue}</span>}
                  {view === "assigned" && k.my_status && <span className="rounded-full bg-[#dff2fb] px-3 py-1 text-xs font-bold text-[#0a6d96]">{t(("ts_" + k.my_status) as Key)}</span>}
                </div>
                <h2 className="mt-2 text-lg font-extrabold text-foreground">{k.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("due")}: {when(k.due_at)} · {k.issuer_name}</p>
                {view === "issued" && (
                  <>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full bg-[#20603D]" style={{ width: done + "%" }} /></div>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {t("ts_approved")} {k.approved}/{k.targets} · {t("ts_submitted")} {k.submitted} · {t("ts_in_progress")} {k.in_progress + k.acknowledged} · {t("ts_returned")} {k.returned}
                    </p>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {creating && <CreateSheet onClose={() => setCreating(false)} onDone={() => { setCreating(false); setView("issued"); void load(); }} />}
    </div>
  );
}

function CreateSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t, workspace } = useOffice();
  const child = workspace?.child_level ?? "district";
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "critical">("normal");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void api<{ units: { unit_id: string; name: string; parent_name: string | null; level: string; leader_name: string | null }[] }>("/api/admin/office/search?level=" + child + "&limit=100").then((r) => {
      setTargets((r.data.units ?? []).map((u) => ({ unit_id: u.unit_id, name: u.name, parent_name: u.parent_name, level: u.level, leader_name: u.leader_name })));
    });
  }, [child]);

  function toggle(id: string) { setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  const all = targets !== null && targets.length > 0 && picked.size === targets.length;

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null);
    if (picked.size === 0) { setErr(t("pick_one")); return; }
    setBusy(true);
    const res = await api<{ task_id?: string }>("/api/admin/office/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body: body || null, priority, due_at: new Date(due).toISOString(), unit_ids: [...picked] }),
    });
    setBusy(false);
    if (!res.ok) { setErr(res.data.message_kiny || t("error_generic")); return; }
    onDone();
  }

  return (
    <Sheet title={t("new_task")} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("task_title")}</span>
          <input required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("task_body")}</span>
          <textarea rows={4} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} className={fieldClass + " py-3"} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-bold">{t("priority")}</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={fieldClass}>
              <option value="normal">{t("pr_normal")}</option><option value="high">{t("pr_high")}</option><option value="critical">{t("pr_critical")}</option>
            </select></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">{t("due")}</span>
            <input required type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={fieldClass} /></label>
        </div>
        <fieldset>
          <legend className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
            <span>{t("recipients")} ({t(levelKey(child, true))}) · {picked.size}</span>
            {targets && targets.length > 0 && (
              <button type="button" onClick={() => setPicked(all ? new Set() : new Set(targets.map((x) => x.unit_id)))} className="min-h-[44px] rounded-full bg-muted px-4 text-sm font-bold">{t("select_all")}</button>
            )}
          </legend>
          {targets === null && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {(targets ?? []).map((x) => (
              <li key={x.unit_id}>
                <label className="flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-2">
                  <input type="checkbox" className="h-5 w-5 accent-[#20603D]" checked={picked.has(x.unit_id)} onChange={() => toggle(x.unit_id)} />
                  <span className="min-w-0"><span className="block font-bold">{x.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[x.parent_name, x.leader_name].filter(Boolean).join(" · ")}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button type="submit" disabled={busy} className={primaryBtn + " w-full"}>{busy ? t("saving") : t("send")}</button>
      </form>
    </Sheet>
  );
}
