"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import {
  api, fieldClass, LeaderPhoto, primaryBtn, quietBtn, Sheet, shrinkToWebp, useOffice, type LeaderCard,
} from "./office-ui";

const PHONE_OK = /^\+?[0-9 ]{7,16}$/;
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Leader card of one place: name, position, phone, office hours, about, photo, and what the public may see. */
export function LeaderEditorSheet({ unitId, onClose, onSaved }: { unitId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useOffice();
  const [card, setCard] = useState<LeaderCard | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [hours, setHours] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void api<{ card: LeaderCard }>("/api/admin/office/leaders/" + unitId).then((r) => {
      if (!alive) return;
      if (!r.ok || !r.data.card) { setErr(r.data.message_kiny || t("error_generic")); return; }
      const c = r.data.card;
      setCard(c);
      setName(c.display_name ?? "");
      setTitle(c.job_title ?? "");
      setPhone(c.phone ?? "");
      setEmail(c.public_email ?? "");
      setBio(c.bio ?? "");
      setHours(c.office_hours ?? "");
      setIsPublic(c.is_public);
      setShowPhone(c.show_phone);
      setPhotoPath(c.photo_path);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    try {
      const blob = await shrinkToWebp(file);
      setNewPhoto(blob);
      setRemovePhoto(false);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setErr(t("error_generic"));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2) { setErr(t("f_name")); return; }
    if (phone.trim() && !PHONE_OK.test(phone.trim())) { setErr(t("f_phone") + " (+250 78…)"); return; }
    if (email.trim() && !EMAIL_OK.test(email.trim())) { setErr(t("f_email")); return; }
    setBusy(true);
    let path: string | null = null;
    if (newPhoto) {
      const form = new FormData();
      form.append("photo", new File([newPhoto], "photo.webp", { type: "image/webp" }));
      const up = await api<{ photo_path?: string }>("/api/admin/office/leaders/" + unitId + "/photo", { method: "POST", body: form });
      if (!up.ok || !up.data.photo_path) { setBusy(false); setErr(up.data.message_kiny || t("error_generic")); return; }
      path = up.data.photo_path;
    }
    const res = await api<{ status?: string }>("/api/admin/office/leaders/" + unitId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name, job_title: title, phone, public_email: email, bio, office_hours: hours,
        is_public: isPublic, show_phone: showPhone, photo_path: path, remove_photo: removePhoto && !path,
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr(res.data.message_kiny || t("error_generic")); return; }
    onSaved();
  }

  async function removeCard() {
    if (!window.confirm(t("remove_confirm"))) return;
    setBusy(true);
    const res = await api<{ removed?: boolean }>("/api/admin/office/leaders/" + unitId, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { setErr(res.data.message_kiny || t("error_generic")); return; }
    onSaved();
  }

  const shownPhoto = removePhoto ? null : preview ? "blob" : photoPath;
  const canRemoveCard = Boolean(card && card.display_name && !card.user_id);
  const heading = card ? t(levelKey(card.level)) + " · " + card.unit_name : t("edit_leader");

  return (
    <Sheet title={heading} onClose={onClose} wide>
      {!card && !err && <p className="py-8 text-center text-base text-muted-foreground">{t("loading")}</p>}
      {card && (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center gap-5 rounded-2xl bg-muted/60 p-4">
            {preview && !removePhoto
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={preview} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-white" />
              : <LeaderPhoto name={name || null} path={shownPhoto === "blob" ? null : shownPhoto} size={96} />}
            <div className="min-w-0 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className={quietBtn + " !min-h-[44px] !px-4 text-sm"}>
                <Camera className="h-4 w-4" /> {shownPhoto ? t("photo_change") : t("photo_add")}
              </button>
              {shownPhoto && (
                <button type="button" onClick={() => { setRemovePhoto(true); setNewPhoto(null); setPreview(null); }} className="block text-sm font-semibold text-red-700 underline underline-offset-2">
                  {t("photo_remove")}
                </button>
              )}
              <p className="text-xs text-muted-foreground">{t("photo_hint")}</p>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{t("f_name")}</span>
            <input className={fieldClass} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold">{t("f_title")}</span>
              <input className={fieldClass} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold">{t("f_phone")}</span>
              <input className={fieldClass} value={phone} maxLength={20} inputMode="tel" placeholder="+250 78…" onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold">{t("f_email")}</span>
              <input className={fieldClass} value={email} maxLength={160} inputMode="email" onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold">{t("f_hours")}</span>
              <input className={fieldClass} value={hours} maxLength={120} onChange={(e) => setHours(e.target.value)} />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">{t("f_bio")}</span>
            <textarea className={fieldClass + " min-h-[110px] py-3"} value={bio} maxLength={600} onChange={(e) => setBio(e.target.value)} />
          </label>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <label className="flex min-h-[44px] items-center gap-3 text-base font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-[#20603D]" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> {t("f_public")}
            </label>
            <label className="flex min-h-[44px] items-center gap-3 text-base font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-[#20603D]" checked={showPhone} disabled={!isPublic} onChange={(e) => setShowPhone(e.target.checked)} /> {t("f_show_phone")}
            </label>
            <p className="text-xs text-muted-foreground">{t("private_note")}</p>
          </div>

          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className={primaryBtn + " flex-1 sm:flex-none"}>{busy ? t("saving") : t("save")}</button>
            <button type="button" onClick={onClose} className={quietBtn}>{t("cancel")}</button>
            {canRemoveCard && (
              <button type="button" onClick={() => void removeCard()} disabled={busy} className="ml-auto inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-sm font-bold text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> {t("remove")}
              </button>
            )}
          </div>
        </form>
      )}
      {!card && err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
    </Sheet>
  );
}
