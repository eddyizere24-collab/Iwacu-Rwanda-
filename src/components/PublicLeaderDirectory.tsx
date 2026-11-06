"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MessageCircle, Phone, X } from "lucide-react";
import { LeaderFeedbackForm } from "@/components/LeaderFeedbackForm";
// CHANGED 2026-11-05 CLAUDE: restored full component after a placeholder push; added verification date and profile link; see docs/HANDOFF.md
// CHANGED 2026-11-06 CLAUDE: one-view result: the best place is selected automatically and its leaders show at once;
// other places are at most two small switch chips with words (Byizewe/Giciriritse/Gicye), no percentages; see docs/HANDOFF.md
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

/** The page owns which place is shown (activeScope) so its header and this list always agree. */
type Props = {
  candidates: LeaderPlaceCandidate[];
  activeScope: string | null;
  onActiveChange: (scopeCode: string) => void;
};

const MAX_CANDIDATES = 3;

function storageUrl(key: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !key) return null;
  const path = key.split("/").map(encodeURIComponent).join("/");
  return base.replace(/\/$/, "") + "/storage/v1/object/public/leader-photos/" + path;
}

export function levelName(level: string): string {
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

function confidenceChipClass(word: string): string {
  if (word === "Byizewe") return "bg-[#FAD201] text-[#06231A]";
  if (word === "Giciriritse") return "bg-white/25 text-white";
  return "bg-white/12 text-white/85";
}

export function PublicLeaderDirectory({ candidates, activeScope, onActiveChange }: Props) {
  const [shownCandidates, setShownCandidates] = useState<PublicCandidate[]>([]);
  const [sharedLeaders, setSharedLeaders] = useState<PublicSharedLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; alt: string } | null>(null);

  const normalizedCandidates = useMemo(() => {
    const seen = new Set<string>();
    return candidates
      .filter((candidate) => {
        if (!candidate.scope_code || seen.has(candidate.scope_code)) return false;
        seen.add(candidate.scope_code);
        return true;
      })
      .slice(0, MAX_CANDIDATES);
  }, [candidates]);

  const load = useCallback(async () => {
    if (!normalizedCandidates.length) return;
    setLoading(true);
    setUnavailable(false);
    setMessage(null);
    try {
      const response = await fetch("/api/leader-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ candidates: normalizedCandidates }),
      });
      const payload = await response.json().catch(() => null) as ApiPayload | null;
      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message_kiny || "Serivisi y'abayobozi ntiri kuboneka.");
      }
      if (payload.unavailable) {
        setUnavailable(true);
        setMessage(payload.message_kiny || "Urutonde rw'abayobozi ntiruboneka ubu. Ongera ugerageze.");
        setShownCandidates([]);
        setSharedLeaders([]);
        return;
      }
      setShownCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
      setSharedLeaders(Array.isArray(payload.shared_leaders) ? payload.shared_leaders : []);
    } catch (error) {
      setUnavailable(true);
      setMessage(error instanceof Error ? error.message : "Urutonde rw'abayobozi ntiruboneka ubu. Ongera ugerageze.");
    } finally {
      setLoading(false);
    }
  }, [normalizedCandidates]);

  useEffect(() => {
    setShownCandidates([]);
    setSharedLeaders([]);
    setUnavailable(false);
    setMessage(null);
    if (normalizedCandidates.length) void load();
  }, [normalizedCandidates, load]);

  if (!normalizedCandidates.length) return null;

  const effectiveScope =
    activeScope && normalizedCandidates.some((item) => item.scope_code === activeScope)
      ? activeScope
      : normalizedCandidates[0].scope_code;
  const active = shownCandidates.find((item) => item.place.scope_code === effectiveScope) ?? null;
  const others = shownCandidates.filter((item) => item.place.scope_code !== effectiveScope);
  const exactLeaderIds = new Set(active?.leaders.map((leader) => leader.appointment_id) ?? []);
  const visibleShared = sharedLeaders.filter((leader) => !exactLeaderIds.has(leader.appointment_id));

  const renderLeader = (
    leader: PublicCandidate["leaders"][number] | PublicSharedLeader,
    placeName: string,
    level: string,
  ) => {
    const thumb = storageUrl(leader.profile.thumbnail_key || leader.profile.photo_key);
    const full = storageUrl(leader.profile.photo_key);
    const contacts = leader.public_contacts ?? [];
    const initials = leader.display_name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
    const verified = leader.appointment.verified_at;

    return (
      <article
        key={leader.appointment_id}
        className="rounded-[22px] bg-white p-4 text-[#10261C] shadow-[0_10px_28px_rgba(6,35,26,0.22)]"
      >
        <div className="flex items-start gap-3.5">
          {thumb ? (
            <button
              type="button"
              onClick={() => full && setSelectedPhoto({ src: full, alt: leader.display_name })}
              className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#FAD201] bg-muted"
              aria-label={full ? "Reba ifoto nini ya " + leader.display_name : leader.display_name}
              disabled={!full}
            >
              {/* Public photo key is present only on an approved and published profile. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#FAD201] bg-[#e3ede4] text-lg font-bold text-[#20603D]" aria-hidden>
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={"/abayobozi/" + leader.appointment_id}
              className="font-display block min-h-[24px] text-lg font-semibold leading-tight underline-offset-2 hover:underline"
            >
              {leader.display_name}
            </Link>
            <p className="mt-0.5 text-sm font-semibold text-[#20603D]">{leader.position.title_kiny}</p>
            <p className="mt-0.5 text-xs text-[#4A5D54]">{placeName} · {levelName(level)}</p>
          </div>
        </div>

        {leader.profile.office_hours && (
          <p className="mt-3 text-xs text-[#4A5D54]">{leader.profile.office_hours}</p>
        )}

        <p
          className={
            "mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold " +
            (verified ? "bg-[#FAD201]/30 text-[#06231A]" : "bg-[#eef1ec] text-[#4A5D54]")
          }
        >
          {verified ? "Yemejwe ku wa " + verified.slice(0, 10) : "Ntibirasuzumwa"}
        </p>

        {contacts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {contacts.map((contact, index) => {
              const href = contactHref(contact.type, contact.value);
              if (!href) return null;
              const external = href.startsWith("https://");
              const isCall = contact.type === "office_phone" || contact.type === "mobile_phone" || contact.type === "whatsapp";
              const label = contact.label || (contact.type === "whatsapp" ? "WhatsApp" : contact.type === "email" ? "Email" : "Hamagara");
              return (
                <a
                  key={leader.appointment_id + "-" + index}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className={
                    "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-bold " +
                    (isCall
                      ? "bg-[#20603D] text-white hover:bg-[#184a2f]"
                      : "border border-[#c9d3c9] text-[#10261C] hover:bg-[#20603D]/5")
                  }
                >
                  {contact.type === "whatsapp" ? <MessageCircle className="h-4 w-4" aria-hidden /> : contact.type === "website" ? <ExternalLink className="h-4 w-4" aria-hidden /> : <Phone className="h-4 w-4" aria-hidden />}
                  {label}
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-x-4">
          <Link href={"/abayobozi/" + leader.appointment_id} className="inline-flex min-h-[40px] items-center text-xs font-semibold text-[#20603D] underline underline-offset-2">
            Reba umwirondoro wose
          </Link>
          <Link href={"/abayobozi/" + leader.appointment_id + "#tubwire"} className="inline-flex min-h-[40px] items-center text-xs font-semibold text-[#4A5D54] underline underline-offset-2">
            Hari ikibazo kuri aya makuru?
          </Link>
        </div>
      </article>
    );
  };

  return (
    <div className="text-white">
      {loading ? (
        <p role="status" className="flex items-center gap-2 px-2 py-6 text-sm text-white/90">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Turimo gushaka abayobozi b&apos;aha hantu…
        </p>
      ) : unavailable ? (
        <p role="alert" className="rounded-[22px] bg-white px-4 py-4 text-sm text-[#10261C]">
          {message || "Urutonde rw'abayobozi ntiruboneka ubu. Ongera ugerageze."}
        </p>
      ) : active ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 px-1">
            <h3 className="font-display text-xl font-semibold tracking-tight">Abayobozi b&apos;aha hantu</h3>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white/90">
              {levelName(active.place.level)}
            </span>
            <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + confidenceChipClass(active.confidence)}>
              {active.confidence}
            </span>
          </div>

          {active.leaders.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {active.leaders.map((leader) => renderLeader(leader, active.place.name_kiny, active.place.level))}
            </div>
          ) : (
            <div className="rounded-[22px] bg-white p-4 text-[#10261C] shadow-[0_10px_28px_rgba(6,35,26,0.22)]">
              <p className="text-sm font-bold">Umuyobozi w&apos;aha hantu ntarashyirwa ku rubuga.</p>
              <p className="mt-1 text-xs text-[#4A5D54]">Niba umuzi, utubwire; tuzamugenzura mbere yo kumwerekana.</p>
              <LeaderFeedbackForm administrativeUnitId={active.place.id} />
            </div>
          )}

          {visibleShared.length > 0 && (
            <div className="space-y-3">
              <h4 className="px-1 text-sm font-bold uppercase tracking-wide text-white/85">Abayobozi bo hejuru</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {visibleShared.map((leader) => renderLeader(leader, leader.place.name_kiny, leader.place.level))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div className="px-1 pt-1">
              <p className="text-xs font-semibold text-white/85">Si hano? Ahandi hashoboka:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {others.map((candidate) => (
                  <button
                    key={candidate.place.scope_code}
                    type="button"
                    onClick={() => onActiveChange(candidate.place.scope_code)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    <span>{candidate.place.name_kiny}</span>
                    <span className="text-xs font-normal text-white/80">· {candidate.confidence}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-[22px] bg-white px-4 py-4 text-sm text-[#10261C]">
          Umuyobozi w&apos;aha hantu ntarashyirwa ku rubuga.
        </p>
      )}

      <p className="mt-4 px-1 text-[11px] text-white/70">Hagaragara gusa abayobozi bemejwe kandi bafite umwirondoro wasohowe.</p>

      {selectedPhoto && (
        <div role="dialog" aria-modal="true" aria-label={"Ifoto ya " + selectedPhoto.alt} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3" onClick={() => setSelectedPhoto(null)}>
          <button type="button" onClick={() => setSelectedPhoto(null)} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Funga ifoto"><X className="h-5 w-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedPhoto.src} alt={selectedPhoto.alt} className="max-h-[90vh] max-w-full rounded-xl object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
