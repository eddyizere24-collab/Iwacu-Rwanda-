"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Phone, Pencil, UserPlus } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { CreateAccountSheet } from "@/components/office/CreateAccountSheet";
import { LeaderEditorSheet } from "@/components/office/LeaderEditorSheet";
import {
  api, LeaderPhoto, PageTitle, quietBtn, StatusChip, unitName, useOffice, type OfficeUnit,
} from "@/components/office/office-ui";

type Crumb = { scope: string | null; label: string };

export default function UnitsPage() {
  const { workspace, t, refresh } = useOffice();
  const [trail, setTrail] = useState<Crumb[]>([]);
  const [units, setUnits] = useState<OfficeUnit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<OfficeUnit | null>(null);
  const [creating, setCreating] = useState<OfficeUnit | null>(null);

  const current = trail.length ? trail[trail.length - 1].scope : null;

  const load = useCallback(async () => {
    setError(null);
    const q = current ? "?parent=" + encodeURIComponent(current) : "";
    const res = await api<{ units: OfficeUnit[] }>("/api/admin/office/units" + q);
    if (!res.ok) { setError(res.data.message_kiny || t("error_generic")); setUnits([]); return; }
    setUnits(res.data.units ?? []);
  }, [current, t]);

  useEffect(() => { setUnits(null); void load(); }, [load]);

  const rootLabel = workspace ? unitName(workspace.scope) : t("breadcrumb_root");

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("nav_units")} />

      <nav aria-label="breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm">
        <button type="button" onClick={() => setTrail([])} className={"rounded-lg px-2 py-1 font-bold " + (trail.length === 0 ? "text-foreground" : "text-[#0a6d96] underline underline-offset-2")}>{rootLabel}</button>
        {trail.map((c, i) => (
          <span key={(c.scope ?? "") + i} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button type="button" onClick={() => setTrail(trail.slice(0, i + 1))} className={"rounded-lg px-2 py-1 font-bold " + (i === trail.length - 1 ? "text-foreground" : "text-[#0a6d96] underline underline-offset-2")}>{c.label}</button>
          </span>
        ))}
      </nav>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {units === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {units && units.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("empty_units")}</p>}

      <ul className="space-y-4">
        {(units ?? []).map((u) => {
          const label = unitName(u);
          const hasCard = u.status !== "vacant";
          return (
            <li key={u.unit_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <LeaderPhoto name={u.leader_name} path={u.leader_photo} size={64} tone={u.status === "vacant" ? "sun" : "forest"} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#20603D]">{t(levelKey(u.level))}</p>
                  <p className="truncate text-lg font-extrabold text-foreground">{label}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {hasCard ? [u.leader_name, u.leader_title].filter(Boolean).join(" · ") : t("status_vacant")}
                  </p>
                </div>
                {u.level !== "province" && <StatusChip status={u.status} />}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {u.child_count > 0 && (
                  <button type="button" onClick={() => setTrail([...trail, { scope: u.scope_code, label }])} className={quietBtn + " !min-h-[44px] text-sm"}>
                    {t("open")} · {u.child_count} <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {u.can_edit && (
                  <button type="button" onClick={() => setEditing(u)} className={quietBtn + " !min-h-[44px] text-sm"}>
                    <Pencil className="h-4 w-4" /> {hasCard ? t("edit") : t("add_leader")}
                  </button>
                )}
                {u.can_create_account && (
                  <button type="button" onClick={() => setCreating(u)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#20603D] px-4 text-sm font-bold text-white hover:bg-[#1b5234]">
                    <UserPlus className="h-4 w-4" /> {t("create_account")}
                  </button>
                )}
                {u.leader_phone && (
                  <a href={"tel:" + u.leader_phone.replace(/\s/g, "")} className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#0a6d96] hover:bg-muted">
                    <Phone className="h-4 w-4" /> {u.leader_phone}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <LeaderEditorSheet unitId={editing.unit_id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); void refresh(); }} />
      )}
      {creating && (
        <CreateAccountSheet
          unitId={creating.unit_id}
          unitLabel={unitName(creating)}
          level={creating.level}
          defaults={{ name: creating.leader_name, title: creating.leader_title, phone: creating.leader_phone }}
          onClose={() => setCreating(null)}
          onCreated={() => { void load(); void refresh(); }}
        />
      )}
    </div>
  );
}
