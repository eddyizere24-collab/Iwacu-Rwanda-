import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson } from "@/lib/leaders/registry-api";
import { SCOPE_CODE } from "@/lib/office/office-api";
import {
  createSupabaseServerClient, createSupabaseServiceClient, isSupabaseConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ scope: z.string().regex(SCOPE_CODE), key: z.string().min(1).max(128) });

// One answer for every failure, so nobody can tell "wrong key" from "this place has no account".
const WRONG = "Urufunguzo si rwo, cyangwa aho hantu nta konti ihari.";

/**
 * Entry for district / sector / cell offices: the person picked a place and typed that place's key.
 * The key is the password of the account that holds that place (the level above gave it and can reset it).
 * National does not come here: it keeps name + password + second step.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return registryJson({ status: "error", message_kiny: "Serivisi yo kwinjira ntiraboneka." }, 503);
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Schema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Hitamo ahantu wandike urufunguzo." }, 422);
  const { scope, key } = parsed.data;
  if (scope === "RW") return registryJson({ status: "error", message_kiny: WRONG }, 401);

  const ip = createHash("sha256")
    .update((request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown")
    .digest("hex").slice(0, 32);

  const service = createSupabaseServiceClient();
  const { data: rows, error: lookupError } = await service.rpc("office_entry_lookup_v1", { p_scope: scope, p_ip: ip });
  if (lookupError) return registryJson({ status: "error", message_kiny: "Ntibyashobotse. Ongera ugerageze." }, 500);
  const found = Array.isArray(rows) ? rows[0] : null;
  if (found?.locked) {
    return registryJson({ status: "error", message_kiny: "Wagerageje inshuro nyinshi. Tegereza iminota 15 wongere ugerageze." }, 429);
  }

  const fail = async () => {
    await service.rpc("office_entry_fail_v1", { p_scope: scope, p_ip: ip });
    return registryJson({ status: "error", message_kiny: WRONG }, 401);
  };
  if (!found?.email) return fail();

  const supabase = await createSupabaseServerClient();
  const { data: signed, error: signError } = await supabase.auth.signInWithPassword({ email: found.email, password: key });
  if (signError || !signed.user) return fail();
  if (signed.user.id !== found.user_id) {
    await supabase.auth.signOut();
    return fail();
  }
  await service.rpc("office_entry_clear_v1", { p_scope: scope, p_ip: ip });

  const { data: me } = await supabase.rpc("get_office_me_v1");
  const profile = Array.isArray(me) ? me[0] : null;
  return registryJson({
    status: "success",
    next: profile?.must_change_password ? "/admin/ijambo-ry-ibanga" : "/admin/ibiro",
  });
}
