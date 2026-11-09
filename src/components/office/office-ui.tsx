"use client";

import { createContext, useContext } from "react";
import { UserRound, X } from "lucide-react";
import { translate, type Key, type Lang } from "@/lib/office/i18n";

export type Unit = { id: string; scope_code: string; name_kiny: string | null; name_eng: string | null; level: string };
export type MeResponse = {
  status: string;
  user?: { id: string; email: string | null };
  profile: { display_name: string; job_title: string | null; login_name: string; must_change_password: boolean } | null;
  assignments?: { role_code: string; unit: Unit | null; child_level: string | null }[];
};
export type Workspace = {
  scope: { unit_id: string; scope_code: string; level: string; name_kiny: string | null; name_eng: string | null; role_code: string };
  child_level: string | null;
  counts: Record<string, number>;
  child_total: number;
  child_with_leader: number;
  child_with_account: number;
  accounts_below: number;
  accounts_waiting_first_login: number;
  unread: number;
};
export type OfficeUnit = {
  unit_id: string; scope_code: string; level: string; name_kiny: string | null; name_eng: string | null; child_count: number;
  leader_user_id: string | null; leader_name: string | null; leader_title: string | null; leader_phone: string | null;
  leader_photo: string | null; leader_public: boolean | null; status: "vacant" | "record" | "invited" | "active";
  can_edit: boolean; can_create_account: boolean;
};
export type LeaderRow = {
  unit_id: string; scope_code: string; level: string; unit_name: string; parent_name: string | null;
  leader_user_id: string | null; leader_name: string; leader_title: string | null; leader_phone: string | null;
  leader_photo: string | null; leader_public: boolean; status: "record" | "invited" | "active";
};
export type LeaderCard = {
  unit_id: string; scope_code: string; level: string; unit_name: string; user_id: string | null;
  display_name: string | null; job_title: string | null; phone: string | null; public_email: string | null;
  bio: string | null; office_hours: string | null; photo_path: string | null;
  is_public: boolean; show_phone: boolean; can_edit: boolean;
};

export type OfficeCtx = {
  me: MeResponse;
  workspace: Workspace | null;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key) => string;
  refresh: () => Promise<void>;
};
export const OfficeContext = createContext<OfficeCtx | null>(null);
export function useOffice(): OfficeCtx {
  const v = useContext(OfficeContext);
  if (!v) throw new Error("useOffice must be used inside OfficeShell");
  return v;
}
export { translate };

export async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { message_kiny?: string; code?: string } }> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin", ...init });
  const data = (await res.json().catch(() => ({}))) as T & { message_kiny?: string; code?: string };
  return { ok: res.ok, status: res.status, data };
}

export const unitName = (u: { name_kiny?: string | null; name_eng?: string | null } | null | undefined) =>
  u?.name_kiny || u?.name_eng || "";
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

export function photoUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return base.replace(/\/$/, "") + "/storage/v1/object/public/leader-photos/" + path.split("/").map(encodeURIComponent).join("/");
}

export function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export const fieldClass =
  "min-h-[48px] w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus:ring-2 focus:ring-[#00A3E0]";
export const primaryBtn =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#20603D] px-5 text-base font-bold text-white transition hover:bg-[#1b5234] disabled:opacity-60";
export const quietBtn =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-muted px-5 text-base font-bold text-foreground transition hover:bg-muted/70";

/** Leader's face: the real photo when there is one, otherwise initials on Rwanda green. */
export function LeaderPhoto({ name, path, size = 56, tone = "forest" }: { name: string | null; path: string | null; size?: number; tone?: "forest" | "sky" | "sun" }) {
  const url = photoUrl(path);
  const box = { width: size, height: size } as const;
  if (url && name) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} loading="lazy" style={box} className="shrink-0 rounded-full object-cover ring-2 ring-white" />;
  }
  const tones = { forest: "bg-[#e3ede4] text-[#20603D]", sky: "bg-[#dff2fb] text-[#0a6d96]", sun: "bg-[#fdf3c2] text-[#6b5600]" } as const;
  return (
    <span style={box} className={"flex shrink-0 items-center justify-center rounded-full text-base font-bold ring-2 ring-white " + tones[tone]} aria-hidden={!name}>
      {name ? initials(name) : <UserRound className="h-1/2 w-1/2" />}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const { t } = useOffice();
  const style: Record<string, string> = {
    vacant: "bg-muted text-muted-foreground",
    record: "bg-[#dff2fb] text-[#0a6d96]",
    invited: "bg-[#fdf3c2] text-[#6b5600]",
    active: "bg-[#e3ede4] text-[#20603D]",
    suspended: "bg-red-100 text-red-800",
    revoked: "bg-red-100 text-red-800",
  };
  const key = ("status_" + (status === "revoked" ? "suspended" : status)) as Key;
  return <span className={"inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold " + (style[status] ?? style.vacant)}>{t(key)}</span>;
}

export function Sheet({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const { t } = useOffice();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#06231A]/60 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className={"max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-card p-6 shadow-2xl sm:rounded-[28px] " + (wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight text-foreground">{title}</h1>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** Shrinks any picture to a square WebP of at most ~140 KB in the browser, so it uploads fast on small data plans. */
export async function shrinkToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  let target = Math.min(640, side);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
    for (const q of [0.82, 0.7, 0.58, 0.46]) {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", q));
      if (blob && blob.type === "image/webp" && blob.size <= 140 * 1024) return blob;
    }
    target = Math.round(target * 0.8);
  }
  throw new Error("too-big");
}
