# HANDOFF

2026-11-01 CHATGPT: applied CLAUDE-PATCH (independence + hardening), base 96f4b1d; no merge; waiting for CI and for the project lead's RELEASE.

## 2026-11-02 GROK — P4 national daytime gate (owner-approved)

- **What:** `P4_ANYTIME=1` allows the national validation workflow and scripts to run outside 22:00–06:00 Kigali.
- **Why:** Owner decision 2 Nov 2026 — only 2 users on production; daytime load is acceptable.
- **Where:** `scripts/p4-national-runner.mjs`, `scripts/p4-fetch-truth.mjs` (gate checks `env.P4_ANYTIME`), `.github/workflows/p4-national.yml` (env + night-gate conditions).
- **Unchanged:** 2.2 s spacing, auto-stop rules, 30 districts, seeds 424242 / 20261030, 120 truth REST reads.
- **Restore night-only:** delete `P4_ANYTIME: "1"` from the workflow env (and leave script gates as-is; without the env var they still refuse daytime).
- **Next:** push workflow alone to start the run; report each job.

