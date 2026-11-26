"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Crosshair, MapPin, Search } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { orderForPerson, type SearchResult, type SearchUnit } from "@/lib/administrative-search";

type BoundaryLevel = "province" | "district" | "sector" | "cell" | "village";
type Choice = {
  id: string;
  code: string;
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: BoundaryLevel;
  parent_id: string | null;
};
type SavedVillage = { scope_code: string; name_kiny: string; confirmed_at?: string };
type Crumb = { level: BoundaryLevel; parentId: string; label: string; labelEng?: string | null };
type ApiResponse = { status: string; units?: Choice[] };

const NEXT_LEVEL: Record<BoundaryLevel, BoundaryLevel | null> = {
  province: "district",
  district: "sector",
  sector: "cell",
  cell: "village",
  village: null,
};
const LABEL: Record<BoundaryLevel, string> = {
  province: "Intara 4 n'Umujyi wa Kigali",
  district: "Akarere",
  sector: "Umurenge",
  cell: "Akagari",
  village: "Umudugudu",
};
const CACHE_PREFIX = "iwacu-static-picker-v5:";
const TITLE: Record<BoundaryLevel, string> = {
  province: "Intara", district: "Akarere", sector: "Umurenge", cell: "Akagari", village: "Umudugudu",
};
const SCOPE_PATTERN = /^RW(?:-[0-9A-Z]+)*$/;
const LEVELS = new Set<string>(["province", "district", "sector", "cell", "village"]);
const FIRST_PAGE = 20;

