import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured, createSupabaseServiceClient } from "@/lib/supabase/server";
import { maskPhone } from "@/lib/security/mask";
import { requireAdminWrite } from "@/lib/security/admin-gate";
import type { LeaderPublic } from "@/types/leader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CHANGED 2026-11-03 GROK: leaders write path uses real Supabase insert/soft-delete only when configured;
// no mock writes; no auto-verified demo defaults; scope must exist in boundaries; see docs/HANDOFF.md and docs/governance/PHASE1-RECON.md

const LEADER_ROLES = [
  "Village Leader",
  "Cell Executive Secretary",
  "Sector Executive Secretary",
  "Mayor",
  "Vice Mayor",
  "District Executive Secretary",
  "Other",
] as const;

const PatchLeaderSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().nonnegative(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(LEADER_ROLES),
  phone_number: z.string().optional(),
  email: z.string().email().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});

const CreateLeaderSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  role: z.enum(LEADER_ROLES),
  phone_number: z.string().min(8).max(20),
  email: z.string().email().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  scope_code: z.string().min(2).max(64),
});

/** Normalize Rwanda mobile to +250XXXXXXXXX or null if invalid. */
function normalizeRwPhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  let n = digits;
  if (n.startsWith("00250")) n = "+250" + n.slice(5);
  else if (n.startsWith("250") && n.length === 12) n = "+" + n;
  else if (n.startsWith("0") && n.length === 10) n = "+250" + n.slice(1);
  else if (/^\d{9}$/.test(n)) n = "+250" + n;
  if (!/^\+250[0-9]{9}$/.test(n)) return null;
  return n;
}

function mapLeaderRow(row: Record<string, unknown>, reveal: boolean): LeaderPublic {
  const rawB = row.boundaries;
  const b = (Array.isArray(rawB) ? rawB[0] : rawB) as {
    name_kiny: string;
    name_eng: string | null;
    level: string;
  } | null;
  return {
    id: row.id as string,
    scope_code: row.scope_code as string,
    first_name: row.first_name as string,
    last_name: row.last_name as string,
    role: row.role as LeaderPublic["role"],
    email: (row.email as string) ?? null,
    photo_url: (row.photo_url as string) ?? null,
    valid_from: row.valid_from as string,
    valid_to: (row.valid_to as string) ?? null,
    version: row.version as number,
    boundary_name_kiny: b?.name_kiny ?? "",
    boundary_name_eng: b?.name_eng ?? null,
    level: b?.level ?? "",
    phone_masked: maskPhone(row.phone_number as string | null),
    phone_raw: reveal ? (row.phone_number as string) : undefined,
  };
}

