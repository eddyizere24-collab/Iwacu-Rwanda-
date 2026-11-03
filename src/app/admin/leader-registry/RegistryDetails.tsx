"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, FileText, Globe, Lock, Phone, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { RegistryFileControls } from "./RegistryFileControls";

type Props = {
  appointmentId: string;
  personId: string;
  caseId: string | null;
  personName: string;
  firstName: string;
  lastName: string;
  personVersion: number;
  onIdentityUpdated: (person: { id: string; first_name: string; last_name: string; version: number }) => void;
  positionName: string;
};

type Profile = {
  appointment_id: string;
  display_name: string | null;
  biography: string | null;
  office_hours: string | null;
  service_priorities: string | null;
  public_photo_object_key: string | null;
  public_photo_thumbnail_key: string | null;
  publication_status: string;
};

type Contact = {
  id: string;
  contact_type: string;
  contact_value: string;
  label: string | null;
  visibility: "private" | "public";
  public_approved_at: string | null;
};

type Dossier = {
  education_level: string | null;
  field_of_study: string | null;
  institution: string | null;
  internal_notes: string | null;
  version: number;
} | null;

type HistoryItem = {
  id: string;
  version: number;
  first_name: string;
  last_name: string;
  change_reason: string | null;
  archived_at: string;
};

type Evidence = {
  id: string;
  evidence_type: string;
  reference_number: string;
  issuer: string;
  issued_on: string | null;
  valid_until: string | null;
  mime_type: string | null;
  byte_size: number | null;
  created_at: string;
};

type Tab = "profile" | "contacts" | "dossier" | "history";

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "success") {
    const message = payload && typeof payload.message_kiny === "string"
      ? payload.message_kiny
      : "Ntibyashobotse kurangiza iki gikorwa.";
    throw new Error(message);
  }
  return payload;
}

