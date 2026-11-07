import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CHANGED 2026-11-05 GROK: public citizen feedback (anon INSERT only); see docs/HANDOFF.md and docs/BUILD_M2_PUBLIC_LEADER_VIEW.md

const Uuid = z.string().uuid();
const FeedbackSchema = z
  .object({
    appointment_id: Uuid.optional().nullable(),
    administrative_unit_id: Uuid.optional().nullable(),
    category: z.enum(["wrong_leader", "wrong_place", "wrong_phone", "other"]),
    message: z.string().trim().min(1).max(500),
  })
  .refine(
    (value) => Boolean(value.appointment_id || value.administrative_unit_id),
    { message: "Hitamo appointment cyangwa ahantu." },
  );

function json(
  body: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      {
        status: "error",
        message_kiny: "Amakuru ntabwo yoherejwe neza.",
      },
      400,
    );
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        status: "error",
        message_kiny:
          "Ohereza category yemewe n'ubutumwa bw'amagambo 1 kugeza 500, hamwe na appointment_id cyangwa administrative_unit_id.",
      },
      422,
    );
  }

  if (!isSupabasePublicConfigured()) {
    return json(
      {
        status: "error",
        message_kiny: "Serivisi ntiri kuboneka ubu. Ongera ugerageze.",
      },
      503,
    );
  }

  const supabase = createSupabasePublicClient();
  const row = {
    appointment_id: parsed.data.appointment_id ?? null,
    administrative_unit_id: parsed.data.administrative_unit_id ?? null,
    category: parsed.data.category,
    message: parsed.data.message,
  };

  const { error } = await supabase.from("leader_public_feedback").insert(row);

  if (error) {
    console.error("[leader-feedback] insert failed", { code: error.code });
    return json(
      {
        status: "error",
        message_kiny: "Ntibyashobotse kubika igitekerezo. Ongera ugerageze.",
      },
      500,
    );
  }

  return json(
    {
      status: "success",
      message_kiny: "Urakoze. Igitekerezo cyawe cyakiriwe. Abakozi bazagisuzuma.",
    },
    201,
  );
}
