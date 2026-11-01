# Release 1 — IWACU RWANDA 2

## Candidate status

This is a review candidate only. It is **not merged** and no Production deployment or promotion is authorized.

- Source branch: `wip/p3-protect`
- Target branch: `main`
- Candidate PR: [Release 1 — PR #5](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/pull/5)
- Authorized low-load workflow: [run #41284933243](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/actions/runs/41284933243)
- Result record: `wip/p3-results:results/p3-low-load.json`
- Run outcome: **FAILED BEFORE THE VALIDATION SCRIPT STARTED**. The application build succeeded, but the runner's gzip payload failed CRC validation. The result record therefore says `NOT_RUN`. No truth-sample REST read and no `/api/locate` test request was made. All accuracy, empty-answer, degraded-response, latency, agreement and release gates are **NOT MEASURED**.

## What Release 1 changes

The candidate combines the location-discovery experience and P3 locate protections:

1. Location acquisition accepts reported uncertainty instead of rejecting a fix solely because its accuracy radius is large. GPS, network/IP, previous-fix/prior and manual/map correction paths are kept distinguishable.
2. The locate API returns a structured administrative hierarchy and candidate information across province, district, sector, cell and village. It also retains a clear fallback when the finest unit is not supported by the available evidence.
3. Map pin selection, administrative-unit selection, location context and nearby-landmark flows are integrated with the location experience. The candidate includes an offline administrative index and related UI handling.
4. Server-side locate protections include a bounded in-memory response cache, per-IP request limiting, deadline-controlled RPC calls, and a degraded HTTP 200 fallback rather than an unhandled blank/error response.
5. `LOCATE_CONFIDENCE_RPC` keeps v1 as the default; v2 is selected only by an explicit `LOCATE_CONFIDENCE_RPC=v2` setting.

These are code-scope statements, not a guarantee that every district or device scenario is accurate. Scores are not calibrated probabilities.

## Release gates — NOT YET EVALUATED

The intended protocol is 25 truth points each from Nyarugenge (`RW-P1-D01`), Nyamasheke (`RW-P3-D07`) and Musanze (`RW-P4-D03`), seed `20261030`. It requires one indexed truth-row REST request and one ancestor-chain REST request per district. The same 75 points are offset at 0, 100, 500 and 2,000 metres using exact geodesic distances and random bearings. Accuracy is `max(radius_m,20)`. v1 runs first, followed by v2 against the same point schedule: 300 locate requests per version.

| Gate | Required result | Actual result from run #41284933243 |
|---|---:|---|
| Total locate request errors | < 10 | NOT MEASURED — runner did not start |
| Chosen-level unit contains true village, radii 0/100/500 m | >= 90% | NOT MEASURED — 0 locate calls |
| Chosen-level unit contains true village, radius 2,000 m | >= 85% | NOT MEASURED — 0 locate calls |
| Empty answers | 0 | NOT MEASURED — 0 locate calls |
| v1 `/api/locate` p95 latency, each radius | <= 3,000 ms | NOT MEASURED — 0 locate calls |
| v2 `/api/locate` p95 latency, each radius | <= 1,500 ms | NOT MEASURED — 0 locate calls |
| v1/v2 chosen-unit agreement, radii 0 and 100 m | >= 98% | NOT MEASURED — neither version ran |

The workflow did confirm the configured URL matched the allow-listed project `buexgewxypvkqmphvfec`, installed dependencies, and completed `npm run build`. The build output explicitly contained both `/api/health` and `/api/locate`. The failure occurred at:
`gzip: stdin: invalid compressed data--crc error`
while decoding `scripts/p3-low-load-runner.cjs.gz.b64`. Thus the test runner was never invoked and no database REST request took place. The sole run's fallback result JSON records `outcome: NOT_RUN` and the source SHA. It is not a test pass.

The one authorized workflow run has been consumed. No second low-load run, workflow dispatch, DB test, SQL operation or other DB validation is included in this candidate status.

## Scope disclosure

At preparation, `wip/p3-protect` was **90 commits ahead of main and 0 commits behind**. This is a broad release diff, not a narrowly isolated protection patch. Reviewers must inspect the full PR file/commit scope before approval. Even after the low-load measurements are completed in a separately authorized run, they will not replace full code review, device testing, security review or production release approval.

## Rollback

If Release 1 is merged and a rollback is required:

1. Revert the **merge commit** on GitHub (do not reset or rewrite the protected main branch).
2. Perform the Vercel rollback to deployment **`dpl_EqeT3pbQHustzJstX9rhAibo1D3z`**.

Both actions are required. This validation task does not authorize merging PR #5 or changing Production.
