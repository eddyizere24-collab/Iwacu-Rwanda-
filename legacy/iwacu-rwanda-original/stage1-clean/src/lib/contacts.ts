/**
 * Contact details of a leader (phone, WhatsApp, e-mail, social ...). Pure functions, no I/O.
 */

export interface ContactKindDef {
  code: string;
  label_kiny: string;
  label_eng: string | null;
  icon: string | null;
  value_pattern: string | null;
  link_template: string | null;
  is_phone: boolean;
  is_public: boolean;
}

export interface ContactInput {
  kind: string;
  value: string;
  is_primary?: boolean;
  note?: string | null;
}

export const MAX_CONTACTS = 20;

export function normalizePhone(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  let s = input.trim().replace(/[\s\-\.\(\)]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("0") && s.length === 10) s = "+250" + s.slice(1);
  if (s.startsWith("250") && s.length === 12) s = "+" + s;
  if (!s.startsWith("+")) s = "+" + s;
  if (/^\+2507\d{8}$/.test(s)) return s;
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

export function formatPhoneDisplay(e164: string): string {
  if (!e164) return "";
  if (e164.startsWith("+250") && e164.length === 13) {
    return `0${e164.slice(4, 7)} ${e164.slice(7, 10)} ${e164.slice(10)}`;
  }
  return e164;
}

export function displayContactValue(kindCode: string, value: string): string {
  if (kindCode === "phone" || kindCode === "whatsapp" || kindCode === "mobile" || kindCode === "office") {
    return formatPhoneDisplay(value.startsWith("+") ? value : value);
  }
  return value;
}

export function normalizeContactValue(
  kind: Pick<ContactKindDef, "code" | "link_template">,
  raw: string
): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (kind.code === "phone" || kind.code === "whatsapp" || kind.code === "mobile" || kind.code === "office") {
    return normalizePhone(trimmed);
  }
  if (kind.code === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed.toLowerCase() : null;
  }
  return trimmed.length >= 2 && trimmed.length <= 200 ? trimmed : null;
}

export function buildContactLink(
  kind: Pick<ContactKindDef, "link_template">,
  value: string
): string | null {
  if (!value) return null;
  const tmpl = kind.link_template;
  if (tmpl && tmpl.includes("{value}")) {
    return tmpl.replace("{value}", encodeURIComponent(value));
  }
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:") || value.startsWith("tel:")) {
    return value;
  }
  if (value.includes("@") && !value.startsWith("+")) {
    return `mailto:${value}`;
  }
  const phone = normalizePhone(value);
  if (phone) return `tel:${phone}`;
  return null;
}

export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  if (d.length < 8) return "••••";
  return d.slice(0, 4) + "•".repeat(Math.max(0, d.length - 6)) + d.slice(-2);
}

export function sanitizeContactInput(input: ContactInput): ContactInput | null {
  const kind = (input.kind || "").trim().toLowerCase();
  let value = (input.value || "").trim();
  if (!kind || !value) return null;
  if (kind === "phone" || kind === "whatsapp" || kind === "mobile" || kind === "office") {
    const n = normalizePhone(value);
    if (!n) return null;
    value = n;
  }
  return {
    kind,
    value,
    is_primary: !!input.is_primary,
    note: input.note?.trim() || null,
  };
}

export interface ContactsParse {
  contacts: Array<{ kind: string; value: string; is_primary: boolean; note: string | null }>;
  errors: string[];
}

export function parseContacts(raw: unknown, _kinds: ReadonlyMap<string, ContactKindDef>): ContactsParse {
  const errors: string[] = [];
  const contacts: ContactsParse["contacts"] = [];
  if (!Array.isArray(raw)) return { contacts: [], errors: ["not_array"] };
  for (const item of raw.slice(0, MAX_CONTACTS)) {
    if (!item || typeof item !== "object") continue;
    const s = sanitizeContactInput(item as ContactInput);
    if (s) contacts.push({ kind: s.kind, value: s.value, is_primary: !!s.is_primary, note: s.note ?? null });
    else errors.push("invalid_contact");
  }
  return { contacts, errors };
}
