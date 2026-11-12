import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError, UUID_RE } from "@/lib/office/office-api";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authority first (database, caller's session); then a 60-second signed link to the private file. */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ recordId: string }> }) {
  const { recordId } = await ctx.params;
  if (!UUID_RE.test(recordId)) return registryJson({ status: "error", message_kiny: "Inyandiko ntiyemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.context.supabase.rpc("get_office_record_file_v1", { p_id: recordId });
  if (error) return officeDbError(error, "Dosiye ntiyabonetse.");
  if (typeof data !== "string" || !data) return registryJson({ status: "error", message_kiny: "Nta dosiye iriho." }, 404);
  if (!isSupabaseConfigured()) return registryJson({ status: "error", code: "SERVICE_KEY_MISSING", message_kiny: "Gufungura dosiye ntibirashoboka: urufunguzo rwa seriveri ntirurashyirwaho." }, 503);
  const signed = await createSupabaseServiceClient().storage.from("office-records").createSignedUrl(data, 60);
  if (signed.error || !signed.data?.signedUrl) return registryJson({ status: "error", message_kiny: "Dosiye ntiyabonetse." }, 502);
  return registryJson({ status: "success", url: signed.data.signedUrl });
}
