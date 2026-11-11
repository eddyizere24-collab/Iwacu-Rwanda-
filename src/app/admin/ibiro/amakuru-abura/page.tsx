"use client";

import { useCallback, useEffect, useState } from "react";
import { levelKey, type Key } from "@/lib/office/i18n";
import { api, PageTitle, useOffice, when } from "@/components/office/office-ui";

type GapAlert = {
  alert_id: string;
  gap_type: "leader_missing" | "contact_missing" | "place_not_found" | "capability_data_missing";
  scope_code: string;
  place_name: string;
  place_level: string;
  destination_scope_code: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  status: "new" | "reviewing" | "resolved";
};

const GAP_KEY: Record<GapAlert["gap_type"], Key> = {
  leader_missing: "gap_leader_missing",
  contact_missing: "gap_contact_missing",
  place_not_found: "gap_place_not_found",
  capability_data_missing: "gap_data_missing",
};

/** Questions people asked the assistant that it could not answer from verified data, routed to the office that owns that place. */
export default function GapsPage() {
  const { t } = useOffice();
  const [alerts, setAlerts] = useState<GapAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ alerts: GapAlert[] }>("/api/admin/office/gaps");
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setAlerts([]); return; }
    setError(null); setAlerts(r.data.alerts ?? []);
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  async function update(alert: GapAlert, status: "reviewing" | "resolved") {
    const r = await api("/api/admin/office/gaps", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alert_id: alert.alert_id, status }),
    });
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return; }
    setAlerts((rows) => (rows ?? []).map((a) => (a.alert_id === alert.alert_id ? { ...a, status } : a)));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("gap_title")} hint={t("gap_hint")} />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {alerts === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {alerts && alerts.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("gap_none")}</p>}
      <ul className="space-y-3">
        {alerts?.map((a) => (
          <li key={a.alert_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-extrabold text-foreground">{t(GAP_KEY[a.gap_type])}</p>
                <p className="mt-1 text-base font-semibold text-[#20603D]">{a.place_name}</p>
                <p className="text-sm text-muted-foreground">{t(levelKey(a.place_level))} · {a.scope_code}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t("gap_seen")} {a.occurrences.toLocaleString("rw-RW")} · {when(a.last_seen_at)}</p>
              </div>
              <span className={"shrink-0 rounded-full px-3 py-1 text-xs font-bold " + (a.status === "new" ? "bg-[#FCE9D7] text-[#8A4710]" : a.status === "reviewing" ? "bg-[#DFF2FB] text-[#0A5B7D]" : "bg-[#E3EDE4] text-[#20603D]")}>
                {a.status === "new" ? t("gap_new") : a.status === "reviewing" ? t("gap_reviewing") : t("gap_resolved")}
              </span>
            </div>
            {a.status !== "resolved" && (
              <button type="button" onClick={() => void update(a, a.status === "new" ? "reviewing" : "resolved")}
                className="mt-4 min-h-[48px] w-full rounded-xl bg-[#20603D] px-4 text-base font-bold text-white">
                {a.status === "new" ? t("gap_start") : t("gap_confirm")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
