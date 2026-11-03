import { NextResponse } from "next/server";
import { VERIFIED_EMERGENCY_NUMBERS } from "@/lib/rwanda-geo";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "success",
      source: "Government of Rwanda (gov.rw/emergency) & Rwanda National Police (police.gov.rw)",
      last_verified: "2026-10-30",
      items: VERIFIED_EMERGENCY_NUMBERS.map((e) => ({
        number: e.number,
        label_kiny: e.name_kiny,
        label_eng: e.name_eng,
        source: e.source,
        category: e.category,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}

