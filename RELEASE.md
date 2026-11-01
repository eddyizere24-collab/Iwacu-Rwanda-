# Release 1 — IWACU RWANDA 2

## Candidate status

This is a review candidate only. It is **not merged** and no Production deployment or promotion is authorized by this document.

- Source branch: `wip/p3-protect`
- Target branch: `main`
- Low-load validation workflow: [run #41284933243](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/actions/runs/41284933243)
- Validation measurements: pending completion of that single authorized workflow. The result JSON will be committed to `wip/p3-results:results/p3-low-load.json`.

## What Release 1 changes

The candidate combines the location-discovery experience and P3 locate protections:

1. Location acquisition accepts reported uncertainty instead of rejecting a fix solely because its accuracy radius is large. GPS, network/IP, previous-fix/prior and manual/map correction paths are kept distinguishable.
2. The locate API returns a structured administrative hierarchy and candidate information across province, district, sector, cell and village. It also retains a clear fallback when the finest unit is not supported by the available evidence.
3. Map pin selection, administrative-unit selection, location context and nearby-landmark flows are integrated with the location experience. The candidate includes an offline administrative index and related UI handling.
4. Server-side locate protections include a bounded in-memory response cache, per-IP request limiting, deadline-controlled RPC calls, and a degraded HTTP 200 fallback rather than an unhandled blank/error response.
5. `LOCATE_CONFIDENCE_RPC` keeps v1 as the default; v2 is selected only by an explicit `LOCATE_CONFIDENCE_RPC=v2` setting.

These are code-scope statements, not a guarantee that every district or device scenario is accurate. Scores are not calibrated probabilities.

## Release gates

The P3 low-load workflow tests 75 truth points from each of Nyarugenge, Nyamasheke and Musanze (75 points total), with exact geodesic offsets and 300 requests per RPC version. v1 runs first, then v2 on the same generated points.

| Gate | Required result |
|---|---:|
| Total locate request errors | < 10 |
| Chosen-level unit contains true village, radii 0 m, 100 m, 500 m | >= 90% |
| Chosen-level unit contains true village, radius 2,000 m | >= 85% |
| Empty answers | 0 |
| v1 `/api/locate` p95 latency, each radius | <= 3,000 ms |
| v2 `/api/locate` p95 latency, each radius | <= 1,500 ms |
| v1/v2 chosen-unit agreement, radii 0 m and 100 m | >= 98% |

The workflow also reports, by radius and version, attempted requests, chosen-level correctness, empty answers, degraded answers, errors, p50/p95 latency, and v1/v2 agreement. The source rows are read with one indexed REST request per district (seed `20261030`, limit 25); ancestor chains are fetched once per district. No database writes are performed by this validation.

## Scope disclosure

At the time this candidate was prepared, `wip/p3-protect` was **90 commits ahead of main and 0 commits behind**. This is a broad release diff, not a narrowly isolated protection patch. Reviewers must inspect the full PR file/commit scope before approval. The low-load run does not substitute for full code review, device testing, security review, or production release approval.

## Rollback

If Release 1 is merged and a rollback is required:

1. Revert the **merge commit** on GitHub (do not reset or rewrite the protected main branch).
2. Perform the Vercel rollback to deployment **`dpl_EqeT3pbQHustzJstX9rhAibo1D3z`**.

Both actions are required by this rollback procedure. Do not merge this PR as part of the validation task.
