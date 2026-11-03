"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X, UserPlus, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import type { LeaderRole } from "@/types/leader";

type BoundaryLevel = "province" | "district" | "sector" | "cell" | "village";
type Choice = { id: string; scope_code: string; name_kiny: string; level: BoundaryLevel; parent_id: string | null };

interface AddLeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaderAdded: () => void;
  adminTier?: "national" | "province" | "district" | "sector" | "cell";
}

const ROLE_OPTIONS: { value: LeaderRole; label: string; target: BoundaryLevel; tiers: string[] }[] = [
  { value: "Village Leader", label: "Umukuru w'Umudugudu", target: "village", tiers: ["national", "district", "sector", "cell"] },
  { value: "Cell Executive Secretary", label: "Umunyamabanga Nshingwabikorwa w'Akagari", target: "cell", tiers: ["national", "district", "sector"] },
  { value: "Sector Executive Secretary", label: "Umunyamabanga Nshingwabikorwa w'Umurenge", target: "sector", tiers: ["national", "district"] },
  { value: "Mayor", label: "Meya w'Akarere", target: "district", tiers: ["national"] },
  { value: "Vice Mayor", label: "Visi Meya", target: "district", tiers: ["national"] },
  { value: "District Executive Secretary", label: "Umunyamabanga Nshingwabikorwa w'Akarere", target: "district", tiers: ["national"] },
];
const LEVELS: BoundaryLevel[] = ["province", "district", "sector", "cell", "village"];

async function fetchUnits(level: BoundaryLevel, parentId?: string): Promise<Choice[]> {
  const params = new URLSearchParams({ level });
  if (parentId) params.set("parent_id", parentId);
  const response = await fetch("/api/administrative-units?" + params.toString(), { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || payload.status !== "success" || !Array.isArray(payload.units)) {
    throw new Error(payload.message_kiny || "Urutonde rw'ahantu ntirubonetse.");
  }
  return payload.units as Choice[];
}
function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\\s()-]/g, "");
  if (!compact) return null;
  if (/^07[0-9]{8}$/.test(compact)) return "+250" + compact.slice(1);
  if (/^250[0-9]{9}$/.test(compact)) return "+" + compact;
  if (/^\\+250[0-9]{9}$/.test(compact)) return compact;
  throw new Error("Telefone igomba kuba nka 078XXXXXXX cyangwa +25078XXXXXXX.");
}