const LEADER_SELECT = `
  id,
  scope_code,
  first_name,
  last_name,
  role,
  email,
  photo_url,
  phone_number,
  valid_from,
  valid_to,
  version,
  boundaries!inner ( name_kiny, name_eng, level )
`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scopeCode = searchParams.get("scope_code") || "RW";
    const reveal = searchParams.get("reveal") === "true";

    if (reveal) {
      const gate = requireAdminWrite(req);
      if (!gate.ok) {
        return NextResponse.json(gate.body, { status: gate.status });
      }
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          status: "error",
          message_kiny:
            "Ububiko bw'amakuru nyayo ntiburashyirwaho. Nta makuru y'abayobozi y'icyitegererezo agaragazwa nk'ayemejwe.",
          leaders: [],
        },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServiceClient();
    let query = supabase
      .from("leaders")
      .select(LEADER_SELECT)
      .is("valid_to", null);

    if (scopeCode !== "RW") {
      query = query.like("scope_code", `${scopeCode}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[leaders GET] database query failed:", error.message);
      return NextResponse.json(
        {
          status: "error",
          message_kiny: "Ntibyashobotse gusoma amakuru nyayo y'abayobozi. Ongera ugerageze nyuma.",
          leaders: [],
        },
        { status: 502 }
      );
    }

    const leaders: LeaderPublic[] = (data || []).map((row: Record<string, unknown>) =>
      mapLeaderRow(row, reveal)
    );

    return NextResponse.json({ status: "success", leaders });
  } catch (err) {
    console.error("[leaders GET] unexpected error:", err);
    return NextResponse.json(
      {
        status: "error",
        message_kiny: "Serivisi y'amakuru y'abayobozi ntiyabonetse.",
        leaders: [],
      },
      { status: 502 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const gate = requireAdminWrite(req);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { status: "error", message_kiny: "Imiterere ya JSON ntabwo yemewe" },
        { status: 400 }
      );
    }

    const parsed = PatchLeaderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message_kiny: "Amakuru watanze ntabwo yuzuye neza",
          errors: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          status: "error",
          message_kiny:
            "Ububiko bw'amakuru ntiburashyirwaho. Ntihashobora guhindurwa umuyobozi w'ukuri.",
        },
        { status: 503 }
      );
    }

    const { id, version, first_name, last_name, role, phone_number, email, photo_url } =
      parsed.data;

    let normalizedPhone: string | undefined;
    if (phone_number !== undefined) {
      const n = normalizeRwPhone(phone_number);
      if (!n) {
        return NextResponse.json(
          {
            status: "error",
            message_kiny:
              "Nimero ya telefone ntabwo yemewe. Ikoreshe imiterere +250XXXXXXXXX.",
          },
          { status: 422 }
        );
      }
      normalizedPhone = n;
    }

    const supabase = createSupabaseServiceClient();

    const { data: current, error: fetchErr } = await supabase
      .from("leaders")
      .select("id, scope_code, first_name, last_name, role, email, photo_url, valid_from, valid_to, version")
      .eq("id", id)
      .is("valid_to", null)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json(
        { status: "error", message_kiny: "Umuyobozi ntabwo abonetse" },
        { status: 404 }
      );
    }

    if (current.version !== version) {
      return NextResponse.json(
        {
          status: "conflict",
          conflict: {
            server_version: current.version,
            your_version: version,
            server_data: {
              id: current.id,
              scope_code: current.scope_code,
              first_name: current.first_name,
              last_name: current.last_name,
              role: current.role,
              email: current.email,
              photo_url: current.photo_url,
              valid_from: current.valid_from,
              valid_to: current.valid_to,
              version: current.version,
            },
          },
        },
        { status: 409 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      first_name,
      last_name,
      role,
      version: current.version + 1,
      updated_at: new Date().toISOString(),
    };
    if (normalizedPhone !== undefined) updatePayload.phone_number = normalizedPhone;
    if (email !== undefined) updatePayload.email = email;
    if (photo_url !== undefined) updatePayload.photo_url = photo_url;

    const { data: updated, error: updateErr } = await supabase
      .from("leaders")
      .update(updatePayload)
      .eq("id", id)
      .eq("version", version)
      .is("valid_to", null)
      .select(LEADER_SELECT)
      .single();

    if (updateErr || !updated) {
      console.error("[leaders PATCH] update failed:", updateErr?.message);
      return NextResponse.json(
        { status: "error", message_kiny: "Guhindura byanze. Ongera ugerageze." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      leader: mapLeaderRow(updated as Record<string, unknown>, false),
    });
  } catch (err) {
    console.error("[leaders PATCH] error:", err);
    return NextResponse.json(
      { status: "error", message_kiny: "Ikibazo cy'urukurikirane" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const gate = requireAdminWrite(req);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const body = await req.json();
    const parsed = CreateLeaderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", message_kiny: "Amakuru ntiyuzuye neza", errors: parsed.error.flatten() },
        { status: 422 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          status: "error",
          message_kiny:
            "Ububiko bw'amakuru ntiburashyirwaho. Ntihashobora gushyirwaho umuyobozi w'ukuri.",
        },
        { status: 503 }
      );
    }

    const phone = normalizeRwPhone(parsed.data.phone_number);
    if (!phone) {
      return NextResponse.json(
        {
          status: "error",
          message_kiny:
            "Nimero ya telefone ntabwo yemewe. Ikoreshe imiterere +250XXXXXXXXX.",
        },
        { status: 422 }
      );
    }

    const supabase = createSupabaseServiceClient();

    // Canonical unit only — never invent scope codes
    const { data: boundary, error: boundaryErr } = await supabase
      .from("boundaries")
      .select("scope_code, name_kiny, name_eng, level")
      .eq("scope_code", parsed.data.scope_code)
      .is("valid_to", null)
      .maybeSingle();

    if (boundaryErr) {
      console.error("[leaders POST] boundary lookup failed:", boundaryErr.message);
      return NextResponse.json(
        { status: "error", message_kiny: "Ntibyashobotse kugenzura urwego rw'ubuyobozi." },
        { status: 502 }
      );
    }
    if (!boundary) {
      return NextResponse.json(
        {
          status: "error",
          message_kiny:
            "Kode y'urwego ntabwo ibonetse mu makuru yemewe (boundaries). Hitamo urwego ruri mu rutonde.",
        },
        { status: 422 }
      );
    }

    const insertRow = {
      scope_code: boundary.scope_code,
      first_name: parsed.data.first_name.trim(),
      last_name: parsed.data.last_name.trim(),
      role: parsed.data.role,
      phone_number: phone,
      email: parsed.data.email ?? null,
      photo_url: parsed.data.photo_url ?? null,
      valid_from: new Date().toISOString(),
      valid_to: null,
      version: 1,
    };

    const { data: created, error: insertErr } = await supabase
      .from("leaders")
      .insert(insertRow)
      .select(LEADER_SELECT)
      .single();

    if (insertErr || !created) {
      console.error("[leaders POST] insert failed:", insertErr?.message);
      if (insertErr?.code === "23505") {
        return NextResponse.json(
          {
            status: "error",
            message_kiny:
              "Hari umuyobozi ukora kuri uyu mwanya n'uru rwego. Fungura cyangwa uhindure uwariho mbere.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          status: "error",
          message_kiny: "Kubika umuyobozi byanze. Ongera ugerageze.",
        },
        { status: 500 }
      );
    }

    // Spec §7.3 / §20: new records default to pending verification (no auto-verified demo).
    // verification_status column is additive (sql/migrations/); until applied, API states intent only.
    return NextResponse.json({
      status: "success",
      verification_status: "pending_verification",
      leader: mapLeaderRow(created as Record<string, unknown>, true),
    });
  } catch (err) {
    console.error("[leaders POST] error:", err);
    return NextResponse.json(
      { status: "error", message_kiny: "Ikibazo cy'urukurikirane mu kubika." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const gate = requireAdminWrite(req);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { status: "error", message_kiny: "Shyiramo id y'umuyobozi" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          status: "error",
          message_kiny:
            "Ububiko bw'amakuru ntiburashyirwaho. Ntihashobora gukurwaho umuyobozi w'ukuri.",
        },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServiceClient();

    // Soft-delete: set valid_to (preserve history; no hard delete of official records)
    const { data: existing, error: fetchErr } = await supabase
      .from("leaders")
      .select("id, version")
      .eq("id", id)
      .is("valid_to", null)
      .maybeSingle();

    if (fetchErr) {
      console.error("[leaders DELETE] fetch failed:", fetchErr.message);
      return NextResponse.json(
        { status: "error", message_kiny: "Ikibazo mu gushaka umuyobozi." },
        { status: 502 }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { status: "error", message_kiny: "Umuyobozi ntabonetse" },
        { status: 404 }
      );
    }

    const { error: delErr } = await supabase
      .from("leaders")
      .update({
        valid_to: new Date().toISOString(),
        version: (existing.version as number) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("valid_to", null);

    if (delErr) {
      console.error("[leaders DELETE] soft-delete failed:", delErr.message);
      return NextResponse.json(
        { status: "error", message_kiny: "Ikibazo mu gukura umuyobozi." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      message_kiny: "Umuyobozi yakuwemo neza (valid_to yashyizweho; amateka aragumye).",
    });
  } catch (err) {
    console.error("[leaders DELETE] error:", err);
    return NextResponse.json(
      { status: "error", message_kiny: "Ikibazo mu gukura umuyobozi." },
      { status: 500 }
    );
  }
}
