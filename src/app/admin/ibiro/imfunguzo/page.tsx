"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { api, PageTitle, useOffice, when } from "@/components/office/office-ui";

type LevelRow = { level: "district" | "sector" | "cell"; is_set: boolean; set_at: string | null };
const LEVELS = ["district", "sector", "cell"] as const;

export default function EntryKeysPage() {
  const { t } = useOffice();
  const [rows, setRows] = useState<LevelRow[] | null>(null);
  const [which, setWhich] = useState<"all" | "district" | "sector" | "cell">("all");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ levels: LevelRow[] }>("/api/admin/office/entry-keys");
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setRows([]); return; }
    setRows(r.data.levels ?? []);
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setDone(false);
    const r = await api<{ levels: string[] }>("/api/admin/office/entry-keys", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: which, key }),
    });
    setBusy(false);
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return; }
    setKey(""); setDone(true);
    await load();
  }

  const choices: { id: typeof which; label: string }[] = [
    { id: "all", label: t("ek_all") },
    ...LEVELS.map((l) => ({ id: l, label: t(levelKey(l)) })),
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("ek_title")} hint={t("ek_hint")} />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {done && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{t("ek_saved")}</p>}

      <ul className="mb-6 space-y-2">
        {rows === null && <li className="text-base text-muted-foreground">{t("loading")}</li>}
        {rows?.map((r) => (
          <li key={r.level} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="text-lg font-extrabold text-foreground">{t(levelKey(r.level))}</span>
            <span className={"text-sm font-bold " + (r.is_set ? "text-[#20603D]" : "text-red-700")}>
              {r.is_set ? t("ek_set") + (r.set_at ? " · " + when(r.set_at) : "") : t("ek_not_set")}
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {choices.map((c) => (
            <button key={c.id} type="button" onClick={() => setWhich(c.id)} aria-pressed={which === c.id}
              className={"min-h-[48px] rounded-xl border text-base font-bold " + (which === c.id ? "border-[#20603D] bg-[#20603D] text-white" : "border-border bg-background")}>
              {c.label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="ek-key" className="mb-1.5 block text-sm font-semibold text-foreground">{t("ek_key")}</label>
          <input id="ek-key" inputMode="numeric" pattern="[0-9]{6,16}" minLength={6} maxLength={16} required autoComplete="off"
            value={key} onChange={(e) => setKey(e.target.value.replace(/[^0-9]/g, ""))}
            className="min-h-[52px] w-full rounded-xl border border-input bg-background px-4 font-mono text-xl tracking-widest outline-none focus:ring-2 focus:ring-[#00A3E0]" />
          <p className="mt-1.5 text-xs text-muted-foreground">{t("ek_rule")}</p>
        </div>
        <button type="submit" disabled={busy || key.length < 6}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 text-base font-bold text-white disabled:opacity-60">
          <KeyRound className="h-5 w-5" /> {busy ? t("loading") : t("ek_save")}
        </button>
      </form>
    </div>
  );
}
