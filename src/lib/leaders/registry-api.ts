import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  createSupabaseServerClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/server";

export type LeaderAdminAssignment = {
  id: string;
  role_code: "national_super_admin" | "district_admin" | "sector_admin" | "cell_admin";
  administrative_unit_id: string;
  valid_from: string;
  valid_until: string | null;
};

export type LeaderAdminContext = {
  supabase: SupabaseClient;
  user: User;
  assignments: LeaderAdminAssignment[];
};

export type LeaderAdminResult =
  | { ok: true; context: LeaderAdminContext }
  | { ok: false; response: NextResponse };

export function registryJson(
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Cookie",
    },
  });
}

/**
 * Resolve the actor from a server-validated Supabase Auth session.
 * Role and scope always come from active database assignments, never from
 * query strings, request bodies, user_metadata, or localStorage.
 * RLS and database triggers remain the final authority for each action.
 */
export async function requireLeaderAdmin(): Promise<LeaderAdminResult> {
  if (!isSupabasePublicConfigured()) {
    return {
      ok: false,
      response: registryJson(
        { status: "error", code: "AUTH_NOT_CONFIGURED", message_kiny: "Serivisi yo kwinjira ntirategurwa neza." },
        503
      ),
    };
  }

  let supabase: SupabaseClient;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return {
      ok: false,
      response: registryJson(
        { status: "error", code: "AUTH_UNAVAILABLE", message_kiny: "Serivisi yo kwinjira ntiyabonetse." },
        503
      ),
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      ok: false,
      response: registryJson(
        { status: "error", code: "UNAUTHENTICATED", message_kiny: "Banza winjire muri konti y'ubuyobozi." },
        401
      ),
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("admin_role_assignments")
    .select("id, role_code, administrative_unit_id, valid_from, valid_until")
    .eq("user_id", authData.user.id)
    .eq("assignment_status", "active")
    .lte("valid_from", now);

  if (error) {
    // Missing registry tables on an unreleased environment are not treated as
    // permission to fall back to the legacy/localStorage dashboard.
    console.error("[leader-registry] assignment lookup failed", { code: error.code });
    return {
      ok: false,
      response: registryJson(
        { status: "error", code: "REGISTRY_NOT_READY", message_kiny: "Sisitemu nshya y'ubuyobozi ntirashyirwaho muri ubu bubiko." },
        503
      ),
    };
  }

  const assignments = (data ?? []).filter((row) => {
    const validUntil = row.valid_until as string | null;
    return validUntil === null || validUntil > now;
  }) as LeaderAdminAssignment[];

  if (assignments.length === 0) {
    return {
      ok: false,
      response: registryJson(
        { status: "error", code: "NO_ACTIVE_ADMIN_ROLE", message_kiny: "Konti yawe nta burenganzira bw'ubuyobozi ifite bukora ubu." },
        403
      ),
    };
  }

  // National Super Admin sessions must be at AAL2. The same requirement is
  // enforced independently in the database RLS helper using auth.jwt()->>'aal'.
  if (assignments.some((assignment) => assignment.role_code === "national_super_admin")) {
    try {
      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) {
        console.error("[leader-registry] MFA assurance check failed", { code: assuranceError.code });
        return {
          ok: false,
          response: registryJson(
            { status: "error", code: "MFA_STATUS_UNAVAILABLE", message_kiny: "Ntibyashobotse kugenzura umutekano wa konti. Ongera ugerageze." },
            503
          ),
        };
      }
      if (assurance?.currentLevel !== "aal2") {
        return {
          ok: false,
          response: registryJson(
            {
              status: "error",
              code: "MFA_REQUIRED",
              mfa_mode: assurance?.nextLevel === "aal2" ? "challenge" : "setup",
              message_kiny: "National Super Admin agomba kubanza kwemeza ko ari we ukoresheje MFA.",
            },
            403
          ),
        };
      }
    } catch {
      return {
        ok: false,
        response: registryJson(
          { status: "error", code: "MFA_STATUS_UNAVAILABLE", message_kiny: "Ntibyashobotse kugenzura umutekano wa konti. Ongera ugerageze." },
          503
        ),
      };
    }
  }

  return {
    ok: true,
    context: { supabase, user: authData.user, assignments },
  };
}

export function registryDbError(
  error: { code?: string; message?: string },
  fallbackKiny = "Ibyo wasabye ntibyashobotse kubikwa."
): NextResponse {
  if (error.code === "42501") {
    return registryJson(
      { status: "error", code: "FORBIDDEN", message_kiny: "Nta burenganzira ufite bwo gukora iki gikorwa muri uru rwego." },
      403
    );
  }
  if (error.code === "23505") {
    return registryJson(
      { status: "error", code: "CONFLICT", message_kiny: "Aya makuru asanzwe ari muri sisitemu." },
      409
    );
  }
  if (["23503", "23514", "22P02", "P0001"].includes(error.code ?? "")) {
    return registryJson(
      { status: "error", code: "INVALID_TRANSITION_OR_REFERENCE", message_kiny: "Amakuru cyangwa intambwe wahisemo ntibyemewe." },
      422
    );
  }
  console.error("[leader-registry] database operation failed", { code: error.code });
  return registryJson(
    { status: "error", code: "DATABASE_ERROR", message_kiny: fallbackKiny },
    500
  );
}

export async function readJson(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: registryJson(
        { status: "error", code: "INVALID_JSON", message_kiny: "Imiterere y'amakuru (JSON) ntabwo yemewe." },
        400
      ),
    };
  }
}
