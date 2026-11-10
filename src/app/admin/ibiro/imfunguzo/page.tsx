"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { api, PageTitle, Sheet, useOffice, when } from "@/components/office/office-ui";

type Place = { unit_id: string; scope_code: string; level: string; name: string; has_key: boolean; last_event_at: string | null; last_action: string | null };
type Issued = { name: string; key: string };

export default function KeysPage() {
  const { t, workspace } = useOffice();
  const scope = workspace?.scope.scope_code ?? "";
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState<Issued[] | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!scope) return;
    const r = await api<{ places: Place[] }>("/api/admin/office/keys?scope=" + encodeURIComponent(scope));
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); setPlaces([]); return; }
    setError(null); setPlaces(r.data.places ?? []);
  }, [scope, t]);
  useEffect(() => { void load(); }, [load]);

  async function make(p: Place): Promise<Issued | null> {
    const r = await api<{ key: string }>("/api/admin/office/keys", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unit_id: p.unit_id }),
    });
    if (!r.ok) { setError(r.data.message_kiny || t("error_generic")); return null; }
    return { name: p.name, key: r.data.key };
  }

  async function one(p: Place) {
    if (p.has_key && !window.confirm(t("key_confirm_reset"))) return;
    setBusy(p.unit_id); setCopied(false); setError(null);
    const got = await make(p);
    setBusy(null);
    if (got) setShown([got]);
    await load();
  }

  async function allMissing() {
    const missing = (places ?? []).filter((p) => !p.has_key);
    if (missing.length === 0) return;
    setBusy("all"); setCopied(false); setError(null);
    const got: Issued[] = [];
    for (const p of missing) {
      const g = await make(p);
      if (!g) break;
      got.push(g);
    }
    setBusy(null);
    if (got.length > 0) setShown(got);
    await load();
  }

  async function copy() {
    const text = (shown ?? []).map((x) => x.name + ": " + x.key).join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  }

  const missing = (places ?? []).filter((p) => !p.has_key).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("keys_title")} hint={t("keys_hint")}
        action={missing > 0 ? (
          <button type="button" onClick={() => void allMissing()} disabled={busy !== null}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#20603D] px-5 text-base font-bold text-white disabled:opacity-60">
            <KeyRound className="h-5 w-5" /> {t("key_make_all")} ({missing})
          </button>
        ) : undefined} />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {places === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {places && places.length === 0 && !error && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-base text-muted-foreground">{t("key_empty")}</p>}
      <ul className="space-y-3">
        {places?.map((p) => (
          <li key={p.unit_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="min-w-0">
              <p className="break-words text-lg font-extrabold text-foreground">{p.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t(levelKey(p.level))} · <span className={p.has_key ? "font-bold text-[#20603D]" : "font-bold text-red-700"}>{p.has_key ? t("key_has") : t("key_none")}</span>
                {p.last_event_at && <> · {p.last_action === "reset" ? t("key_last_reset") : t("key_last_issued")} {when(p.last_event_at)}</>}
              </p>
            </div>
            <button type="button" onClick={() => void one(p)} disabled={busy !== null}
              className={"inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-base font-bold disabled:opacity-60 " + (p.has_key ? "border border-border bg-background text-foreground" : "bg-[#20603D] text-white")}>
              <KeyRound className="h-5 w-5" /> {p.has_key ? t("key_reset") : t("key_make")}
            </button>
          </li>
        ))}
      </ul>

      {shown && (
        <Sheet title={t("key_new_title")} onClose={() => setShown(null)}>
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{t("key_new_once")}</p>
          <ul className="mb-5 space-y-2">
            {shown.map((x) => (
              <li key={x.name} className="rounded-xl bg-muted p-3">
                <p className="text-sm font-semibold text-muted-foreground">{x.name}</p>
                <p className="select-all break-all font-mono text-2xl font-extrabold tracking-wider text-foreground">{x.key}</p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void copy()} className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 text-base font-bold text-white">
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? t("key_copied") : shown.length > 1 ? t("key_copy_all") : t("key_copy")}
          </button>
        </Sheet>
      )}
    </div>
  );
}
