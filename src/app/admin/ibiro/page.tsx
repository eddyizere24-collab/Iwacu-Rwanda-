"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, MessageSquarePlus, Send, UserPlus, UserRound, X } from "lucide-react";
import { LEVEL_LABEL } from "@/lib/office/office-logic";

type Unit = { id: string; scope_code: string; name_kiny: string | null; name_eng: string | null; level: string };
type MeResponse = {
  status: string;
  user?: { id: string; email: string | null };
  profile: { display_name: string; job_title: string | null; login_name: string; must_change_password: boolean } | null;
  assignments?: { role_code: string; unit: Unit | null; child_level: string | null }[];
};
type Contact = {
  user_id: string; display_name: string; job_title: string | null; phone: string | null; login_name: string | null;
  role_code: string; unit_id: string; unit_name: string; unit_level: string; relation: "below" | "above";
  created_by_me: boolean; must_change_password: boolean;
};
type InboxRow = { message_id: string; subject: string; body: string; created_at: string; read_at: string | null; sender_id: string; sender_name: string; sender_title: string | null };
type SentRow = { message_id: string; subject: string; body: string; created_at: string; audience: string; recipients: number; read_count: number };
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

const GAP_LABEL: Record<GapAlert["gap_type"], string> = {
  leader_missing: "Umuyobozi utaraboneka",
  contact_missing: "Nimero y'ubuyobozi ibura",
  place_not_found: "Ahantu hatabonetse",
  capability_data_missing: "Andi makuru abura",
};

const unitName = (u: Unit | null | undefined) => u?.name_kiny || u?.name_eng || "";
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("rw-RW", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("rw-RW", { day: "2-digit", month: "short" });
}
async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { message_kiny?: string } }> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin", ...init });
  const data = (await res.json().catch(() => ({}))) as T & { message_kiny?: string };
  return { ok: res.ok, status: res.status, data };
}

