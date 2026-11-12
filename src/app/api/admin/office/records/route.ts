import { NextRequest } from "next/server";
import { registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";
import { intParam, officeDbError, SCOPE_CODE, UUID_RE } from "@/lib/office/office-api";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["decision", "report", "minutes", "circular", "other"];
const MAX_BYTES = 5 * 1024 * 1024;

function detect(bytes: Uint8Array): { ext: "pdf" | "jpg" | "png"; mime: string } | null {
  if (bytes.length > 8 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return { ext: "pdf", mime: "application/pdf" };
  if (bytes.length > 8 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", mime: "image/png" };
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind");
  if (kind && !KINDS.includes(kind)) return registryJson({ status: "error", message_kiny: "Ubwoko ntibwemewe." }, 422);
  const under = sp.get("under");
  if (under && !SCOPE_CODE.test(under)) return registryJson({ status: "error", message_kiny: "Ahantu ntiharemewe." }, 422);
  const { data, error } = await auth.context.supabase.rpc("list_office_records_v1", {
    p_q: (sp.get("q") ?? "").trim().slice(0, 60) || null, p_kind: kind || null, p_under: under || null,
    p_limit: intParam(sp.get("limit"), 30, 1, 100), p_offset: intParam(sp.get("offset"), 0, 0, 100000),
  });
  if (error) return officeDbError(error, "Inyandiko ntizabonetse.");
  const rows = (data ?? []) as { total: number | string }[];
  return registryJson({ status: "success", records: rows, total: rows.length ? Number(rows[0].total) : 0 });
}

/** Adds a record (and its optional PDF/photo). Authority is checked first by the database under the caller's session. */
export async function POST(request: NextRequest) {
  const auth = await requireLeaderAdmin();
  if (!auth.ok) return auth.response;
  let form: FormData;
  try { form = await request.formData(); } catch { return registryJson({ status: "error", message_kiny: "Ibyoherejwe ntibyasomwe neza." }, 400); }
  const unitId = String(form.get("unit_id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const kind = String(form.get("kind") ?? "");
  const note = String(form.get("note") ?? "").trim();
  if (!UUID_RE.test(unitId) || title.length < 3 || title.length > 160 || !KINDS.includes(kind) || note.length > 1000) {
    return registryJson({ status: "error", message_kiny: "Andika umutwe (nibura inyuguti 3) uhitemo n'ubwoko." }, 422);
  }
  const file = form.get("file");
  let bytes: Uint8Array | null = null;
  let det: ReturnType<typeof detect> = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return registryJson({ status: "error", message_kiny: "Dosiye igomba kuba itarengeje 5 MB." }, 422);
    bytes = new Uint8Array(await file.arrayBuffer());
    det = detect(bytes);
    if (!det) return registryJson({ status: "error", message_kiny: "Dosiye igomba kuba PDF, JPG cyangwa PNG." }, 422);
    if (!isSupabaseConfigured()) {
      return registryJson({ status: "error", code: "SERVICE_KEY_MISSING", message_kiny: "Kubika dosiye ntibirashoboka: urufunguzo rwa seriveri ntirurashyirwaho." }, 503);
    }
  }
  const { data, error } = await auth.context.supabase.rpc("create_office_record_v1", {
    p_unit_id: unitId, p_title: title, p_kind: kind, p_note: note || null,
    p_file_name: file instanceof File && bytes ? file.name.slice(0, 120) : null, p_size: bytes ? bytes.length : null, p_ext: det ? det.ext : null,
  });
  if (error) return officeDbError(error, "Inyandiko ntibitswe.");
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; file_path: string | null } | null;
  if (!row) return registryJson({ status: "error", message_kiny: "Inyandiko ntibitswe." }, 500);
  if (bytes && det && row.file_path) {
    const up = await createSupabaseServiceClient().storage.from("office-records").upload(row.file_path, bytes, { contentType: det.mime, cacheControl: "3600", upsert: false });
    if (up.error) {
      console.error("[office] record upload failed");
      await auth.context.supabase.rpc("archive_office_record_v1", { p_id: row.id });
      return registryJson({ status: "error", message_kiny: "Dosiye ntiyoherejwe. Ongera ugerageze." }, 502);
    }
  }
  return registryJson({ status: "success", id: row.id }, 201);
}
