"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MessageCircle, Phone, Users, X } from "lucide-react";
// CHANGED 2026-11-05 CLAUDE: restored full component after a placeholder push; added verification date and profile link; see docs/HANDOFF.md
import type { PublicCandidate, PublicSharedLeader } from "@/lib/leaders/public-directory";

export type LeaderPlaceCandidate = {
  scope_code: string;
  name_kiny: string;
  name_eng?: string | null;
  level: string;
  supported_probability?: number;
};

type ApiPayload = {
  status?: string;
  unavailable?: boolean;
  candidates?: PublicCandidate[];
  shared_leaders?: PublicSharedLeader[];
  message_kiny?: string | null;
};

type Props = { candidates: LeaderPlaceCandidate[] };

function storageUrl(key: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !key) return null;
  const path = key.split("/").map(encodeURIComponent).join("/");
  return base.replace(/\/$/, "") + "/storage/v1/object/public/leader-photos/" + path;
}

function levelName(level: string): string {
  return ({
    village: "Umudugudu",
    cell: "Akagari",
    sector: "Umurenge",
    district: "Akarere",
    province: "Intara",
  } as Record<string, string>)[level] ?? level;
}

function contactHref(type: string, value: string): string | null {
  if (type === "office_phone" || type === "mobile_phone") return "tel:" + value.replace(/[^+\d]/g, "");
  if (type === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return digits ? "https://wa.me/" + digits : null;
  }
  if (type === "email") return "mailto:" + value;
  if (type === "website" && /^https?:\/\//i.test(value)) return value;
  return null;
}

export function PublicLeaderDirectory({ candidates }: Props) {
  const [shownCandidates, setShownCandidates] = useState<PublicCandidate[]>([]);
  const [sharedLeaders, setSharedLeaders] = useState<PublicSharedLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nextIndex, setNextIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; alt: string } | null>(null);

  const normalizedCandidates = useMemo(() => {
    const seen = new Set<string>();
    return candidates.filter((candidate) => {
      if (!candidate.scope_code || seen.has(candidate.scope_code)) return false;
      seen.add(candidate.scope_code);
      return true;
    });
  }, [candidates]);

  const loadChunk = useCallback(async (start: number, append: boolean) => {
    const chunk = normalizedCandidates.slice(start, start + 3);
    if (!chunk.length) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setUnavailable(false);
    setMessage(null);
    try {
      const response = await fetch("/api/leader-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ candidates: chunk }),
      });
      const payload = await response.json().catch(() => null) as ApiPayload | null;
      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message_kiny || "Serivisi y'abayobozi ntiri kuboneka.");
      }
      if (payload.unavailable) {
        setUnavailable(true);
        setMessage(payload.message_kiny || "Urutonde rw'abayobozi ntiruboneka ubu. Ongera ugerageze.");
        if (!append) {
          setShownCandidates([]);
          setSharedLeaders([]);
        }
        return;
      }

      const addedCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
      setShownCandidates((current) => {
        const byScope = new Map(current.map((item) => [item.place.scope_code, item]));
        for (const item of addedCandidates) byScope.set(item.place.scope_code, item);
        return [...byScope.values()];
      });
      setSharedLeaders((current) => {
        const ids = new Set(current.map((item) => item.appointment_id));
        const merged = [...current];
        for (const item of payload.shared_leaders ?? []) {
          if (!ids.has(item.appointment_id)) {
            ids.add(item.appointment_id);
            merged.push(item);
          }
        }
        return merged;
      });
      setNextIndex(start + chunk.length);
      setMessage(payload.message_kiny || null);
    } catch (error) {
      setUnavailable(true);
      setMessage(error instanceof Error ? error.message : "Urutonde rw'abayobozi ntiruboneka ubu. Ongera ugerageze.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [normalizedCandidates]);

  useEffect(() => {
    setShownCandidates([]);
    setSharedLeaders([]);
    setNextIndex(0);
    setUnavailable(false);
    setMessage(null);
    if (normalizedCandidates.length) void loadChunk(0, false);
  }, [normalizedCandidates, loadChunk]);

  const exactLeaderIds = new Set(shownCandidates.flatMap((candidate) => candidate.leaders.map((leader) => leader.appointment_id)));
  const visibleShared = sharedLeaders.filter((leader) => !exactLeaderIds.has(leader.appointment_id));
  const hasMore = nextIndex < normalizedCandidates.length;

  if (!normalizedCandidates.length) return null;

  const renderLeader = (
    leader: PublicCandidate["leaders"][number] | PublicSharedLeader,
    placeName: string,
    level: string,
  ) => {
    const thumb = storageUrl(leader.profile.thumbnail_key || leader.profile.photo_key);
    const full = storageUrl(leader.profile.photo_key);
    const contacts = leader.public_contacts ?? [];
    const initials = leader.display_name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();

    return (
      <article key={leader.appointment_id} className="flex items-start gap-3 border-t border-border/70 px-3 py-3">
        {thumb ? (
          <button
            type="button"
            onClick={() => full && setSelectedPhoto({ src: full, alt: leader.display_name })}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
            aria-label={full ? "Reba ifoto nini ya " + leader.display_name : leader.display_name}
            disabled={!full}
          >
            {/* Public photo key is present only on an approved and published profile. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-sky-50 text-sm font-black text-[#00A3E0] dark:bg-sky-950/40">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link href={"/abayobozi/" + leader.appointment_id} className="block min-h-[24px] text-sm font-bold text-foreground underline-offset-2 hover:underline">{leader.display_name}</Link>
          <p className="mt-0.5 text-xs font-semibold text-[#00A3E0]">{leader.position.title_kiny}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{placeName} · {levelName(level)}</p>
          {leader.profile.office_hours && <p className="mt-1 text-[10px] text-muted-foreground">{leader.profile.office_hours}</p>}
          <p className="mt-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
            {leader.appointment.verified_at ? "Yemejwe ku wa " + leader.appointment.verified_at.slice(0, 10) : "Ntibirasuzumwa"}
          </p>
          <Link href={"/abayobozi/" + leader.appointment_id + "#tubwire"} className="mt-1 inline-flex min-h-[36px] items-center text-[10px] font-semibold text-[#00A3E0] underline-offset-2 hover:underline">Hari ikibazo kuri aya makuru?</Link>
          {contacts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contacts.map((contact, index) => {
                const href = contactHref(contact.type, contact.value);
                if (!href) return null;
                const external = href.startsWith("https://");
                const label = contact.label || (contact.type === "whatsapp" ? "WhatsApp" : contact.type === "email" ? "Email" : "Hamagara");
                return (
                  <a
                    key={leader.appointment_id + "-" + index}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-foreground hover:border-[#20603D] hover:bg-[#20603D]/5"
                  >
                    {contact.type === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5 text-[#20603D]" /> : contact.type === "website" ? <ExternalLink className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                    {label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00A3E0]/10 text-[#00A3E0]">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold">Abayobozi b'aho uri</h2>
          <p className="text-[10px] text-muted-foreground">Abayobozi bemejwe kandi bafite umwirondoro wasohowe gusa.</p>
        </div>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 p-4 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Turimo gushaka abayobozi bemejwe...</p>
      ) : unavailable ? (
        <p role="alert" className="p-4 text-xs text-muted-foreground">{message || "Urutonde rw'abayobozi ntiruboneka ubu. Ongera ugerageze."}</p>
      ) : (
        <div>
          {shownCandidates.map((candidate) => (
            <div key={candidate.place.id}>
              <div className="flex items-center justify-between gap-2 bg-muted/25 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{candidate.place.name_kiny}</p>
                  <p className="text-[10px] text-muted-foreground">{levelName(candidate.place.level)} · {candidate.confidence}</p>
                </div>
              </div>
              {candidate.leaders.length ? candidate.leaders.map((leader) => renderLeader(leader, candidate.place.name_kiny, candidate.place.level)) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">Amakuru y'umuyobozi ntaruzuzwa</p>
              )}
            </div>
          ))}

          {visibleShared.length > 0 && (
            <div className="border-t-2 border-[#20603D]/20">
              <div className="flex items-center gap-2 bg-[#20603D]/5 px-3 py-2">
                <Users className="h-4 w-4 text-[#20603D]" />
                <p className="text-xs font-bold text-[#20603D]">Abayobozi basangiye ibice byinshi</p>
              </div>
              {visibleShared.map((leader) => renderLeader(leader, leader.place.name_kiny, leader.place.level))}
            </div>
          )}
          {!shownCandidates.length && <p className="p-4 text-xs text-muted-foreground">Amakuru y'umuyobozi ntaruzuzwa</p>}
          {hasMore && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadChunk(nextIndex, true)}
              className="min-h-[44px] w-full border-t border-border px-4 text-xs font-bold text-[#00A3E0] hover:bg-[#00A3E0]/5 disabled:opacity-50"
            >
              {loadingMore ? "Turimo gushaka andi hantu..." : "Andi hantu ashoboka"}
            </button>
          )}
        </div>
      )}
      <div className="border-t border-border bg-muted/20 px-3 py-2">
        <p className="text-[10px] text-muted-foreground">Amakuru yerekanywa iyo appointment yemejwe kandi public profile yasohowe.</p>
      </div>

      {selectedPhoto && (
        <div role="dialog" aria-modal="true" aria-label={"Ifoto ya " + selectedPhoto.alt} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3" onClick={() => setSelectedPhoto(null)}>
          <button type="button" onClick={() => setSelectedPhoto(null)} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Funga ifoto"><X className="h-5 w-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedPhoto.src} alt={selectedPhoto.alt} className="max-h-[90vh] max-w-full rounded-xl object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
