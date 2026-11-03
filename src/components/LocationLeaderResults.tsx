"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MapPin,
  UserRound,
  X,
  ZoomIn,
} from "lucide-react";
import type { ConfidenceMatch } from "@/types/boundary";
import type { LeaderPublic } from "@/types/leader";
import type { LocateSuccess } from "@/types/location";

type SelectionMethod = "gps" | "map" | "manual" | "nearest" | "offline";

interface LocationLeaderResultsProps {
  data: LocateSuccess;
  onChooseVillage: (scopeCode: string, method: SelectionMethod) => void;
}

const LEVEL_LABELS: Record<string, string> = {
  province: "Intara",
  district: "Akarere",
  sector: "Umurenge",
  cell: "Akagari",
  village: "Umudugudu",
  country: "Igihugu",
};

const ROLE_LABELS: Record<string, string> = {
  "Village Leader": "Umuyobozi w'Umudugudu",
  "Cell Executive Secretary": "Umunyamabanga Nshingwabikorwa w'Akagari",
  "Sector Executive Secretary": "Umunyamabanga Nshingwabikorwa w'Umurenge",
  Mayor: "Umuyobozi w'Akarere",
  "Vice Mayor": "Visi Meya",
  "District Executive Secretary": "Umunyamabanga Nshingwabikorwa w'Akarere",
  Other: "Umwanya utarasobanurwa",
};

const LEVEL_ORDER = ["village", "cell", "sector", "district", "province"] as const;

function fullName(leader: LeaderPublic): string {
  return [leader.first_name, leader.last_name].filter(Boolean).join(" ");
}

function initials(leader: LeaderPublic): string {
  return [leader.first_name, leader.last_name]
    .filter(Boolean)
    .map((part) => part.slice(0, 1))
    .join("")
    .toLocaleUpperCase();
}

function roleName(leader: LeaderPublic): string {
  return ROLE_LABELS[leader.role] ?? leader.role;
}

function getSelectionMethod(source: LocateSuccess["source"]): SelectionMethod {
  if (source === "map") return "map";
  if (source === "offline") return "offline";
  if (source === "nearest") return "nearest";
  if (source === "manual") return "manual";
  return "gps";
}

function confidenceLabel(data: LocateSuccess): { title: string; detail: string } {
  if (data.source === "manual") {
    return { title: "Wahisemo aka gace", detail: "Aho hantu wemeje ni ho tugaragaza." };
  }
  if (data.hierarchy?.village?.center_point_match) {
    return { title: "Aho uri haragaragaye", detail: "Ikimenyetso cya GPS kiri mu mbibi z'uyu mudugudu." };
  }
  if (data.source === "nearest" || data.source === "ip" || data.source === "prior" || data.source === "last-known") {
    return { title: "Igereranya riracyagenzurwa", detail: "Turerekana ahantu hashoboka kurusha ahandi; ushobora kugenzura amahitamo." };
  }
  const villageChoices = data.hierarchyCandidates?.village ?? [];
  if (villageChoices.length > 1) {
    return { title: "Ahantu haracyagereranywa", detail: "Hari ahantu hafi y'aho telefone yatanze; reba amahitamo ari munsi." };
  }
  return { title: "Aho uri haragenzurwa", detail: "Igisubizo gishobora kunozwa uko ibimenyetso biboneka." };
}

function getCandidates(data: LocateSuccess): { level: typeof LEVEL_ORDER[number]; items: ConfidenceMatch[] } {
  for (const level of LEVEL_ORDER) {
    const candidates = data.hierarchyCandidates?.[level] ?? [];
    if (candidates.length > 0) {
      const selectedCode = data.hierarchy?.[level]?.scope_code;
      const ordered = [...candidates].sort((a, b) => {
        if (a.scope_code === selectedCode) return -1;
        if (b.scope_code === selectedCode) return 1;
        return (b.supported_probability ?? b.calibrated_probability ?? b.confidence) -
          (a.supported_probability ?? a.calibrated_probability ?? a.confidence);
      });
      return { level, items: ordered.slice(0, 3) };
    }
    const current = data.hierarchy?.[level];
    if (current) return { level, items: [current] };
  }
  return { level: "province", items: [] };
}

