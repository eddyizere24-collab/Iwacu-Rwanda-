import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient, createSupabaseServiceClient, isSupabaseConfigured, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/security/admin-auth";
import { canAssignLeaderScope, isWithinAdminScope, ROLE_LEVEL, type AssignableLeaderRole } from "@/lib/security/admin-authz";
import { maskPhone } from "@/lib/security/mask";
import type { LeaderPublic } from "@/types/leader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OfficialRole = z.enum([
  "Village Leader",
  "Cell Executive Secretary",
  "Sector Executive Secretary",
  "Mayor",
  "Vice Mayor",
  "District Executive Secretary",
]);
const CreateSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(100),
  role: OfficialRole,
  scope_code: z.string().trim().min(4).max(100),
  phone_number: z.string().trim().regex(/^\+250[0-9]{9}$/).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});
const PatchSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().nonnegative(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(100),
  role: OfficialRole,
  phone_number: z.string().trim().regex(/^\+250[0-9]{9}$/).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});

function toLeader(row: Record<string, any>, adminView: boolean): LeaderPublic {
  const boundary = Array.isArray(row.boundaries) ? row.boundaries[0] : row.boundaries;
  const status = String(adminView ? row.verification_status ?? "pending" : "approved");
  return {
    id: String(row.id),
    scope_code: String(row.scope_code),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    role: row.role as LeaderPublic["role"],
    email: adminView ? (row.email as string | null) ?? null : null,
    photo_url: (row.photo_url as string | null) ?? null,
    valid_from: String(row.valid_from),
    valid_to: (row.valid_to as string | null) ?? null,
    version: Number(row.version ?? 1),
    boundary_name_kiny: String(boundary?.name_kiny ?? row.boundary_name_kiny ?? ""),
    boundary_name_eng: (boundary?.name_eng as string | null) ?? null,
    level: String(boundary?.level ?? row.level ?? ""),
    phone_masked: adminView ? maskPhone((row.phone_number as string | null) ?? null) : null,
    phone_raw: undefined,
    is_verified: status === "approved",
    verification_status: status as LeaderPublic["verification_status"],
  };
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const wantsReveal = params.get("reveal") === "true";
    const access = await getAdminAccess();

    if (wantsReveal && !access.ok) {
      return NextResponse.json({ status: "error", message_kiny: access.message_kiny }, { status: access.status, headers: { "Cache-Control": "no-store" } });
    }

    if (access.ok) {
      if (!isSupabaseConfigured()) return NextResponse.json({ status: "error", message_kiny: "Database y'abayobozi ntihujwe neza.", leaders: [] }, { status: 503 });
      const requested = params.get("scope_code") || access.profile.scope_code;
      const scopeCode = access.profile.is_super_admin ? requested : access.profile.scope_code;
      const supabase = createSupabaseServiceClient();
      let query = supabase.from("leaders")
        .select("id, scope_code, first_name, last_name, role, email, photo_url, phone_number, valid_from, valid_to, version, verification_status, boundaries!inner(name_kiny, name_eng, level)")
        .is("valid_to", null);
      if (scopeCode !== "RW") query = query.like("scope_code", scopeCode + "%");
      const { data, error } = await query.order("scope_code", { ascending: true }).order("role", { ascending: true });
      if (error) {
        console.error("[leaders GET admin] failed:", error.message);
        return NextResponse.json({ status: "error", message_kiny: "Ntibyashobotse gusoma urutonde rw'abayobozi.", leaders: [] }, { status: 502 });
      }
      const leaders = (data ?? []).map((row) => toLeader(row as Record<string, any>, true));
      if (!wantsReveal) leaders.forEach((leader) => { leader.phone_raw = null; });
      else leaders.forEach((leader, index) => { leader.phone_raw = (data?.[index]?.phone_number as string | null) ?? null; });
      return NextResponse.json({ status: "success", leaders }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!isSupabasePublicConfigured()) return NextResponse.json({ status: "error", message_kiny: "Database y'abayobozi ntiboneka.", leaders: [] }, { status: 503 });
    const scopeCode = params.get("scope_code") || "RW";
    const supabase = createSupabasePublicClient();
    let query = supabase.from("leaders")
      .select("id, scope_code, first_name, last_name, role, photo_url, valid_from, valid_to, version, boundaries!inner(name_kiny, name_eng, level)")
      .is("valid_to", null);
    if (scopeCode !== "RW") query = query.like("scope_code", scopeCode + "%");
    const { data, error } = await query.order("scope_code", { ascending: true }).order("role", { ascending: true });
    if (error) {
      console.error("[leaders GET public] failed:", error.message);
      return NextResponse.json({ status: "error", message_kiny: "Ntibyashobotse gusoma urutonde rw'abayobozi.", leaders: [] }, { status: 502 });
    }
    return NextResponse.json(
      { status: "success", leaders: (data ?? []).map((row) => toLeader(row as Record<string, any>, false)) },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("[leaders GET] unexpected error:", error);
    return NextResponse.json({ status: "error", message_kiny: "Serivisi y'abayobozi ntiyabonetse.", leaders: [] }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access.ok) return NextResponse.json({ status: "error", message_kiny: access.message_kiny }, { status: access.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ status: "error", message_kiny: "Database y'abayobozi ntihujwe neza." }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ status: "error", message_kiny: "Amakuru yoherejwe ntabwo ari JSON yemewe." }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: "error", message_kiny: "Reba amazina, inshingano, ahantu na telefone watanze.", errors: parsed.error.flatten() }, { status: 422 });

  const role = parsed.data.role as AssignableLeaderRole;
  const requiredLevel = ROLE_LEVEL[role];
  const supabase = createSupabaseServiceClient();
  const { data: boundary, error: boundaryError } = await supabase.from("boundaries")
    .select("scope_code, name_kiny, name_eng, level")
    .eq("scope_code", parsed.data.scope_code)
    .eq("level", requiredLevel)
    .is("valid_to", null)
    .maybeSingle();
  if (boundaryError || !boundary) {
    return NextResponse.json({ status: "error", message_kiny: "Aho wahisemo ntihuye n'inshingano z'uwo muyobozi." }, { status: 422 });
  }

  const allowed = canAssignLeaderScope({
    isSuperAdmin: access.profile.is_super_admin === true,
    adminScopeCode: access.profile.scope_code,
    adminScopeLevel: access.scope_level,
    targetScopeCode: boundary.scope_code,
    targetLevel: requiredLevel,
  });
  if (!allowed) return NextResponse.json({ status: "error", message_kiny: "Iyi konti ntiyemerewe gushyira umuyobozi kuri uru rwego cyangwa muri aka gace." }, { status: 403 });

  const { data: created, error: insertError } = await supabase.from("leaders").insert({
    scope_code: boundary.scope_code,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    role,
    phone_number: parsed.data.phone_number || null,
    email: parsed.data.email || null,
    photo_url: parsed.data.photo_url || null,
    created_by: access.user.id,
    updated_by: access.user.id,
  }).select("id, scope_code, first_name, last_name, role, email, photo_url, phone_number, valid_from, valid_to, version, verification_status").single();

  if (insertError || !created) {
    if (insertError?.code === "23505") return NextResponse.json({ status: "error", message_kiny: "Hari undi muyobozi w'iyi nshingano ukiriho muri aka gace." }, { status: 409 });
    console.error("[leaders POST] insert failed:", insertError?.message);
    return NextResponse.json({ status: "error", message_kiny: "Umuyobozi ntiyabitswe muri database." }, { status: 500 });
  }
  return NextResponse.json({
    status: "success",
    leader: { ...created, boundary_name_kiny: boundary.name_kiny, boundary_name_eng: boundary.name_eng, level: boundary.level, phone_masked: maskPhone(created.phone_number), phone_raw: null, is_verified: false, verification_status: "pending" },
    message_kiny: "Umuyobozi yabitswe. Aracyategereje kwemezwa mbere yo kugaragara ku rubuga rw'abaturage.",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access.ok) return NextResponse.json({ status: "error", message_kiny: access.message_kiny }, { status: access.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ status: "error", message_kiny: "Database ntihujwe neza." }, { status: 503 });
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ status: "error", message_kiny: "Amakuru yoherejwe ntabwo ari JSON yemewe." }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: "error", message_kiny: "Amakuru watanze ntabwo yuzuye neza.", errors: parsed.error.flatten() }, { status: 422 });

  const supabase = createSupabaseServiceClient();
  const { data: current, error: currentError } = await supabase.from("leaders")
    .select("id, scope_code, version, valid_to").eq("id", parsed.data.id).maybeSingle();
  if (currentError || !current || current.valid_to) return NextResponse.json({ status: "error", message_kiny: "Umuyobozi ntabwo abonetse cyangwa yarahagaritswe." }, { status: 404 });
  const { data: currentBoundary, error: boundaryError } = await supabase.from("boundaries")
    .select("level").eq("scope_code", current.scope_code).is("valid_to", null).maybeSingle();
  if (boundaryError || !currentBoundary) {
    return NextResponse.json({ status: "error", message_kiny: "Aho uyu muyobozi ashinzwe ntihabonetse." }, { status: 422 });
  }
  const canEditThisLeader = canAssignLeaderScope({
    isSuperAdmin: access.profile.is_super_admin === true,
    adminScopeCode: access.profile.scope_code,
    adminScopeLevel: access.scope_level,
    targetScopeCode: current.scope_code,
    targetLevel: currentBoundary.level as import("@/lib/security/admin-auth").AdminScopeLevel,
  });
  if (!canEditThisLeader) {
    return NextResponse.json({ status: "error", message_kiny: "Iyi konti ntifite uburenganzira bwo guhindura uyu muyobozi." }, { status: 403 });
  }
  if (currentBoundary.level !== ROLE_LEVEL[parsed.data.role as AssignableLeaderRole]) {
    return NextResponse.json({ status: "error", message_kiny: "Inshingano wahisemo ntihuye n'urwego uyu muyobozi ashinzwe." }, { status: 422 });
  }
  if (current.version !== parsed.data.version) return NextResponse.json({ status: "conflict", message_kiny: "Hari uwabanje guhindura aya makuru. Ongera ufungure urupapuro." }, { status: 409 });

  const { data: updated, error: updateError } = await supabase.from("leaders").update({
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    role: parsed.data.role,
    phone_number: parsed.data.phone_number === undefined ? undefined : parsed.data.phone_number,
    email: parsed.data.email === undefined ? undefined : parsed.data.email,
    photo_url: parsed.data.photo_url === undefined ? undefined : parsed.data.photo_url,
    version: current.version + 1,
    updated_by: access.user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", parsed.data.id).eq("version", parsed.data.version)
    .select("id, scope_code, first_name, last_name, role, email, photo_url, phone_number, valid_from, valid_to, version, verification_status").single();

  if (updateError || !updated) {
    console.error("[leaders PATCH] update failed:", updateError?.message);
    return NextResponse.json({ status: "error", message_kiny: "Guhindura byanze. Ongera ugerageze." }, { status: 500 });
  }
  return NextResponse.json({ status: "success", leader: { ...updated, phone_masked: maskPhone(updated.phone_number), phone_raw: null, boundary_name_kiny: "", boundary_name_eng: null, level: "", is_verified: updated.verification_status === "approved" } });
}

export async function DELETE(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access.ok) return NextResponse.json({ status: "error", message_kiny: access.message_kiny }, { status: access.status });
  if (!isSupabaseConfigured()) return NextResponse.json({ status: "error", message_kiny: "Database ntihujwe neza." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ status: "error", message_kiny: "Shyiramo id y'umuyobozi." }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data: current, error } = await supabase.from("leaders").select("id, scope_code, version, valid_to").eq("id", id).maybeSingle();
  if (error || !current || current.valid_to) return NextResponse.json({ status: "error", message_kiny: "Umuyobozi ntabwo abonetse." }, { status: 404 });
  const { data: targetBoundary, error: targetBoundaryError } = await supabase.from("boundaries")
    .select("level").eq("scope_code", current.scope_code).is("valid_to", null).maybeSingle();
  if (targetBoundaryError || !targetBoundary) {
    return NextResponse.json({ status: "error", message_kiny: "Aho uyu muyobozi ashinzwe ntihabonetse." }, { status: 422 });
  }
  const canDeleteThisLeader = canAssignLeaderScope({
    isSuperAdmin: access.profile.is_super_admin === true,
    adminScopeCode: access.profile.scope_code,
    adminScopeLevel: access.scope_level,
    targetScopeCode: current.scope_code,
    targetLevel: targetBoundary.level as import("@/lib/security/admin-auth").AdminScopeLevel,
  });
  if (!canDeleteThisLeader) return NextResponse.json({ status: "error", message_kiny: "Iyi konti ntifite uburenganzira bwo guhagarika uyu muyobozi." }, { status: 403 });

  const now = new Date().toISOString();
  const { error: archiveError } = await supabase.from("leaders").update({
    valid_to: now, updated_at: now, updated_by: access.user.id, version: current.version + 1,
  }).eq("id", id).eq("version", current.version).is("valid_to", null);
  if (archiveError) {
    console.error("[leaders archive] failed:", archiveError.message);
    return NextResponse.json({ status: "error", message_kiny: "Ntibyashobotse guhagarika uyu muyobozi." }, { status: 500 });
  }
  return NextResponse.json({ status: "success", message_kiny: "Umuyobozi yahagaritswe; amateka ye yagumye muri database." });
}
