import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/security/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getAdminAccess();
  if (!access.ok) {
    return NextResponse.json(
      { status: "error", message_kiny: access.message_kiny },
      { status: access.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json({
    status: "success",
    session: {
      tier: access.tier,
      scope_code: access.profile.scope_code,
      scope_name: access.scope_name,
      email: access.user.email ?? "",
      loginTime: new Date().toISOString(),
      is_super_admin: access.profile.is_super_admin === true,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
