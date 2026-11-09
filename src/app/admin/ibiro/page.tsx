"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare, Landmark } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { PageTitle, unitName, useOffice } from "@/components/office/office-ui";

function Stat({ value, label, tone = "forest" }: { value: number | string; label: string; tone?: "forest" | "sky" | "sun" }) {
  const bar = { forest: "bg-[#20603D]", sky: "bg-[#00A3E0]", sun: "bg-[#FAD201]" } as const;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
      <span className={"absolute inset-y-0 left-0 w-1.5 " + bar[tone]} aria-hidden="true" />
      <p className="text-3xl font-extrabold leading-none text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function OfficeHome() {
  const { me, workspace, t } = useOffice();
  const name = me.profile?.display_name ?? "";
  const ws = workspace;
  const childLevel = ws?.child_level ?? null;
  const levels = ws ? (["district", "sector", "cell", "village"] as const).filter((l) => (ws.counts[l] ?? 0) > 0) : [];
  const total = ws?.child_total ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("hello") + ", " + name.split(" ")[0]} hint={ws ? t("scope_here") + ": " + t(levelKey(ws.scope.level)) + " · " + unitName(ws.scope) : undefined} />

      {ws && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {childLevel && <Stat value={total} label={t(levelKey(childLevel, true))} />}
            {childLevel && <Stat value={ws.child_with_leader + "/" + total} label={t("with_leader")} tone="sky" />}
            <Stat value={ws.accounts_below} label={t("with_account")} />
            <Stat value={ws.accounts_waiting_first_login} label={t("waiting_login")} tone="sun" />
          </div>

          {levels.length > 0 && (
            <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-extrabold">{t("per_level")}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {levels.map((l) => (
                  <li key={l} className="flex items-baseline justify-between rounded-xl bg-muted/60 px-4 py-3">
                    <span className="text-base font-semibold">{t(levelKey(l, true))}</span>
                    <span className="text-xl font-extrabold text-[#20603D]">{ws.counts[l]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link href="/admin/ibiro/inzego" className="group flex min-h-[88px] items-center gap-4 rounded-2xl bg-[#20603D] p-5 text-white shadow-sm transition hover:bg-[#1b5234]">
              <Landmark className="h-7 w-7 shrink-0" />
              <span className="flex-1 text-lg font-extrabold">{t("nav_units")}</span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link href="/admin/ibiro/ubutumwa" className="group flex min-h-[88px] items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:bg-muted/50">
              <MessageSquare className="h-7 w-7 shrink-0 text-[#00A3E0]" />
              <span className="flex-1 text-lg font-extrabold">
                {t("nav_messages")}
                {ws.unread > 0 && <span className="ml-3 rounded-full bg-[#00A3E0] px-3 py-1 text-sm font-bold text-white">{ws.unread}</span>}
              </span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </>
      )}
      {!ws && <p className="text-base text-muted-foreground">{t("loading")}</p>}
    </div>
  );
}
