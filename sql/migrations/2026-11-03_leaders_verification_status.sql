-- Additive only. Do NOT drop or truncate. Apply manually after review.
-- CHANGED 2026-11-03 GROK: pending verification default for leader registry (spec §7.3, §20).
-- See docs/governance/PHASE1-RECON.md R5 step 1.

ALTER TABLE public.leaders
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending_verification'
  CHECK (verification_status IN ('draft', 'pending_verification', 'verified', 'rejected'));

COMMENT ON COLUMN public.leaders.verification_status IS
  'Public verification lifecycle: draft | pending_verification | verified | rejected. New inserts default pending_verification.';
