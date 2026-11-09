"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { LeaderEditorSheet } from "@/components/office/LeaderEditorSheet";
import { api, fieldClass, LeaderPhoto, PageTitle, StatusChip, useOffice, type LeaderRow } from "@/components/office/office-ui";

const LEVELS = ["", "district", "sector", "cell", "village"] as const;

export default function LeadersPage() {
  const { t, refresh } = useOffice();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("");
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const handle = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (level) qs.set("level", level);
      void api<{ leaders: LeaderRow[] }>("/api/admin/office/leaders?" + qs.toString()).then((r) => {
        if (!alive) return;
        if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
        setError(null);
        setRows(r.data.leaders ?? []);
      });
    }, 250);
    return () => { alive = false; clearTimeout(handle); };
  }, [q, level, tick, t]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title={t("nav_leaders")} />

      <div className="mb-6 space-y-4">
        <input className={fieldClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button key={l || "all"} type="button" onClick={() => setLevel(l)} aria-pressed={level === l}
              className={"min-h-[44px] rounded-full px-5 text-sm font-bold " + (level === l ? "bg-[#20603D] text-white" : "bg-muted text-foreground")}>
              {l ? t(levelKey(l, true)) : t("all")}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {rows === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {rows && rows.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("empty_leaders")}</p>}

      {rows && rows.length > 0 && (
        <>
          {/* Wide screens: a real table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t("table_name")}</th>
                  <th className="px-3 py-3">{t("table_place")}</th>
                  <th className="px-3 py-3">{t("table_level")}</th>
                  <th className="px-3 py-3">{t("table_phone")}</th>
                  <th className="px-3 py-3">{t("table_status")}</th>
                  <th className="px-3 py-3"><span className="sr-only">{t("edit")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.unit_id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <LeaderPhoto name={r.leader_name} path={r.leader_photo} size={44} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-foreground">{r.leader_name}</p>
                          {r.leader_title && <p className="truncate text-xs text-muted-foreground">{r.leader_title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{r.unit_name}{r.parent_name && <span className="block text-xs text-muted-foreground">{r.parent_name}</span>}</td>
                    <td className="px-3 py-3">{t(levelKey(r.level))}</td>
                    <td className="px-3 py-3">{r.leader_phone ? <a className="font-semibold text-[#0a6d96]" href={"tel:" + r.leader_phone.replace(/\s/g, "")}>{r.leader_phone}</a> : "—"}</td>
                    <td className="px-3 py-3"><StatusChip status={r.status} /></td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => setEditing(r.unit_id)} aria-label={t("edit")} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per leader */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.unit_id}>
                <button type="button" onClick={() => setEditing(r.unit_id)} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
                  <LeaderPhoto name={r.leader_name} path={r.leader_photo} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-extrabold text-foreground">{r.leader_name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{t(levelKey(r.level))} · {r.unit_name}</span>
                    {r.leader_phone && <span className="block truncate text-sm font-semibold text-[#0a6d96]">{r.leader_phone}</span>}
                  </span>
                  <StatusChip status={r.status} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && <LeaderEditorSheet unitId={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setTick((n) => n + 1); void refresh(); }} />}
    </div>
  );
}
