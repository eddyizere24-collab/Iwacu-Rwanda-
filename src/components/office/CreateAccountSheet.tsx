"use client";

import { FormEvent, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { api, fieldClass, primaryBtn, quietBtn, Sheet, useOffice } from "./office-ui";

type Made = { login_name: string; temp_password: string; display_name: string };

/** Gives the leader of one place a login. The temporary password is shown once and never stored. */
export function CreateAccountSheet({
  unitId, unitLabel, level, defaults, onClose, onCreated,
}: {
  unitId: string; unitLabel: string; level: string;
  defaults?: { name?: string | null; title?: string | null; phone?: string | null };
  onClose: () => void; onCreated: () => void;
}) {
  const { t } = useOffice();
  const [fullName, setFullName] = useState(defaults?.name ?? "");
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await api<{ account?: Made }>("/api/admin/office/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, job_title: title || null, phone: phone || null, unit_id: unitId }),
    });
    setBusy(false);
    if (!res.ok || !res.data.account) { setErr(res.data.message_kiny || t("error_generic")); return; }
    setMade(res.data.account);
    onCreated();
  }

  async function copy() {
    if (!made) return;
    const text = t("login_name") + ": " + made.login_name + "\n" + t("temp_password") + ": " + made.temp_password + "\n" + window.location.origin + "/admin/login";
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  }

  if (made) {
    return (
      <Sheet title={made.display_name} onClose={onClose}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#e3ede4] p-5">
            <p className="text-xs font-semibold text-[#20603D]">{t("login_name")}</p>
            <p className="select-all text-xl font-extrabold text-foreground">{made.login_name}</p>
            <p className="mt-4 text-xs font-semibold text-[#20603D]">{t("temp_password")}</p>
            <p className="select-all font-mono text-xl font-extrabold tracking-wider text-foreground">{made.temp_password}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t("shown_once")}</p>
          <button type="button" onClick={copy} className={primaryBtn + " w-full"}>
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? t("copied") : t("copy")}
          </button>
          <button type="button" onClick={onClose} className={quietBtn + " w-full"}>{t("close")}</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={t("new_account_for") + t(levelKey(level)) + " · " + unitLabel} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">{t("f_name")}</span>
          <input className={fieldClass} value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">{t("f_title")}</span>
          <input className={fieldClass} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">{t("f_phone")}</span>
          <input className={fieldClass} value={phone} maxLength={20} inputMode="tel" placeholder="+250 78…" onChange={(e) => setPhone(e.target.value)} />
        </label>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button type="submit" disabled={busy || fullName.trim().length < 2} className={primaryBtn + " w-full"}>
          <UserPlus className="h-5 w-5" /> {busy ? t("saving") : t("create_account")}
        </button>
      </form>
    </Sheet>
  );
}
