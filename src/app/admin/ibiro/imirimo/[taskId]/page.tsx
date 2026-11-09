"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { levelKey, type Key } from "@/lib/office/i18n";
import { unitHref } from "@/components/office/dossier-types";
import { api, fieldClass, primaryBtn, quietBtn, useOffice, when } from "@/components/office/office-ui";

type TaskT = {
  id: string; reference: string; title: string; body: string | null; priority: string; due_at: string; status: string;
  issuer_name: string; issuer_unit: string; can_cancel: boolean;
};
type Tgt = {
  unit_id: string; scope_code: string; level: string; name: string; parent_name: string | null; leader_name: string | null;
  status: string; note: string | null; review_note: string | null; submitted_at: string | null; overdue: boolean; can_review: boolean; can_update: boolean;
};
type Detail = { task: TaskT; targets: Tgt[] };

export default function TaskDetailPage() {
  const { t } = useOffice();
  const { taskId } = useParams<{ taskId: string }>();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ detail: Detail }>("/api/admin/office/tasks/" + taskId);
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return; }
    setError(null); setD(r.data.detail);
  }, [taskId, t]);
  useEffect(() => { void load(); }, [load]);

  async function act(unitId: string, status: string) {
    setBusy(unitId + status);
    const r = await api("/api/admin/office/tasks/" + taskId, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_id: unitId, status, note: notes[unitId] || null }),
    });
    setBusy(null);
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return; }
    setNotes((n) => ({ ...n, [unitId]: "" }));
    await load();
  }
  async function cancel() {
    setBusy("cancel");
    const r = await api("/api/admin/office/tasks/" + taskId, { method: "DELETE" });
    setBusy(null);
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return; }
    await load();
  }

  const task = d?.task;
  const counts = (d?.targets ?? []).reduce<Record<string, number>>((m, x) => { m[x.status] = (m[x.status] ?? 0) + 1; return m; }, {});

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/ibiro/imirimo" className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-[#0a6d96]"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!d && !error && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {task && (
        <>
          <header className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground">{task.reference} · {t(("pr_" + task.priority) as Key)}{task.status === "cancelled" ? " · " + t("task_cancelled") : ""}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-foreground">{task.title}</h1>
            {task.body && <p className="mt-3 whitespace-pre-wrap text-base leading-7">{task.body}</p>}
            <p className="mt-3 text-sm text-muted-foreground">{t("due")}: {when(task.due_at)} · {task.issuer_name} · {task.issuer_unit}</p>
            <p className="mt-3 text-sm font-semibold">
              {(["assigned", "acknowledged", "in_progress", "submitted", "returned", "approved"] as const).map((s) => t(("ts_" + s) as Key) + " " + (counts[s] ?? 0)).join(" · ")}
            </p>
            {task.can_cancel && <button type="button" disabled={busy === "cancel"} onClick={() => void cancel()} className={quietBtn + " mt-4"}>{t("act_cancel")}</button>}
          </header>

          <ul className="space-y-4">
            {(d?.targets ?? []).map((x) => (
              <li key={x.unit_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={unitHref(x.scope_code)} className="text-lg font-extrabold text-[#0a6d96] underline underline-offset-2">{x.name}</Link>
                  <span className="text-sm text-muted-foreground">{t(levelKey(x.level))}{x.parent_name ? " · " + x.parent_name : ""}</span>
                  <span className={"ml-auto rounded-full px-3 py-1 text-xs font-bold " + (x.overdue ? "bg-red-100 text-red-700" : x.status === "approved" ? "bg-[#e3ede4] text-[#20603D]" : "bg-[#dff2fb] text-[#0a6d96]")}>{t(("ts_" + x.status) as Key)}</span>
                </div>
                {x.leader_name && <p className="mt-1 text-sm text-muted-foreground">{x.leader_name}</p>}
                {x.note && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{x.note}</p>}
                {x.review_note && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#fdf3c2] p-3 text-sm"><b>{t("review_note")}:</b> {x.review_note}</p>}
                {x.submitted_at && <p className="mt-2 text-xs text-muted-foreground">{t("ts_submitted")}: {when(x.submitted_at)}</p>}

                {task.status === "open" && (x.can_update || x.can_review) && (
                  <div className="mt-4 space-y-3">
                    <textarea rows={2} maxLength={2000} placeholder={t("note")} value={notes[x.unit_id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [x.unit_id]: e.target.value }))} className={fieldClass + " py-3"} />
                    <div className="flex flex-wrap gap-2">
                      {x.can_update && x.status === "assigned" && <button type="button" disabled={!!busy} onClick={() => void act(x.unit_id, "acknowledged")} className={quietBtn}>{t("act_ack")}</button>}
                      {x.can_update && (x.status === "assigned" || x.status === "acknowledged" || x.status === "returned") && <button type="button" disabled={!!busy} onClick={() => void act(x.unit_id, "in_progress")} className={quietBtn}>{t("act_start")}</button>}
                      {x.can_update && x.status !== "submitted" && x.status !== "approved" && <button type="button" disabled={!!busy} onClick={() => void act(x.unit_id, "submitted")} className={primaryBtn}>{t("act_submit")}</button>}
                      {x.can_review && <button type="button" disabled={!!busy} onClick={() => void act(x.unit_id, "approved")} className={primaryBtn}>{t("act_approve")}</button>}
                      {x.can_review && <button type="button" disabled={!!busy} onClick={() => void act(x.unit_id, "returned")} className={quietBtn}>{t("act_return")}</button>}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