export function AddLeaderModal({ isOpen, onClose, onLeaderAdded, adminTier = "national" }: AddLeaderModalProps) {
  const roles = useMemo(() => ROLE_OPTIONS.filter((item) => item.tiers.includes(adminTier)), [adminTier]);
  const [role, setRole] = useState<LeaderRole>("Village Leader");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [provinces, setProvinces] = useState<Choice[]>([]);
  const [districts, setDistricts] = useState<Choice[]>([]);
  const [sectors, setSectors] = useState<Choice[]>([]);
  const [cells, setCells] = useState<Choice[]>([]);
  const [villages, setVillages] = useState<Choice[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [cellId, setCellId] = useState("");
  const [villageId, setVillageId] = useState("");
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const targetLevel = ROLE_OPTIONS.find((item) => item.value === role)?.target ?? "village";
  const targetIndex = LEVELS.indexOf(targetLevel);
  const targetChoice =
    targetLevel === "district" ? districts.find((item) => item.id === districtId) :
    targetLevel === "sector" ? sectors.find((item) => item.id === sectorId) :
    targetLevel === "cell" ? cells.find((item) => item.id === cellId) :
    villages.find((item) => item.id === villageId);

  useEffect(() => {
    if (!isOpen || provinces.length > 0) return;
    let active = true;
    setLoadingUnits(true);
    fetchUnits("province").then((items) => {
      if (!active) return;
      setProvinces(items);
      setProvinceId(items[0]?.id ?? "");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Intara ntizabonetse.");
    }).finally(() => {
      if (active) setLoadingUnits(false);
    });
    return () => { active = false; };
  }, [isOpen, provinces.length]);

  useEffect(() => {
    if (!provinceId || targetIndex < 1) { setDistricts([]); setDistrictId(""); return; }
    let active = true;
    fetchUnits("district", provinceId).then((items) => {
      if (active) { setDistricts(items); setDistrictId(items[0]?.id ?? ""); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Uturere ntitwabonetse."); });
    return () => { active = false; };
  }, [provinceId, targetIndex]);

  useEffect(() => {
    if (!districtId || targetIndex < 2) { setSectors([]); setSectorId(""); return; }
    let active = true;
    fetchUnits("sector", districtId).then((items) => {
      if (active) { setSectors(items); setSectorId(items[0]?.id ?? ""); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Imirenge ntiyabonetse."); });
    return () => { active = false; };
  }, [districtId, targetIndex]);

  useEffect(() => {
    if (!sectorId || targetIndex < 3) { setCells([]); setCellId(""); return; }
    let active = true;
    fetchUnits("cell", sectorId).then((items) => {
      if (active) { setCells(items); setCellId(items[0]?.id ?? ""); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Utugari ntitwabonetse."); });
    return () => { active = false; };
  }, [sectorId, targetIndex]);

  useEffect(() => {
    if (!cellId || targetIndex < 4) { setVillages([]); setVillageId(""); return; }
    let active = true;
    fetchUnits("village", cellId).then((items) => {
      if (active) { setVillages(items); setVillageId(items[0]?.id ?? ""); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Imidugudu ntibonetse."); });
    return () => { active = false; };
  }, [cellId, targetIndex]);

  useEffect(() => {
    if (!roles.some((item) => item.value === role)) setRole(roles[0]?.value ?? "Village Leader");
  }, [roles, role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!targetChoice) { setError("Hitamo neza ahantu uyu muyobozi ashinzwe."); return; }
    setSaving(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await fetch("/api/leaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
          scope_code: targetChoice.scope_code,
          phone_number: normalizedPhone,
          email: email.trim() || null,
          photo_url: photoUrl.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== "success") {
        setError(payload.message_kiny || "Umuyobozi ntiyabitswe.");
        return;
      }
      setSuccess(true);
      onLeaderAdded();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ikibazo cyabaye mu kubika umuyobozi.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;
  const fieldClass = "min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="add-leader-title">
      <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00A3E0]/15 text-[#00A3E0]"><UserPlus className="h-5 w-5" aria-hidden /></span>
            <div>
              <h2 id="add-leader-title" className="text-sm font-extrabold text-foreground">Ongeraho Umuyobozi</h2>
              <p className="text-[10px] text-muted-foreground">Ahantu hatoranywa muri database y'u Rwanda.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="Funga"><X className="h-5 w-5" aria-hidden /></button>
        </header>
        {success ? (
          <div className="p-7 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-700"><CheckCircle2 className="h-8 w-8" aria-hidden /></span>
            <h3 className="text-base font-bold text-foreground">Umuyobozi yabitswe</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Aracyategereje kwemezwa n'inyandiko yemewe mbere yo kugaragara ku rubuga rw'abaturage.</p>
            <button type="button" onClick={onClose} className="mt-5 min-h-[42px] rounded-xl bg-[#20603D] px-5 py-2 text-xs font-bold text-white">Funga</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 text-xs">
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1"><span className="block font-semibold text-foreground">Izina *</span><input required maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} className={fieldClass} autoComplete="given-name" /></label>
              <label className="space-y-1"><span className="block font-semibold text-foreground">Izina ry'umuryango *</span><input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClass} autoComplete="family-name" /></label>
            </div>
            <label className="block space-y-1"><span className="font-semibold text-foreground">Inshingano *</span>
              <select value={role} onChange={(event) => setRole(event.target.value as LeaderRole)} className={fieldClass}>
                {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <p className="mb-3 font-bold text-foreground">Aho uyu muyobozi ashinzwe</p>
              {loadingUnits && <p role="status" className="mb-2 text-[11px] text-muted-foreground">Turimo kuzana ahantu muri database...</p>}
              <div className="space-y-3">
                <label className="block space-y-1"><span className="font-semibold text-muted-foreground">Intara / Umujyi wa Kigali</span>
                  <select value={provinceId} onChange={(event) => setProvinceId(event.target.value)} className={fieldClass}>{provinces.map((item) => <option key={item.id} value={item.id}>{item.name_kiny}</option>)}</select>
                </label>
                {targetIndex >= 1 && <label className="block space-y-1"><span className="font-semibold text-muted-foreground">Akarere</span>
                  <select value={districtId} onChange={(event) => setDistrictId(event.target.value)} className={fieldClass}>{districts.map((item) => <option key={item.id} value={item.id}>Akarere ka {item.name_kiny}</option>)}</select>
                </label>}
                {targetIndex >= 2 && <label className="block space-y-1"><span className="font-semibold text-muted-foreground">Umurenge</span>
                  <select value={sectorId} onChange={(event) => setSectorId(event.target.value)} className={fieldClass}>{sectors.map((item) => <option key={item.id} value={item.id}>Umurenge wa {item.name_kiny}</option>)}</select>
                </label>}
                {targetIndex >= 3 && <label className="block space-y-1"><span className="font-semibold text-muted-foreground">Akagari</span>
                  <select value={cellId} onChange={(event) => setCellId(event.target.value)} className={fieldClass}>{cells.map((item) => <option key={item.id} value={item.id}>Akagari ka {item.name_kiny}</option>)}</select>
                </label>}
                {targetIndex >= 4 && <label className="block space-y-1"><span className="font-semibold text-muted-foreground">Umudugudu</span>
                  <select value={villageId} onChange={(event) => setVillageId(event.target.value)} className={fieldClass}>{villages.map((item) => <option key={item.id} value={item.id}>Umudugudu wa {item.name_kiny}</option>)}</select>
                </label>}
              </div>
              {targetChoice && <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-[#20603D]"><ChevronRight className="h-3 w-3" aria-hidden /> {targetChoice.name_kiny}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1"><span className="font-semibold text-foreground">Telefone (ubishatse)</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="078XXXXXXX" className={fieldClass} autoComplete="tel" /></label>
              <label className="block space-y-1"><span className="font-semibold text-foreground">Email (ubishatse)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email y'akazi" className={fieldClass} autoComplete="email" /></label>
            </div>
            <label className="block space-y-1"><span className="font-semibold text-foreground">Ifoto (URL, ubishatse)</span><input type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://..." className={fieldClass} inputMode="url" /></label>
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">Umuyobozi mushya abanza kubikwa ategereje kugenzurwa. Nta muntu uzamugaragaza ku rubuga rw'abaturage atarabyemezwa.</p>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button type="button" onClick={onClose} className="min-h-[42px] rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground">Hagarika</button>
              <button type="submit" disabled={saving || loadingUnits || !targetChoice} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#20603D] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />} Bika Umuyobozi
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
