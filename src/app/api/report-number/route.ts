import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function retired() {
  return NextResponse.json(
    {
      status: "error",
      code: "GONE",
      message_kiny: "Raporo z'amakuru ya telefoni zarahagaritswe. Public contacts za V2 zitegereje verification na approval.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

/** Legacy in-memory phone-report workflow is retired; no mock data is accepted. */
export async function POST() { return retired(); }
export async function GET() { return retired(); }
export async function PATCH() { return retired(); }
