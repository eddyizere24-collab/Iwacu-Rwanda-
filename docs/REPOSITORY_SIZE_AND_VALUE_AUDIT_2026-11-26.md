# IWACU RWANDA — Repository Size, Engineering Scope and Indicative Value Review

**Audit date:** 26 November 2026  
**Audited source branch:** `main`  
**Main commit measured:** `0fca0ea6f7bd67bbc3cf1ab83284527091dc80a0`  
**Repository:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-  
**Measurement evidence:** GitHub Actions workflow run [#45786116773](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/45786116773)  
**Audit branch:** `verify/repo-size-audit-20261126`

## 1. Executive conclusion

IWACU RWANDA is substantially larger than a conventional brochure website. The repository contains a multi-module civic/geospatial web platform: location determination, national map assets, route planning, public leader directory, administrative/office workflows, Ishakiro AI assistant, accessibility, localization, notifications, offline support and supporting data pipelines.

The best current classification is:

**Advanced custom MVP / early operational platform, with substantial engineering scope, but not yet independently verified as a fully enterprise-ready commercial product.**

The code and data footprint is meaningful. The most important remaining qualification is operational evidence: real production behavior, security review, accuracy/coverage validation, reliability under load, and verified users/revenue have not all been independently demonstrated in this audit.

## 2. Exact repository size

GitHub's recursive Git tree for the audited main commit contains **1,040 tree entries: 781 files and 259 directories**.

A GitHub Actions inventory script checked out the same source tree and measured every tracked file. The two temporary inventory-measurement files added on the audit branch were excluded from the totals.

| Measure | Exact result |
|---|---:|
| Tracked files | **781** |
| Directories | **259** |
| Total file content | **65,519,251 bytes** |
| Decimal size | **65.52 MB** |
| Binary size equivalent | **62.48 MiB** |
| UTF-8 text files | **753** |
| UTF-8 text bytes | **7,395,231 bytes** |
| Binary files | **28** |
| Binary bytes | **58,124,020 bytes** |
| Physical text lines | **90,841** |
| Unicode characters in text files | **7,387,015** |

### Counting definitions

- A line is a physical text line; a final non-empty line counts even if it has no trailing newline.
- Character count means Unicode code points after UTF-8 decoding. Line-ending characters are included.
- Binary files (images, audio, PDFs, map packages and compressed files) are excluded from line and character counts.
- The total line count is for **all UTF-8 text files**, not only application source code. It includes source code, SQL, tests, documentation, configuration, workflows and structured data.
- One-line JSON files can contain millions of characters while adding only one physical line. This is why line count and character count are different measures.

## 3. How much is actual code?

It is important not to call every line in the repository application code.

| Code category | Files | Lines | Bytes | Unicode characters |
|---|---:|---:|---:|---:|
| First-party application source under `src/` (excluding tests and vendored code) | **232** | **39,115** | **1,983,380** | **1,978,621** |
| All source-code extensions combined, including tests, SQL, scripts and vendored source | **558** | **78,136** | **4,498,531** | **4,492,882** |
| Test source files | **100** | **10,815** | **522,851** | **522,581** |
| SQL files | **81** | **10,715** | **537,885** | **537,816** |
| Script code files | **16** | **3,553** | **144,911** | **144,866** |
| Documentation text | **73** | **4,837** | **369,222** | **366,999** |
| Configuration/workflow text files | **108** | **7,611** | **2,399,080** | **2,398,736** |
| Structured data text (JSON/CSV/XML/GeoJSON categories) | **56** | **2,522** | **2,205,583** | **2,205,269** |

Some rows overlap by design. For example, SQL test files are in both the SQL and test categories; JSON configuration may also be structured data. Do **not** add these rows together to calculate the repository total.

### Language-level counts

| File type | Files | Lines | Bytes |
|---|---:|---:|---:|
| TypeScript (.ts) | 291 | 36,841 | 1,757,245 |
| React TypeScript (.tsx) | 96 | 17,340 | 828,410 |
| JavaScript (.js) | 10 | 2,431 | 876,414 |
| SQL (.sql) | 81 | 10,715 | 537,885 |
| Python (.py) | 50 | 6,057 | 239,308 |
| Markdown (.md) | 69 | 4,606 | 356,975 |
| YAML workflows (.yml) | 55 | 3,857 | 144,355 |
| Other text types | Remaining text files | Included in the 90,841 total | Included in the 7,395,231 text bytes |

## 4. What occupies the storage?

The largest directory is `public/`, because IWACU carries map, offline and media assets rather than only HTML and CSS.

| Top-level directory | Bytes | Approximate decimal size |
|---|---:|---:|
| `public/` | 60,941,885 | 60.94 MB |
| `src/` | 2,397,795 | 2.40 MB |
| `national-grid/` | 571,073 | 0.57 MB |
| `sql/` | 351,778 | 0.35 MB |
| `legacy/` | 331,854 | 0.33 MB |
| `docs/` | 265,817 | 0.27 MB |
| Repository root files | 210,037 | 0.21 MB |
| `scripts/` | 156,743 | 0.16 MB |
| `supabase/` | 144,482 | 0.14 MB |
| `.aistudio/` | 81,008 | 0.08 MB |
| `.github/` | 66,779 | 0.07 MB |

Largest individual assets:

| Asset | Exact bytes | Approximate size |
|---|---:|---:|
| `public/rwanda-grid-map/basemap/rwanda.pmtiles` | 45,127,285 | 45.13 MB |
| `public/routing/graph.bin.gz` | 8,656,471 | 8.66 MB |
| `public/offline/location-index.json` | 1,937,963 | 1.94 MB |
| Vendored `maplibre-gl.js` | 803,086 | 0.80 MB |
| Rwanda volcanoes image | 401,564 | 0.40 MB |
| Akagera giraffes image | 389,204 | 0.39 MB |
| Rwanda tea plantation image | 383,264 | 0.38 MB |
| Kinyarwanda help audio | 381,484 | 0.38 MB |
| Kinyarwanda greeting audio | 375,084 | 0.38 MB |

The PMTiles map and compressed road graph together use **53,783,756 bytes (about 82.1% of the whole tracked repository)**. Adding the offline location index brings these three major data assets to **55,721,719 bytes (about 85.0%)**.

This is meaningful product data, not merely decorative media. It also means that repository size is not the same as the amount of code a phone downloads on every visit; delivery, caching and map-tile loading determine the actual user download.

## 5. Application architecture and feature inventory

### Application surface

- **34** Next.js page files.
- **71** API route handler files.
- **291** tracked files under `src/` in total.
- **44** component-related TypeScript/TSX files, including component tests and office UI/type files.
- Main stack: TypeScript, Next.js 15, React 19, Supabase/PostgreSQL, Turf.js and map/routing infrastructure.

### Main product capabilities found in the source tree

1. **Location engine:** GPS and alternative location signals, coordinate validation, confidence/arbitration, administrative hierarchy and fallback handling.
2. **Map and Ikarita:** map overlays, administrative boundaries, search, named places, route planning and cached map assets.
3. **Rwanda data:** administrative/geospatial data, a large offline location index, place gazetteer and national-grid processing.
4. **Ishakiro:** conversational assistant, intent handling, Rwanda knowledge, stored answers, language detection, spatial/place facts and external research controls.
5. **Leaders Registry:** public leader directory plus substantial admin workflows for people, positions, appointments, evidence, contacts, transfers, documents and verification.
6. **Offices/workspaces:** accounts, entry keys, records, assignments, cases, audit, tasks, messages and reporting.
7. **Access and inclusion:** Kinyarwanda/English/French support, accessibility settings, voice/read-aloud support, help, captions/RSL guide assets and emergency information.
8. **Notifications:** location-change monitoring, visitor subscriptions, Web Push and notification history.
9. **Operational controls:** feature flags, rate limits, security helpers, health endpoint, CI tests and documented release boundaries.

### Database and data engineering

- **81 SQL files** in total.
- **29** dated SQL migration files.
- **24** rollback scripts.
- **19** SQL contract/bootstrap/check files under `supabase/tests/`.
- Database code covers leader registry, office workflows, location, assistant knowledge/usage and map/search RPCs.

### Rwanda places and map work

The merged PR #102 records a named-place gazetteer of **1,583 Rwanda places** from OpenStreetMap, including cities, towns, markets, bus stations, hospitals, universities and other place types. The merged PR added ranking and map/planner integration. See https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/102.

The repository's deployment documentation also records a source-coverage limitation for the NISR 2022 village boundaries: it describes 14,816 mapped villages out of 14,837 gazetted villages and notes that recent administrative changes still need official verification. Therefore, the existence of a national map package must not be interpreted as proof that every village boundary is complete or field-validated.

## 6. Testing and engineering evidence

There are **100 test source files containing 10,815 lines** by the inventory rules. The repository has GitHub Actions checks for Ishakiro, location, accessibility, leader registry database contracts, service-worker contracts, geospatial processing and other tasks.

Examples from the current GitHub Actions history:

- Ishakiro assistant checks passed on PR #104 head commit `4ebdabfb9228424cd2bcb3824a3d20286cd8b712`: https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/45772645038
- Location engine checks passed on the same PR head: https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/45772645010
- The repository inventory job completed successfully: https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/45786116773

A passing CI workflow proves that the specified automated checks passed for that commit. It does not prove nationwide field accuracy, production uptime, security against real attackers, or successful use on every phone model.

## 7. Current weaknesses that affect professional/commercial readiness

1. **Production search reliability:** draft PR #104 records production Supabase logs on 26 November 2026 showing the new map-search RPC returning HTTP 500 / SQLSTATE `57014` (statement timeout), followed by the legacy search RPC also timing out. PR #104 changes fallback behavior and adds tests. Its Ishakiro and location CI checks passed, but the PR is still open and draft, not merged into `main`. See https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/104.
2. **Deployment verification:** the combined status endpoint reports a `Vercel` failure status for the latest audited main commit `0fca0ea6f7bd67bbc3cf1ab83284527091dc80a0`. The connected Vercel integration could not retrieve the deployment, so this audit does not claim that the live production deployment is healthy or broken; it is unverified here.
3. **Geographic completeness:** NISR boundary data is dated 2022 and has documented coverage gaps. Official validation of all current administrative units is still needed.
4. **Real-device evidence:** automated tests and browser phone-size work do not replace a structured field test on entry-level Android, iPhone, weak mobile data, indoor GPS and border areas.
5. **Security assurance:** no independent penetration-test report or completed external security certification was found in this audit.
6. **Commercial proof:** repository evidence does not establish paying customers, recurring revenue, retention, active user counts, contracts or audited uptime.
7. **Native mobile:** the audited main branch is a Next.js/PWA website. It does not yet contain an independent Android/iOS native application project.

## 8. Indicative international engineering replacement-cost estimate

This is a **replacement-cost estimate**, not a statement of revenue, company equity value or a buyer's guaranteed offer.

Clutch's 2026 pricing guide reports that most listed software development firms charge **US$24–49/hour**, that reviewed custom software projects commonly fall in the **US$10,000–49,999** band, and that its reported average project cost is **US$132,480.29 over about 13 months**. Clutch says its hourly pricing uses first-party pricing data from verified client reviews. Source: https://clutch.co/developers/pricing (updated 21 September 2026).

For IWACU, a bottom-up reconstruction estimate for a comparable web platform is approximately:

| Workstream | Estimated hours |
|---|---:|
| Product analysis, architecture and UX planning | 120–200 |
| Website pages, responsive UI and component implementation | 300–500 |
| APIs, Supabase/Postgres integration and admin/leader workflows | 450–700 |
| Geospatial engine, map, offline assets and routing | 400–700 |
| Ishakiro assistant, knowledge and AI/search integration | 200–400 |
| Localization, accessibility, voice and notifications | 150–250 |
| Automated tests, CI, security hardening and integration QA | 300–500 |
| Release preparation, documentation and project coordination | 150–250 |
| **Total estimated reconstruction effort** | **2,070–3,500 hours** |

At the Clutch reference band of US$24–49/hour:

- Lower scenario: 2,070 hours × US$24 = **US$49,680**.
- Upper scenario: 3,500 hours × US$49 = **US$171,500**.

**Indicative international replacement cost: approximately US$50,000–172,000.**

This estimate assumes that the replacement is built and tested to comparable functional scope. It is not calculated by multiplying the number of source-code lines by a price. The hours are a scoping estimate inferred from the inspected modules and integration surface; they are not time-sheet hours recorded by the existing team. A full formal quote would require detailed acceptance criteria, code-quality review, data validation and deployment discovery.

### Current as-is code/IP negotiation indicator

For planning only, a cautious **code-and-data asset discussion range is US$10,000–40,000**, with low confidence. This is deliberately much lower than replacement cost because the buyer would still inherit the unverified deployment status, unresolved draft production-search fix, source-data coverage limitations, lack of independent security certification and lack of proven revenue/user metrics.

This is not a certified valuation or an offer. A company valuation based on ARR, earnings, contracts or customer growth cannot be inferred from the repository alone. Verified adoption and recurring revenue could materially change the commercial valuation; without them, the engineering replacement value is the more defensible benchmark.

The estimate excludes a separate native Android/iOS application, App Store/Play Store submission, long-term hosting, map/data licensing review, ongoing support and future feature requests.

## 9. Overall assessment

| Dimension | Current assessment |
|---|---|
| Feature breadth | High |
| Custom engineering scope | High |
| Geospatial/data assets | High |
| Test and CI foundation | Substantial |
| Nationwide accuracy proof | Incomplete |
| Production reliability evidence | Incomplete / one current search issue under draft fix |
| Independent security assurance | Not demonstrated |
| Commercial traction | Not demonstrated in repository evidence |
| Native Android/iOS application | Not yet present on audited main |

**Final technical position:** IWACU RWANDA has the breadth and data engineering of a serious custom platform, not a small template website. Its codebase and geospatial assets represent meaningful engineering work. It should currently be described as an advanced custom MVP / early operational platform, not yet as a fully proven enterprise-grade product.

## 10. Reproducibility

- Inventory workflow: https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/45786116773
- Inventory script: `scripts/repo-size-audit.mjs` on `verify/repo-size-audit-20261126`.
- Workflow: `.github/workflows/repo-size-audit.yml` on the same audit branch.
- The measuring script excludes its own two temporary files from the totals.
- No application feature code, Production database, Vercel environment setting or website release was changed by the inventory measurement.
