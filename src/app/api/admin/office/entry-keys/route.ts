import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";
import { ENTRY_KEY_PATTERN, ENTRY_LEVELS, hashEntryKey } from "@/lib/office/entry-key";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which levels already have a key (never the key). National only; the database refuses everyone else. */
export async function GET() {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("get_office_entry_keys_status_v1");
  if (error) return officeDbError(error, "Ntibyashobotse gusoma imfunguzo.");
  return registryJson({ status: "success", levels: data ?? [] });
}

const Schema = z.object({ level: z.enum(["district", "sector", "cell", "all"]), key: z.string() });

/** National sets the key of one level, or of all three at once. Only a salted hash is stored. */
export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Schema.safeParse(body.value);
  if (!parsed.success || !ENTRY_KEY_PATTERN.test(parsed.data.key)) {
    return registryJson({ status: "error", message_kiny: "Urufunguzo ni imibare gusa, kuva kuri 6 kugeza kuri 16." }, 422);
  }
  if (!isSupabaseConfigured()) {
    return registryJson({ status: "error", code: "SERVICE_KEY_MISSING", message_kiny: "Gushyiraho urufunguzo ntibirashoboka: urufunguzo rwa seriveri ntirurashyirwaho." }, 503);
  }
  const levels = parsed.data.level === "all" ? [...ENTRY_LEVELS] : [parsed.data.level];
  const service = createSupabaseServiceClient();
  for (const level of levels) {
    const { error: authError } = await auth.context.supabase.rpc("authorize_office_entry_key_v1", { p_level: level });
    if (authError) return officeDbError(authError, "Ntibyemewe.");
    const { salt, hash } = hashEntryKey(parsed.data.key);
    const { error } = await service.rpc("office_entry_key_set_v1", { p_level: level, p_salt: salt, p_hash: hash, p_actor: auth.context.user.id });
    if (error) return registryJson({ status: "error", message_kiny: "Urufunguzo ntirwabitswe. Ongera ugerageze." }, 500);
  }
  return registryJson({ status: "success", levels });
}
