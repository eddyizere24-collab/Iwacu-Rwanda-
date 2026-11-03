"use client";

import { useEffect, useState } from "react";
import { Phone, Users, MessageCircle, ExternalLink } from "lucide-react";

type PublicContact = {
  type: "office_phone" | "mobile_phone" | "email" | "whatsapp" | "website" | "other";
  label: string | null;
  value: string;
};

type PublicLeader = {
  appointment_id: string;
  display_name: string;
  position_code: string;
  title_kiny: string;
  title_eng: string;
  title_fra: string;
  scope_code: string;
  administrative_unit_name_kiny: string;
  administrative_unit_level: string;
  public_photo_object_key: string | null;
  public_contacts: PublicContact[] | null;
};

type ResponsePayload = {
  status?: string;
  unavailable?: boolean;
  leaders?: PublicLeader[];
  message_kiny?: string;
};

type Props = {
  scopeCode: string | null;
  placeName: string | null;
};

function contactHref(contact: PublicContact): string | null {
  const value = contact.value.trim();
  if (contact.type === "office_phone" || contact.type === "mobile_phone") {
    return "tel:" + value.replace(/[^+\d]/g, "");
  }
  if (contact.type === "whatsapp") {
    const number = value.replace(/[^\d]/g, "");
    return number ? "https://wa.me/" + number : null;
  }
  if (contact.type === "email") return "mailto:" + value;
  if (contact.type === "website" && /^https?:\/\//i.test(value)) return value;
  return null;
}

export function PublicLeaderDirectory({ scopeCode, placeName }: Props) {
  const [leaders, setLeaders] = useState<PublicLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!scopeCode) {
      setLeaders([]);
      setUnavailable(false);
      setFailed(false);
      setLoading(false);
      return () => { cancelled = true; };
    }

    async function load() {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({ scope_code: scopeCode! });
        const response = await fetch("/api/leader-directory?" + params.toString(), { cache: "no-store" });
        const payload = await response.json().catch(() => null) as ResponsePayload | null;
        if (!response.ok || payload?.status !== "success") {
          throw new Error(payload?.message_kiny || "Directory unavailable");
        }
        if (!cancelled) {
          setUnavailable(Boolean(payload.unavailable));
          setLeaders(Array.isArray(payload.leaders) ? payload.leaders : []);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setUnavailable(false);
          setLeaders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [scopeCode]);

  if (!scopeCode) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00A3E0]/10 text-[#00A3E0]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Abayobozi b'aho uri</h2>
            <p className="text-[11px] text-muted-foreground">{placeName || scopeCode}</p>
          </div>
        </div>
        {leaders.length > 0 && (
          <span className="rounded-full bg-[#20603D]/10 px-2.5 py-1 text-[10px] font-bold text-[#20603D]">{leaders.length} basohowe</span>
        )}
      </div>

      {loading ? (
        <p role="status" className="p-4 text-xs text-muted-foreground">Turimo gushaka abayobozi bemejwe muri aka gace...</p>
      ) : unavailable ? (
        <p className="p-4 text-xs text-muted-foreground">Urutonde rw'abayobozi ntirurashyirwa ku rubuga. Aha hazagaragara abayobozi bemejwe gusa.</p>
      ) : failed ? (
        <p className="p-4 text-xs text-muted-foreground">Serivisi y'abayobozi ntiri kuboneka ubu. Ongera ugerageze nyuma.</p>
      ) : leaders.length === 0 ? (
        <p className="p-4 text-xs text-muted-foreground">Nta muyobozi wemejwe kandi wasohowe uranditswe muri aka gace.</p>
      ) : (
        <div className="divide-y divide-border">
          {leaders.map((leader) => (
            <article key={leader.appointment_id} className="flex items-start gap-3 p-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-sky-50 text-sm font-black text-[#00A3E0] dark:bg-sky-950/40">
                {leader.display_name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{leader.display_name}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#00A3E0]">{leader.title_kiny}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{leader.administrative_unit_name_kiny} · {leader.administrative_unit_level}</p>
                {leader.public_contacts?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {leader.public_contacts.map((contact, index) => {
                      const href = contactHref(contact);
                      if (!href) return null;
                      const external = href.startsWith("https://");
                      const label = contact.label || (contact.type === "whatsapp" ? "WhatsApp" : contact.type === "email" ? "Email" : "Hamagara");
                      return (
                        <a
                          key={leader.appointment_id + "-" + index}
                          href={href}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noopener noreferrer" : undefined}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-foreground hover:border-[#20603D] hover:bg-[#20603D]/5"
                        >
                          {contact.type === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5 text-[#20603D]" /> : contact.type === "website" ? <ExternalLink className="h-3.5 w-3.5" /> : contact.type === "email" ? <span>@</span> : <Phone className="h-3.5 w-3.5" />}
                          {label}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="border-t border-border bg-muted/20 px-4 py-2">
        <p className="text-[10px] text-muted-foreground">Abagaragara hano ni abemejwe, bafite appointment ikiriho kandi public profile yabo yasohowe.</p>
      </div>
    </section>
  );
}
