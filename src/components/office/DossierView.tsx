"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, KeyRound, Pencil, Phone, ShieldOff, ShieldCheck, UserPlus } from "lucide-react";
import { levelKey, type Key } from "@/lib/office/i18n";
import { CreateAccountSheet } from "./CreateAccountSheet";
import { LeaderEditorSheet } from "./LeaderEditorSheet";
import { LEVEL_BELOW, placesHref, unitHref, type Dossier } from "./dossier-types";
import { api, LeaderPhoto, quietBtn, Sheet, StatusChip, unitName, useOffice, when, primaryBtn } from "./office-ui";

const SUB_ORDER = ["district", "sector", "cell", "village"] as const;

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className="h-full rounded-full bg-[#20603D]" style={{ width: pct + "%" }} />
    </div>
  );
}

function Attention({ href, count, label }: { href: string; count: number; label: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-[56px] items-center gap-4 rounded-xl px-4 py-3 hover:bg-muted/60">
        <span className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-full bg-[#fdf3c2] px-2 text-base font-extrabold text-[#6b5600]">{count}</span>
        <span className="flex-1 text-base font-semibold text-foreground">{label}</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** One place, fully: leader, what needs attention, coverage, everything directly below (all clickable), cases, tasks, changes. */
export function DossierView({ scope }: { scope: string | null }) {
  const { t, workspace, lang } = useOffice();
  const [d, setD] = useState<Dossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await api<{ dossier: Dossier }>("/api/admin/office/unit" + (scope ? "?scope=" + encodeURIComponent(scope) : ""));
    if (!res.ok) { setError(res.data.message_kiny || t("error_generic")); return; }
    setD(res.data.dossier);
  }, [scope, t]);

  useEffect(() => { setD(null); void load(); }, [load]);

  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-6 text-base text-red-700">{error}</p>;
  if (!d) return <p className="text-base text-muted-foreground">{t("loading")}</p>;

  const u = d.unit;
  const isRoot = u.is_my_top;
  const name = unitName({ name_kiny: u.name_kiny, name_eng: u.name_eng });
  const title = isRoot && u.level === "country" ? t("home_title") : name;
  const myChild = workspace ? LEVEL_BELOW[workspace.scope.level] : null;
  const canCreateAccount = Boolean(d.leader === null || !d.leader.has_account) && u.card_expected && !isRoot && myChild === u.level;
  const accountStatus = d.leader?.status ?? "vacant";
  const manageAccount = Boolean(d.leader?.user_id) && !isRoot;
  const att = d.attention;
  const caseOpen = (d.case_counts.new ?? 0) + (d.case_counts.reviewing ?? 0);
  const levelsPresent = SUB_ORDER.filter((l) => d.levels[l]);
  const tk = d.tasks;
  const asOf = new Date(d.as_of).toLocaleString(lang === "rw" ? "en-GB" : lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  async function act(action: "suspend" | "resume" | "reset") {
    const userId = d?.leader?.user_id;
    if (!userId) return;
    if (action === "reset" && !window.confirm(t("confirm_reset"))) return;
    if (action === "suspend" && !window.confirm(t("confirm_suspend"))) return;
    setBusy(true);
    const res = await api<{ temp_password?: string }>("/api/admin/office/people/" + userId, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (!res.ok) { setError(res.data.message_kiny || t("error_generic")); return; }
    if (res.data.temp_password) setPassword(res.data.temp_password);
    void load();
  }

  const sectionTitle = "mb-4 text-lg font-extrabold text-foreground";
  const card = "rounded-2xl border border-border bg-card p-6 shadow-sm";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Breadcrumb: every step is a link */}
      {d.ancestors.length > 0 && (
        <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
          {d.ancestors.map((a) => (
            <span key={a.scope_code} className="flex items-center gap-1">
              <Link href={a.scope_code === workspace?.scope.scope_code ? "/admin/ibiro" : unitHref(a.scope_code)} className="rounded-lg px-2 py-1 font-bold text-[#0a6d96] underline underline-offset-2">
                {a.level === "country" ? t("home_title") : a.name}
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </span>
          ))}
          <span className="px-2 py-1 font-bold text-foreground">{name}</span>
        </nav>
      )}

      {/* Header */}
      <header className="photo-surface photo-hills relative overflow-hidden rounded-3xl p-6 text-white shadow-md sm:p-8">
        <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
        <p className="relative text-xs font-bold uppercase tracking-wider text-white/90">{t(levelKey(u.level))} · {t("code")} {u.scope_code}</p>
        <h1 className="relative mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
        <p className="relative mt-3 text-sm text-white/85">{t("as_of")}: {asOf}</p>
      </header>

      {/* Leader of this place */}
      {u.card_expected && (
        <section className={card} aria-label={t("edit_leader")}>
          <div className="flex flex-wrap items-start gap-5">
            <LeaderPhoto name={d.leader?.display_name ?? null} path={d.leader?.photo_path ?? null} size={88} tone={d.leader ? "forest" : "sun"} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-extrabold">{d.leader ? d.leader.display_name : t("leader_vacant")}</h2>
                <StatusChip status={accountStatus} />
              </div>
              {d.leader?.job_title && <p className="mt-1 text-base text-muted-foreground">{d.leader.job_title}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-base">
                {d.leader?.phone && <a href={"tel:" + d.leader.phone.replace(/\s/g, "")} className="inline-flex items-center gap-2 font-semibold text-[#0a6d96]"><Phone className="h-4 w-4" />{d.leader.phone}</a>}
                {d.leader?.office_hours && <span className="text-muted-foreground">{d.leader.office_hours}</span>}
                {d.leader?.login_name && !isRoot && <span className="text-sm text-muted-foreground">{t("login_name")}: <span className="font-mono font-semibold text-foreground">{d.leader.login_name}</span></span>}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setEditing(true)} className={quietBtn}><Pencil className="h-4 w-4" /> {d.leader ? t("edit") : t("add_leader")}</button>
            {canCreateAccount && d.leader !== null && !d.leader.has_account && (
              <button type="button" onClick={() => setCreating(true)} className={primaryBtn}><UserPlus className="h-5 w-5" /> {t("create_account")}</button>
            )}
            {canCreateAccount && d.leader === null && (
              <button type="button" onClick={() => setCreating(true)} className={primaryBtn}><UserPlus className="h-5 w-5" /> {t("create_account")}</button>
            )}
            {manageAccount && (
              <>
                <button type="button" disabled={busy} onClick={() => void act("reset")} className={quietBtn}><KeyRound className="h-4 w-4" /> {t("reset_access")}</button>
                {accountStatus === "suspended"
                  ? <button type="button" disabled={busy} onClick={() => void act("resume")} className={quietBtn}><ShieldCheck className="h-4 w-4" /> {t("resume")}</button>
                  : <button type="button" disabled={busy} onClick={() => void act("suspend")} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-base font-bold text-red-700 hover:bg-red-50"><ShieldOff className="h-4 w-4" /> {t("suspend")}</button>}
              </>
            )}
          </div>
        </section>
      )}

      {/* What needs attention */}
      <section className={card} aria-label={t("needs_attention")}>
        <h2 className={sectionTitle}>{t("needs_attention")}</h2>
        {(() => {
          const items: { href: string; count: number; label: string }[] = [];
          if (att.vacant_units && att.vacant_level) {
            items.push({ href: placesHref({ level: att.vacant_level, under: u.scope_code, vacant: true }), count: att.vacant_units, label: t(levelKey(att.vacant_level, true)) + " · " + t("att_no_leader") });
          }
          if (att.waiting_login_over_7d > 0) items.push({ href: "/admin/ibiro/konti?status=invited&under=" + u.scope_code, count: att.waiting_login_over_7d, label: t("att_waiting") });
          if (att.open_cases > 0) items.push({ href: "/admin/ibiro/ibibazo?status=open&scope=" + u.scope_code, count: att.open_cases, label: t("att_cases") });
          if ((tk.overdue_targets ?? 0) > 0) items.push({ href: "/admin/ibiro/imirimo", count: tk.overdue_targets ?? 0, label: t("att_overdue") });
          if ((tk.waiting_review ?? 0) > 0) items.push({ href: "/admin/ibiro/imirimo", count: tk.waiting_review ?? 0, label: t("att_review") });
          if (items.length === 0) return <p className="text-base text-muted-foreground">{t("att_none")}</p>;
          return <ul className="-mx-2 divide-y divide-border">{items.map((i) => <Attention key={i.label} {...i} />)}</ul>;
        })()}
      </section>

      {/* Coverage per level */}
      {levelsPresent.length > 0 && (
        <section className={card} aria-label={t("coverage_title")}>
          <h2 className={sectionTitle}>{t("coverage_title")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {levelsPresent.map((l) => {
              const c = d.levels[l];
              const expected = (l as string) !== "province";
              return (
                <div key={l} className="rounded-xl bg-muted/50 p-5">
                  <Link href={placesHref({ level: l, under: u.scope_code })} className="flex items-baseline justify-between gap-3 hover:underline">
                    <span className="text-base font-extrabold text-foreground">{t(levelKey(l, true))}</span>
                    <span className="text-2xl font-extrabold text-[#20603D]">{c.total}</span>
                  </Link>
                  {expected && (
                    <>
                      <div className="mt-3"><Bar value={c.with_leader} total={c.total} /></div>
                      <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between"><dt><Link className="text-[#0a6d96] underline underline-offset-2" href={placesHref({ level: l, under: u.scope_code, vacant: false })}>{t("cov_leader")}</Link></dt><dd className="font-bold">{c.with_leader} {t("of")} {c.total}</dd></div>
                        <div className="flex justify-between"><dt><Link className="text-[#0a6d96] underline underline-offset-2" href={"/admin/ibiro/konti?under=" + u.scope_code}>{t("cov_account")}</Link></dt><dd className="font-bold">{c.with_account}</dd></div>
                        <div className="flex justify-between"><dt><Link className="text-[#0a6d96] underline underline-offset-2" href={"/admin/ibiro/konti?status=active&under=" + u.scope_code}>{t("cov_signed")}</Link></dt><dd className="font-bold">{c.signed_in}</dd></div>
                      </dl>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <details className="mt-5 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-bold text-foreground">{t("def_title")}</summary>
            <p className="mt-2 leading-6">{t("def_text")}</p>
          </details>
        </section>
      )}

      {/* Everything directly below, each row a door */}
      {d.children.length > 0 && u.child_level && (
        <section aria-label={t("units_below")}>
          <h2 className={sectionTitle}>{t(levelKey(d.children[0].level, true))} · {d.children.length}</h2>
          <ul className="space-y-3">
            {d.children.map((c) => (
              <li key={c.unit_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <LeaderPhoto name={c.leader_name} path={c.leader_photo} size={52} tone={c.status === "vacant" ? "sun" : "forest"} />
                  <div className="min-w-0 flex-1 basis-56">
                    <Link href={unitHref(c.scope_code)} className="block truncate text-lg font-extrabold text-foreground hover:underline">{c.name}</Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.card_expected ? (c.leader_name ? [c.leader_name, c.leader_title].filter(Boolean).join(" · ") : t("leader_vacant")) : t(levelKey(c.level))}
                    </p>
                  </div>
                  {c.card_expected && <StatusChip status={c.status} />}
                  <Link href={unitHref(c.scope_code)} aria-label={t("open") + " " + c.name} className="flex h-11 w-11 items-center justify-center rounded-full bg-muted hover:bg-muted/70"><ChevronRight className="h-5 w-5" /></Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUB_ORDER.filter((l) => (c.sub[l] ?? 0) > 0).map((l) => (
                    <Link key={l} href={placesHref({ level: l, under: c.scope_code })} className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold hover:bg-muted/70">
                      {t(levelKey(l, true))} <span className="text-[#20603D]">{c.sub[l]}</span>
                    </Link>
                  ))}
                  {c.open_cases > 0 && (
                    <Link href={"/admin/ibiro/ibibazo?status=open&scope=" + c.scope_code} className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#fdf3c2] px-4 text-sm font-bold text-[#6b5600] hover:opacity-90">
                      {t("col_cases")} <span>{c.open_cases}</span>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cases */}
      {(d.cases.length > 0 || caseOpen > 0) && (
        <section className={card} aria-label={t("cases_title")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">{t("cases_title")} · {caseOpen}</h2>
            <Link href={"/admin/ibiro/ibibazo?status=open&scope=" + u.scope_code} className="text-sm font-bold text-[#0a6d96] underline underline-offset-2">{t("view_all")}</Link>
          </div>
          <ul className="divide-y divide-border">
            {d.cases.map((c) => (
              <li key={c.id}>
                <Link href={"/admin/ibiro/ibibazo?status=open&scope=" + c.scope_code} className="block px-1 py-3 hover:bg-muted/50">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#20603D]">{t(("cat_" + c.category) as Key)} · {c.unit_name}</span>
                  <span className="mt-1 block text-base text-foreground">{c.message}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{when(c.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tasks and messages */}
      {((tk.open_targets ?? 0) + (tk.waiting_review ?? 0) > 0 || d.messages) && (
        <section className="grid gap-4 sm:grid-cols-2" aria-label={t("tasks_title")}>
          {((tk.open_targets ?? 0) + (tk.waiting_review ?? 0) > 0) && (
            <Link href="/admin/ibiro/imirimo" className={card + " block hover:bg-muted/40"}>
              <h2 className={sectionTitle}>{t("tasks_title")}</h2>
              <dl className="space-y-2 text-base">
                <div className="flex justify-between"><dt>{t("tasks_open")}</dt><dd className="font-extrabold">{tk.open_targets ?? 0}</dd></div>
                <div className="flex justify-between"><dt>{t("tasks_overdue")}</dt><dd className="font-extrabold text-red-700">{tk.overdue_targets ?? 0}</dd></div>
                <div className="flex justify-between"><dt>{t("tasks_review")}</dt><dd className="font-extrabold">{tk.waiting_review ?? 0}</dd></div>
              </dl>
            </Link>
          )}
          {d.messages && (
            <Link href="/admin/ibiro/ubutumwa" className={card + " block hover:bg-muted/40"}>
              <h2 className={sectionTitle}>{t("messages_title")}</h2>
              <dl className="space-y-2 text-base">
                <div className="flex justify-between"><dt>{t("msg_sent")}</dt><dd className="font-extrabold">{d.messages.sent_30d}</dd></div>
                <div className="flex justify-between"><dt>{t("sent_to")}</dt><dd className="font-extrabold">{d.messages.delivered_30d}</dd></div>
                <div className="flex justify-between"><dt>{t("msg_read")}</dt><dd className="font-extrabold">{d.messages.read_30d}</dd></div>
              </dl>
            </Link>
          )}
        </section>
      )}

      {/* Recent changes */}
      {d.recent.length > 0 && (
        <section className={card} aria-label={t("recent_title")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">{t("recent_title")}</h2>
            <Link href="/admin/ibiro/amateka" className="text-sm font-bold text-[#0a6d96] underline underline-offset-2">{t("view_all")}</Link>
          </div>
          <ul className="divide-y divide-border">
            {d.recent.map((r, i) => (
              <li key={r.at + i}>
                <Link href={unitHref(r.scope_code)} className="flex flex-wrap items-baseline gap-x-3 px-1 py-3 hover:bg-muted/50">
                  <span className="text-base font-semibold">{t(("ev_card_" + r.action) as Key)}</span>
                  <span className="text-base text-foreground">{r.leader_name ? r.leader_name + " · " : ""}{r.unit_name}</span>
                  <span className="text-xs text-muted-foreground">{t("by")} {r.who} · {when(r.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && <LeaderEditorSheet unitId={u.unit_id} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void load(); }} />}
      {creating && (
        <CreateAccountSheet
          unitId={u.unit_id} unitLabel={name} level={u.level}
          defaults={{ name: d.leader?.display_name, title: d.leader?.job_title, phone: d.leader?.phone }}
          onClose={() => setCreating(false)} onCreated={() => void load()}
        />
      )}
      {password && (
        <Sheet title={t("new_password")} onClose={() => setPassword(null)}>
          <div className="space-y-4">
            <p className="select-all rounded-2xl bg-[#e3ede4] p-5 font-mono text-xl font-extrabold tracking-wider">{password}</p>
            <p className="text-sm text-muted-foreground">{t("shown_once")}</p>
            <button type="button" onClick={() => setPassword(null)} className={quietBtn + " w-full"}>{t("close")}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
