"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Award, BriefcaseBusiness, ExternalLink, FileText, Image as ImageIcon, Loader2, Upload } from "lucide-react";

type Props = { appointmentId: string; personId: string; profileExists: boolean; profilePublished: boolean };
type Employment = { id: string; employer: string; position_title: string; started_on: string | null; ended_on: string | null };
type Certification = { id: string; certification_name: string; issuer: string | null; issued_on: string | null; valid_until: string | null };
type Document = { id: string; document_type: string; reference_number: string; mime_type: string; byte_size: number };

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "success") {
    throw new Error(typeof payload?.message_kiny === "string" ? payload.message_kiny : "Ntibyashobotse kurangiza iki gikorwa.");
  }
  return payload;
}

async function resizeWebp(source: File, maxEdge: number, maxBytes: number): Promise<File> {
  if (!source.type.startsWith("image/")) throw new Error("Hitamo ifoto.");
  const bitmap = await createImageBitmap(source);
  try {
    let scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    let quality = 0.82;
    for (let attempt = 0; attempt < 12; attempt++) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Ifoto ntiyashoboye gutunganywa.");
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (!blob) throw new Error("Browser ntiyashoboye gukora WebP.");
      if (blob.size <= maxBytes) return new File([blob], "leader.webp", { type: "image/webp" });
      if (quality > 0.5) quality -= 0.08;
      else scale *= 0.8;
    }
    throw new Error("Ifoto ntishobora kugabanywa mu ngano isabwa.");
  } finally {
    bitmap.close();
  }
}

