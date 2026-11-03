import { requireLeaderAdmin, registryDbError, registryJson } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireLeaderAdmin();
  if (!result.ok) return result.response;

  const { supabase, user, assignments } = result.context;
  const unitIds = [...new Set(assignments.map((row) => row.administrative_unit_id))];
  const { data: units, error } = await supabase
    .from("boundaries")
    .select("id, scope_code, name_kiny, name_eng, level")
    .in("id", unitIds)
    .is("valid_to", null);

  if (error) return registryDbError(error, "Ntibyashobotse kubona aho ububasha bwa konti yawe bugarukira.");

  const unitMap = new Map((units ?? []).map((unit) => [unit.id, unit]));
  return registryJson({
    status: "success",
    user: { id: user.id, email: user.email ?? null },
    assignments: assignments.map((assignment) => ({
      ...assignment,
      boundary: unitMap.get(assignment.administrative_unit_id) ?? null,
    })),
  });
}
