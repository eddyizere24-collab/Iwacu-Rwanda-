import { NextRequest, NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/web-push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(_request: NextRequest): NextResponse {
  const publicKey = getWebPushPublicKey();
  return NextResponse.json(
    { configured: Boolean(publicKey), publicKey },
    { headers: { "Cache-Control": "no-store" } }
  );
}
