/**
 * Admin-side helpers for leaders (self-edit only in stage1).
 */

import { sanitizeContactInput, type ContactInput } from "@/lib/contacts";

export interface AdminLeaderRow {
  id: string;
  full_name: string;
  role: string;
  role_label_kiny: string | null;
  role_label_eng: string | null;
  scope_code: string;
  status: string;
  phone_raw_masked: string | null;
  contacts: Array<{
    kind: string;
    value: string;
    is_primary: boolean;
    note: string | null;
  }>;
  updated_at: string | null;
  version: number;
}

export function toAdminLeader(row: Record<string, unknown>): AdminLeaderRow {
  const contactsRaw = (row.contacts as unknown[]) || [];
  const contacts = contactsRaw.map((c) => {
    const item = c as Record<string, unknown>;
    return {
      kind: String(item.kind || ""),
      value: String(item.value || ""),
      is_primary: !!item.is_primary,
      note: item.note ? String(item.note) : null,
    };
  });

  return {
    id: String(row.id),
    full_name: String(row.full_name || ""),
    role: String(row.role || ""),
    role_label_kiny: row.role_label_kiny ? String(row.role_label_kiny) : null,
    role_label_eng: row.role_label_eng ? String(row.role_label_eng) : null,
    scope_code: String(row.scope_code || ""),
    status: String(row.status || "draft"),
    phone_raw_masked: row.phone_raw_masked ? String(row.phone_raw_masked) : null,
    contacts,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    version: typeof row.version === "number" ? row.version : 1,
  };
}

export interface LeaderUpdatePayload {
  full_name?: string;
  contacts?: ContactInput[];
  note?: string | null;
}

export function validateLeaderUpdate(payload: LeaderUpdatePayload): {
  ok: boolean;
  error?: string;
  cleaned?: LeaderUpdatePayload;
} {
  const cleaned: LeaderUpdatePayload = {};

  if (payload.full_name !== undefined) {
    const name = payload.full_name.trim();
    if (name.length < 2 || name.length > 120) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    cleaned.full_name = name;
  }

  if (payload.contacts !== undefined) {
    if (!Array.isArray(payload.contacts) || payload.contacts.length > 20) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    const cleanedContacts: ContactInput[] = [];
    for (const c of payload.contacts) {
      const s = sanitizeContactInput(c);
      if (!s) return { ok: false, error: "VALIDATION_ERROR" };
      cleanedContacts.push(s);
    }
    cleaned.contacts = cleanedContacts;
  }

  if (payload.note !== undefined) {
    cleaned.note = payload.note?.trim() || null;
  }

  return { ok: true, cleaned };
}
