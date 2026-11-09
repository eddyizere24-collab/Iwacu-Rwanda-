// One workspace template per tier. The pages are shared; this file decides which doors each tier gets and what they are called.
// A District, Sector or Cell instance is the same code scoped to one place (the database enforces the scope, never this file).
export type Tier = "country" | "district" | "sector" | "cell";

export type NavId =
  | "home" | "report" | "verify" | "units" | "leaders" | "tasks" | "cases" | "records" | "messages" | "accounts" | "audit" | "profile";

export const NAV_HREF: Record<NavId, string> = {
  home: "/admin/ibiro",
  report: "/admin/ibiro/raporo",
  verify: "/admin/ibiro/isuzuma",
  units: "/admin/ibiro/inzego",
  leaders: "/admin/ibiro/abayobozi",
  tasks: "/admin/ibiro/imirimo",
  cases: "/admin/ibiro/ibibazo",
  records: "/admin/ibiro/inyandiko",
  messages: "/admin/ibiro/ubutumwa",
  accounts: "/admin/ibiro/konti",
  audit: "/admin/ibiro/amateka",
  profile: "/admin/ibiro/umwirondoro",
};

const FULL: NavId[] = ["home", "report", "verify", "units", "leaders", "tasks", "cases", "records", "messages", "accounts", "audit", "profile"];

/** Which doors a tier gets. A Cell creates no login accounts (village leaders are records), so it has no account page. */
export const TIER_NAV: Record<Tier, NavId[]> = {
  country: FULL,
  district: FULL,
  sector: FULL,
  cell: FULL.filter((n) => n !== "accounts"),
};

export function tierOf(level: string | null | undefined): Tier {
  return level === "district" || level === "sector" || level === "cell" ? level : "country";
}
