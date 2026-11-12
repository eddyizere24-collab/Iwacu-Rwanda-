import { NextResponse } from "next/server";
import { VERIFIED_EMERGENCY_NUMBERS } from "@/lib/rwanda-geo";

export const dynamic = "force-dynamic";

/**
 * Keep the API and the offline emergency strip on one verified source of truth.
 * The source URL and verification date travel with every public contact.
 */
export async function GET() {
  const items = VERIFIED_EMERGENCY_NUMBERS.map((contact) => ({
    number: contact.number,
    label_kiny: contact.name_kiny,
    label_eng: contact.name_eng,
    category: contact.category,
    source: contact.source,
    source_url: contact.source_url,
    last_verified: contact.last_verified,
    is_verified: contact.is_verified,
  }));

  return NextResponse.json(
    {
      status: "success",
      items,
      last_verified: "2026-11-12",
      source_urls: [...new Set(items.map((item) => item.source_url))],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
