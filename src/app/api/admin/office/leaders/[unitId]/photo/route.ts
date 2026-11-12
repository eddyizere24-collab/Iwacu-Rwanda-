import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNIT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length > 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

/**
 * Uploads the leader's photo (already shrunk to WebP in the browser, max 150 KB).
 * Authority is checked first under the CALLER's session; the file itself is written by the server.
 * The photo only becomes visible after the card is saved with the returned path.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await ctx.params;
  if (!UNIT.test(unitId)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.context.supabase.rpc("get_office_unit_leader_v1", { p_unit_id: unitId });
  if (error) return officeDbError(error, "Ahantu ntiharemewe.");
  const card = Array.isArray(data) ? data[0] ?? null : null;
  if (!card || !card.can_edit) return registryJson({ status: "error", message_kiny: "Nta burenganzira ufite aha hantu." }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return registryJson({ status: "error", message_kiny: "Ifoto ntiyoherejwe neza." }, 400);
  }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return registryJson({ status: "error", message_kiny: "Hitamo ifoto." }, 422);
  if (file.size > 150 * 1024) return registryJson({ status: "error", message_kiny: "Ifoto igomba kuba itarengeje 150 KB." }, 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type !== "image/webp" || !isWebp(bytes)) return registryJson({ status: "error", message_kiny: "Ifoto igomba kuba WebP." }, 422);

  if (!isSupabaseConfigured()) {
    return registryJson({ status: "error", code: "SERVICE_KEY_MISSING", message_kiny: "Kubika ifoto ntibirashoboka: urufunguzo rwa seriveri ntirurashyirwaho." }, 503);
  }
  const path = `office/${unitId.toLowerCase()}/${randomUUID()}.webp`;
  const service = createSupabaseServiceClient();
  const up = await service.storage.from("leader-photos").upload(path, bytes, { contentType: "image/webp", cacheControl: "3600", upsert: false });
  if (up.error) {
    console.error("[office] photo upload failed");
    return registryJson({ status: "error", message_kiny: "Ifoto ntiyoherejwe. Ongera ugerageze." }, 502);
  }
  return registryJson({ status: "success", photo_path: path }, 201);
}
