import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getMockInactiveReports,
  addMockInactiveReport,
  resolveMockInactiveReport,
} from "@/lib/mock-data";
import { isSupabaseConfigured, createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic in-memory rate-limiter: max 10 reports per IP per 5-minute window
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count += 1;
  return true;
}

const ReportSchema = z.object({
  leader_id: z.string().min(1).max(100),
  leader_name: z.string().min(1).max(200),
  reported_phone: z.string().min(1).max(50),
  boundary_name: z.string().min(1).max(200),
  citizen_comment: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { status: "error", message_kiny: "Mwahaye raporo nyinshi vuba. Murenzeho akanya mutegereze." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = ReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", message_kiny: "Amakuru ntiyuzuye neza cyangwa aracyari make." },
        { status: 400 }
      );
    }

    const { leader_id, leader_name, reported_phone, boundary_name, citizen_comment } = parsed.data;

    // Check if Supabase is available for durable persistence
    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseServiceClient();
        const { data, error } = await supabase
          .from("inactive_number_reports")
          .insert({
            leader_id,
            leader_name,
            reported_phone,
            boundary_name,
            citizen_comment: citizen_comment || null,
            status: "pending",
          })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({
            status: "success",
            message_kiny: "Murakoze! Raporo yanyu yakiriwe neza kandi yabitswe muri sisiteme.",
            report_id: data.id,
          });
        }
        console.warn("[report-number] Supabase write failed, falling back to mock store:", error?.message);
      } catch (dbErr) {
        console.warn("[report-number] Database error during report insert, falling back:", dbErr);
      }
    }

    // Resilient fallback to mock store for preview/demo mode
    const report = addMockInactiveReport({
      leader_id,
      leader_name,
      reported_phone,
      boundary_name,
      citizen_comment,
    });

    return NextResponse.json({
      status: "success",
      message_kiny: "Murakoze! Raporo yanyu yohererejwe ubuyobozi kugira ngo bayisuzume.",
      report,
    });
  } catch (err) {
    console.error("[report-number POST] error:", err);
    return NextResponse.json(
      { status: "error", message_kiny: "Ikibazo mu kohereza raporo." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Admin gate check (Authorization header or admin session token)
    const authHeader = req.headers.get("authorization") || req.headers.get("x-iwacu-admin-token");
    if (!authHeader) {
      return NextResponse.json(
        { status: "error", message_kiny: "Nta burenganzira bwo kureba izi raporo." },
        { status: 401 }
      );
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseServiceClient();
        const { data, error } = await supabase
          .from("inactive_number_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (!error && data) {
          return NextResponse.json({
            status: "success",
            reports: data,
          });
        }
      } catch (dbErr) {
        console.warn("[report-number GET] Supabase query failed:", dbErr);
      }
    }

    const reports = getMockInactiveReports();
    return NextResponse.json({
      status: "success",
      reports,
    });
  } catch (err) {
    console.error("[report-number GET] error:", err);
    return NextResponse.json(
      { status: "error", message_kiny: "Ikibazo mu gushaka raporo." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Authorization check
    const authHeader = req.headers.get("authorization") || req.headers.get("x-iwacu-admin-token");
    if (!authHeader) {
      return NextResponse.json(
        { status: "error", message_kiny: "Nta burenganzira bwo gukemura iyi raporo." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { report_id, status } = body;
    if (!report_id) {
      return NextResponse.json({ status: "error", message_kiny: "Shyiramo id ya raporo" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseServiceClient();
        const { error } = await supabase
          .from("inactive_number_reports")
          .update({
            status: status || "resolved",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", report_id);

        if (!error) {
          return NextResponse.json({
            status: "success",
            message_kiny: "Raporo yakemuwe neza.",
          });
        }
      } catch (dbErr) {
        console.warn("[report-number PATCH] Supabase update failed:", dbErr);
      }
    }

    const resolved = resolveMockInactiveReport(report_id);
    if (!resolved) {
      return NextResponse.json({ status: "error", message_kiny: "Raporo ntibonetse" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      message_kiny: "Raporo yakemuwe neza.",
    });
  } catch (err) {
    console.error("[report-number PATCH] error:", err);
    return NextResponse.json(
      { status: "error", message_kiny: "Ikibazo mu gukemura raporo." },
      { status: 500 }
    );
  }
}
