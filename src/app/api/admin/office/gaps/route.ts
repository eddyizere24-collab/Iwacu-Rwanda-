import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.context.supabase.rpc(
    "list_assistant_gap_alerts_v1",
    { p_limit: 100 },
  );
  if (error) return officeDbError(error, "Amakuru abura ntashoboye kuboneka.");
  return registryJson({ status: "success", alerts: data ?? [] });
}

const UpdateSchema = z.object({
  alert_id: z.string().uuid(),
  status: z.enum(["reviewing", "resolved"]),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  if (!body.ok) return body.response;

  const parsed = UpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return registryJson({
      status: "error",
      message_kiny: "Ubutumwa bw'imenyesha ntabwo bwemewe.",
    }, 422);
  }

  const { data, error } = await auth.context.supabase.rpc(
    "update_assistant_gap_alert_v1",
    {
      p_alert_id: parsed.data.alert_id,
      p_status: parsed.data.status,
    },
  );
  if (error) return officeDbError(error, "Ntibyashobotse kuvugurura imenyesha.");
  if (data !== true) {
    return registryJson({
      status: "error",
      message_kiny: "Iri menyasha ntirigenewe konti yawe cyangwa ntirikiboneka.",
    }, 404);
  }
  return registryJson({ status: "success" });
}
