"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { levelKey } from "@/lib/office/i18n";
import { LeaderEditorSheet } from "@/components/office/LeaderEditorSheet";
import { api, LeaderPhoto, PageTitle, primaryBtn, unitName, useOffice, type LeaderCard } from "@/components/office/office-ui";

/** The leader's own card: exactly what citizens will see, with an edit button. */
export default function ProfilePage() {
  const { me, workspace, t } = useOffice();
  const unitId = workspace?.scope.unit_id ?? null;
  const [card, setCard] = useState<LeaderCard | null>(null);
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!unitId) return;
    let alive = true;
    void api<{ card: LeaderCard }>("/api/admin/office/leaders/" + unitId).then((r) => { if (alive && r.ok) setCard(r.data.card); });
    return () => { alive = false; };
  }, [unitId, tick]);

  const level = workspace?.scope.level ?? "district";
  const canEdit = Boolean(card?.can_edit);
  const shownName = card?.display_name || me.profile?.display_name || "";
  const shownTitle = card?.job_title || me.profile?.job_title || null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("my_card")} hint={t("my_card_hint")} />
      {!card && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {card && (
        <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="photo-surface photo-hills relative h-28">
            <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
          </div>
          <div className="-mt-12 px-6 pb-6">
            <LeaderPhoto name={shownName} path={card.photo_path} size={96} />
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#20603D]">{t(levelKey(level))} · {workspace ? unitName(workspace.scope) : ""}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground">{shownName}</h2>
            {shownTitle && <p className="text-base text-muted-foreground">{shownTitle}</p>}
            <dl className="mt-5 space-y-3 text-base">
              {card.phone && <div><dt className="text-xs font-bold text-muted-foreground">{t("f_phone")}</dt><dd className="font-semibold">{card.phone}</dd></div>}
              {card.public_email && <div><dt className="text-xs font-bold text-muted-foreground">{t("f_email")}</dt><dd className="font-semibold">{card.public_email}</dd></div>}
              {card.office_hours && <div><dt className="text-xs font-bold text-muted-foreground">{t("f_hours")}</dt><dd className="font-semibold">{card.office_hours}</dd></div>}
              {card.bio && <div><dt className="text-xs font-bold text-muted-foreground">{t("f_bio").replace(/\s*\(.*\)$/, "")}</dt><dd className="whitespace-pre-wrap">{card.bio}</dd></div>}
            </dl>
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} className={primaryBtn + " mt-6 w-full sm:w-auto"}>
                <Pencil className="h-5 w-5" /> {t("edit")}
              </button>
            )}
          </div>
        </article>
      )}
      {editing && unitId && <LeaderEditorSheet unitId={unitId} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setTick((n) => n + 1); }} />}
    </div>
  );
}
