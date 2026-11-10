"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, BarChart3, ClipboardList, FileText, History, Home, KeyRound, Landmark, LogOut, MessageSquare, UserPlus, UserRound, Users } from "lucide-react";
import { NAV_HREF, TIER_NAV, tierOf, type NavId } from "@/lib/office/tier";
import { LANGS, parseLang, translate, type Key, type Lang } from "@/lib/office/i18n";
import { LEVEL_LABEL } from "@/lib/office/office-logic";
import { api, OfficeContext, unitName, LeaderPhoto, type MeResponse, type Workspace } from "./office-ui";

const ICONS: Record<NavId, typeof Home> = {
  home: Home, report: BarChart3, verify: BadgeCheck, units: Landmark, leaders: Users, tasks: ClipboardList,
  cases: AlertCircle, records: FileText, messages: MessageSquare, accounts: UserPlus, keys: KeyRound, audit: History, profile: UserRound,
};
const NAV_KEY: Record<NavId, Key> = {
  home: "nav_home", report: "nav_report", verify: "nav_verify", units: "nav_units", leaders: "nav_leaders", tasks: "nav_tasks",
  cases: "nav_cases", records: "nav_records", messages: "nav_messages", accounts: "nav_accounts", keys: "nav_keys", audit: "nav_audit", profile: "nav_profile",
};

function readLang(): Lang {
  try {
    return parseLang(window.localStorage.getItem("office-lang"));
  } catch {
    return "rw";
  }
}

export function OfficeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("rw");

  useEffect(() => { setLangState(readLang()); }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem("office-lang", l); } catch { /* private mode: language just is not remembered */ }
  }, []);
  const t = useCallback((key: Key) => translate(lang, key), [lang]);

  const refresh = useCallback(async () => {
    const meRes = await api<MeResponse>("/api/admin/office/me");
    if (meRes.status === 401) { router.replace("/admin/login"); return; }
    if (meRes.status === 403 && meRes.data.code === "MFA_REQUIRED") { router.replace("/admin/mfa"); return; }
    if (!meRes.ok) { setError(meRes.data.message_kiny || translate(lang, "error_generic")); return; }
    if (meRes.data.profile?.must_change_password) { router.replace("/admin/ijambo-ry-ibanga"); return; }
    setMe(meRes.data);
    const ws = await api<{ workspace: Workspace }>("/api/admin/office/workspace");
    if (ws.ok) setWorkspace(ws.data.workspace);
  }, [router, lang]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function logout() {
    await fetch("/api/admin/leader-registry/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
  }

  const ctx = useMemo(() => (me ? { me, workspace, lang, setLang, t, refresh } : null), [me, workspace, lang, setLang, t, refresh]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-base text-red-700">{error}</div>
      </main>
    );
  }
  if (!ctx || !me) {
    return <main className="mx-auto max-w-xl px-6 py-16 text-center text-base text-muted-foreground">{translate(lang, "loading")}</main>;
  }

  const a = me.assignments?.[0];
  const myLine = a?.unit ? (LEVEL_LABEL[a.unit.level] ?? "") + " · " + unitName(a.unit) : "";
  const name = me.profile?.display_name || me.user?.email || "";
  const unread = workspace?.unread ?? 0;
  const tier = tierOf(workspace?.scope.level ?? a?.unit?.level);
  const navItems = TIER_NAV[tier].map((id: NavId) => ({ id, href: NAV_HREF[id], key: NAV_KEY[id], Icon: ICONS[id] }));

  return (
    <OfficeContext.Provider value={ctx}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        {/* Sidebar (desktop) / header + scrolling tabs (phone) */}
        <aside className="md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:overflow-y-auto md:pb-20">
          <div className="photo-surface photo-hills relative overflow-hidden px-6 pb-6 pt-8 text-white md:min-h-[220px] md:rounded-br-[28px]">
            <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
            <div className="relative flex items-start gap-4">
              <LeaderPhoto name={name} path={null} size={56} tone="sun" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/85">{myLine || t("appName")}</p>
                <p className="mt-1 break-words text-xl font-extrabold leading-snug">{name}</p>
                {me.profile?.job_title && <p className="mt-0.5 text-sm text-white/90">{me.profile.job_title}</p>}
              </div>
              <button type="button" onClick={logout} aria-label={t("logout")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 md:hidden"><LogOut className="h-5 w-5" /></button>
            </div>
          </div>

          <nav aria-label={t("appName")} className="flex gap-2 overflow-x-auto px-4 py-3 md:flex-col md:gap-1 md:px-4 md:py-6">
            {navItems.map(({ id, href, key, Icon }) => {
              const active = id === "home" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined}
                  className={"flex min-h-[48px] shrink-0 items-center gap-3 rounded-xl px-4 text-base font-bold transition " + (active ? "bg-[#20603D] text-white" : "bg-card text-foreground hover:bg-muted md:bg-transparent")}>
                  <Icon className="h-5 w-5" />
                  <span>{t(key)}</span>
                  {key === "nav_messages" && unread > 0 && <span className="rounded-full bg-[#00A3E0] px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="hidden px-4 pb-8 md:block">
            <div className="mb-4 flex gap-2" role="group" aria-label={t("language")}>
              {LANGS.map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={"min-h-[40px] flex-1 rounded-full text-xs font-extrabold uppercase " + (lang === l ? "bg-[#06231A] text-white" : "bg-muted text-foreground")}>{l}</button>
              ))}
            </div>
            <button type="button" onClick={logout} className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 text-base font-bold text-foreground hover:bg-muted">
              <LogOut className="h-5 w-5" /> {t("logout")}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 md:pt-10">
          {workspace && (
            <div className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border-l-8 border-[#20603D] bg-card px-5 py-3 shadow-sm" role="banner">
              <span className="text-sm font-extrabold uppercase tracking-wide text-[#20603D]">{t(("tier_" + tier) as Key)}</span>
              <span className="text-base font-extrabold text-foreground">{unitName(workspace.scope)}</span>
              <span className="text-xs font-semibold text-muted-foreground">{t("code")} {workspace.scope.scope_code}</span>
            </div>
          )}
          <div className="mb-4 flex justify-end gap-2 md:hidden" role="group" aria-label={t("language")}>
            {LANGS.map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                className={"min-h-[40px] min-w-[48px] rounded-full text-xs font-extrabold uppercase " + (lang === l ? "bg-[#06231A] text-white" : "bg-muted text-foreground")}>{l}</button>
            ))}
          </div>
          {children}
        </main>
      </div>
    </OfficeContext.Provider>
  );
}
