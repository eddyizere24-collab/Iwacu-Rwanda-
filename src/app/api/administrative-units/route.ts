import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import offlineLocationIndex from "../../../../public/offline/location-index.json";
import { getAdministrativeUnitChoices } from "@/lib/administrative-units";

export const runtime = "nodejs";
export const dynamic = "force-static";

const QuerySchema = z.object({
  level: z.enum(["province", "district", "sector", "cell", "village"]),
  parent_id: z.string().trim().max(80).optional(),
  q: z.string().trim().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    level: req.nextUrl.searchParams.get("level"),
    parent_id: req.nextUrl.searchParams.get("parent_id") || undefined,
    q: req.nextUrl.searchParams.get("q") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({
      status: "error",
      message_kiny: "Urwego cyangwa aho utangirira gushaka ntibyemewe.",
      units: [],
    }, { status: 400 });
  }

  const { level, parent_id: parentScopeCode = "", q = "" } = parsed.data;
  const units = getAdministrativeUnitChoices(
    offlineLocationIndex,
    level,
    parentScopeCode,
    q
  );

  return NextResponse.json({
    status: "success",
    source: "bundled NISR 2022 administrative index",
    units,
  }, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
