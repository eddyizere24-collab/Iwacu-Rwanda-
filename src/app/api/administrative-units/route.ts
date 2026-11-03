import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  level: z.enum(["province", "district", "sector", "cell", "village"]),
  parent_id: z.string().uuid().optional(),
  parent_code: z.string().trim().min(2).max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    level: req.nextUrl.searchParams.get("level"),
    parent_id: req.nextUrl.searchParams.get("parent_id") || undefined,
    parent_code: req.nextUrl.searchParams.get("parent_code") || undefined,
    q: req.nextUrl.searchParams.get("q") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({
      status: "error",
      message_kiny: "Urwego cyangwa aho utangirira gushaka ntibyemewe.",
    }, { status: 400 });
  }

  const { level, parent_id: requestedParentId, parent_code: parentCode, q } = parsed.data;
  if (requestedParentId && parentCode) {
    return NextResponse.json({
      status: "error",
      message_kiny: "Hitamo uburyo bumwe bwo kwerekana urwego rubanziriza.",
    }, { status: 400 });
  }
  if (level !== "province" && !requestedParentId && !parentCode && level !== "district") {
    return NextResponse.json({
      status: "error",
      message_kiny: "Hitamo urwego rubanziriza mbere yo gufungura urutonde.",
    }, { status: 400 });
  }
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({
      status: "unavailable",
      message_kiny: "Urutonde rw'ubuyobozi ntirubashije gufunguka. Reba ibyo telefone yari yarabitse.",
      units: [],
    }, { status: 503 });
  }

  const supabase = createSupabasePublicClient();
  let parentId = requestedParentId ?? null;
  if (parentCode) {
    const { data: parent, error: parentError } = await supabase
      .from("boundaries")
      .select("id, level")
      .eq("scope_code", parentCode)
      .is("valid_to", null)
      .maybeSingle();
    if (parentError || !parent) {
      return NextResponse.json({
        status: "error",
        message_kiny: "Urwego rubanziriza ntirubonetse muri database.",
        units: [],
      }, { status: 404 });
    }
    const expectedParent: Record<string, string> = {
      district: "province",
      sector: "district",
      cell: "sector",
      village: "cell",
    };
    if (expectedParent[level] !== parent.level) {
      return NextResponse.json({
        status: "error",
        message_kiny: "Urwego wahisemo ntirujyanye n'urwego rubanziriza.",
        units: [],
      }, { status: 422 });
    }
    parentId = parent.id;
  }

  let query = supabase
    .from("boundaries")
    .select("id, scope_code, name_kiny, name_eng, level, parent_id")
    .eq("level", level)
    .is("valid_to", null)
    .order("name_kiny", { ascending: true })
    .limit(2_000);

  // Filtering by level excludes the country row; root always starts with the
  // five province records from the database, never a hand-maintained list.
  if ((level !== "province" && level !== "district") && parentId) query = query.eq("parent_id", parentId);
  if (level === "district" && parentId) query = query.eq("parent_id", parentId);
  if (q) query = query.ilike("name_kiny", "%" + q + "%");

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({
      status: "unavailable",
      message_kiny: "Urutonde ntirwashoboye gusomwa muri database.",
      units: [],
    }, { status: 503 });
  }

  const units = (data ?? []).map((row) => ({
    id: row.id,
    code: row.scope_code,
    scope_code: row.scope_code,
    name_kiny: row.name_kiny,
    name_eng: row.name_eng,
    level: row.level,
    parent_id: row.parent_id,
  }));

  return NextResponse.json({
    status: "success",
    source: "Supabase boundaries",
    units,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
