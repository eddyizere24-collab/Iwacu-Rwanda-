import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle, Phone } from "lucide-react";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { LeaderFeedbackForm } from "@/components/LeaderFeedbackForm";

// CHANGED 2026-11-05 GROK: public leader profile page (room); see docs/BUILD_M2_PUBLIC_LEADER_VIEW.md

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PublicRow = {
  appointment_id: string;
  person_id: string;
  display_name: string;
  title_kiny: string | null;
  title_eng: string | null;
  administrative_unit_name_kiny: string | null;
  administrative_unit_name_eng: string | null;
  administrative_unit_level: string | null;
  scope_code: string | null;
  effective_from: string | null;
  biography: string | null;
  office_hours: string | null;
  service_priorities: string | null;
  public_photo_object_key: string | null;
  public_photo_thumbnail_key: string | null;
  public_contacts: Array<{ type: string; label: string | null; value: string }> | null;
  verified_at: string | null;
};

function storageUrl(key: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !key) return null;
  const path = key.split("/").map(encodeURIComponent).join("/");
  return base.replace(/\/$/, "") + "/storage/v1/object/public/leader-photos/" + path;
}

function levelName(level: string | null): string {
  if (!level) return "";
  return (
    {
      village: "Umudugudu",
      cell: "Akagari",
      sector: "Umurenge",
      district: "Akarere",
      province: "Intara",
      country: "Igihugu",
    } as Record<string, string>
  )[level] ?? level;
}

function contactHref(type: string, value: string): string | null {
  if (type === "office_phone" || type === "mobile_phone") {
    return "tel:" + value.replace(/[^\d+]/g, "");
  }
  if (type === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return digits ? "https://wa.me/" + digits : null;
  }
  if (type === "email") return "mailto:" + value;
  if (type === "website" && /^https?:\/\//i.test(value)) return value;
  return null;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

async function loadLeader(appointmentId: string): Promise<PublicRow | null> {
  if (!isSupabasePublicConfigured()) return null;
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("leader_directory_public")
    .select(
      "appointment_id,person_id,display_name,title_kiny,title_eng,administrative_unit_name_kiny,administrative_unit_name_eng,administrative_unit_level,scope_code,effective_from,biography,office_hours,service_priorities,public_photo_object_key,public_photo_thumbnail_key,public_contacts,verified_at",
    )
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PublicRow;
}

type PageProps = { params: Promise<{ appointmentId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appointmentId } = await params;
  if (!UUID_RE.test(appointmentId)) {
    return { title: "Umuyobozi ntabwo abonetse · Ubuyobozi Bwacu" };
  }
  const leader = await loadLeader(appointmentId);
  if (!leader) {
    return { title: "Umuyobozi ntabwo abonetse · Ubuyobozi Bwacu" };
  }
  const title = `${leader.display_name} · ${leader.title_kiny ?? "Umuyobozi"}`;
  const description = [
    leader.title_kiny,
    leader.administrative_unit_name_kiny,
    levelName(leader.administrative_unit_level),
  ]
    .filter(Boolean)
    .join(" · ");
  const photo = storageUrl(leader.public_photo_object_key || leader.public_photo_thumbnail_key);
  return {
    title: `${title} · Ubuyobozi Bwacu`,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(photo ? { images: [{ url: photo }] } : {}),
    },
  };
}

export default async function LeaderProfilePage({ params }: PageProps) {
  const { appointmentId } = await params;
  if (!UUID_RE.test(appointmentId)) notFound();

  const leader = await loadLeader(appointmentId);
  if (!leader) notFound();

  const photo = storageUrl(leader.public_photo_object_key || leader.public_photo_thumbnail_key);
  const initials = leader.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  const verified = formatDate(leader.verified_at);
  const contacts = Array.isArray(leader.public_contacts) ? leader.public_contacts : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        <span>Subira ku bisubizo</span>
      </Link>

      <article className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-center gap-4 border-b border-border p-6 sm:flex-row sm:items-start">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={`Ifoto ya ${leader.display_name}, ${leader.title_kiny ?? ""}`}
              width={180}
              height={180}
              loading="lazy"
              className="h-[160px] w-[160px] shrink-0 rounded-2xl object-cover sm:h-[180px] sm:w-[180px]"
            />
          ) : (
            <div
              className="flex h-[160px] w-[160px] shrink-0 items-center justify-center rounded-2xl border border-border bg-sky-50 text-3xl font-black text-[#00A3E0] dark:bg-sky-950/40 sm:h-[180px] sm:w-[180px]"
              aria-hidden
            >
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {leader.display_name}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#00A3E0]">
              {leader.title_kiny}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[leader.administrative_unit_name_kiny, levelName(leader.administrative_unit_level)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {verified && (
              <p className="mt-2 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                Yemejwe ku wa {verified}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {leader.office_hours && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Amasaha y&apos;akazi
              </h2>
              <p className="mt-1 text-sm text-foreground">{leader.office_hours}</p>
            </section>
          )}

          {leader.service_priorities && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Intego n&apos;ibanze
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {leader.service_priorities}
              </p>
            </section>
          )}

          {leader.biography && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Ibiografi
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {leader.biography}
              </p>
            </section>
          )}

          {contacts.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Aho wahamagara
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {contacts.map((contact, index) => {
                  const href = contactHref(contact.type, contact.value);
                  if (!href) return null;
                  const external = href.startsWith("https://");
                  const label =
                    contact.label ||
                    (contact.type === "whatsapp"
                      ? "WhatsApp"
                      : contact.type === "email"
                        ? "Email"
                        : "Hamagara");
                  return (
                    <a
                      key={`${contact.type}-${index}`}
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-foreground hover:border-[#20603D] hover:bg-[#20603D]/5"
                    >
                      {contact.type === "whatsapp" ? (
                        <MessageCircle className="h-3.5 w-3.5 text-[#20603D]" aria-hidden />
                      ) : contact.type === "website" ? (
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {label}
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          <div id="tubwire">
            <LeaderFeedbackForm appointmentId={leader.appointment_id} />
          </div>
        </div>
      </article>
    </div>
  );
}
