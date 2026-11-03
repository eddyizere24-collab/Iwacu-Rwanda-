import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint supporting both Liveness and Readiness probes.
 * - Liveness (?type=liveness or default): Returns 200 if Next.js server is up and responsive.
 * - Readiness (?type=readiness): Checks database connectivity when configured.
 *   Returns 503 degraded if database is configured but unreachable.
 * 
 * Complies with zero-leakage security policy: Never exposes secrets, passwords, or raw error traces.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "liveness";

  const baseStatus = {
    service: "iwacu-rwanda-2",
    version: "2.1.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  };

  if (type === "readiness") {
    const dbConfigured = isSupabaseConfigured();

    if (!dbConfigured) {
      // In zero-config/preview/demo mode, platform operates with offline mock store
      return NextResponse.json(
        {
          status: "healthy",
          check: "readiness",
          mode: "preview_mock_fallback",
          database: {
            configured: false,
            message: "Operating with local fallback and offline GeoJSON dataset",
          },
          ...baseStatus,
        },
        { status: 200 }
      );
    }

    try {
      const supabase = createSupabaseServiceClient();
      // Perform minimal non-blocking ping query
      const { error } = await supabase
        .from("boundaries")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[Health Readiness] Database ping error:", error.message);
        return NextResponse.json(
          {
            status: "degraded",
            check: "readiness",
            database: {
              configured: true,
              connected: false,
              message: "Database ping failed",
            },
            ...baseStatus,
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          status: "healthy",
          check: "readiness",
          database: {
            configured: true,
            connected: true,
          },
          ...baseStatus,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("[Health Readiness] Unexpected connection error");
      return NextResponse.json(
        {
          status: "degraded",
          check: "readiness",
          database: {
            configured: true,
            connected: false,
            message: "Database connection failed",
          },
          ...baseStatus,
        },
        { status: 503 }
      );
    }
  }

  // Default: Liveness probe
  return NextResponse.json(
    {
      status: "healthy",
      check: "liveness",
      ...baseStatus,
    },
    { status: 200 }
  );
}
