// One workspace template per tier. The pages are shared; this file decides which doors each tier gets and what they are called.
// A District, Sector or Cell instance is the same code scoped to one place (the database enforces the scope, never this file).
export type Tier = "country" | "district" | "sector" | "cell";

export type NavId =
  | "home" | "report" | "verify" | "units" | "leaders" | "tasks" | "cases" | "records" | "messages" | "accounts" | "keys" | "audit" | "profile";

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
  keys: "/admin/ibiro/imfunguzo",
  audit: "/admin/ibiro/amateka",
  profile: "/admin/ibiro/umwirondoro",
};

const FULL: NavId[] = ["home", "report", "verify", "units", "leaders", "tasks", "cases", "records", "messages", "accounts", "keys", "audit", "profile"];

/** Which doors a tier gets. A Cell creates no login accounts (village leaders are records), so it has no account or key page. */
export const TIER_NAV: Record<Tier, NavId[]> = {
  country: FULL,
  district: FULL,
  sector: FULL,
  cell: FULL.filter((n) => n !== "accounts" && n !== "keys"),
};

export function tierOf(level: string | null | undefined): Tier {
  return level === "district" || level === "sector" || level === "cell" ? level : "country";
}

const LEVEL_ORDER = ["province", "district", "sector", "cell", "village"] as const;

/** Levels that exist STRICTLY below an office: a Sector never sees districts, a Cell sees only villages, the country room sees them all. */
export function levelsBelow(tier: Tier): string[] {
  const at: Record<Tier, number> = { country: -1, district: 1, sector: 2, cell: 3 };
  return LEVEL_ORDER.filter((_, i) => i > at[tier]);
}
