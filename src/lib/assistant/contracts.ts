import { z } from "zod";

const ScopeCodeSchema = z.string().regex(/^RW(?:-[A-Z0-9]{1,12}){0,5}$/).max(80);
const LevelSchema = z.enum(["province", "district", "sector", "cell", "village"]);

export const AssistantLocationSchema = z.object({
  level: LevelSchema,
  scope_code: ScopeCodeSchema,
  name_kiny: z.string().trim().min(1).max(160),
  path: z.array(z.object({
    level: LevelSchema,
    scope_code: ScopeCodeSchema,
    name_kiny: z.string().trim().min(1).max(160),
  })).max(5).default([]),
});

export const AssistantContextSchema = z.object({
  intent: z.enum(["leader_by_place", "leader_by_location", "leader_contact_followup", "place_lookup"]).optional(),
  scope_code: ScopeCodeSchema.nullable().optional(),
  place_name: z.string().trim().max(160).nullable().optional(),
  level: LevelSchema.nullable().optional(),
  person_name: z.string().trim().max(160).nullable().optional(),
  person_id: z.string().uuid().nullable().optional(),
  appointment_id: z.string().uuid().nullable().optional(),
});

export const AssistantRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  location: AssistantLocationSchema.nullable().optional(),
  context: AssistantContextSchema.nullable().optional(),
});

export type AssistantLocationContext = z.infer<typeof AssistantLocationSchema>;
export type AssistantConversationContext = z.infer<typeof AssistantContextSchema>;
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

export type AssistantIntent =
  | "greeting"
  | "help"
  | "emergency"
  | "leader_by_location"
  | "leader_by_place"
  | "person_search"
  | "leader_contact_followup"
  | "place_lookup"
  | "distance"
  | "boundaries"
  | "signs"
  | "place_facts"
  | "out_of_scope";

export type AssistantConfidence = "high" | "medium" | "low" | "not_applicable";

export interface AssistantSource {
  label: string;
  data_date: string | null;
}

export interface AssistantPlaceCard {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: string;
  full_path: string;
}

export interface AssistantLeaderContact {
  type: string;
  label: string | null;
  value: string;
}

export interface AssistantLeaderCard {
  appointment_id: string;
  display_name: string;
  role_kiny: string;
  role_eng: string;
  place_name: string;
  place_level: string;
  effective_from: string | null;
  contacts: AssistantLeaderContact[];
}

export interface AssistantEmergencyContact {
  number: string;
  name_kiny: string;
  source: string;
  category: string;
}

export interface AssistantReply {
  status: "success" | "partial" | "missing" | "error";
  intent: AssistantIntent;
  answer_kiny: string;
  confidence: AssistantConfidence;
  confidence_label: string;
  data_date_label: string;
  sources: AssistantSource[];
  places: AssistantPlaceCard[];
  leaders: AssistantLeaderCard[];
  emergency_contacts: AssistantEmergencyContact[];
  suggestions: string[];
  context: AssistantConversationContext | null;
  gap_recorded: boolean;
  capability: string | null;
}
