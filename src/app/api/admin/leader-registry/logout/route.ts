import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { registryJson } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isSupabasePublicConfigured()) {
    return registryJson({ status: "error", message_kiny: "Serivisi yo kwinjira ntirategurwa neza." }, 503);
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return registryJson({ status: "error", message_kiny: "Gusohoka muri konti ntibyashobotse." }, 500);
    }
    return NextResponse.json(
      { status: "success" },
      { headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" } }
    );
  } catch {
    return registryJson({ status: "error", message_kiny: "Serivisi yo gusohoka ntiyabonetse." }, 503);
  }
}
