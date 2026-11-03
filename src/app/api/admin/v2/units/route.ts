import { NextRequest, NextResponse } from "next/server";
import { getRegistrySession, registryErrorMessage } from "@/lib/leaders-v2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { supabase, user, error: sessionError } = await getRegistrySession();
  if (!user || sessionError) {
    return NextResponse.json({ status: "error", code: "UNAUTHENTICATED", units: [] }, { status: 401 });
  }

  const parentId = request.nextUrl.searchParams.get("parent_id");
  if (!parentId || !/^[0-9a-f-]{36}$/i.test(parentId)) {
    return NextResponse.json({ status: "error", message_kiny: "Hitamo agace shingiro mbere.", units: [] }, { status: 400 });
  }

  // RLS restricts this lookup to public geography. Authority scope is checked
  // against the signed-in user's own active assignment before returning children.
  const { data: parent, error: parentError } = await supabase
    .from("boundaries")
    .select("id, scope_code, level, name_kiny, name_eng, parent_id")
    .eq("id", parentId)
    .maybeSingle();

  if (parentError || !parent) {
    return NextResponse.json({ status: "error", message_kiny: "Agace shingiro ntikabonetse.", units: [] }, { status: 404 });
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("admin_role_assignments")
    .select("administrative_unit_id, valid_from, valid_until, assignment_status")
    .eq("user_id", user.id)
    .eq("assignment_status", "active");

  if (assignmentError) {
    console.error("[leaders-v2 units] assignments failed:", assignmentError.code, assignmentError.message);
    return NextResponse.json({ status: "error", message_kiny: registryErrorMessage(assignmentError), units: [] }, { status: 503 });
  }

  const now = Date.now();
  const active = (assignments ?? []).filter((row) =>
    Date.parse(row.valid_from) <= now &&
    (!row.valid_until || Date.parse(row.valid_until) > now)
  );
  const roots = [...new Set(active.map((row) => row.administrative_unit_id))];

  if (!roots.includes(parent.id)) {
    const { data: rootUnits, error: rootError } = await supabase
      .from("boundaries")
      .select("scope_code")
      .in("id", roots);

    if (rootError) {
      return NextResponse.json({ status: "error", message_kiny: "Ntibyashobotse kugenzura uburenganzira bw'ahantu.", units: [] }, { status: 503 });
    }

    const allowed = (rootUnits ?? []).some((root) =>
      parent.scope_code === root.scope_code || parent.scope_code.startsWith(root.scope_code + "-")
    );
    if (!allowed) {
      return NextResponse.json({ status: "error", message_kiny: "Ntabwo wemerewe guhitamo aka gace.", units: [] }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("boundaries")
    .select("id, scope_code, level, name_kiny, name_eng, parent_id")
    .eq("parent_id", parent.id)
    .is("valid_to", null)
    .order("name_kiny", { ascending: true })
    .limit(300);

  if (error) {
    console.error("[leaders-v2 units] children failed:", error.code, error.message);
    return NextResponse.json({ status: "error", message_kiny: registryErrorMessage(error), units: [] }, { status: 503 });
  }

  return NextResponse.json({ status: "success", parent, units: data ?? [] });
}
