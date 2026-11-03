import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const createAppointmentSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(100),
  position_id: z.string().uuid(),
  administrative_unit_id: z.string().uuid(),
  effective_from: isoDate,
  evidence: z.object({
    evidence_type: z.string().trim().min(2).max(80),
    reference_number: z.string().trim().min(1).max(160),
    issuer: z.string().trim().min(2).max(200),
    issued_on: isoDate.nullable().optional(),
    valid_until: isoDate.nullable().optional(),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  const issued = value.evidence.issued_on;
  const until = value.evidence.valid_until;
  if (issued && until && until < issued) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidence", "valid_until"],
      message: "Evidence validity date cannot precede issue date.",
    });
  }
});

export const decideVerificationSchema = z.object({
  verification_case_id: z.string().uuid(),
  decision: z.enum(["under_review", "approved", "rejected", "suspended", "disputed"]),
  reason: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.decision !== "under_review" && !value.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "A reason is required for a final decision.",
    });
  }
});