export function LocationLeaderResults({ data, onChooseVillage }: LocationLeaderResultsProps) {
  const [selectedLeader, setSelectedLeader] = useState<LeaderPublic | null>(null);
  const [photoLeader, setPhotoLeader] = useState<LeaderPublic | null>(null);
  const candidates = useMemo(() => getCandidates(data), [data]);
  const leadersByScope = useMemo(
    () => new Map((data.leaders ?? []).map((leader) => [leader.scope_code, leader])),
    [data.leaders],
  );
  const candidateCodes = useMemo(
    () => new Set(candidates.items.map((candidate) => candidate.scope_code)),
    [candidates.items],
  );
  const parentLeaders = useMemo(() => {
    const unique = new Map<string, LeaderPublic>();
    for (const leader of data.leaders ?? []) {
      if (!candidateCodes.has(leader.scope_code)) unique.set(leader.scope_code, leader);
    }
    return Array.from(unique.values()).sort((a, b) => {
      const order = ["cell", "sector", "district", "province"];
      return order.indexOf(a.level) - order.indexOf(b.level);
    });
  }, [candidateCodes, data.leaders]);
  const confidence = confidenceLabel(data);
  const choiceMethod = getSelectionMethod(data.source);

  useEffect(() => {
    if (!selectedLeader && !photoLeader) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPhotoLeader(null);
        setSelectedLeader(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedLeader, photoLeader]);

  return (
    <>
      <section aria-labelledby="location-leader-heading" className="overflow-hidden rounded-2xl border border-sky-100 bg-card shadow-sm dark:border-sky-950">
        <div className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00A3E0]/10 text-[#00A3E0]">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="location-leader-heading" className="text-sm font-extrabold text-foreground">
                  Aho uri n'abayobozi baho
                </h2>
                <p className="text-[11px] text-muted-foreground">Ahantu n'umuyobozi bigaragara hamwe.</p>
              </div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FAD201]/20 px-2.5 py-1 text-[10px] font-bold text-slate-800">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {confidence.title}
          </span>
        </div>

        <p className="px-4 pt-3 text-xs leading-relaxed text-muted-foreground">{confidence.detail}</p>

        <div className="space-y-2 p-3 sm:p-4">
          {candidates.items.length > 0 ? candidates.items.map((candidate, index) => {
            const leader = leadersByScope.get(candidate.scope_code);
            const isVillage = candidate.level === "village";
            const selected = data.hierarchy?.[candidate.level]?.scope_code === candidate.scope_code;

            return (
              <article
                key={candidate.scope_code}
                className="rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:border-[#00A3E0]/50"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {LEVEL_LABELS[candidate.level] ?? "Ahantu"}
                    {index === 0 && candidates.items.length > 1 ? " · Iryo sisitemu ishyira imbere" : ""}
                  </span>
                  {selected && data.source !== "manual" && (
                    <span className="rounded-full bg-[#20603D]/10 px-2 py-0.5 text-[10px] font-semibold text-[#20603D]">
                      Iby'ibanze
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {leader?.photo_url ? (
                    <button
                      type="button"
                      onClick={() => setPhotoLeader(leader)}
                      className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-sky-100 bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                      aria-label={`Reba ifoto ya ${fullName(leader)}`}
                      title="Kanda urebe ifoto nini"
                    >
                      {/* Small lazy-loaded image keeps the list visually light. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={leader.photo_url}
                        alt=""
                        width={44}
                        height={44}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white group-hover:flex">
                        <ZoomIn className="h-4 w-4" aria-hidden />
                      </span>
                    </button>
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00A3E0]/10 text-[#20603D]">
                      <UserRound className="h-5 w-5" aria-hidden />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-foreground">{candidate.name_kiny}</p>
                    {leader ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedLeader(leader)}
                          className="mt-0.5 flex max-w-full items-center gap-1 text-left text-xs font-bold text-[#00A3E0] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                        >
                          <span className="truncate">{fullName(leader)}</span>
                          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                        </button>
                        <p className="truncate text-[11px] text-muted-foreground">{roleName(leader)}</p>
                      </>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">Amakuru y'umuyobozi ntaruzuzwa</p>
                    )}
                  </div>

                  {isVillage && data.source !== "manual" && (
                    <button
                      type="button"
                      onClick={() => onChooseVillage(candidate.scope_code, choiceMethod)}
                      className="min-h-[40px] shrink-0 rounded-lg bg-[#20603D] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[#194d31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                    >
                      Ni ho ndi
                    </button>
                  )}
                </div>
              </article>
            );
          }) : (
            <p className="rounded-xl bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
              Amakuru y'aho uri aracyakusanywa.
            </p>
          )}
        </div>

        {parentLeaders.length > 0 && (
          <div className="border-t border-border/80 bg-muted/20 px-4 py-3">
            <h3 className="mb-2 text-xs font-bold text-foreground">Abandi bayobozi b'inzego zibakuriye</h3>
            <div className="space-y-2">
              {parentLeaders.map((leader) => (
                <div key={leader.scope_code} className="flex items-center gap-2.5">
                  {leader.photo_url ? (
                    <button
                      type="button"
                      onClick={() => setPhotoLeader(leader)}
                      className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border bg-card"
                      aria-label={`Reba ifoto ya ${fullName(leader)}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={leader.photo_url} alt="" width={32} height={32} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#20603D]/10 text-[#20603D]">
                      <UserRound className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{LEVEL_LABELS[leader.level] ?? "Umuyobozi"} · {leader.boundary_name_kiny}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedLeader(leader)}
                      className="max-w-full truncate text-left text-xs font-bold text-[#00A3E0] hover:underline"
                    >
                      {fullName(leader)}
                    </button>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {selectedLeader && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leader-detail-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedLeader(null);
          }}
        >
          <section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedLeader(null)}
                className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Subira inyuma
              </button>
              <button
                type="button"
                onClick={() => setSelectedLeader(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                aria-label="Funga amakuru y'umuyobozi"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                {selectedLeader.photo_url ? (
                  <button
                    type="button"
                    onClick={() => setPhotoLeader(selectedLeader)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-sky-100 bg-muted"
                    aria-label="Reba ifoto nini"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedLeader.photo_url} alt="" width={80} height={80} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#00A3E0]/10 text-[#20603D]">
                    <UserRound className="h-8 w-8" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 id="leader-detail-title" className="text-lg font-extrabold text-foreground">{fullName(selectedLeader)}</h2>
                  <p className="mt-1 text-sm font-bold text-[#00A3E0]">{roleName(selectedLeader)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedLeader.boundary_name_kiny}</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-bold text-foreground">Amakuru rusange</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {selectedLeader.is_verified === true
                    ? "Amakuru y'uyu muyobozi yemejwe."
                    : selectedLeader.is_verified === false
                      ? "Amakuru y'uyu muyobozi aracyagenzurwa."
                      : "Amakuru y'uyu muyobozi aracyuzuzwa cyangwa aracyagenzurwa."}
                </p>
              </div>

              {(selectedLeader.office_hours || selectedLeader.vision_priorities) && (
                <div className="mt-3 space-y-3">
                  {selectedLeader.office_hours && (
                    <div>
                      <h3 className="text-xs font-bold text-foreground">Amasaha yo kwakira abaturage</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedLeader.office_hours}</p>
                    </div>
                  )}
                  {selectedLeader.vision_priorities && (
                    <div>
                      <h3 className="text-xs font-bold text-foreground">Ibyo ashyize imbere</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{selectedLeader.vision_priorities}</p>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-5 text-[11px] text-muted-foreground">Hagaragazwa gusa amakuru rusange yemewe gushyirwa ahagaragara.</p>
            </div>
          </section>
        </div>
      )}

      {photoLeader?.photo_url && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Ifoto ya ${fullName(photoLeader)}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPhotoLeader(null);
          }}
        >
          <button
            type="button"
            onClick={() => setPhotoLeader(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Funga ifoto"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* Full-size image is fetched only after the citizen opens it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoLeader.photo_url}
            alt={`Ifoto ya ${fullName(photoLeader)}`}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-[82vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}