function Avatar({ name, tone = "forest" }: { name: string; tone?: "forest" | "sky" }) {
  return (
    <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold " + (tone === "forest" ? "bg-[#e3ede4] text-[#20603D]" : "bg-[#dff2fb] text-[#0a6d96]")}>
      {name ? initials(name) : <UserRound className="h-5 w-5" />}
    </span>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#06231A]/60 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-card p-5 shadow-2xl sm:rounded-[28px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Funga" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const field = "min-h-[48px] w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#00A3E0]";

export default function OfficePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tab, setTab] = useState<"messages" | "accounts" | "gaps">("messages");
  const [box, setBox] = useState<"inbox" | "sent">("inbox");
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [sent, setSent] = useState<SentRow[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [gapAlerts, setGapAlerts] = useState<GapAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<InboxRow | SentRow | null>(null);
  const [composing, setComposing] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    const meRes = await api<MeResponse>("/api/admin/office/me");
    if (meRes.status === 401) { router.replace("/admin/login"); return; }
    if (meRes.status === 403 && (meRes.data as { code?: string }).code === "MFA_REQUIRED") { router.replace("/admin/mfa"); return; }
    if (!meRes.ok) { setError(meRes.data.message_kiny || "Ntibyashobotse gufungura ibiro."); return; }
    if (meRes.data.profile?.must_change_password) { router.replace("/admin/ijambo-ry-ibanga"); return; }
    setMe(meRes.data);
    const [i, s, c, g] = await Promise.all([
      api<{ messages: InboxRow[] }>("/api/admin/office/messages?box=inbox"),
      api<{ messages: SentRow[] }>("/api/admin/office/messages?box=sent"),
      api<{ contacts: Contact[] }>("/api/admin/office/accounts"),
      api<{ alerts: GapAlert[] }>("/api/admin/office/gaps"),
    ]);
    setInbox(i.data.messages ?? []);
    setSent(s.data.messages ?? []);
    setContacts(c.data.contacts ?? []);
    setGapAlerts(g.data.alerts ?? []);
    if (!g.ok) setError(g.data.message_kiny || "Amakuru abura ntashoboye kuboneka.");
  }, [router]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function logout() {
    await fetch("/api/admin/leader-registry/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
  }

  async function updateGapStatus(alert: GapAlert, status: "reviewing" | "resolved") {
    const response = await api("/api/admin/office/gaps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: alert.alert_id, status }),
    });
    if (!response.ok) {
      setError(response.data.message_kiny || "Ntibyashobotse kuvugurura imenyesha.");
      return;
    }
    setGapAlerts((rows) => rows.map((item) => item.alert_id === alert.alert_id
      ? { ...item, status }
      : item));
  }

  async function openMessage(row: InboxRow | SentRow) {
    setOpen(row);
    if ("read_at" in row && !row.read_at) {
      setInbox((rows) => rows.map((r) => (r.message_id === row.message_id ? { ...r, read_at: new Date().toISOString() } : r)));
      await api("/api/admin/office/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_id: row.message_id }) });
    }
  }

  const myLine = useMemo(() => {
    const a = me?.assignments?.[0];
    return a?.unit ? (LEVEL_LABEL[a.unit.level] ?? "") + " · " + unitName(a.unit) : "";
  }, [me]);
  const childLevel = me?.assignments?.map((a) => a.child_level).find(Boolean) ?? null;
  const unread = inbox.filter((m) => !m.read_at).length;
  const newGapCount = gapAlerts.filter((alert) => alert.status === "new").length;
  const name = me?.profile?.display_name || me?.user?.email || "";

  return (
    <main className="mx-auto min-h-screen max-w-2xl pb-28">
      <header className="relative bg-gradient-to-br from-[#06231A] to-[#20603D] px-5 pb-6 pt-8 text-white">
        <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/80">{myLine || "Ibiro"}</p>
            <h1 className="mt-1 truncate text-2xl font-extrabold">{name || "…"}</h1>
            {me?.profile?.job_title && <p className="mt-0.5 truncate text-sm text-white/85">{me.profile.job_title}</p>}
          </div>
          <button type="button" onClick={logout} aria-label="Sohoka" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><LogOut className="h-5 w-5" /></button>
        </div>
        <div className="relative mt-5 flex gap-2">
          {(["messages", "accounts", "gaps"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={"min-h-[44px] flex-1 rounded-full px-3 text-xs font-bold transition " + (tab === t ? "bg-white text-[#06231A]" : "bg-white/15 text-white hover:bg-white/25")}>
              {t === "messages"
                ? "Ubutumwa" + (unread ? " (" + unread + ")" : "")
                : t === "accounts" ? "Konti" : "Amakuru abura" + (newGapCount ? " (" + newGapCount + ")" : "")}
            </button>
          ))}
        </div>
      </header>

      {error && <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {tab === "messages" && (
        <section className="px-4 pt-4">
          <button type="button" onClick={() => setComposing(true)}
            className="mb-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] text-sm font-bold text-white hover:bg-[#1b5234]">
            <MessageSquarePlus className="h-5 w-5" /> Andika ubutumwa
          </button>
          <div className="mb-3 flex gap-2">
            {(["inbox", "sent"] as const).map((b) => (
              <button key={b} type="button" onClick={() => setBox(b)}
                className={"min-h-[40px] rounded-full px-4 text-xs font-bold " + (box === b ? "bg-[#20603D] text-white" : "bg-muted text-foreground")}>
                {b === "inbox" ? "Byaje" : "Byoherejwe"}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {box === "inbox" && inbox.map((m) => (
              <li key={m.message_id}>
                <button type="button" onClick={() => void openMessage(m)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50">
                  <Avatar name={m.sender_name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={"truncate text-sm " + (m.read_at ? "font-semibold" : "font-extrabold")}>{m.sender_name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{when(m.created_at)}</span>
                    </span>
                    <span className="block truncate text-sm text-foreground">{m.subject}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.body}</span>
                  </span>
                  {!m.read_at && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#00A3E0]" aria-label="Ntibusomwe" />}
                </button>
              </li>
            ))}
            {box === "sent" && sent.map((m) => (
              <li key={m.message_id}>
                <button type="button" onClick={() => void openMessage(m)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50">
                  <Avatar name="" tone="sky" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{m.subject}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{when(m.created_at)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{m.body}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-bold">{m.read_count}/{m.recipients}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "gaps" && (
        <section className="px-4 pt-4">
          <div className="mb-3 rounded-2xl border border-[#E7D7A5] bg-[#FFF9E8] p-3 text-xs leading-relaxed text-[#66551E]">
            Aha hagaragara amakuru abaturage babajije ariko ataraboneka mu bubiko. Ishakiro ryohereza imenyesha ku muyobozi bireba hakurikijwe aho ikibazo kiri. Nta kibazo cyanditswe cyangwa umwirondoro w’uwagitanze bibikwa hano.
          </div>
          <ul className="space-y-3">
            {gapAlerts.map((alert) => (
              <li key={alert.alert_id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-foreground">{GAP_LABEL[alert.gap_type]}</p>
                    <p className="mt-1 text-sm font-semibold text-[#20603D]">{alert.place_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(LEVEL_LABEL[alert.place_level] ?? "Aho hantu")} · {alert.scope_code || "Aho hantu ntiharamenyekana"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Byagaragaye inshuro {alert.occurrences.toLocaleString("rw-RW")} · {when(alert.last_seen_at)}
                    </p>
                  </div>
                  <span className={"shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold " + (
                    alert.status === "new" ? "bg-[#FCE9D7] text-[#8A4710]"
                      : alert.status === "reviewing" ? "bg-[#DFF2FB] text-[#0A5B7D]"
                        : "bg-[#E3EDE4] text-[#20603D]"
                  )}>
                    {alert.status === "new" ? "Bishya" : alert.status === "reviewing" ? "Birakurikiranwa" : "Byakemutse"}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Urwego rwamenyeshejwe: {alert.destination_scope_code}</p>
                {alert.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => void updateGapStatus(alert, alert.status === "new" ? "reviewing" : "resolved")}
                    className="mt-3 min-h-[42px] w-full rounded-xl bg-[#20603D] px-3 py-2 text-xs font-bold text-white"
                  >
                    {alert.status === "new" ? "Tangira kubikurikirana" : "Emeza ko byakemutse"}
                  </button>
                )}
              </li>
            ))}
            {gapAlerts.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nta menyesha ry’amakuru abura riragera kuri iyi konti.
              </li>
            )}
          </ul>
        </section>
      )}

      {tab === "accounts" && (
        <section className="px-4 pt-4">
          {childLevel && (
            <button type="button" onClick={() => setCreating(true)}
              className="mb-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] text-sm font-bold text-white hover:bg-[#1b5234]">
              <UserPlus className="h-5 w-5" /> Konti nshya y'{(LEVEL_LABEL[childLevel] ?? "").toLowerCase()}
            </button>
          )}
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {contacts.map((c) => (
              <li key={c.user_id} className="flex items-center gap-3 px-3 py-3">
                <Avatar name={c.display_name} tone={c.relation === "below" ? "forest" : "sky"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.display_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{(LEVEL_LABEL[c.unit_level] ?? "") + " · " + c.unit_name}</span>
                </span>
                {c.must_change_password && <span className="shrink-0 rounded-full bg-[#FAD201]/30 px-2 py-1 text-[11px] font-bold text-[#6b5600]">Ntiraninjira</span>}
                {c.phone && <a href={"tel:" + c.phone.replace(/\s/g, "")} className="shrink-0 rounded-full bg-muted px-3 py-2 text-xs font-bold">Hamagara</a>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && (
        <Sheet title={open.subject} onClose={() => setOpen(null)}>
          {"sender_name" in open && <p className="mb-3 text-xs text-muted-foreground">{open.sender_name}{open.sender_title ? " · " + open.sender_title : ""} · {when(open.created_at)}</p>}
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{open.body}</p>
        </Sheet>
      )}
      {composing && <ComposeSheet contacts={contacts} onClose={() => setComposing(false)} onSent={() => { setComposing(false); setBox("sent"); void loadAll(); }} />}
      {creating && me && childLevel && <CreateAccountSheet me={me} childLevel={childLevel} onClose={() => setCreating(false)} onCreated={() => void loadAll()} />}
    </main>
  );
}

function ComposeSheet({ contacts, onClose, onSent }: { contacts: Contact[]; onClose: () => void; onSent: () => void }) {
  const hasBelow = contacts.some((c) => c.relation === "below");
  const hasAbove = contacts.some((c) => c.relation === "above");
  const [audience, setAudience] = useState<"below" | "above" | "person">(hasBelow ? "below" : "above");
  const [picked, setPicked] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (audience === "person" && picked.length === 0) { setErr("Hitamo nibura umuntu umwe."); return; }
    setBusy(true);
    const res = await api<{ delivered_to?: number }>("/api/admin/office/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, audience, recipient_ids: audience === "person" ? picked : undefined }),
    });
    setBusy(false);
    if (!res.ok) { setErr(res.data.message_kiny || "Ubutumwa ntibwoherejwe."); return; }
    onSent();
  }

  return (
    <Sheet title="Ubutumwa bushya" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {([["below", "Abo hasi", hasBelow], ["above", "Abo hejuru", hasAbove], ["person", "Umuntu", contacts.length > 0]] as const).map(([k, label, enabled]) => (
            <button key={k} type="button" disabled={!enabled} onClick={() => setAudience(k)}
              className={"min-h-[40px] rounded-full px-4 text-xs font-bold disabled:opacity-40 " + (audience === k ? "bg-[#20603D] text-white" : "bg-muted")}>{label}</button>
          ))}
        </div>
        {audience === "person" && (
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {contacts.map((c) => {
              const on = picked.includes(c.user_id);
              return (
                <li key={c.user_id}>
                  <button type="button" onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.user_id) : [...p, c.user_id]))}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50">
                    <span className={"flex h-6 w-6 items-center justify-center rounded-full border " + (on ? "border-[#20603D] bg-[#20603D] text-white" : "border-border")}>{on && <Check className="h-4 w-4" />}</span>
                    <span className="min-w-0 text-sm"><span className="block truncate font-semibold">{c.display_name}</span><span className="block truncate text-xs text-muted-foreground">{(LEVEL_LABEL[c.unit_level] ?? "") + " · " + c.unit_name}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <input className={field} placeholder="Umutwe" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} required />
        <textarea className={field + " min-h-[140px] py-3"} placeholder="Ubutumwa" value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} required />
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        <button type="submit" disabled={busy} className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] text-sm font-bold text-white disabled:opacity-60">
          <Send className="h-4 w-4" /> {busy ? "…" : "Ohereza"}
        </button>
      </form>
    </Sheet>
  );
}

function CreateAccountSheet({ me, childLevel, onClose, onCreated }: { me: MeResponse; childLevel: string; onClose: () => void; onCreated: () => void }) {
  const mine = me.assignments?.find((a) => a.child_level === childLevel)?.unit ?? null;
  const isNational = mine?.level === "country";
  const [provinces, setProvinces] = useState<Unit[]>([]);
  const [province, setProvince] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<{ login_name: string; temp_password: string; display_name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isNational) return;
    void api<{ units: Unit[] }>("/api/administrative-units?level=province").then((r) => setProvinces(r.data.units ?? []));
  }, [isNational]);

  useEffect(() => {
    setUnits([]); setUnitId("");
    const parent = isNational ? province : mine?.id;
    if (!parent) return;
    void api<{ units: Unit[] }>("/api/administrative-units?level=" + (isNational ? "district" : childLevel) + "&parent_id=" + parent)
      .then((r) => setUnits(r.data.units ?? []));
  }, [isNational, province, mine?.id, childLevel]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const res = await api<{ account?: { login_name: string; temp_password: string; display_name: string } }>("/api/admin/office/accounts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, job_title: title || null, phone: phone || null, unit_id: unitId }),
    });
    setBusy(false);
    if (!res.ok || !res.data.account) { setErr(res.data.message_kiny || "Konti ntiyabitswe."); return; }
    setMade(res.data.account);
    onCreated();
  }

  async function copy() {
    if (!made) return;
    const text = "Izina: " + made.login_name + "\nIjambo ry'ibanga: " + made.temp_password + "\n" + window.location.origin + "/admin/login";
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  }

  if (made) {
    return (
      <Sheet title={made.display_name} onClose={onClose}>
        <div className="space-y-3">
          <div className="rounded-2xl bg-[#e3ede4] p-4">
            <p className="text-xs font-semibold text-[#20603D]">Izina ryo kwinjira</p>
            <p className="select-all text-lg font-extrabold text-foreground">{made.login_name}</p>
            <p className="mt-3 text-xs font-semibold text-[#20603D]">Ijambo ry'ibanga ry'agateganyo</p>
            <p className="select-all font-mono text-lg font-extrabold tracking-wider text-foreground">{made.temp_password}</p>
          </div>
          <p className="text-xs text-muted-foreground">Bigaragara rimwe gusa. Azabihindura akinjira bwa mbere.</p>
          <button type="button" onClick={copy} className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] text-sm font-bold text-white">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Byakopowe" : "Koporora"}
          </button>
          <button type="button" onClick={onClose} className="min-h-[48px] w-full rounded-xl bg-muted text-sm font-bold">Funga</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={"Konti y'" + (LEVEL_LABEL[childLevel] ?? "").toLowerCase()} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {isNational && (
          <select className={field} value={province} onChange={(e) => setProvince(e.target.value)} required>
            <option value="">Intara</option>
            {provinces.map((p) => <option key={p.id} value={p.id}>{unitName(p)}</option>)}
          </select>
        )}
        <select className={field} value={unitId} onChange={(e) => setUnitId(e.target.value)} required disabled={units.length === 0}>
          <option value="">{LEVEL_LABEL[childLevel]}</option>
          {units.map((u) => <option key={u.id} value={u.id}>{unitName(u)}</option>)}
        </select>
        <input className={field} placeholder="Amazina yose" value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} required />
        <input className={field} placeholder="Inshingano" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        <input className={field} placeholder="Telefone" inputMode="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        <button type="submit" disabled={busy || !unitId} className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#20603D] text-sm font-bold text-white disabled:opacity-60">
          <UserPlus className="h-4 w-4" /> {busy ? "…" : "Kora konti"}
        </button>
      </form>
    </Sheet>
  );
}

