import { NextResponse } from "next/server";
import { getRegistrySession, registryErrorMessage } from "@/lib/leaders-v2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user, error: sessionError } = await getRegistrySession();
  if (!user || sessionError) {
    return NextResponse.json({ status: "error", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const now = Date.now();
  const { data: assignments, error } = await supabase
    .from("admin_role_assignments")
    .select("id, role_code, administrative_unit_id, valid_from, valid_until, assignment_status")
    .eq("user_id", user.id)
    .eq("assignment_status", "active");

  if (error) {
    console.error("[leaders-v2 context] assignments failed:", error.code, error.message);
    return NextResponse.json({ status: "error", message_kiny: registryErrorMessage(error) }, { status: 503 });
  }

  const active = (assignments ?? []).filter((row) => {
    const from = Date.parse(row.valid_from);
    const until = row.valid_until ? Date.parse(row.valid_until) : Number.POSITIVE_INFINITY;
    return from <= now && until > now;
  });

  if (active.length === 0) {
    return NextResponse.json(
      { status: "forbidden", message_kiny: "Nta burenganzira bw'ubuyobozi bukiriho bufitanye isano n'iyi konti.", assignments: [] },
      { status: 403 }
    );
  }

  const unitIds = [...new Set(active.map((row) => row.administrative_unit_id))];
  const { data: units, error: unitsError } = await supabase
    .from("boundaries")
    .select("id, scope_code, level, name_kiny, name_eng, parent_id")
    .in("id", unitIds);

  if (unitsError) {
    console.error("[leaders-v2 context] boundaries failed:", unitsError.code, unitsError.message);
    return NextResponse.json({ status: "error", message_kiny: "Ntibyashobotse kubona agace konti icunga." }, { status: 503 });
  }

  const unitById = new Map((units ?? []).map((unit) => [unit.id, unit]));
  const result = active.flatMap((assignment) => {
    const unit = unitById.get(assignment.administrative_unit_id);
    return unit ? [{ ...assignment, unit }] : [];
  });

  return NextResponse.json({
    status: "success",
    user_id: user.id,
    assignments: result,
  });
}
