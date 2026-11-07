import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";
import {
  checkAccountInput, childLevelFor, generateTempPassword, loginToEmail, makeLoginName, roleForLevel,
} from "@/lib/office/office-logic";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("list_office_contacts_v1");
  if (error) return officeDbError(error, "Urutonde rw'abayobozi ntirwabonetse.");
  return registryJson({ status: "success", contacts: data ?? [] });
}

const CreateSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  job_title: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  unit_id: z.string().uuid(),
});

/**
 * Creates the Auth user (service role) and then records authority + profile in one database call that runs
 * under the CALLER's session, so the database decides whether this caller may create this account here.
 * If that call fails, the Auth user is removed again. The temporary password is returned once and never stored.
 */
export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = CreateSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Andika amazina n'ahantu." }, 422);
  const input = parsed.data;
  const problem = checkAccountInput({ full_name: input.full_name, phone: input.phone });
  if (problem) return registryJson({ status: "error", message_kiny: problem }, 422);

  const { supabase, assignments } = auth.context;
  const { data: unit, error: unitError } = await supabase
    .from("boundaries").select("id, level, name_kiny, scope_code").eq("id", input.unit_id).is("valid_to", null).maybeSingle();
  if (unitError || !unit) return registryJson({ status: "error", message_kiny: "Ahantu ntihabonetse." }, 404);
  const role = roleForLevel(unit.level);
  if (!role || !assignments.some((a) => childLevelFor(a.role_code) === unit.level)) {
    return registryJson({ status: "error", code: "ROLE_HIERARCHY", message_kiny: "Ushobora gukorera konti urwego rukurikira urwawe gusa." }, 403);
  }

  if (!isSupabaseConfigured()) {
    return registryJson({ status: "error", code: "SERVICE_KEY_MISSING", message_kiny: "Gukora konti ntibirashoboka: urufunguzo rwa seriveri ntirurashyirwaho." }, 503);
  }
  const service = createSupabaseServiceClient();

  let created: { id: string; loginName: string; password: string } | null = null;
  for (let attempt = 0; attempt < 4 && !created; attempt += 1) {
    const loginName = makeLoginName(input.full_name);
    const password = generateTempPassword((max) => randomInt(max));
    const { data, error } = await service.auth.admin.createUser({
      email: loginToEmail(loginName),
      password,
      email_confirm: true,
      user_metadata: { office_account: true },
    });
    if (data?.user) created = { id: data.user.id, loginName, password };
    else if (!/already|registered|exists/i.test(error?.message ?? "")) {
      console.error("[office] auth user creation failed", { status: error?.status });
      return registryJson({ status: "error", message_kiny: "Konti ntiyashoboye gukorwa. Ongera ugerageze." }, 502);
    }
  }
  if (!created) return registryJson({ status: "error", message_kiny: "Konti ntiyashoboye gukorwa. Ongera ugerageze." }, 409);

  const { error: rpcError } = await supabase.rpc("create_office_account_v1", {
    p_user_id: created.id,
    p_login_name: created.loginName,
    p_display_name: input.full_name,
    p_job_title: input.job_title ?? null,
    p_phone: input.phone ?? null,
    p_role_code: role,
    p_unit_id: unit.id,
  });
  if (rpcError) {
    await service.auth.admin.deleteUser(created.id).catch(() => undefined);
    return officeDbError(rpcError, "Konti ntiyabitswe.");
  }

  return registryJson({
    status: "success",
    account: {
      user_id: created.id,
      login_name: created.loginName,
      temp_password: created.password,
      display_name: input.full_name,
      role_code: role,
      unit_name: unit.name_kiny,
    },
  }, 201);
}
