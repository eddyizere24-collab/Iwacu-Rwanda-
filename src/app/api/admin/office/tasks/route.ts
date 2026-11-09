import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { intParam, officeDbError, UUID_RE } from "@/lib/office/office-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const view = sp.get("view") === "assigned" ? "assigned" : "issued";
  const { data, error } = await auth.context.supabase.rpc("list_office_tasks_v1", {
    p_view: view, p_limit: intParam(sp.get("limit"), 50, 1, 100), p_offset: intParam(sp.get("offset"), 0, 0, 100000),
  });
  if (error) return officeDbError(error, "Imirimo ntiyabonetse.");
  const rows = (data ?? []) as { total: number | string }[];
  return registryJson({ status: "success", tasks: rows, total: rows.length ? Number(rows[0].total) : 0 });
}

const Create = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().max(4000).optional().nullable(),
  priority: z.enum(["normal", "high", "critical"]).default("normal"),
  due_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "date"),
  unit_ids: z.array(z.string().regex(UUID_RE)).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = Create.safeParse(body.value);
  if (!parsed.success) return registryJson({ status: "error", message_kiny: "Andika umutwe, itariki n'ahantu hatoranyijwe." }, 422);
  const v = parsed.data;
  const { data, error } = await auth.context.supabase.rpc("create_office_task_v1", {
    p_title: v.title, p_body: v.body ?? null, p_priority: v.priority, p_due_at: new Date(v.due_at).toISOString(), p_unit_ids: v.unit_ids,
  });
  if (error) return officeDbError(error, "Umurimo ntiwabitswe.");
  return registryJson({ status: "success", task_id: data }, 201);
}