function cleanUnits(value: unknown): SearchUnit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): SearchUnit[] => {
    const unit = item as Partial<SearchUnit> | null;
    if (!unit || typeof unit.scope_code !== "string" || !SCOPE_PATTERN.test(unit.scope_code) ||
      typeof unit.name_kiny !== "string" || !unit.name_kiny || !LEVELS.has(String(unit.level)) || !Array.isArray(unit.path)) return [];
    const path = unit.path.filter((a) => a && typeof a.scope_code === "string" && SCOPE_PATTERN.test(a.scope_code) &&
      typeof a.name_kiny === "string" && LEVELS.has(String(a.level)));
    return [{
      scope_code: unit.scope_code, name_kiny: unit.name_kiny, name_eng: typeof unit.name_eng === "string" ? unit.name_eng : null,
      level: unit.level as BoundaryLevel, lat: typeof unit.lat === "number" ? unit.lat : null,
      lng: typeof unit.lng === "number" ? unit.lng : null, tier: typeof unit.tier === "number" ? unit.tier : 3, path,
    }];
  });
}
function shortName(name: string): string {
  return name.replace(/^(intara y'|umujyi wa |akarere ka |umurenge wa |akagari ka )/i, "");
}
function formatMeters(meters: number): string {
  return meters < 950 ? Math.max(50, Math.round(meters / 50) * 50) + " m" : (meters < 10000 ? (meters / 1000).toFixed(1) : String(Math.round(meters / 1000))) + " km";
}

function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}
function cacheKey(level: BoundaryLevel, parentId: string, query: string): string {
  return CACHE_PREFIX + level + ":" + (parentId || "root") + ":" + normalizeName(query);
}
function readCache(key: string): Choice[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value as Choice[] : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, value: Choice[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be disabled */ }
}
async function loadChoices(level: BoundaryLevel, parentId: string, query: string): Promise<Choice[]> {
  const key = cacheKey(level, parentId, query);
  const cached = readCache(key);
  if (typeof navigator !== "undefined" && navigator.onLine === false) return cached ?? [];

  const params = new URLSearchParams({ level });
  if (parentId) params.set("parent_id", parentId);
  if (query.trim()) params.set("q", query.trim());
  try {
    const response = await fetch("/api/administrative-units?" + params.toString());
    if (!response.ok) throw new Error("database_picker_unavailable");
    const payload = await response.json() as ApiResponse;
    if (payload.status !== "success" || !Array.isArray(payload.units)) {
      throw new Error("database_picker_unavailable");
    }
    const valid = payload.units.filter((item) =>
      item && item.id && item.scope_code && item.name_kiny && item.level === level &&
      (level === "province" || item.parent_id === parentId)
    );
    writeCache(key, valid);
    return valid;
  } catch {
    return cached ?? [];
  }
}

export function VillagePicker({ onSelect }: { onSelect: (scopeCode: string) => void }) {
  const { locale, t } = useI18n();
  const [level, setLevel] = useState<BoundaryLevel>("province");
  const [parentId, setParentId] = useState("");
  const [history, setHistory] = useState<Array<{ level: BoundaryLevel; parentId: string; crumbs: Crumb[] }>>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([
    { level: "province", parentId: "", label: "Intara" },
  ]);
  const [query, setQuery] = useState("");
  const [visibleChoices, setVisibleChoices] = useState<Choice[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [lastVillage, setLastVillage] = useState<SavedVillage | null>(null);
  const [found, setFound] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [shown, setShown] = useState(FIRST_PAGE);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [canAskPosition, setCanAskPosition] = useState(false);
  const text = query.trim();
  const searchMode = text.length >= 2;

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = localStorage.getItem("iwacu-confirmed-village");
      if (saved) setLastVillage(JSON.parse(saved) as SavedVillage);
    } catch { /* storage may be disabled */ }

    const key = cacheKey(level, parentId, "");
    const cached = readCache(key);
    if (cached) {
      setVisibleChoices(cached);
      setBusy(false);
      setMessage("");
    } else {
      setVisibleChoices([]);
      setBusy(true);
    }

    loadChoices(level, parentId, "")
      .then((choices) => {
        if (cancelled) return;
        setVisibleChoices(choices);
        setMessage("");
      })
      .catch(() => {
        if (!cancelled) setMessage("Urutonde ntirubashije gufunguka. Ongera uhuze interineti.");
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [level, parentId]);

  // One search over every level while typing: every place with that name, with the places above it.
  useEffect(() => {
    if (text.length < 2) { setFound(null); setSearching(false); setSearchFailed(false); return; }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/administrative-units/search?q=" + encodeURIComponent(text), { signal: controller.signal });
        if (!response.ok) throw new Error("search_unavailable");
        const payload = await response.json() as { status?: string; total?: number; units?: unknown };
        if (controller.signal.aborted) return;
        if (payload.status !== "success") throw new Error("search_unavailable");
        const units = cleanUnits(payload.units);
        setFound({ total: Math.max(units.length, Number(payload.total) || 0), units });
        setSearchFailed(false);
        setShown(FIRST_PAGE);
      } catch {
        if (!controller.signal.aborted) { setSearchFailed(true); setFound(null); }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text]);

  // Where the person is stays on the phone: it only orders the answers by distance. Asked for only on a tap.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    let cancelled = false;
    const read = () => navigator.geolocation.getCurrentPosition(
      (p) => { if (!cancelled) { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); setCanAskPosition(false); } },
      () => { if (!cancelled) setCanAskPosition(false); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" }).then((status) => {
        if (cancelled) return;
        if (status.state === "granted") read();
        else if (status.state === "prompt") setCanAskPosition(true);
      }).catch(() => { if (!cancelled) setCanAskPosition(true); });
    } else {
      setCanAskPosition(true);
    }
    return () => { cancelled = true; };
  }, []);

  function askPosition() {
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); setCanAskPosition(false); },
      () => setCanAskPosition(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  const ordered = useMemo(
    () => (found ? orderForPerson(found.units, position, parentId) : []),
    [found, position, parentId],
  );

  /** A village is the answer; anything bigger opens, with the whole way down to it shown in the trail. */
  function chooseFound(unit: SearchUnit) {
    if (unit.level === "village") { onSelect(unit.scope_code); return; }
    const nextLevel = NEXT_LEVEL[unit.level];
    if (!nextLevel) return;
    const chain = [...unit.path, unit].map((place): Crumb => ({
      level: NEXT_LEVEL[place.level] ?? place.level, parentId: place.scope_code, label: place.name_kiny, labelEng: place.name_eng,
    }));
    setHistory([]);
    setCrumbs([{ level: "province", parentId: "", label: "Intara" }, ...chain]);
    setParentId(unit.scope_code);
    setLevel(nextLevel);
    setQuery("");
  }

  function choose(choice: Choice) {
    if (choice.level === "village") {
      onSelect(choice.scope_code);
      return;
    }
    const nextLevel = NEXT_LEVEL[choice.level];
    if (!nextLevel) return;
    setHistory((previous) => [...previous, { level, parentId, crumbs }]);
    setParentId(choice.id);
    setLevel(nextLevel);
    setCrumbs((previous) => [...previous, {
      level: nextLevel,
      parentId: choice.id,
      label: choice.name_kiny,
      labelEng: choice.name_eng,
    }]);
    setQuery("");
  }

  function goBackTo(index: number) {
    const crumb = crumbs[index];
    if (!crumb) return;
    setLevel(crumb.level);
    setParentId(crumb.parentId);
    setCrumbs((previous) => previous.slice(0, index + 1));
    setHistory((previous) => previous.slice(0, index));
    setQuery("");
  }

  const savedVillageIsKnown = useMemo(() => Boolean(
    lastVillage && visibleChoices.some(
      (choice) => choice.level === "village" && choice.scope_code === lastVillage.scope_code
    )
  ), [lastVillage, visibleChoices]);

  // If the one search cannot be reached (no connection), typing still narrows the list being browsed.
  const browseChoices = useMemo(() => {
    if (!(searchMode && searchFailed)) return visibleChoices;
    const needle = normalizeName(text);
    return visibleChoices.filter((choice) => normalizeName(choice.name_kiny).includes(needle) || normalizeName(choice.name_eng ?? "").includes(needle));
  }, [visibleChoices, searchMode, searchFailed, text]);

  return (
    <section aria-labelledby="iwacu-village-picker-title" aria-busy={busy} className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-[#20603D]" aria-hidden />
        <h2 id="iwacu-village-picker-title" className="text-sm font-bold">{t("Guhindura ahagaragajwe (Si hano?)")}</h2>
      </div>

      <nav aria-label={t("Aho uri mu nzego z'ubuyobozi")} className="mb-3 flex flex-wrap items-center gap-1 text-xs">
        {crumbs.map((crumb, index) => (
          <span key={crumb.level + ":" + index} className="inline-flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />}
            <button type="button" onClick={() => goBackTo(index)}
              className="min-h-[44px] rounded-md px-1.5 font-semibold text-[#20603D] hover:bg-[#20603D]/5">
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {savedVillageIsKnown && lastVillage && (
        <div className="mb-3 rounded-xl bg-emerald-500/10 p-3">
          <p className="text-xs text-muted-foreground">Umudugudu wari wemeje mbere</p>
          <p className="mt-1 text-sm font-semibold">{lastVillage.name_kiny}</p>
          <button type="button" onClick={() => onSelect(lastVillage.scope_code)}
            className="mt-2 min-h-[44px] rounded-lg border border-emerald-700/30 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Ongera uwemeze
          </button>
        </div>
      )}

      <label className="flex min-h-[46px] items-center gap-2 rounded-xl border border-border bg-background px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Shakisha umudugudu, akagari, umurenge…")}
          className="w-full bg-transparent py-2 text-sm outline-none" aria-label={t("Shakisha ahantu")} />
      </label>

      {searchMode && !searchFailed && (
        <div className="mt-3">
          {canAskPosition && (
            <button type="button" onClick={askPosition}
              className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#20603D]/30 px-3 text-xs font-semibold text-[#20603D] hover:bg-[#20603D]/5">
              <Crosshair className="h-4 w-4" aria-hidden />{t("Hafi yanjye")}
            </button>
          )}
          {searching && !found && <p role="status" aria-live="polite" className="py-3 text-sm text-muted-foreground">{t("Turimo gushakisha…")}</p>}
          {found && ordered.length === 0 && !searching && (
            <p role="status" className="py-3 text-sm text-muted-foreground">{t("Nta hantu habonetse. Gerageza irindi zina cyangwa andika neza.")}</p>
          )}
          {found && ordered.length > 0 && (
            <p role="status" aria-live="polite" aria-atomic="true" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Ahantu habonetse")} ({found.total.toLocaleString("rw-RW")})
            </p>
          )}
          <ul className="mt-2 max-h-[340px] space-y-2 overflow-y-auto">
            {ordered.slice(0, shown).map((unit) => (
              <li key={unit.scope_code}>
                <button type="button" onClick={() => chooseFound(unit)}
                  className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:border-[#20603D] hover:bg-[#20603D]/5 focus:outline-none focus:ring-2 focus:ring-[#20603D]">
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {locale === "en" && unit.name_eng ? unit.name_eng : unit.name_kiny}{" "}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#20603D]">{t(TITLE[unit.level])}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {unit.path.map((place) => shortName(place.name_kiny)).join(" › ")}
                      {unit.meters !== null ? (unit.path.length ? " · " : "") + formatMeters(unit.meters) : ""}
                    </span>
                  </span>
                  {unit.level === "village"
                    ? <MapPin className="h-4 w-4 shrink-0 text-[#20603D]" aria-hidden />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
          {ordered.length > shown && (
            <button type="button" onClick={() => setShown((count) => count + 30)}
              className="mt-2 min-h-[44px] w-full rounded-xl border border-border px-3 text-xs font-semibold text-[#20603D] hover:bg-[#20603D]/5">
              {t("Erekana ibindi")} ({(ordered.length - shown).toLocaleString("rw-RW")})
            </button>
          )}
        </div>
      )}

      {!(searchMode && !searchFailed) && !busy && browseChoices.length > 0 && (
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {LABEL[level]} ({browseChoices.length.toLocaleString("rw-RW")})
        </p>
      )}
      {!(searchMode && !searchFailed) && busy && <p role="status" aria-live="polite" className="py-4 text-sm text-muted-foreground">Turimo gufungura uru rwego…</p>}
      {!(searchMode && !searchFailed) && !busy && message && <p role="status" className="py-3 text-sm text-amber-700">{message}</p>}
      {!(searchMode && !searchFailed) && !busy && !message && browseChoices.length === 0 && (
        <p className="py-3 text-sm text-muted-foreground">
          Nta mazina abitswe kuri uru rwego. Subira ku rwego rubanziriza cyangwa uhuze interineti.
        </p>
      )}

      {!(searchMode && !searchFailed) && !message && (
        <div className="mt-2 grid max-h-[300px] gap-2 overflow-y-auto sm:grid-cols-2">
          {browseChoices.map((choice) => (
            <button type="button" key={choice.id} onClick={() => choose(choice)}
              className="flex min-h-[46px] items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:border-[#20603D] hover:bg-[#20603D]/5 focus:outline-none focus:ring-2 focus:ring-[#20603D]">
              <span>
                <span className="block font-semibold">{locale === "en" && choice.name_eng ? choice.name_eng : choice.name_kiny}</span>
                {locale === "en" ? (
                  choice.name_kiny !== choice.name_eng && <span className="block text-xs text-muted-foreground">{choice.name_kiny}</span>
                ) : (
                  choice.name_eng && choice.name_eng !== choice.name_kiny && <span className="block text-xs text-muted-foreground">{choice.name_eng}</span>
                )}
              </span>
              {choice.level === "village"
                ? <MapPin className="h-4 w-4 shrink-0 text-[#20603D]" aria-hidden />
                : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Urutonde rwemewe rwubakiye mu rubuga, rukabikwa kuri telefone kugira ngo rukomeze gukora no offline.
      </p>
    </section>
  );
}
