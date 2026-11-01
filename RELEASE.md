# Release 1 — IWACU RWANDA 2

## Candidate state

- Candidate PR: [PR #5 — Release 1](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/pull/5)
- Source branch: `wip/p3-protect`; target: `main`.
- PR is open, not merged. No Production deployment has been authorized or started.
- At the last comparison, this candidate was 100 commits ahead of `main`, 0 behind, with 39 changed files (+3,626 / -931). This is a broad release candidate and requires full-diff review.

## Database probe and district-code correction

Only Supabase project `buexgewxypvkqmphvfec` was queried.

The `select count(*) from public.boundaries` probe returned **17,423**. The measured connector round trip on 2026-11-01 09:39:39.808Z–09:39:43.050Z was **3,239 ms**, above the 300 ms threshold. No SQL query was issued during the following **20 minutes 2.887 seconds**. The single follow-up probe at 09:59:46.778Z–09:59:50.165Z returned **17,423** in **3,387 ms**.

One SQL call returned the active district codes:
- Nyarugenge — `RW-P1-D11`
- Nyamasheke — `RW-P3-D37`
- Musanze — `RW-P4-D43`

The truth loader now uses those constants and does not look up districts by name over REST. Every REST `select` explicitly requests only the small fields required for truth rows or ancestor rows; no REST request selects `*` or requests `geom`.

**The earlier PostgreSQL 57014 was not caused by `select=*` or geometry.** The previous runner's failing district REST request explicitly selected `scope_code,name_kiny,level`; the timeout occurred while filtering `level`, `valid_to` and the three district names.

## Low-load runner and result persistence

The runner uses the same 75 truth samples (25 per district), offsets each at 0, 100, 500 and 2,000 metres, then runs v1 followed by v2. It plans 300 requests per version, one at a time with at least 2,100 ms between request starts, and stops after 10 total HTTP/API errors. The output is written to `/tmp/p3-low-load-results.json`.

The workflow now writes the result branch through a separate clean, detached Git worktree based on `origin/wip/p3-results`. It does not switch the checkout containing untracked result files.

## Actual measurement status

The preceding run, [#41285823872](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/actions/runs/41285823872), confirmed the project URL, installed dependencies and built the app, but failed before truth reads because the old REST district-name lookup returned HTTP 500 / PostgreSQL `57014` (statement timeout). It completed **0 truth reads, 0 ancestor reads, 0 v1 locate requests and 0 v2 locate requests**. It was not an accuracy result.

The corrected one-run validation has not yet completed at the time this file is committed. The next run's authoritative record will be written to `wip/p3-results:results/p3-low-load.json`. Until that record contains actual numbers and every gate is true, Release 1 must not be merged or deployed.

## Release gates

| Gate | Required |
|---|---:|
| Total request errors | < 10 |
| Chosen-level correctness, each version, radii 0/100/500 m | >= 90% |
| Chosen-level correctness, each version, radius 2,000 m | >= 85% |
| Empty answers | 0 |
| Degraded responses, each version and radius | <= 5% |
| v1 `/api/locate` p95, each radius | <= 5,000 ms |
| v2 `/api/locate` p95, each radius | <= 3,000 ms |
| v1/v2 chosen-unit agreement, radii 0 and 100 m | >= 98% |

No measurement is treated as a pass when its request count is zero or a metric is missing.

## AI router and service-role boundary

The current `src/app/api/ai-router/route.ts` uses the public `search_places` RPC in its active POST handler. Older service-role helper functions remain defined but are not called by that handler. The code search finds `createSupabaseServiceClient` usage only in server-side API route files and `src/lib/supabase/server.ts`; the service key is not a `NEXT_PUBLIC_` variable and is not imported into a client component.

## Production and rollback

No Vercel settings, environment variables or Supabase integration settings were changed. Do not merge PR #5, change the v2 default, or promote a Production deployment unless the new results JSON proves every release gate. If any metric is missing or any gate fails, keep v1 and do not merge.
