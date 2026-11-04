import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gone() {
  return NextResponse.json(
    {
      status: "error",
      code: "GONE",
      message_kiny: "Iyi API ya Leaders ya legacy yahagaritswe. Koresha Leaders Registry V2.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

/** Legacy leader CRUD/reveal routes are retired; no raw phone or mock data is returned. */
export async function GET() { return gone(); }
export async function POST() { return gone(); }
export async function PATCH() { return gone(); }
export async function DELETE() { return gone(); }
