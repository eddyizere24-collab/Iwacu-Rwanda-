"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, UserRound, X } from "lucide-react";
import { LeaderFeedbackForm } from "@/components/LeaderFeedbackForm";
// CHANGED 2026-11-05 CLAUDE: restored full component after a placeholder push; added verification date and profile link; see docs/HANDOFF.md
// CHANGED 2026-11-07 CLAUDE: chat-style list: one compact row per leader from district down to the chosen place
// (small photo, place, name); an empty row keeps its place when nobody is registered yet; tap a row for the full profile.
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
  /** Names of the places the engine resolved, by level (district..village). Only passed for the engine's own place. */
  levelNames?: Record<string, string>;
};

const MAX_CANDIDATES = 3;
const LEVEL_ORDER = ["district", "sector", "cell", "village"];

type RowLeader = PublicCandidate["leaders"][number] | PublicSharedLeader;
type Row = { key: string; level: string; placeName: string; leader: RowLeader | null };

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

function confidenceChipClass(word: string): string {
  if (word === "Byizewe") return "bg-[#FAD201] text-[#06231A]";
  if (word === "Giciriritse") return "bg-white/25 text-white";
  return "bg-white/12 text-white/85";
}

/** One compact line per leader, like a chat list: small photo, place, name. Tap the line for the full profile. */
function LeaderRow({ row, onPhoto }: { row: Row; onPhoto: (photo: { src: string; alt: string }) => void }) {
  const { leader } = row;
  const thumb = leader ? storageUrl(leader.profile.thumbnail_key || leader.profile.photo_key) : null;
  const full = leader ? storageUrl(leader.profile.photo_key) : null;
  const initials = leader
    ? leader.display_name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase()
    : "";

  const avatar = thumb ? (
    <button
      type="button"
      onClick={() => full && onPhoto({ src: full, alt: leader?.display_name ?? "" })}
      disabled={!full}
      className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-full border-2 border-[#FAD201] bg-muted"
      aria-label={leader ? "Reba ifoto nini ya " + leader.display_name : undefined}
    >
      {/* Public photo key is present only on an approved and published profile. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
    </button>
  ) : (
    <div
      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-[#FAD201] bg-[#e3ede4] text-base font-bold text-[#20603D]"
      aria-hidden
    >
      {initials || <UserRound className="h-6 w-6" />}
    </div>
  );

  const text = (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-[#20603D]">
        {levelName(row.level)} · <span className="normal-case tracking-normal">{row.placeName}</span>
      </p>
      {leader ? (
        <>
          <p className="truncate text-base font-bold leading-tight text-[#10261C]">{leader.display_name}</p>
          <p className="truncate text-xs text-[#4A5D54]">{leader.position.title_kiny}</p>
        </>
      ) : (
        <div aria-hidden>
          <div className="mt-1.5 h-4 w-3/5 rounded-full bg-[#e3e9e3]" />
          <div className="mt-1.5 h-3 w-2/5 rounded-full bg-[#eef1ec]" />
        </div>
      )}
    </div>
  );

  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5">
      {avatar}
      {leader ? (
        <Link
          href={"/abayobozi/" + leader.appointment_id}
          className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2"
          aria-label={"Reba umwirondoro wa " + leader.display_name}
        >
          {text}
          <ChevronRight className="h-5 w-5 shrink-0 text-[#8a978f]" aria-hidden />
        </Link>
      ) : (
        <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2">{text}</div>
      )}
    </li>
  );
}

export function PublicLeaderDirectory({ candidates, activeScope, onActiveChange, levelNames }: Props) {
  const [shownCandidates, setShownCandidates] = useState<PublicCandidate[]>([]);
  const [sharedLeaders, setSharedLeaders] = useState<PublicSharedLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
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
        setShownCandidates([]);
        setSharedLeaders([]);
        return;
      }
      setShownCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
      setSharedLeaders(Array.isArray(payload.shared_leaders) ? payload.shared_leaders : []);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [normalizedCandidates]);

  useEffect(() => {
    setShownCandidates([]);
    setSharedLeaders([]);
    setUnavailable(false);
    if (normalizedCandidates.length) void load();
  }, [normalizedCandidates, load]);

  if (!normalizedCandidates.length) return null;

  const effectiveScope =
    activeScope && normalizedCandidates.some((item) => item.scope_code === activeScope)
      ? activeScope
      : normalizedCandidates[0].scope_code;
  const activePlaceInfo = normalizedCandidates.find((item) => item.scope_code === effectiveScope) ?? normalizedCandidates[0];
  const active = shownCandidates.find((item) => item.place.scope_code === effectiveScope) ?? null;
  const others = shownCandidates.filter((item) => item.place.scope_code !== effectiveScope);
  const exactLeaderIds = new Set(active?.leaders.map((leader) => leader.appointment_id) ?? []);
  const visibleShared = sharedLeaders.filter((leader) => !exactLeaderIds.has(leader.appointment_id));

  // One row per leader, from district down to the chosen place. A level with nobody yet keeps an empty row,
  // so the list has the same shape whether or not leaders have been registered.
  const unitsToShow = LEVEL_ORDER.slice(0, Math.max(LEVEL_ORDER.indexOf(activePlaceInfo.level), 0) + 1);
  const rows: Row[] = [];
  for (const level of unitsToShow) {
    const found: Array<{ leader: RowLeader; placeName: string }> = [];
    let name: string | undefined = levelNames?.[level];
    if (level === activePlaceInfo.level) {
      name = activePlaceInfo.name_kiny;
      for (const leader of active?.leaders ?? []) found.push({ leader, placeName: activePlaceInfo.name_kiny });
    }
    for (const leader of visibleShared) {
      if (leader.place.level !== level) continue;
      name = name ?? leader.place.name_kiny;
      found.push({ leader, placeName: leader.place.name_kiny });
    }
    if (!name) continue;
    if (found.length === 0) {
      rows.push({ key: level + "-empty", level, placeName: name, leader: null });
    } else {
      for (const item of found) {
        rows.push({ key: level + "-" + item.leader.appointment_id, level, placeName: item.placeName, leader: item.leader });
      }
    }
  }
  const hasEmptyRow = rows.some((row) => row.leader === null);

  return (
    <div className="text-white">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 px-1">
          <h3 className="font-display text-xl font-semibold tracking-tight">Abayobozi b&apos;aho uri</h3>
          {active && !unavailable && (
            <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + confidenceChipClass(active.confidence)}>
              {active.confidence}
            </span>
          )}
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/80" aria-label="Turimo gushaka" />}
        </div>

        <ul className="divide-y divide-[#e3e9e3] overflow-hidden rounded-[22px] bg-white shadow-[0_10px_28px_rgba(6,35,26,0.22)]">
          {rows.map((row) => (
            <LeaderRow key={row.key} row={row} onPhoto={setSelectedPhoto} />
          ))}
        </ul>

        {hasEmptyRow && !loading && !unavailable && active && (
          <details className="rounded-[22px] bg-white/95 px-4 text-[#10261C] shadow">
            <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-[#20603D]">
              Tubwire umuyobozi
            </summary>
            <div className="pb-3">
              <LeaderFeedbackForm administrativeUnitId={active.place.id} />
            </div>
          </details>
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

      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={"Ifoto ya " + selectedPhoto.alt}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Funga ifoto"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhoto.src}
            alt={selectedPhoto.alt}
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
