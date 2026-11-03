/** An emergency number shown to every visitor. scope_code null = national. */
export interface EmergencyNumber {
  number: string;
  category: string;
  label_kiny: string;
  label_eng: string | null;
  note_kiny?: string | null;
  /** null = national; otherwise the administrative unit it belongs to. */
  scope_code?: string | null;
}
