# Release 1 — IWACU RWANDA 2

## Release decision

- Selected implementation: **V2**.
- Candidate: [PR #5 — Release 1](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/pull/5).
- Source branch: `wip/p3-protect`; target: `main`.
- Project owner authorized release of V2 on 2026-11-01.
- The v1/v2 agreement metric is **informational**, not a release gate. Ground-truth correctness is available, and V2 correctness is at least as high as V1 at every tested radius.
- V2 is the default for the classifier and location-confidence RPC. The classifier is fixed to V2 in code; the confidence RPC may still be set to V1 explicitly with `LOCATE_CONFIDENCE_RPC=v1`.

## Validation record

Authoritative result: [GitHub Actions run #41305872805](https://github.com/eddyizere24-collab/Iwacu-rwanda-2/actions/runs/41305872805)  
Results source: `wip/p3-results:results/p3-low-load.json`  
Validation source commit: `dd81e7f198339f8b815505ed7cc081e8e94840d0`  
Results commit: `724d9c2816456b348d91b0fd4ea80ffdd7a7306a`

The validation completed 600 requests: 300 per version, with 75 truth points (25 per district) in Nyarugenge, Nyamasheke and Musanze. Each point was tested at radii 0, 100, 500 and 2,000 metres. Request starts were spaced by at least 2,100 ms. There was one measured error, on V1; V2 had zero errors.

### Ground-truth correctness and empty/degraded responses

| Radius | V1 correct | V1 correctness | V2 correct | V2 correctness | Empty V1/V2 | Degraded V1/V2 |
|---:|---:|---:|---:|---:|---:|---:|
| 0 m | 75/75 | 100% | 75/75 | 100% | 0 / 0 | 0 / 0 |
| 100 m | 72/75 | 96% | 73/75 | 97.33% | 0 / 0 | 0 / 0 |
| 500 m | 64/75 | 85.33% | 70/75 | 93.33% | 0 / 0 | 0 / 0 |
| 2,000 m | 71/75 | 94.67% | 72/75 | 96% | 0 / 0 | 0 / 0 |

V2 had zero errors, zero empty responses and zero degraded responses at all four radii. V1 had one error in total: a classifier timeout at 100 m in Nyarugenge, marked `rwanda_classifier_unavailable` / `RPC_TIMEOUT`. No response had `source: prior`.

### Informativeness

Percentages below use the order village / akagari (cell) / umurenge (sector) / akarere (district) / intara (province).

| Radius | V1 level share | V1 informative | V2 level share | V2 informative |
|---:|---|---:|---|---:|
| 0 m | 97.33 / 2.67 / 0 / 0 / 0 | 97.33% | 96 / 4 / 0 / 0 / 0 | 96% |
| 100 m | 72 / 20 / 4 / 4 / 0 | 92% | 68 / 22.67 / 5.33 / 4 / 0 | 90.67% |
| 500 m | 16 / 44 / 21.33 / 12 / 6.67 | 81.33% | 5.33 / 44 / 26.67 / 14.67 / 9.33 | 76% |
| 2,000 m | 1.33 / 2.67 / 24 / 45.33 / 26.67 | 73.33% | 0 / 0 / 22.67 / 49.33 / 28 | 72% |

All four V2 informativeness thresholds passed: at least 80% for 0 m, 60% for 100 m, 50% for 500 m and 60% for 2,000 m.

### Latency

Values are p50 / p95 in milliseconds.

| Radius | V1 p50 / p95 | V2 p50 / p95 |
|---:|---:|---:|
| 0 m | 1,323 / 3,396 | 593 / 658 |
| 100 m | 1,283 / 3,235 | 591 / 680 |
| 500 m | 1,315 / 2,743 | 597 / 686 |
| 2,000 m | 1,391 / 2,036 | 654 / 938 |

V2 p95 was at most 938 ms, below the 3,000 ms threshold.

### V1/V2 agreement — informational only

| Radius | Agreement |
|---:|---:|
| 0 m | 98.67% |
| 100 m | 96% |
| 500 m | 80% |
| 2,000 m | 90.67% |

Agreement was 96% at 100 m. It is not a release gate: the two algorithms are compared against the independently loaded ground truth, and V2 has better correctness at 100, 500 and 2,000 m and equal correctness at 0 m. The previous automated composite gate marked the run as failed because it required agreement >=98% and required both V1 and V2 to pass the chosen-correctness threshold. Those V1/agreement conditions do not block this owner-authorized V2 release.

## Honest limits

- The validation covers **three districts only**: Nyarugenge, Nyamasheke and Musanze.
- It uses **75 truth points total**: 25 per district, measured at each of four radii. The results do not establish nationwide accuracy.
- Displayed confidence percentages are **not yet calibrated real-world probabilities**. Calibration is deferred to **Release 2**; values must be treated as relative scores, not guaranteed odds.
- These are controlled API measurements, not a substitute for broader real-phone field tests, including indoor, weak-network, border and GPS-permission scenarios.
- V1/V2 agreement was **96% at 100 m** and is recorded for monitoring, not used to overrule the ground-truth correctness results.

## Data and service boundaries

- Only Supabase project `buexgewxypvkqmphvfec` was used for the validation.
- The truth loader uses the fixed district codes: Nyarugenge `RW-P1-D11`, Nyamasheke `RW-P3-D37`, Musanze `RW-P4-D43`.
- Truth and ancestor reads used small explicit field selections; no geometry payloads or `select=*` were requested.
- No Vercel settings, environment variables or Supabase integration settings are changed as part of this release.
- The service-role key is server-only and must not be exposed to browser code.

## Production and rollback

PR #5 is to be squash-merged only after its CI checks pass. Production readiness must be confirmed from GitHub deployment/status records; if the Vercel deployment cannot be verified because access is denied (403), report that limitation rather than claiming READY.

After Production is READY, the separate production smoke workflow will exercise both Production hostnames and persist raw HTTP status, chosen level, scope code, flags and latency to `wip/p3-results`. Any HTTP 5xx, more than 2 incorrect results among the 12 primary-host POST requests, or any `rwanda_classifier_unavailable` flag is a rollback trigger. The project owner will issue the explicit `ROLLBACK` instruction before rollback.

