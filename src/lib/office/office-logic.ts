// Pure rules for office accounts (no I/O). The database stays the final authority on who may create what.
export const OFFICE_EMAIL_DOMAIN = "abayobozi.iwacu.invalid";

export type OfficeRole = "district_admin" | "sector_admin" | "cell_admin";
export type UnitLevel = "district" | "sector" | "cell";

const ROLE_BY_LEVEL: Record<UnitLevel, OfficeRole> = {
  district: "district_admin",
  sector: "sector_admin",
  cell: "cell_admin",
};

export function roleForLevel(level: string): OfficeRole | null {
  return (ROLE_BY_LEVEL as Record<string, OfficeRole>)[level] ?? null;
}

/** Level of accounts a role may create: Igihugu -> akarere, akarere -> umurenge, umurenge -> akagari. */
export function childLevelFor(roleCode: string): UnitLevel | null {
  if (roleCode === "national_super_admin") return "district";
  if (roleCode === "district_admin") return "sector";
  if (roleCode === "sector_admin") return "cell";
  return null;
}

export const LEVEL_LABEL: Record<string, string> = {
  country: "Igihugu",
  district: "Akarere",
  sector: "Umurenge",
  cell: "Akagari",
  village: "Umudugudu",
};

export function loginToEmail(input: string): string {
  const v = input.trim().toLowerCase();
  return v.includes("@") ? v : v + "@" + OFFICE_EMAIL_DOMAIN;
}

export function slugName(fullName: string): string {
  const base = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return (base || "umuyobozi").slice(0, 28).replace(/\.+$/g, "");
}

/** `random` is injected so tests are deterministic. */
export function makeLoginName(fullName: string, random: () => number = Math.random): string {
  const digits = String(Math.floor(random() * 900) + 100);
  return slugName(fullName) + "." + digits;
}

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2345679";
export function generateTempPassword(randomInt: (max: number) => number): string {
  let out = "";
  for (let i = 0; i < 10; i += 1) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

export function checkAccountInput(input: { full_name: string; phone?: string | null }): string | null {
  const name = input.full_name.trim();
  if (name.length < 2 || name.length > 120) return "Andika amazina y'umuntu.";
  const phone = (input.phone ?? "").trim();
  if (phone && !/^\+?[0-9 ]{7,16}$/.test(phone)) return "Nimero ya telefone ntiyemewe.";
  return null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Ijambo ry'ibanga rigomba kuba nibura inyuguti 8.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Shyiramo inyuguti n'imibare.";
  return null;
}
