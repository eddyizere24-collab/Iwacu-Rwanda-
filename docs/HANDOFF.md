# HANDOFF

2026-11-01 CHATGPT: applied CLAUDE-PATCH (independence + hardening), base 96f4b1d; no merge; waiting for CI and for the project lead's RELEASE.

## 2026-11-02 GROK — P4 national daytime gate (owner-approved)

- **What:** `P4_ANYTIME=1` allows the national validation workflow and scripts to run outside 22:00–06:00 Kigali.
- **Why:** Owner decision 2 Nov 2026 — only 2 users on production; daytime load is acceptable.
- **Where:** `scripts/p4-national-runner.mjs`, `scripts/p4-fetch-truth.mjs` (gate checks `env.P4_ANYTIME`), `.github/workflows/p4-national.yml` (env + night-gate conditions).
- **Unchanged:** 2.2 s spacing, auto-stop rules, 30 districts, seeds 424242 / 20261030, 120 truth REST reads.
- **Restore night-only:** delete `P4_ANYTIME: "1"` from the workflow env (and leave script gates as-is; without the env var they still refuse daytime).
- **Next:** push workflow alone to start the run; report each job.

## 2026-11-02 GROK — ONE project (owner decision)

- **What:** Imported `iwacu-rwanda-grid` branch `wip/integrate3` under `national-grid/integrate3` (tree SHA `56dbf653954bd07f5438411f30859ca0b73a8287`, byte-identical to integrate3 head tree).
- **App build:** `legacy/`, `national-grid/`, `grid/` excluded from TypeScript and ESLint. App `src/` behaviour unchanged.
- **Heavy jobs:** root workflows `grid-*.yml` are **workflow_dispatch only** (no push/schedule). Working-directory: `national-grid/integrate3`.
- **Frozen:** from now on **ALL grid work happens ONLY in Iwacu-rwanda-2 under `national-grid/integrate3`**. Repo `iwacu-rwanda-grid` is **FROZEN** (no new commits).
- **Build fix:** branch `fix/consolidation-build` (do not merge without RELEASE).
