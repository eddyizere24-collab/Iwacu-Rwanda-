/**
 * Emergency numbers shown to every visitor. National numbers have scope_code NULL; local ones belong to an
 * administrative unit and apply to everyone inside it. Only status = 'verified' rows are ever selected.
 */
import type { EmergencyNumber } from "@/types/emergency";

export const EMERGENCY_SELECT = "number, category, label_kiny, label_eng, note_kiny, scope_code, sort_order";

export interface EmergencyRow {
  number: string;
  category: string;
  label_kiny: string;
  label_eng: string | null;
  note_kiny: string | null;
  scope_code: string | null;
  sort_order: number | null;
}

/** National numbers first, then local ones; each group by sort_order, then number. */
export function toEmergencyList(rows: EmergencyRow[]): EmergencyNumber[] {
  return [...rows]
    .sort((a, b) => {
      const ga = a.scope_code === null ? 0 : 1;
      const gb = b.scope_code === null ? 0 : 1;
      return ga - gb || (a.sort_order ?? 100) - (b.sort_order ?? 100) || a.number.localeCompare(b.number);
    })
    .map((r) => ({
      number: r.number,
      category: r.category,
      label_kiny: r.label_kiny,
      label_eng: r.label_eng ?? null,
      note_kiny: r.note_kiny ?? null,
      scope_code: r.scope_code ?? null,
    }));
}

/** A dial string for a tel: link. Emergency numbers are digits plus an optional leading +, * or #. */
export function emergencyTel(number: string): string | null {
  return /^[+*#0-9]{2,16}$/.test(number) ? `tel:${number}` : null;
}
