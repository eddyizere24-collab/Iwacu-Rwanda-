import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Phone, UserRound } from "lucide-react";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { LeaderFeedbackForm } from "@/components/LeaderFeedbackForm";
import { cookies } from "next/headers";
import { normalizeLocale, translateText } from "@/lib/i18n";

// CHANGED 2026-11-07 CLAUDE: profile "room" for a place whose leader is not registered yet: same shape as a real
// profile, with empty slots. If a leader has been registered meanwhile, go to that leader's profile.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE_RE = /^RW(?:-[A-Z0-9]{1,12}){0,5}$/;

const LEVELS: Record<string, string> = {
  village: "Umudugudu",
  cell: "Akagari",
  sector: "Umurenge",
  district: "Akarere",
  province: "Intara",
};

type Place = { id: string; scope_code: string; name_kiny: string; name_eng?: string | null; level: string };

async function loadPlace(scopeCode: string): Promise<{ place: Place; leaderId: string | null } | null> {
  if (!SCOPE_RE.test(scopeCode) || !isSupabasePublicConfigured()) return null;
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("get_leader_candidates_v2", { p_scope_codes: [scopeCode] });
  if (error || !data || typeof data !== "object") return null;
  const first = (data as { candidates?: Array<{ place?: Partial<Place>; leaders?: Array<{ appointment_id?: string }> }> })
    .candidates?.[0];
  const place = first?.place;
  if (!place?.id || !place.scope_code || !place.name_kiny || !place.level) return null;
  const leaderId = first?.leaders?.[0]?.appointment_id ?? null;
  return { place: place as Place, leaderId: typeof leaderId === "string" ? leaderId : null };
}

function Bars({ widths }: { widths: string[] }) {
  return (
    <div className="mt-2 space-y-2" aria-hidden>
      {widths.map((w, i) => (
        <div key={i} className="h-3.5 rounded-full bg-[#eef1ec]" style={{ width: w }} />
      ))}
    </div>
  );
}

type PageProps = {
  params: Promise<{ scopeCode: string }>;
  searchParams: Promise<{ n?: string | string[]; l?: string | string[] }>;
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The place comes from the registry when it can be read; otherwise from the row that was tapped (display only). */
async function resolvePlace(scopeCode: string, sp: { n?: string | string[]; l?: string | string[] }) {
  const found = await loadPlace(scopeCode);
  if (found) return { place: found.place as Place, leaderId: found.leaderId, unitId: found.place.id as string | null };
  const name = first(sp.n).trim().slice(0, 80);
  const level = first(sp.l);
  if (!SCOPE_RE.test(scopeCode) || !name || !(level in LEVELS)) return null;
  return { place: { id: "", scope_code: scopeCode, name_kiny: name, level } as Place, leaderId: null, unitId: null };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("iwacu-locale")?.value);
  const { scopeCode } = await params;
  const found = await resolvePlace(scopeCode, await searchParams);
  const placeName = found && locale === "en" ? found.place.name_eng ?? found.place.name_kiny : found?.place.name_kiny ?? "Aho uri";
  return { title: placeName + " · " + translateText("Ubuyobozi Bwacu", locale) };
}

export default async function PlaceRoomPage({ params, searchParams }: PageProps) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("iwacu-locale")?.value);
  const { scopeCode } = await params;
  const found = await resolvePlace(scopeCode, await searchParams);
  if (!found) notFound();
  if (found.leaderId) redirect("/abayobozi/" + found.leaderId);
  const { place, unitId } = found;
  const displayPlaceName = locale === "en" ? place.name_eng ?? place.name_kiny : place.name_kiny;
  const displayLevel = translateText(LEVELS[place.level] ?? place.level, locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        <span>Subira inyuma</span>
      </Link>

      <article className="mt-4 overflow-hidden rounded-[28px] border border-white/70 bg-card shadow-[0_18px_48px_rgba(6,35,26,0.16)]">
        <div className="photo-surface photo-canopy relative flex flex-col items-center gap-4 p-6 pt-8 sm:flex-row sm:items-start sm:p-8 sm:pt-10">
          <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
          <div
            className="flex h-[160px] w-[160px] shrink-0 items-center justify-center rounded-full border-4 border-white/90 bg-[#e3ede4] text-[#20603D] shadow-lg sm:h-[180px] sm:w-[180px]"
            aria-hidden
          >
            <UserRound className="h-14 w-14" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mx-auto h-8 w-3/4 rounded-full bg-white/25 sm:mx-0" aria-hidden />
            <div className="mx-auto mt-3 h-4 w-1/2 rounded-full bg-white/20 sm:mx-0" aria-hidden />
            <p className="mt-3 text-sm text-white/90">
              {displayLevel} · {displayPlaceName}
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {[
            { title: "Yatangiye akazi ku wa", widths: ["30%"] },
            { title: "Amasaha y'akazi", widths: ["45%"] },
            { title: "Imihigo", widths: ["90%", "75%", "60%"] },
            { title: "Ibiografi", widths: ["95%", "85%", "70%", "40%"] },
          ].map((section) => (
            <section key={section.title}>
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
              <Bars widths={section.widths} />
            </section>
          ))}

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Aho wahamagara</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#e3e9e3] px-3 text-xs font-semibold text-[#8a978f]"
                aria-hidden
              >
                <Phone className="h-3.5 w-3.5" /> Hamagara
              </span>
            </div>
          </section>

          {unitId && (
            <div id="tubwire">
              <LeaderFeedbackForm administrativeUnitId={unitId} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
