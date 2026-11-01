import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SearchSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

// CHANGED 2026-11-01 CHATGPT: place search reads only the owned Supabase search_places RPC; remove dormant NISR HTTP lookup code; see docs/HANDOFF.md.
export async function POST(req: NextRequest) {
  try {
    const parsed = SearchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({
        status: "error",
        message_kiny: "Andika izina ry'ahantu ushaka gushakisha.",
      }, { status: 400 });
    }

    if (!isSupabasePublicConfigured()) {
      return NextResponse.json({
        status: "error",
        message_kiny: "Serivisi yo gushakisha amazina ntibashije kugera kuri database.",
      }, { status: 503 });
    }

    // Place lookup uses only search_places. Legacy findOfficialUnit and
    // fetchLeadersForUnit remain above for the deferred leaders feature,
    // but this route never calls them and never contacts live NISR.
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("search_places", {
      p_query: parsed.data.query,
      p_limit: 12,
    });

    if (error) {
      console.error("[ai-router] search_places failed:", error.message);
      return NextResponse.json({
        status: "error",
        message_kiny: "Gushakisha amazina muri database ntibyashobotse ubu.",
        results: [],
      }, { status: 503 });
    }

    const results = (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
      place_id: String(row.place_id ?? ""),
      scope_code: String(row.scope_code ?? ""),
      level: String(row.level ?? ""),
      name_kiny: String(row.name_kiny ?? ""),
      name_eng: row.name_eng == null ? null : String(row.name_eng),
      matched_name: String(row.matched_name ?? row.name_kiny ?? ""),
      full_path: String(row.full_path ?? ""),
      duplicate_count: Number(row.duplicate_count ?? 1),
      match_score: Number(row.match_score ?? 0),
    }));

    if (results.length === 0) {
      return NextResponse.json({
        status: "success",
        answer_kiny: "Nta hantu twabonye muri database bihuye n'iryo zina. Nta zina twahimbye cyangwa ngo duhindure.",
        query: parsed.data.query,
        results: [],
        source: "search_places",
      });
    }

    const answerLines = results.slice(0, 8).map((item: {
      name_kiny: string;
      full_path: string;
      duplicate_count: number;
    }) => {
      const duplicateText = item.duplicate_count > 1
        ? " (iri zina rikoreshwa ahantu " + item.duplicate_count + ")"
        : "";
      return item.name_kiny + " — " + item.full_path + duplicateText;
    });

    return NextResponse.json({
      status: "success",
      answer_kiny: "Ahantu twabonye muri database:\n" + answerLines.join("\n"),
      query: parsed.data.query,
      results,
      source: "search_places",
    });
  } catch (error) {
    console.error("[ai-router] search_places request error:", error);
    return NextResponse.json({
      status: "error",
      message_kiny: "Serivisi yo gushakisha amazina ntibashije gukora ubu.",
    }, { status: 503 });
  }
}
