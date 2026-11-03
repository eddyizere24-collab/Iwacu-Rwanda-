import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PositionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/),
  title_kiny: z.string().trim().min(2).max(160),
  title_eng: z.string().trim().min(2).max(160),
  title_fra: z.string().trim().min(2).max(160),
  required_boundary_level: z.enum(["country", "district", "sector", "cell", "village"]),
  is_exclusive: z.boolean().default(true),
});
const PositionPatchSchema = z.object({
  id: z.string().uuid(),
  position_status: z.enum(["draft", "approved", "retired"]).optional(),
  title_kiny: z.string().trim().min(2).max(160).optional(),
  title_eng: z.string().trim().min(2).max(160).optional(),
  title_fra: z.string().trim().min(2).max(160).optional(),
  required_boundary_level: z.enum(["country", "district", "sector", "cell", "village"]).optional(),
  is_exclusive: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 1, "At least one field is required");

export async function GET() {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase
    .from("leader_positions")
    .select("id, code, title_kiny, title_eng, title_fra, required_boundary_level, is_exclusive, position_status, created_at, updated_at, approved_at")
    .order("required_boundary_level")
    .order("title_kiny");
  if (error) return registryDbError(error, "Urutonde rw'imyanya ntirubonetse.");
  return registryJson({ status: "success", positions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = PositionSchema.safeParse(body.value);
  if (!parsed.success) {
    return registryJson({ status: "error", code: "VALIDATION_ERROR", message_kiny: "Ibisobanuro by'umwanya ntibyujuje ibisabwa." }, 422);
  }
  // Database RLS restricts catalogue creation to the National Super Admin.
  const { data, error } = await auth.context.supabase
    .from("leader_positions")
    .insert(parsed.data)
    .select("id, code, title_kiny, title_eng, title_fra, required_boundary_level, is_exclusive, position_status, created_at")
    .single();
  if (error) return registryDbError(error, "Umwanya ntubitswe. Ububasha bw'Igihugu ni bwo bugena urutonde rw'imyanya.");
  return registryJson({ status: "success", position: data }, 201);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = PositionPatchSchema.safeParse(body.value);
  if (!parsed.success) {
    return registryJson({ status: "error", code: "VALIDATION_ERROR", message_kiny: "Amakuru yo guhindura umwanya ntiyemewe." }, 422);
  }
  const { id, ...changes } = parsed.data;
  const { data, error } = await auth.context.supabase
    .from("leader_positions")
    .update(changes)
    .eq("id", id)
    .select("id, code, title_kiny, title_eng, title_fra, required_boundary_level, is_exclusive, position_status, approved_at")
    .maybeSingle();
  if (error) return registryDbError(error, "Guhindura cyangwa kwemeza umwanya byanze.");
  if (!data) return registryJson({ status: "error", code: "NOT_FOUND", message_kiny: "Umwanya ntiwabonetse cyangwa nta burenganzira ufite." }, 404);
  return registryJson({ status: "success", position: data });
}
