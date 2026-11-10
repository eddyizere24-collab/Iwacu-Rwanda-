import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, SCOPE_CODE } from "@/lib/office/office-api";
import { generateTempPassword, loginToEmail, makeLoginName } from "@/lib/office/office-logic";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The places directly below `scope` whose key the caller may create or reset, and whether each has one. */
export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const scope = request.nextUrl.searchParams.get("scope") ?? "";
  if (!SCOPE_CODE.test(scope)) return registryJson({ status: "error", message_kiny: "Aho uhereye si ho." }, 422);
  const { data, error } = await auth.context.supabase.rpc("list_office_keys_v1", { p_scope: scope });
  if (error) return officeDbError(error, "Urutonde rw'imfunguzo ntirwabonetse.");
  return registryJson({ status: "success", places: data ?? [] });
}

const Schema = z.object({ unit_id: z.string().uuid() });

/**
 * Create the key of a place that has none, or reset it if it has one. Either way the new key is returned ONCE
 * and is never stored. The database decides whether the caller is the level above this place.
 */
export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Schema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Hitamo ahantu." }, 422);
  if (!isSupabaseConfigured()) {
    return registryJson({ status: "error", code: "SERVICE_KEY_MISSING", message_kiny: "Kurema urufunguzo ntibirashoboka: urufunguzo rwa seriveri ntirurashyirwaho." }, 503);
  }
  const { supabase } = auth.context;
  const unitId = parsed.data.unit_id;
  const service = createSupabaseServiceClient();
  const key = generateTempPassword((max) => randomInt(max));

  const { data: unit } = await supabase.from("boundaries").select("id, name_kiny, level, scope_code").eq("id", unitId).is("valid_to", null).maybeSingle();
  if (!unit) return registryJson({ status: "error", message_kiny: "Ahantu ntihabonetse." }, 404);

  // 1) Existing key? The database authorises the reset and tells us which account holds it.
  const { data: existing, error: resetError } = await supabase.rpc("reset_office_key_v1", { p_unit_id: unitId });
  if (!resetError && typeof existing === "string") {
    const { error: updateError } = await service.auth.admin.updateUserById(existing, { password: key });
    if (updateError) return registryJson({ status: "error", message_kiny: "Urufunguzo ntirwahinduwe. Ongera ugerageze." }, 502);
    return registryJson({ status: "success", action: "reset", place: { name: unit.name_kiny, level: unit.level }, key }, 200);
  }
  if (resetError && resetError.code !== "P0002") return officeDbError(resetError, "Urufunguzo ntirwahinduwe.");

  // 2) No key yet: make the account (Auth first), then record it under the caller's session.
  let created: { id: string; loginName: string } | null = null;
  for (let attempt = 0; attempt < 4 && !created; attempt += 1) {
    const loginName = makeLoginName(unit.name_kiny ?? "ahantu");
    const { data, error } = await service.auth.admin.createUser({
      email: loginToEmail(loginName), password: key, email_confirm: true, user_metadata: { office_account: true },
    });
    if (data?.user) created = { id: data.user.id, loginName };
    else if (!/already|registered|exists/i.test(error?.message ?? "")) {
      return registryJson({ status: "error", message_kiny: "Urufunguzo ntirwaremwe. Ongera ugerageze." }, 502);
    }
  }
  if (!created) return registryJson({ status: "error", message_kiny: "Urufunguzo ntirwaremwe. Ongera ugerageze." }, 409);

  const { error: rpcError } = await supabase.rpc("create_office_key_account_v1", {
    p_user_id: created.id, p_login_name: created.loginName, p_unit_id: unitId,
  });
  if (rpcError) {
    await service.auth.admin.deleteUser(created.id).catch(() => undefined);
    return officeDbError(rpcError, "Urufunguzo ntirwabitswe.");
  }
  return registryJson({ status: "success", action: "issued", place: { name: unit.name_kiny, level: unit.level }, key }, 201);
}
