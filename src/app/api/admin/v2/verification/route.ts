import { NextRequest, NextResponse } from "next/server";
import { decideVerificationSchema } from "@/lib/leaders-v2/schemas";
import { getRegistrySession, registryErrorMessage } from "@/lib/leaders-v2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const { supabase, user, error: sessionError } = await getRegistrySession();
  if (!user || sessionError) {
    return NextResponse.json({ status: "error", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", message_kiny: "Amakuru yoherejwe ntabwo asomeka." }, { status: 400 });
  }

  const parsed = decideVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "error", message_kiny: "Ibyemezo n'impamvu bigomba kuba byuzuye.", errors: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { data, error } = await supabase.rpc("decide_leader_verification_v2", {
    p_verification_case_id: parsed.data.verification_case_id,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason ?? null,
  });

  if (error) {
    console.error("[leaders-v2 verification PATCH] RPC failed:", error.code, error.message);
    const forbidden = error.code === "42501" || error.code === "P0001";
    return NextResponse.json(
      { status: "error", message_kiny: registryErrorMessage(error) },
      { status: forbidden ? 403 : 422 }
    );
  }

  return NextResponse.json({
    status: "success",
    decision: data,
    message_kiny: "Icyemezo cyabitswe neza.",
  });
}