export function RegistryDetails({
  appointmentId, personId, caseId, personName, firstName, lastName,
  personVersion, onIdentityUpdated, positionName,
}: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [legalFirstName, setLegalFirstName] = useState(firstName);
  const [legalLastName, setLegalLastName] = useState(lastName);
  const [legalVersion, setLegalVersion] = useState(personVersion);
  const [legalName, setLegalName] = useState(personName);
  const [identityChangeReason, setIdentityChangeReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dossier, setDossier] = useState<Dossier>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState("appointment_letter");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [evidenceIssuer, setEvidenceIssuer] = useState("");
  const [evidenceIssuedOn, setEvidenceIssuedOn] = useState("");
  const [evidenceValidUntil, setEvidenceValidUntil] = useState("");
  const [evidenceBusy, setEvidenceBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [biography, setBiography] = useState("");
  const [officeHours, setOfficeHours] = useState("");
  const [servicePriorities, setServicePriorities] = useState("");

  const [contactType, setContactType] = useState("office_phone");
  const [contactValue, setContactValue] = useState("");
  const [contactLabel, setContactLabel] = useState("");

  const [educationLevel, setEducationLevel] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [institution, setInstitution] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const results = await Promise.allSettled([
      requestJson(`/api/admin/leader-registry/profiles?appointment_id=${appointmentId}`),
      requestJson(`/api/admin/leader-registry/contacts?appointment_id=${appointmentId}`),
      requestJson(`/api/admin/leader-registry/dossiers?person_id=${personId}`),
      requestJson(`/api/admin/leader-registry/history?person_id=${personId}`),
      caseId ? requestJson(`/api/admin/leader-registry/evidence?verification_case_id=${caseId}`) : Promise.resolve({ evidence: [] }),
    ]);

    const profileResult = results[0];
    if (profileResult.status === "fulfilled") {
      const next = (profileResult.value.profile ?? null) as Profile | null;
      setProfile(next);
      setDisplayName(next?.display_name ?? "");
      setBiography(next?.biography ?? "");
      setOfficeHours(next?.office_hours ?? "");
      setServicePriorities(next?.service_priorities ?? "");
    } else {
      setError(profileResult.reason instanceof Error ? profileResult.reason.message : "Public profile ntiyabonetse.");
    }

    const contactsResult = results[1];
    if (contactsResult.status === "fulfilled") setContacts((contactsResult.value.contacts ?? []) as Contact[]);

    const dossierResult = results[2];
    if (dossierResult.status === "fulfilled") {
      const next = (dossierResult.value.dossier ?? null) as Dossier;
      setDossier(next);
      setEducationLevel(next?.education_level ?? "");
      setFieldOfStudy(next?.field_of_study ?? "");
      setInstitution(next?.institution ?? "");
      setInternalNotes(next?.internal_notes ?? "");
    }

    const historyResult = results[3];
    if (historyResult.status === "fulfilled") setHistory((historyResult.value.history ?? []) as HistoryItem[]);

    const evidenceResult = results[4];
    if (evidenceResult.status === "fulfilled") setEvidence((evidenceResult.value.evidence ?? []) as Evidence[]);

    setLoading(false);
  }, [appointmentId, personId, caseId, personName]);

  useEffect(() => { void load(); }, [load]);

  async function saveIdentity() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload = await requestJson("/api/admin/leader-registry/people", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: personId,
          version: legalVersion,
          first_name: legalFirstName,
          last_name: legalLastName,
          change_reason: identityChangeReason,
        }),
      });
      const updated = payload.person as { id: string; first_name: string; last_name: string; version: number };
      setLegalFirstName(updated.first_name);
      setLegalLastName(updated.last_name);
      setLegalVersion(updated.version);
      setLegalName(updated.first_name + " " + updated.last_name);
      setIdentityChangeReason("");
      onIdentityUpdated(updated);
      setMessage("Amazina y'umuntu yabitswe kandi amateka y'impinduka ararinzwe.");
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : "Ntibyashobotse guhindura amazina y'umuntu.");
    } finally { setSaving(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(null); setMessage(null);
    try {
      const body = {
        appointment_id: appointmentId,
        display_name: displayName || null,
        biography: biography || null,
        office_hours: officeHours || null,
        service_priorities: servicePriorities || null,
      };
      const payload = await requestJson(
        "/api/admin/leader-registry/profiles",
        { method: profile ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      setProfile(payload.profile as Profile);
      setMessage("Public profile yabitswe nka Draft.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse kubika public profile.");
    } finally { setSaving(false); }
  }

  async function publishProfile() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload = await requestJson("/api/admin/leader-registry/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointmentId, publication_status: "published" }),
      });
      setProfile(payload.profile as Profile);
      setMessage("Public profile yasohowe.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse gusohora public profile.");
    } finally { setSaving(false); }
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(null); setMessage(null);
    try {
      await requestJson("/api/admin/leader-registry/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointmentId,
          contact_type: contactType,
          contact_value: contactValue,
          label: contactLabel || null,
          visibility: "private",
        }),
      });
      setContactValue(""); setContactLabel("");
      setMessage("Private contact yabitswe. Umugenzuzi ubifitiye ububasha ni we ushobora kuyemeza ngo igaragare ku baturage.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse kubika contact.");
    } finally { setSaving(false); }
  }

  async function changeContactVisibility(item: Contact, visibility: "private" | "public") {
    setSaving(true); setError(null); setMessage(null);
    try {
      await requestJson("/api/admin/leader-registry/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, visibility }),
      });
      setMessage(visibility === "public"
        ? "Contact yemerewe kugaragara ku baturage."
        : "Contact yasubijwe mu makuru y'ibanga.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : "Nta burenganzira ufite bwo guhindura uko contact igaragara.");
    } finally { setSaving(false); }
  }

  async function uploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseId) { setError("Verification case ntiyabonetse. Banza wohereze appointment ngo isuzumwe."); return; }
    if (!evidenceFile) { setError("Hitamo PDF, JPG cyangwa PNG."); return; }
    setEvidenceBusy(true); setError(null); setMessage(null);
    try {
      const form = new FormData();
      form.set("appointment_id", appointmentId);
      form.set("verification_case_id", caseId);
      form.set("evidence_type", evidenceType);
      form.set("reference_number", evidenceReference);
      form.set("issuer", evidenceIssuer);
      form.set("issued_on", evidenceIssuedOn);
      form.set("valid_until", evidenceValidUntil);
      form.set("file", evidenceFile);
      const payload = await requestJson("/api/admin/leader-registry/evidence", { method: "POST", body: form });
      setEvidenceFile(null); setEvidenceReference(""); setEvidenceIssuer("");
      const refreshed = await requestJson(`/api/admin/leader-registry/evidence?verification_case_id=${caseId}`);
      setEvidence((refreshed.evidence ?? []) as Evidence[]);
      setMessage(payload.message_kiny ?? "Evidence yabitswe.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evidence ntiyabitswe.");
    } finally { setEvidenceBusy(false); }
  }

  async function openEvidence(id: string) {
    setError(null); setMessage(null);
    try {
      const payload = await requestJson("/api/admin/leader-registry/evidence?evidence_id=" + encodeURIComponent(id));
      window.open(payload.signed_url as string, "_blank", "noopener,noreferrer");
      setMessage("Evidence signed URL izarangira mu masegonda 60.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Signed URL ntiyabonetse.");
    }
  }

  async function saveDossier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(null); setMessage(null);
    try {
      const payload = await requestJson("/api/admin/leader-registry/dossiers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId,
          expected_version: dossier?.version ?? null,
          education_level: educationLevel || null,
          field_of_study: fieldOfStudy || null,
          institution: institution || null,
          internal_notes: internalNotes || null,
        }),
      });
      setDossier(payload.dossier as Dossier);
      setMessage("Confidential dossier yabitswe.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ntibyashobotse kubika dossier.");
    } finally { setSaving(false); }
  }

  const tabClass = (selected: boolean) =>
    `min-h-[38px] rounded-lg px-3 text-xs font-bold ${selected ? "bg-[#00A3E0] text-white" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <section className="space-y-3 rounded-2xl border border-sky-100 bg-card p-3 dark:border-sky-950 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">Amakuru arambuye · {personName}</p>
          <p className="text-xs text-muted-foreground">{positionName} · {appointmentId.slice(0, 8)}…</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Vugurura
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</p>}

      <nav className="flex flex-wrap gap-1" aria-label="Leader detail modules">
        <button type="button" onClick={() => setTab("profile")} className={tabClass(tab === "profile")}><Globe className="mr-1 inline h-3.5 w-3.5" /> Profile</button>
        <button type="button" onClick={() => setTab("contacts")} className={tabClass(tab === "contacts")}><Phone className="mr-1 inline h-3.5 w-3.5" /> Contacts</button>
        <button type="button" onClick={() => setTab("dossier")} className={tabClass(tab === "dossier")}><Lock className="mr-1 inline h-3.5 w-3.5" /> Dossier</button>
        <button type="button" onClick={() => setTab("history")} className={tabClass(tab === "history")}><BookOpen className="mr-1 inline h-3.5 w-3.5" /> History & Evidence</button>
      </nav>

      {loading ? <p className="p-4 text-center text-xs text-muted-foreground">Turimo kuzana amakuru...</p> : null}

      {tab === "profile" && (
        <form onSubmit={saveProfile} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs font-bold">Public Profile</p>
            <p className="text-[11px] text-muted-foreground">Aya ni yo makuru ashobora kugaragara ku baturage nyuma yo kwemezwa.</p>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-border p-3">
            <p className="text-xs font-bold">Umwirondoro wemewe (Legal Identity)</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Guhindura amazina bibikwa mu mateka. Iyo uyu muntu afite imyanya mu turere dutandukanye, ubuyobozi bw'Igihugu ni bwo bugomba gukosora umwirondoro rusange.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold">
                Izina rya mbere
                <input required maxLength={80} value={legalFirstName} onChange={(e) => setLegalFirstName(e.target.value)} className="mt-1 min-h-[40px] w-full rounded-lg border border-input bg-background px-2.5 text-xs" />
              </label>
              <label className="text-[11px] font-semibold">
                Izina ry'umuryango
                <input required maxLength={100} value={legalLastName} onChange={(e) => setLegalLastName(e.target.value)} className="mt-1 min-h-[40px] w-full rounded-lg border border-input bg-background px-2.5 text-xs" />
              </label>
              <label className="text-[11px] font-semibold sm:col-span-2">
                Impamvu yo gukosora amazina (ikenewe)
                <textarea required minLength={4} maxLength={2000} rows={2} value={identityChangeReason} onChange={(e) => setIdentityChangeReason(e.target.value)} placeholder="Urugero: byemejwe n'inyandiko y'irangamimerere..." className="mt-1 w-full rounded-lg border border-input bg-background p-2.5 text-xs" />
              </label>
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                <span className="text-[10px] text-muted-foreground">Identity version: {legalVersion}</span>
                <button type="button" onClick={() => void saveIdentity()} disabled={saving || identityChangeReason.trim().length < 4 || (legalFirstName === firstName && legalLastName === lastName)} className="min-h-[36px] rounded-lg border border-border px-3 text-[11px] font-bold disabled:opacity-50">Bika amazina</button>
              </div>
            </div>
          </div>
          <div><label className="mb-1 block text-[11px] font-semibold">Izina rigaragara</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={legalName} className="min-h-[40px] w-full rounded-lg border border-input bg-background px-2.5 text-xs" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-[11px] font-semibold">Ubuzima bwe mu magambo make</label><textarea rows={3} maxLength={4000} value={biography} onChange={(e) => setBiography(e.target.value)} className="w-full rounded-lg border border-input bg-background p-2.5 text-xs" /></div>
          <div><label className="mb-1 block text-[11px] font-semibold">Amasaha yo kwakira abaturage</label><textarea rows={2} maxLength={1000} value={officeHours} onChange={(e) => setOfficeHours(e.target.value)} className="w-full rounded-lg border border-input bg-background p-2.5 text-xs" /></div>
          <div><label className="mb-1 block text-[11px] font-semibold">Ibyo ashyize imbere</label><textarea rows={2} maxLength={2000} value={servicePriorities} onChange={(e) => setServicePriorities(e.target.value)} className="w-full rounded-lg border border-input bg-background p-2.5 text-xs" /></div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
            <span className="text-[11px] text-muted-foreground">Status: <strong>{profile?.publication_status ?? "draft"}</strong></span>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving} className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-border px-3 text-xs font-bold"><Save className="h-3.5 w-3.5" /> Bika Draft</button>
              {profile && profile.publication_status !== "published" && <button type="button" disabled={saving} onClick={publishProfile} className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white"><ShieldCheck className="h-3.5 w-3.5" /> Sohora profile</button>}
            </div>
          </div>
        </form>
      )}

      {tab === "contacts" && (
        <div className="space-y-3">
          <form onSubmit={addContact} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            <p className="text-xs font-bold sm:col-span-2">Ongeraho uburyo bwo kuvugana</p>
            <select value={contactType} onChange={(e) => setContactType(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2.5 text-xs">
              <option value="office_phone">Telefone y'ibiro</option><option value="mobile_phone">Telefone</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="website">Website</option><option value="other">Ubundi buryo</option>
            </select>
            <input required value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder="Numero cyangwa address" className="min-h-[40px] rounded-lg border border-input bg-background px-2.5 text-xs" />
            <input value={contactLabel} onChange={(e) => setContactLabel(e.target.value)} placeholder="Izina/label (ntibisabwa)" className="min-h-[40px] rounded-lg border border-input bg-background px-2.5 text-xs" />
            <div className="sm:col-span-2 rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">
              Contact nshya ibikwa ari private. Umugenzuzi ufite ububasha bwo kuyemeza ni we ushobora kuyishyira ku mugaragaro nyuma y'uko appointment yemejwe kandi profile yasohowe.
            </div>
            <div className="sm:col-span-2"><button type="submit" disabled={saving} className="min-h-[38px] rounded-lg bg-[#20603D] px-4 text-xs font-bold text-white">Bika private contact</button></div>
          </form>
          <div className="divide-y divide-border rounded-xl border border-border">
            {contacts.length === 0 ? <p className="p-4 text-xs text-muted-foreground">Nta contact ubonera kuri uru rwego. Private contacts zishobora gusabwa uburenganzira bwo kuzibona.</p> : contacts.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{item.label || item.contact_type}</p>
                  <p className="break-all text-sm">{item.contact_value}</p>
                  <span className="mt-1 inline-flex rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold">
                    {item.visibility === "public" && item.public_approved_at ? "Public · approved" : "Private"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void changeContactVisibility(item, item.visibility === "public" ? "private" : "public")}
                  className="min-h-[36px] shrink-0 rounded-lg border border-border px-3 text-[11px] font-semibold disabled:opacity-50"
                >
                  {item.visibility === "public" ? "Hisha" : "Emeza public"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "dossier" && (
        <>
        <form onSubmit={saveDossier} className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/10 sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="text-xs font-bold">Confidential Administrative Dossier</p><p className="text-[11px] text-muted-foreground">Yerekanwa gusa ku nzego zifite uburenganzira cyangwa delegation yemewe.</p></div>
          <div><label className="mb-1 block text-[11px] font-semibold">Urwego rw'amashuri</label><input value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className="min-h-[40px] w-full rounded-lg border border-input bg-background px-2.5 text-xs" /></div>
          <div><label className="mb-1 block text-[11px] font-semibold">Ibyo yize</label><input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} className="min-h-[40px] w-full rounded-lg border border-input bg-background px-2.5 text-xs" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-[11px] font-semibold">Ishuri / Kaminuza</label><input value={institution} onChange={(e) => setInstitution(e.target.value)} className="min-h-[40px] w-full rounded-lg border border-input bg-background px-2.5 text-xs" /></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-[11px] font-semibold">Icyitonderwa cy'ibanga</label><textarea rows={4} maxLength={12000} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="w-full rounded-lg border border-input bg-background p-2.5 text-xs" /></div>
          <div className="sm:col-span-2"><button type="submit" disabled={saving} className="min-h-[38px] rounded-lg bg-[#20603D] px-4 text-xs font-bold text-white">Bika confidential dossier</button></div>
          <p className="text-[11px] text-muted-foreground sm:col-span-2">Dossier version: {dossier?.version ?? "Nta dossier irabikwa"}</p>
        </form>
        <RegistryFileControls
          appointmentId={appointmentId}
          personId={personId}
          profileExists={Boolean(profile)}
          profilePublished={profile?.publication_status === "published"}
        />
        </>
      )}

      {tab === "history" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-border">
            <div className="border-b border-border p-3"><p className="text-xs font-bold">Amateka y'umwirondoro</p></div>
            {history.length === 0 ? <p className="p-3 text-xs text-muted-foreground">Nta mateka arandikwa.</p> : history.map((item) => (
              <div key={item.id} className="border-b border-border p-3 last:border-0">
                <p className="text-xs font-bold">Version {item.version} · {item.first_name} {item.last_name}</p>
                {item.change_reason && <p className="text-[11px] text-muted-foreground">{item.change_reason}</p>}
                <time className="text-[10px] text-muted-foreground">{new Date(item.archived_at).toLocaleString("rw-RW")}</time>
              </div>
            ))}
          </section>
          <section className="rounded-xl border border-border">
            <div className="border-b border-border p-3"><p className="text-xs font-bold">Evidence n'inyandiko y'ibimenyetso</p></div>
            <form onSubmit={uploadEvidence} className="grid gap-2 p-3 sm:grid-cols-2">
              <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs">
                <option value="appointment_letter">Ibaruwa y'ishyirwaho</option>
                <option value="government_decision">Icyemezo cya Leta</option>
                <option value="other">Ikindi kimenyetso</option>
              </select>
              <input required value={evidenceReference} onChange={(e) => setEvidenceReference(e.target.value)} placeholder="Reference number" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
              <input required value={evidenceIssuer} onChange={(e) => setEvidenceIssuer(e.target.value)} placeholder="Issuer / Urwego rwatanze" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
              <input type="date" value={evidenceIssuedOn} onChange={(e) => setEvidenceIssuedOn(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
              <input type="date" value={evidenceValidUntil} onChange={(e) => setEvidenceValidUntil(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
              <input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)} className="min-h-[40px] text-xs sm:col-span-2" />
              <p className="text-[10px] text-muted-foreground sm:col-span-2">PDF/JPG/PNG · ≤5 MB · ibikwa muri leader-dossier private bucket. Reviewers babifitiye uburenganzira gusa ni bo bahabwa signed URL y'amasegonda 60.</p>
              <button type="submit" disabled={evidenceBusy || !caseId || !evidenceFile} className="min-h-[40px] rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white disabled:opacity-50">{evidenceBusy ? "Turabika..." : "Ohereza evidence"}</button>
            </form>
            {evidence.length === 0 ? <p className="p-3 text-xs text-muted-foreground">Nta evidence irabikwa.</p> : evidence.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
                <div><p className="text-xs font-bold">{item.evidence_type} · {item.reference_number}</p><p className="text-[11px] text-muted-foreground">{item.issuer} · {item.issued_on ?? "Itariki itazwi"} · {item.mime_type ?? "Metadata gusa"}</p></div>
                {item.mime_type && <button type="button" onClick={() => void openEvidence(item.id)} className="min-h-[36px] rounded-lg border border-border px-3 text-[10px] font-semibold">Fungura (60s)</button>}
              </div>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
