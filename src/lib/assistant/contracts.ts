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
  intent: z.enum(["leader_by_place", "leader_by_location", "leader_contact_followup", "place_lookup", "person_search"]).optional(),
  scope_code: ScopeCodeSchema.nullable().optional(),
  place_name: z.string().trim().max(160).nullable().optional(),
  level: LevelSchema.nullable().optional(),
  person_name: z.string().trim().max(160).nullable().optional(),
  person_id: z.string().uuid().nullable().optional(),
  appointment_id: z.string().uuid().nullable().optional(),
  knowledge_topic: z.enum(["iwacu_rwanda", "rwanda", "kigali", "nyamasheke"]).nullable().optional(),
});

export const AssistantConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().max(1200),
});

export const AssistantRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  location: AssistantLocationSchema.nullable().optional(),
  context: AssistantContextSchema.nullable().optional(),
  // Short in-session transcript; never stored in the database.
  history: z.array(AssistantConversationTurnSchema).max(12).optional().default([]),
});

export type AssistantLocationContext = z.infer<typeof AssistantLocationSchema>;
export type AssistantConversationContext = z.infer<typeof AssistantContextSchema>;
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;
export type AssistantConversationTurn = z.infer<typeof AssistantConversationTurnSchema>;

export type AssistantIntent =
  | "greeting"
  | "identity"
  | "help"
  | "emergency"
  | "national_facts"
  | "my_location"
  | "leader_by_location"
  | "leader_by_place"
  | "person_search"
  | "leader_contact_followup"
  | "place_lookup"
  | "distance"
  | "boundaries"
  | "signs"
  | "place_facts"
  | "external_research"
  | "general_knowledge"
  | "out_of_scope";

export type AssistantConfidence = "high" | "medium" | "low" | "not_applicable";

export interface AssistantSource {
  label: string;
  data_date: string | null;
  url?: string | null;
  snippet?: string | null;
  trust_tier?: "official_government" | "intergovernmental_academic" | "reputable_publisher" | "other" | null;
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
  role_fra: string;
  place_name: string;
  place_name_eng: string;
  place_level: string;
  effective_from: string | null;
  contacts: AssistantLeaderContact[];
  photo_url: string | null;
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
  gap_notified: boolean;
  capability: string | null;
}