export function RegistryFileControls({ appointmentId, personId, profileExists, profilePublished }: Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [canUploadPhoto, setCanUploadPhoto] = useState(profilePublished);
  useEffect(() => setCanUploadPhoto(profilePublished), [profilePublished]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("appointment_letter");
  const [documentReference, setDocumentReference] = useState("");
  const [employment, setEmployment] = useState<Employment[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employer, setEmployer] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [startedOn, setStartedOn] = useState("");
  const [endedOn, setEndedOn] = useState("");
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certReference, setCertReference] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [jobs, awards, files] = await Promise.all([
      requestJson("/api/admin/leader-registry/employment?person_id=" + encodeURIComponent(personId)),
      requestJson("/api/admin/leader-registry/certifications?person_id=" + encodeURIComponent(personId)),
      requestJson("/api/admin/leader-registry/dossier-documents?person_id=" + encodeURIComponent(personId)),
    ]);
    setEmployment((jobs.employment ?? []) as Employment[]);
    setCertifications((awards.certifications ?? []) as Certification[]);
    setDocuments((files.documents ?? []) as Document[]);
  }, [personId]);

  useEffect(() => {
    void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Amakuru y'ibanga ntiyabonetse."));
  }, [load]);

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) { setError("Hitamo ifoto."); return; }
    if (!profileExists || !canUploadPhoto) {
      setError("Banza wemeze kandi usohore public profile. Ifoto imaze koherezwa, profile isubira kuri Draft kugira ngo yongere gusuzumwa.");
      return;
    }
    setBusy("photo"); setError(null); setNotice(null);
    try {
      const thumb = await resizeWebp(photo, 256, 40 * 1024);
      const modal = await resizeWebp(photo, 800, 150 * 1024);
      const form = new FormData();
      form.set("appointment_id", appointmentId);
      form.set("thumbnail", thumb);
      form.set("modal", modal);
      const result = await requestJson("/api/admin/leader-registry/photos", { method: "POST", body: form });
      setNotice(result.message_kiny ?? "Amafoto yabitswe.");
      setCanUploadPhoto(false);
      setPhoto(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ifoto ntiyabitswe."); }
    finally { setBusy(null); }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentFile) { setError("Hitamo inyandiko."); return; }
    setBusy("document"); setError(null); setNotice(null);
    try {
      const form = new FormData();
      form.set("person_id", personId);
      form.set("document_type", documentType);
      form.set("reference_number", documentReference);
      form.set("file", documentFile);
      const result = await requestJson("/api/admin/leader-registry/dossier-documents", { method: "POST", body: form });
      await load();
      setDocumentFile(null); setDocumentReference("");
      setNotice(result.message_kiny ?? "Inyandiko yabitswe muri private Storage.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inyandiko ntiyabitswe."); }
    finally { setBusy(null); }
  }

  async function openDocument(id: string) {
    setError(null); setNotice(null);
    try {
      const result = await requestJson("/api/admin/leader-registry/dossier-documents?document_id=" + encodeURIComponent(id));
      window.open(result.signed_url as string, "_blank", "noopener,noreferrer");
      setNotice("Signed URL izarangira mu masegonda 60.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inyandiko ntiyafunguwe."); }
  }

  async function archiveDocument(id: string) {
    setBusy(id); setError(null); setNotice(null);
    try {
      await requestJson("/api/admin/leader-registry/dossier-documents", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "archive" }),
      });
      await load(); setNotice("Inyandiko yabitswe mu mateka; file ntiyasibwe.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kubika mu mateka byanze."); }
    finally { setBusy(null); }
  }

  async function addEmployment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("employment"); setError(null); setNotice(null);
    try {
      await requestJson("/api/admin/leader-registry/employment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, employer, position_title: positionTitle, started_on: startedOn || null, ended_on: endedOn || null }),
      });
      setEmployer(""); setPositionTitle(""); setStartedOn(""); setEndedOn("");
      await load(); setNotice("Amateka y'akazi yabitswe.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Amateka y'akazi ntiyabitswe."); }
    finally { setBusy(null); }
  }

  async function archiveEmployment(id: string) {
    setBusy(id); setError(null); setNotice(null);
    try {
      await requestJson("/api/admin/leader-registry/employment", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "archive" }),
      });
      await load(); setNotice("Amateka y'akazi yabitswe mu mateka.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Guhagarika byanze."); }
    finally { setBusy(null); }
  }

  async function addCertification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("certification"); setError(null); setNotice(null);
    try {
      await requestJson("/api/admin/leader-registry/certifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, certification_name: certName, issuer: certIssuer || null, issued_on: certDate || null, evidence_reference: certReference || null }),
      });
      setCertName(""); setCertIssuer(""); setCertDate(""); setCertReference("");
      await load(); setNotice("Impamyabumenyi yabitswe.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impamyabumenyi ntiyabitswe."); }
    finally { setBusy(null); }
  }

  async function archiveCertification(id: string) {
    setBusy(id); setError(null); setNotice(null);
    try {
      await requestJson("/api/admin/leader-registry/certifications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "archive" }),
      });
      await load(); setNotice("Impamyabumenyi yabitswe mu mateka.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kubika mu mateka byanze."); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-3">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p>}

      <section className="space-y-2">
        <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-[#00A3E0]" /><h3 className="text-xs font-bold">Ifoto rusange</h3></div>
        <p className="text-[11px] text-muted-foreground">Ifoto igabanywa muri browser: thumbnail ≤256 px/40 KB; modal ≤800 px/150 KB. Ohereza ifoto igihe profile iri Draft/Unpublished; wongere uyisohore nyuma yo kugenzura ifoto.</p>
        <form onSubmit={uploadPhoto} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} className="min-h-[40px] w-full text-xs" />
          <button type="submit" disabled={!photo || busy === "photo" || !profileExists || !canUploadPhoto} className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white disabled:opacity-50">
            {busy === "photo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Ohereza ifoto
          </button>
        </form>
      </section>

      <section className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-[#00A3E0]" /><h3 className="text-xs font-bold">Amateka y'akazi</h3></div>
        <form onSubmit={addEmployment} className="grid gap-2 sm:grid-cols-2">
          <input required value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Urwego / employer" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <input required value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="Umwanya yakoraga" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <input type="date" value={endedOn} onChange={(e) => setEndedOn(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <button type="submit" disabled={busy === "employment"} className="min-h-[40px] rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white">{busy === "employment" ? "Turabika..." : "Bika amateka y'akazi"}</button>
        </form>
        {employment.length === 0 ? <p className="text-[11px] text-muted-foreground">Nta mateka y'akazi arandikwa.</p> : employment.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 border-t border-border py-2">
            <div><p className="text-xs font-semibold">{item.position_title} · {item.employer}</p><p className="text-[10px] text-muted-foreground">{item.started_on ?? "?"} — {item.ended_on ?? "ubu"}</p></div>
            <button type="button" disabled={busy === item.id} onClick={() => void archiveEmployment(item.id)} className="min-h-[36px] rounded-md border border-border px-2 text-[10px] font-semibold">Bika mu mateka</button>
          </div>
        ))}
      </section>

      <section className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2"><Award className="h-4 w-4 text-[#00A3E0]" /><h3 className="text-xs font-bold">Impamyabumenyi / Certifications</h3></div>
        <form onSubmit={addCertification} className="grid gap-2 sm:grid-cols-2">
          <input required value={certName} onChange={(e) => setCertName(e.target.value)} placeholder="Izina ry'impamyabumenyi" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <input value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} placeholder="Urwego rwayitanze" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <input type="date" value={certDate} onChange={(e) => setCertDate(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <input value={certReference} onChange={(e) => setCertReference(e.target.value)} placeholder="Evidence reference" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <button type="submit" disabled={busy === "certification"} className="min-h-[40px] rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white">{busy === "certification" ? "Turabika..." : "Bika impamyabumenyi"}</button>
        </form>
        {certifications.length === 0 ? <p className="text-[11px] text-muted-foreground">Nta mpamyabumenyi irabikwa.</p> : certifications.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 border-t border-border py-2">
            <div><p className="text-xs font-semibold">{item.certification_name}</p><p className="text-[10px] text-muted-foreground">{item.issuer ?? "Urwego rutazwi"} · {item.issued_on ?? "?"}</p></div>
            <button type="button" disabled={busy === item.id} onClick={() => void archiveCertification(item.id)} className="min-h-[36px] rounded-md border border-border px-2 text-[10px] font-semibold">Bika mu mateka</button>
          </div>
        ))}
      </section>

      <section className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#00A3E0]" /><h3 className="text-xs font-bold">Inyandiko z'ibanga</h3></div>
        <form onSubmit={uploadDocument} className="grid gap-2 sm:grid-cols-2">
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs">
            <option value="appointment_letter">Ibaruwa y'ishyirwaho</option><option value="identity">Irangamimerere</option><option value="education">Impamyabumenyi</option><option value="other">Izindi nyandiko</option>
          </select>
          <input required value={documentReference} onChange={(e) => setDocumentReference(e.target.value)} placeholder="Reference number" className="min-h-[40px] rounded-lg border border-input bg-background px-2 text-xs" />
          <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} className="min-h-[40px] text-xs sm:col-span-2" />
          <p className="text-[10px] text-muted-foreground sm:col-span-2">PDF/JPG/PNG · ≤5 MB · private bucket · signed URL imara amasegonda 60.</p>
          <button type="submit" disabled={!documentFile || busy === "document"} className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white">
            {busy === "document" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Ohereza inyandiko
          </button>
        </form>
        {documents.length === 0 ? <p className="text-[11px] text-muted-foreground">Nta nyandiko y'ibanga irabikwa.</p> : documents.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2">
            <div className="min-w-0"><p className="truncate text-xs font-semibold">{item.document_type} · {item.reference_number}</p><p className="text-[10px] text-muted-foreground">{Math.round(item.byte_size / 1024)} KB</p></div>
            <button type="button" onClick={() => void openDocument(item.id)} className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-border px-2 text-[10px] font-semibold"><ExternalLink className="h-3 w-3" /> Fungura</button>
            <button type="button" disabled={busy === item.id} onClick={() => void archiveDocument(item.id)} className="min-h-[36px] rounded-md border border-border px-2 text-[10px] font-semibold">Bika mu mateka</button>
          </div>
        ))}
      </section>
    </div>
  );
}
