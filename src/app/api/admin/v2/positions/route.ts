import { NextResponse } from "next/server";
import { getRegistrySession, registryErrorMessage } from "@/lib/leaders-v2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user, error: sessionError } = await getRegistrySession();
  if (!user || sessionError) {
    return NextResponse.json({ status: "error", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leader_positions")
    .select("id, code, title_kiny, title_eng, title_fra, required_boundary_level, is_exclusive")
    .eq("position_status", "approved")
    .order("title_kiny", { ascending: true });

  if (error) {
    console.error("[leaders-v2 positions] query failed:", error.code, error.message);
    return NextResponse.json({ status: "error", message_kiny: registryErrorMessage(error), positions: [] }, { status: 503 });
  }

  return NextResponse.json({ status: "success", positions: data ?? [] });
}
