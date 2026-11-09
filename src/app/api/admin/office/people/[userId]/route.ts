import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, UUID_RE } from "@/lib/office/office-api";
import { generateTempPassword } from "@/lib/office/office-logic";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ action: z.enum(["suspend", "resume", "reset"]) });

/**
 * Access management for one account below the caller.
 *  suspend / resume: the database switches the assignment off or on (authority is checked there).
 *  reset: the database confirms authority and forces a new password at next sign-in; only then does the server set a
 *  new temporary password through the Auth admin API. The password is shown once and never stored.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  if (!UUID_RE.test(userId)) return registryJson({ status: "error", message_kiny: "Konti ntiyemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Body.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Igikorwa ntikizwi." }, 422);
  const { supabase } = auth.context;

  if (parsed.data.action !== "reset") {
    const { data, error } = await supabase.rpc("set_office_account_active_v1", { p_user: userId, p_active: parsed.data.action === "resume" });
    if (error) return officeDbError(error, "Ntibyashobotse guhindura konti.");
    return registryJson({ status: "success", account_status: data });
  }

  const { error } = await supabase.rpc("prepare_office_reset_v1", { p_user: userId });
  if (error) return officeDbError(error, "Ntibyashobotse gusubiza ijambo ry'ibanga.");
  if (!isSupabaseConfigured()) {
    return registryJson({ status: "error", code: "SERVICE_KEY_MISSING", message_kiny: "Urufunguzo rwa seriveri ntirurashyirwaho." }, 503);
  }
  const password = generateTempPassword((max) => randomInt(max));
  const { error: authError } = await createSupabaseServiceClient().auth.admin.updateUserById(userId, { password });
  if (authError) {
    console.error("[office] password reset failed", { status: authError.status });
    return registryJson({ status: "error", message_kiny: "Ijambo ry'ibanga ntiryahinduwe. Ongera ugerageze." }, 502);
  }
  return registryJson({ status: "success", temp_password: password });
}
