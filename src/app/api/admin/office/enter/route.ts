import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson } from "@/lib/leaders/registry-api";
import { SCOPE_CODE } from "@/lib/office/office-api";
import { entryKeyMatches } from "@/lib/office/entry-key";
import { loginToEmail } from "@/lib/office/office-logic";
import {
  createSupabaseServerClient, createSupabaseServiceClient, isSupabaseConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ scope: z.string().regex(SCOPE_CODE), key: z.string().min(1).max(64) });

// One answer for every failure, so nobody can tell "wrong key" from "this place does not exist".
const WRONG = "Urufunguzo si rwo.";

type Lookup = { email: string | null; user_id: string | null; unit_id: string | null; level: string | null; locked: boolean };

/**
 * Entry for district / sector / cell offices: the person picked a place and typed the key that National set for that level.
 * National does not come here: it keeps name + password + second step.
 * The first time anyone enters a place, its account is created; the person gets a session without anyone knowing a password.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return registryJson({ status: "error", message_kiny: "Serivisi yo kwinjira ntiraboneka." }, 503);
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Schema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Hitamo ahantu wandike urufunguzo." }, 422);
  const { scope, key } = parsed.data;

  const ip = createHash("sha256")
    .update((request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown")
    .digest("hex").slice(0, 32);

  const service = createSupabaseServiceClient();
  const lookup = async (): Promise<Lookup | null> => {
    const { data, error } = await service.rpc("office_entry_lookup_v1", { p_scope: scope, p_ip: ip });
    return error ? null : ((Array.isArray(data) ? data[0] : null) as Lookup | null);
  };
  const found = await lookup();
  if (!found) return registryJson({ status: "error", message_kiny: "Ntibyashobotse. Ongera ugerageze." }, 500);
  if (found.locked) {
    return registryJson({ status: "error", message_kiny: "Wagerageje inshuro nyinshi. Tegereza iminota 15 wongere ugerageze." }, 429);
  }
  const fail = async () => {
    await service.rpc("office_entry_fail_v1", { p_scope: scope, p_ip: ip });
    return registryJson({ status: "error", message_kiny: WRONG }, 401);
  };

  // 1) The key typed must be the key National set for this place's level.
  if (!found.unit_id || !found.level) return fail();
  const { data: stored } = await service.rpc("office_entry_key_get_v1", { p_level: found.level });
  const row = Array.isArray(stored) ? stored[0] : null;
  if (!entryKeyMatches(key, row ? { salt: row.salt, hash: row.hash } : null)) return fail();

  // 2) Make the place's account the first time.
  let email = found.email;
  let userId = found.user_id;
  if (!email || !userId) {
    const loginName = "ahantu." + scope.toLowerCase().replace(/[^a-z0-9]+/g, ".");
    const created = await service.auth.admin.createUser({
      email: loginToEmail(loginName),
      password: randomBytes(32).toString("base64url"), // nobody knows it; entry never uses it
      email_confirm: true,
      user_metadata: { office_account: true },
    });
    if (created.data?.user) {
      const { error: recordError } = await service.rpc("office_entry_create_account_v1", {
        p_user_id: created.data.user.id, p_login_name: loginName, p_unit_id: found.unit_id,
      });
      if (recordError) {
        await service.auth.admin.deleteUser(created.data.user.id).catch(() => undefined);
        // Someone else created it a moment ago: use theirs.
      }
    }
    const again = await lookup();
    if (!again?.email || !again.user_id) return registryJson({ status: "error", message_kiny: "Ntibyashobotse. Ongera ugerageze." }, 500);
    email = again.email; userId = again.user_id;
  }

  // 3) A session for that account, without a password: the server asks Auth for a one-time link and uses it at once.
  const link = await service.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return registryJson({ status: "error", message_kiny: "Ntibyashobotse. Ongera ugerageze." }, 502);
  const supabase = await createSupabaseServerClient();
  const { data: session, error: otpError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (otpError || session.user?.id !== userId) {
    await supabase.auth.signOut();
    return registryJson({ status: "error", message_kiny: "Ntibyashobotse. Ongera ugerageze." }, 502);
  }
  await service.rpc("office_entry_clear_v1", { p_scope: scope, p_ip: ip });
  await service.rpc("office_entry_settle_v1", { p_user_id: userId });
  return registryJson({ status: "success", next: "/admin/ibiro" });
}
