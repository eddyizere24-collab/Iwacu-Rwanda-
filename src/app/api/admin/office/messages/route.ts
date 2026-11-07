import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { officeDbError } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const box = request.nextUrl.searchParams.get("box") === "sent" ? "sent" : "inbox";
  const { data, error } = await auth.context.supabase.rpc(
    box === "sent" ? "list_office_sent_v1" : "list_office_inbox_v1",
    { p_limit: 100 }
  );
  if (error) return officeDbError(error, "Ubutumwa ntibwabonetse.");
  return registryJson({ status: "success", box, messages: data ?? [] });
}

const SendSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  audience: z.enum(["person", "below", "above"]),
  recipient_ids: z.array(z.string().uuid()).max(50).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = SendSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Andika umutwe n'ubutumwa." }, 422);
  const { data, error } = await auth.context.supabase.rpc("send_office_message_v1", {
    p_subject: parsed.data.subject,
    p_body: parsed.data.body,
    p_audience: parsed.data.audience,
    p_recipient_ids: parsed.data.audience === "person" ? parsed.data.recipient_ids ?? [] : null,
  });
  if (error) return officeDbError(error, "Ubutumwa ntibwoherejwe.");
  return registryJson({ status: "success", delivered_to: data }, 201);
}

const ReadSchema = z.object({ message_id: z.string().uuid() });
export async function PATCH(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = ReadSchema.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Ubutumwa ntibwemewe." }, 422);
  const { error } = await auth.context.supabase.rpc("mark_office_message_read_v1", { p_message_id: parsed.data.message_id });
  if (error) return officeDbError(error, "Ntibyashobotse.");
  return registryJson({ status: "success" });
}
