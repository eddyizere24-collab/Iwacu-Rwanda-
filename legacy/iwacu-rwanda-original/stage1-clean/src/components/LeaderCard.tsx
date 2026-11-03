"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Globe, MessageCircle, Send } from "lucide-react";
import type { LeaderPublic, PublicContact } from "@/types/leader";

interface LeaderCardProps {
  leader: LeaderPublic;
  className?: string;
}

const ICONS: Record<string, typeof Phone> = { phone: Phone, whatsapp: MessageCircle, email: Mail, telegram: Send };

function initials(first: string, last: string): string {
  return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || "?";
}

function ContactButton({ c }: { c: PublicContact }) {
  const Icon = ICONS[c.kind] ?? Globe;
  const isPhone = c.kind === "phone";
  const base = "inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2";
  const look = isPhone
    ? "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600 focus-visible:ring-offset-2"
    : "border border-border bg-background text-foreground hover:bg-muted focus-visible:ring-blue-600";
  const text = (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${isPhone ? "" : "text-blue-600"}`} aria-hidden />
      <span className="min-w-0">
        {isPhone && <span className="mr-1">Hamagara</span>}
        <span className="break-all">{c.display}</span>
        {c.label && <span className="ml-1 text-xs opacity-80">({c.label})</span>}
      </span>
    </>
  );
  if (!c.href) {
    return (
      <span className={`${base} border border-border bg-background text-foreground`} title={c.kind_label_kiny}>
        {text}
      </span>
    );
  }
  const external = c.href.startsWith("https://");
  return (
    <a
      href={c.href}
      className={`${base} ${look}`}
      title={c.kind_label_kiny}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {text}
    </a>
  );
}

export function LeaderCard({ leader, className = "" }: LeaderCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const fullName = `${leader.first_name} ${leader.last_name}`;

  return (
    <article
      className={`rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}
      aria-label={`Umuyobozi: ${fullName}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600/10 text-lg font-semibold text-blue-600">
          {leader.photo_url && !photoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={leader.photo_url}
              alt={`Ifoto ya ${fullName}`}
              className="h-full w-full object-cover"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <span aria-hidden>{initials(leader.first_name, leader.last_name)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{fullName}</h3>
          <p className="text-sm font-medium text-green-600 dark:text-green-500">{leader.role_label_kiny}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {leader.boundary_name_kiny}
              {leader.level ? ` · ${leader.level}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {leader.contacts.length > 0 ? (
          leader.contacts.map((c) => <ContactButton key={`${c.kind}|${c.value}`} c={c} />)
        ) : (
          <p className="text-sm text-muted-foreground">Nta buryo bwo kuvugana n&apos;uyu muyobozi buraboneka.</p>
        )}
      </div>
    </article>
  );
}
