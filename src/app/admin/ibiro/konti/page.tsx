"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { levelKey } from "@/lib/office/i18n";
import type { Contact } from "@/components/office/office-types";
import { api, LeaderPhoto, PageTitle, primaryBtn, useOffice } from "@/components/office/office-ui";

/** People this office may write to or manage (above and below). New accounts are created from the Places page. */
export default function AccountsPage() {
  const { t, workspace } = useOffice();
  const [contacts, setContacts] = useState<Contact[] | null>(null);

  useEffect(() => {
    let alive = true;
    void api<{ contacts: Contact[] }>("/api/admin/office/accounts").then((r) => { if (alive) setContacts(r.data.contacts ?? []); });
    return () => { alive = false; };
  }, []);

  const groups: ["below" | "above", string][] = [["below", t("below")], ["above", t("above")]];

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={t("nav_accounts")}
        hint={t("accounts_hint")}
        action={workspace?.child_level ? <Link href="/admin/ibiro/inzego" className={primaryBtn}>{t("create_account")} · {t(levelKey(workspace.child_level))}</Link> : undefined}
      />
      {contacts === null && <p className="text-base text-muted-foreground">{t("loading")}</p>}
      {contacts && groups.map(([rel, label]) => {
        const list = contacts.filter((c) => c.relation === rel);
        if (list.length === 0) return null;
        return (
          <section key={rel} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{label} · {list.length}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {list.map((c) => (
                <li key={c.user_id} className="flex items-center gap-4 px-4 py-4">
                  <LeaderPhoto name={c.display_name} path={null} size={48} tone={rel === "below" ? "forest" : "sky"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">{c.display_name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{t(levelKey(c.unit_level)) + " · " + c.unit_name}</span>
                  </span>
                  {c.must_change_password && <span className="shrink-0 rounded-full bg-[#fdf3c2] px-3 py-1 text-xs font-bold text-[#6b5600]">{t("status_invited")}</span>}
                  {c.phone && <a href={"tel:" + c.phone.replace(/\s/g, "")} className="shrink-0 rounded-full bg-muted px-4 py-2 text-sm font-bold">{t("call")}</a>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
