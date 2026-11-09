"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, MessageSquarePlus, Send } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import type { Contact, InboxRow, SentRow } from "@/components/office/office-types";
import { api, fieldClass, LeaderPhoto, PageTitle, primaryBtn, Sheet, useOffice, when } from "@/components/office/office-ui";

export default function MessagesPage() {
  const { t, refresh } = useOffice();
  const [box, setBox] = useState<"inbox" | "sent">("inbox");
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [sent, setSent] = useState<SentRow[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState<InboxRow | SentRow | null>(null);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    const [i, s, c] = await Promise.all([
      api<{ messages: InboxRow[] }>("/api/admin/office/messages?box=inbox"),
      api<{ messages: SentRow[] }>("/api/admin/office/messages?box=sent"),
      api<{ contacts: Contact[] }>("/api/admin/office/accounts"),
    ]);
    setInbox(i.data.messages ?? []);
    setSent(s.data.messages ?? []);
    setContacts(c.data.contacts ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function openMessage(row: InboxRow | SentRow) {
    setOpen(row);
    if ("read_at" in row && !row.read_at) {
      setInbox((rows) => rows.map((r) => (r.message_id === row.message_id ? { ...r, read_at: new Date().toISOString() } : r)));
      await api("/api/admin/office/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_id: row.message_id }) });
      void refresh();
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={t("nav_messages")}
        action={<button type="button" onClick={() => setComposing(true)} className={primaryBtn}><MessageSquarePlus className="h-5 w-5" /> {t("compose")}</button>}
      />
      <div className="mb-4 flex gap-2">
        {(["inbox", "sent"] as const).map((b) => (
          <button key={b} type="button" onClick={() => setBox(b)} aria-pressed={box === b}
            className={"min-h-[44px] rounded-full px-5 text-sm font-bold " + (box === b ? "bg-[#20603D] text-white" : "bg-muted text-foreground")}>
            {b === "inbox" ? t("inbox") : t("sent")}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {box === "inbox" && inbox.map((m) => (
          <li key={m.message_id}>
            <button type="button" onClick={() => void openMessage(m)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-muted/50">
              <LeaderPhoto name={m.sender_name} path={null} size={48} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={"truncate text-base " + (m.read_at ? "font-semibold" : "font-extrabold")}>{m.sender_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{when(m.created_at)}</span>
                </span>
                <span className="block truncate text-sm text-foreground">{m.subject}</span>
                <span className="block truncate text-sm text-muted-foreground">{m.body}</span>
              </span>
              {!m.read_at && <span className="h-3 w-3 shrink-0 rounded-full bg-[#00A3E0]" aria-hidden="true" />}
            </button>
          </li>
        ))}
        {box === "sent" && sent.map((m) => (
          <li key={m.message_id}>
            <button type="button" onClick={() => void openMessage(m)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-muted/50">
              <LeaderPhoto name={null} path={null} size={48} tone="sky" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-base font-semibold">{m.subject}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{when(m.created_at)}</span>
                </span>
                <span className="block truncate text-sm text-muted-foreground">{m.body}</span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold">{m.read_count}/{m.recipients}</span>
            </button>
          </li>
        ))}
        {((box === "inbox" && inbox.length === 0) || (box === "sent" && sent.length === 0)) && (
          <li className="p-8 text-center text-base text-muted-foreground">—</li>
        )}
      </ul>

      {open && (
        <Sheet title={open.subject} onClose={() => setOpen(null)}>
          {"sender_name" in open && <p className="mb-4 text-sm text-muted-foreground">{open.sender_name}{open.sender_title ? " · " + open.sender_title : ""} · {when(open.created_at)}</p>}
          <p className="whitespace-pre-wrap text-base leading-7 text-foreground">{open.body}</p>
        </Sheet>
      )}
      {composing && <ComposeSheet contacts={contacts} onClose={() => setComposing(false)} onSent={() => { setComposing(false); setBox("sent"); void load(); }} />}
    </div>
  );
}

function ComposeSheet({ contacts, onClose, onSent }: { contacts: Contact[]; onClose: () => void; onSent: () => void }) {
  const { t } = useOffice();
  const hasBelow = contacts.some((c) => c.relation === "below");
  const hasAbove = contacts.some((c) => c.relation === "above");
  const [audience, setAudience] = useState<"below" | "above" | "person">(hasBelow ? "below" : "above");
  const [picked, setPicked] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reach = audience === "below" ? contacts.filter((c) => c.relation === "below").length
    : audience === "above" ? contacts.filter((c) => c.relation === "above").length : picked.length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (audience === "person" && picked.length === 0) { setErr(t("pick_one")); return; }
    setBusy(true);
    const res = await api<{ delivered_to?: number }>("/api/admin/office/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, audience, recipient_ids: audience === "person" ? picked : undefined }),
    });
    setBusy(false);
    if (!res.ok) { setErr(res.data.message_kiny || t("error_generic")); return; }
    onSent();
  }

  return (
    <Sheet title={t("new_message")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {([["below", t("to_below"), hasBelow], ["above", t("to_above"), hasAbove], ["person", t("to_person"), contacts.length > 0]] as const).map(([k, label, enabled]) => (
            <button key={k} type="button" disabled={!enabled} onClick={() => setAudience(k)} aria-pressed={audience === k}
              className={"min-h-[44px] rounded-full px-5 text-sm font-bold disabled:opacity-40 " + (audience === k ? "bg-[#20603D] text-white" : "bg-muted")}>{label}</button>
          ))}
        </div>
        {audience === "person" && (
          <ul className="max-h-52 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {contacts.map((c) => {
              const on = picked.includes(c.user_id);
              return (
                <li key={c.user_id}>
                  <button type="button" onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.user_id) : [...p, c.user_id]))} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50">
                    <span className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border " + (on ? "border-[#20603D] bg-[#20603D] text-white" : "border-border")}>{on && <Check className="h-4 w-4" />}</span>
                    <span className="min-w-0 text-sm"><span className="block truncate font-semibold">{c.display_name}</span><span className="block truncate text-xs text-muted-foreground">{t(levelKey(c.unit_level)) + " · " + c.unit_name}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm font-semibold text-[#20603D]">→ {reach}</p>
        <input className={fieldClass} placeholder={t("subject")} value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} required />
        <textarea className={fieldClass + " min-h-[160px] py-3"} placeholder={t("body")} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} required />
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button type="submit" disabled={busy || reach === 0} className={primaryBtn + " w-full"}>
          <Send className="h-5 w-5" /> {busy ? t("saving") : t("send")}
        </button>
      </form>
    </Sheet>
  );
}
