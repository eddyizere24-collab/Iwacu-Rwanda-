import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * All Registry V2 writes and administrative reads use the signed-in user's
 * Supabase session. Row-level security remains the final authorization layer.
 */
export async function getRegistrySession() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { supabase, user: null, error: "UNAUTHENTICATED" as const };
  }

  return { supabase, user: data.user, error: null };
}

export function registryErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Registry request failed.";
  const candidate = error as { code?: string; message?: string };
  // Return stable, non-sensitive messages to clients; detailed SQL errors stay server-side.
  if (candidate.code === "42501" || candidate.code === "P0001") {
    return "Ntabwo ufite uburenganzira bwo gukora iki gikorwa.";
  }
  if (candidate.code === "P0002") return "Amakuru wasabye ntabwo yabonetse.";
  return "Ntibyashobotse kurangiza iki gikorwa. Ongera ugerageze.";
}
