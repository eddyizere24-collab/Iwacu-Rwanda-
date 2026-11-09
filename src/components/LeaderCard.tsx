"use client";

import { CheckCircle2, MapPin, UserRound } from "lucide-react";
import type { LeaderPublic } from "@/types/leader";
import { useI18n } from "@/components/LocaleProvider";

type Props = { leader: LeaderPublic; className?: string };

export function LeaderCard({ leader, className = "" }: Props) {
  const { locale, t } = useI18n();
  const name = [leader.first_name, leader.last_name].filter(Boolean).join(" ");
  const verified = leader.verification_status === "approved" || leader.is_verified === true;
  const areaName = locale === "en" && leader.boundary_name_eng ? leader.boundary_name_eng : leader.boundary_name_kiny;
  const initials = name.split(/\s+/).slice(0,2).map((part) => part[0] ?? "").join("").toUpperCase();
  return (
    <article className={`rounded-xl border border-border bg-card p-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[#00A3E0]/10 text-sm font-black text-[#00A3E0]">
          {initials || <UserRound className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold">{name || t("Umwirondoro nturuzuzwa")}</h3>
            {verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#20603D]/10 px-2 py-0.5 text-[10px] font-semibold text-[#20603D]"><CheckCircle2 className="h-3 w-3"/> {t("Byemejwe")}</span>}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#00A3E0]">{t(leader.role)}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3 text-[#20603D]"/> {areaName} · {t(leader.level)}</p>
        </div>
      </div>
    </article>
  );
}
