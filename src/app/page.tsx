"use client";

import { useLocation } from "@/hooks/useLocation";
import { LocationButton } from "@/components/LocationButton";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { LeaderCard } from "@/components/LeaderCard";
import { EmergencyBar } from "@/components/EmergencyBar";
import { MapPin, WifiOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { confidenceBand } from "@/lib/geo/gps";

const BAND_LABEL = { high: "Icyizere kinini", medium: "Icyizere giciriritse", low: "Icyizere gito" } as const;

export default function HomePage() {
  const { phase, result, accuracy, slow, locate, reset } = useLocation();

  const isBusy = phase === "requesting_gps" || phase === "locating";
  const showButton = phase === "idle" || isBusy;
  const success = (phase === "success" || phase === "offline") && result?.status === "success" ? result : null;
  const error = phase === "error" && result?.status === "error" ? result : null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-12">
      <div className="mb-8">
        <EmergencyBar extra={success?.emergency?.filter((e) => e.scope_code) ?? []} />
      </div>

      <section className="mb-12 text-center" aria-labelledby="hero-title">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
          <MapPin className="h-8 w-8" aria-hidden />
        </div>
        <h1 id="hero-title" className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Murakaza neza kuri <span className="text-blue-600">IWACU RWANDA</span>
        </h1>
        <p className="mx-auto mb-8 max-w-lg text-base text-muted-foreground sm:text-lg">
          Menya aho uri n’abayobozi b’umudugudu, akagari, umurenge n’akarere.
        </p>

        {showButton && (
          <div className="flex flex-col items-center gap-4">
            <LocationButton status={phase} onClick={locate} />
            <p className="text-xs text-muted-foreground">
              Aho uri twohereza kuri seriveri kugira ngo tumenye umudugudu wawe.
            </p>
            {phase === "requesting_gps" && (
              <p role="status" className="text-sm text-muted-foreground">
                Emera GPS muri browser yawe kugira ngo dukomeze.
              </p>
            )}
            {slow && (
              <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
                Interineti ihuze gato. Tegereza…
              </p>
            )}
          </div>
        )}
      </section>

      {phase === "offline" && (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          <span>Uri offline. Dukoresha imipaka yabitswe kuri telefone yawe; abayobozi ntibagaragara.</span>
        </div>
      )}

      {error && (
        <section className="mb-10" aria-label="Ikibazo">
          <ErrorDisplay code={error.code} messageKiny={error.message_kiny} messageEng={error.message_eng} onRetry={locate} />
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={reset} className="min-h-[44px] rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              Subira ku ntangiriro
            </button>
          </div>
        </section>
      )}

      {success && (
        <section className="space-y-8" aria-label="Ibisubizo">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" aria-hidden />
              <h2 className="text-lg font-semibold text-foreground">Aho uri</h2>
            </div>
            {accuracy !== null && (
              <p className="mb-3 text-xs text-muted-foreground">
                Ukuri kwa GPS: ± {Math.round(accuracy)} m. Ibi ni ikigereranyo, si umwanya nyawo.
              </p>
            )}

            {success.warning && (
              <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{success.warning.message_kiny}</span>
              </p>
            )}

            {success.matches.length > 0 && (
              <ul className="space-y-2">
                {success.matches.map((m) => {
                  const band = confidenceBand(m.confidence);
                  return (
                    <li key={m.scope_code} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{m.name_kiny}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {m.level}
                          {m.name_eng ? ` · ${m.name_eng}` : ""}
                        </p>
                      </div>
                      <span
                        className="inline-flex min-w-[3.5rem] flex-col items-center rounded-full bg-muted px-2.5 py-1 text-sm font-semibold"
                        aria-label={`${BAND_LABEL[band]}: ${m.confidence.toFixed(0)}%`}
                      >
                        {m.confidence.toFixed(0)}%
                        <span className="text-[10px] font-normal text-muted-foreground">{BAND_LABEL[band]}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {success.hierarchy && (
              <div className="mt-4 flex flex-wrap gap-2">
                {success.hierarchy.district && <HierarchyBadge label="Akarere" name={success.hierarchy.district.name_kiny} />}
                {success.hierarchy.sector && <HierarchyBadge label="Umurenge" name={success.hierarchy.sector.name_kiny} />}
                {success.hierarchy.cell && <HierarchyBadge label="Akagari" name={success.hierarchy.cell.name_kiny} />}
                {success.hierarchy.village && <HierarchyBadge label="Umudugudu" name={success.hierarchy.village.name_kiny} />}
              </div>
            )}
          </div>

          {success.leaders.length > 0 ? (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Abayobozi bawe</h2>
              <div className="grid gap-4">
                {success.leaders.map((leader) => (
                  <LeaderCard key={leader.id} leader={leader} />
                ))}
              </div>
            </div>
          ) : (
            <p role="status" className="text-center text-sm text-muted-foreground">
              {success.leaders_notice?.message_kiny ?? "Nta bayobozi bemejwe babonetse kuri uyu mwanya."}
            </p>
          )}

          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Shakisha ahantu handi
            </button>
          </div>
        </section>
      )}

      {phase === "locating" && (
        <div className="mt-10 space-y-4" aria-busy="true" aria-label="Turimo gushakisha">
          <div className="skeleton h-24 w-full rounded-xl" />
          <div className="skeleton h-32 w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

function HierarchyBadge({ label, name }: { label: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground">{name}</span>
    </span>
  );
}
