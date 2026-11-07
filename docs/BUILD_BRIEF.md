# Governance and Leaders Build Brief

Version 1, 2026-11-05. Audience: any engineer or AI coding agent assigned to build the governance and leaders area of IWACU RWANDA 2 ("Ubuyobozi Bwacu"). Read this file completely, then the milestone file you were assigned (`docs/BUILD_M1_LEADERS_WORKSPACE.md`, `docs/BUILD_M2_PUBLIC_LEADER_VIEW.md`). The product specification (hierarchy, roles, security model, workspaces, communication centre) is summarised in section 8; where this brief is silent, ask the reviewer instead of guessing.

## 1. Product in one paragraph
A national platform that (a) tells any person in Rwanda where they are (village, else cell, sector, district) and shows the responsible leaders at once, and (b) gives authorised officials separate workspaces to manage leaders, communicate officially, assign work and keep records. Authority chain: National Ministry / Super Admin > District > Sector > Cell; Village is a data level (optional restricted account later); Province is geography only, never an administrative tier. The users are mostly on low-end Android phones (360 px wide). Interface languages: Kinyarwanda first, English and French required.

## 2. Working agreement
1. You ADD to the existing application in this repository (Next.js 15, React 19, TypeScript, Tailwind, Supabase, Vercel). Do not create a separate app, do not rewrite the project, do not use another host or another database.
2. Read before writing: `README.md`, `docs/HANDOFF.md`, `src/app/admin/**`, `src/app/api/admin/leader-registry/**`, `src/lib/leaders/**`, `src/components/PublicLeaderDirectory.tsx`, `src/app/page.tsx`, `src/app/api/leader-directory/route.ts`, `src/app/api/administrative-units/route.ts`, `sql/migrations/**`, `supabase/tests/**`. Reuse and extend; follow existing conventions.
3. Git: create your work branch from the branch that contains this file. One branch and one DRAFT pull request per milestone. Never push to `main`, never merge, never force-push, never delete a branch.
4. The hosting plan allows about 100 builds per day and every push starts one. Turn off any automatic push or auto-commit-to-remote feature in your tool. Commit locally as often as you like; PUSH AT MOST 3 TIMES PER MILESTONE, each time only after the checks in section 7 pass.
5. Every pull request is reviewed by a separate reviewer who runs the checks again and sends corrections. Do not start the next milestone before the review of the previous one.
6. Commit format: `[AGENT] area: what - why - next`. Keep `docs/HANDOFF.md` updated with a short entry per push.

## 3. Hard rules
- Database: production already contains Leaders Registry V2 (17 tables with RLS, RPCs `create_leader_appointment_v2`, `create_leader_appointment_for_person_v2`, `transfer_leader_appointment_v2`, `change_leader_appointment_state_v2`, `get_leader_candidates_v2`, view `leader_directory_public`, storage buckets `leader-photos` (public, 150 KB) and `leader-dossier` (private, 5 MB)). You never receive production credentials and never run SQL on production. A schema change is delivered ONLY as one additive migration file `sql/migrations/YYYYMMDD_NN_name.sql` (no drop, truncate or rename), its rollback in `sql/rollbacks/`, RLS on every new table, explicit GRANT/REVOKE (the platform grants anon and authenticated everything on new tables by default, so revoke what must not exist; see migrations `20261104_06` and `20261104_07`), and a contract test in `supabase/tests/` registered in `.github/workflows/leader-registry-v2-db.yml`. The reviewer applies migrations.
- Secrets: none in code, chat or commits. No privileged key in browser code. Do not ask for production secrets; develop and test against fixtures (section 7).
- Honesty: no fake leaders, no sample names, no invented contacts, no auto-verified records, no "saved" message before the server confirms and the record is read back. A new appointment is always Pending verification. Public pages show only approved and published leaders and never a confidential dossier field.
- Independence: no runtime dependency on external APIs or CDNs; no new npm dependency unless unavoidable (justify it in the pull request). Free tools only.
- Server-side scope: every protected request verifies user, action, record and assigned scope on the server and in RLS. Hiding a button is not security.
- Performance: the database role timeouts are 3 s (anon) and 8 s (authenticated). Never load all villages (14,823) or the whole directory; always lazy-load children and bound every query (`limit`, indexed filters).
- Languages: every new user-visible string lives in one dictionary module `src/lib/i18n/leaders.ts` keyed by language (`rw` complete, `en` and `fr` keys present; leave a key missing rather than ship a wrong translation). Components never hard-code text.

## 4. Design law (every screen)
Phone first, calm and compact, not cluttered.
- Type: page title 20-26 px, section heading 16-18 px, body 14-16 px, metadata 12-13 px, buttons 13-15 px. Spacing scale 4/8/16/24/32 px.
- Touch targets at least 44 px. Visible labels (placeholders are never labels). Errors in text next to the field. No decorative icons; important actions carry a text label.
- No horizontal scroll and no clipped control at 320, 360, 390, 430, 768, 1024 and 1440 px; 200% zoom stays usable; content width is bounded on large screens.
- Mobile: one main view at a time, compact top bar, bottom bar or drawer. Desktop: compact persistent sidebar, bounded content area, optional detail panel. Tables become readable cards on phones.
- Every loading, empty, error and success state is designed. Keyboard operable with visible focus; accessible names on icon buttons; contrast AA.
- Build shared components once and reuse them (`src/components/ui/` or `src/components/leaders/`): app shell, page header, button, input, select, cascading place picker, status chip, avatar, photo cropper, dialog, empty and error states, responsive table-or-cards. Keep the brand colours (blue #00A3E0, yellow #FAD201, green #20603D) and logo.

## 5. Photo specification (exact)
- Input: camera or gallery; JPEG, PNG or WebP; source up to 12 MB; shorter side at least 400 px (clear Kinyarwanda message otherwise; HEIC gets its own message).
- Crop: square 1:1 frame, drag to reposition, zoom slider, live preview, canvas based, touch friendly, no CDN.
- Outputs: MAIN 800 x 800 px WebP at most 150 KB (lower quality stepwise 0.9 down to 0.6 until it fits, else an error message); THUMB 256 x 256 px WebP at most 40 KB; PENDING ORIGINAL (private) JPEG, longest side 1600 px, at most 1.5 MB. These match the server limits in `src/app/api/admin/leader-registry/photos/route.ts`.
- Privacy rule enforced by the server: public photo upload is accepted only for an approved appointment with a published public profile. A photo chosen while adding a leader is therefore stored privately first (route `dossier-documents`, bucket `leader-dossier`, `document_type` "photo_pending", JPEG) and published with one tap after approval and publication (download via the 60-second signed URL, re-encode MAIN and THUMB, upload with the `photos` route).
- Display: list and org-chart avatar 40 px circle (48 px from 768 px) from THUMB; public result row 56-64 px circle from THUMB; profile page 160-200 px from MAIN; always `width` and `height` attributes, lazy loading, object-cover; initials on a neutral colour when there is no published photo (never a broken image; never an unapproved photo on a public page); the storage key changes on every new photo so old cached images never show.

## 6. Domain rules to respect
- Hierarchy labels: Igihugu, Intara, Akarere, Umurenge, Akagari, Umudugudu. Place selection is by cascading SELECT lists (never typing) loaded from `/api/administrative-units?level=...&parent_id=...`; a District admin starts inside its own district and can never pick outside it.
- Positions are a catalogue (`leader_positions`): draft until a National Super Admin approves; after approval title and level are immutable (trigger `private.guard_leader_position`). A district has two vice-mayors (economic development; social affairs), so allow editing draft titles and creating an extra position before approval.
- Leaders end, transfer or are archived; history is kept; nothing is hard-deleted.
- Verification lifecycle: draft, pending, approved, rejected, suspended/disputed, ended. Evidence is recorded; when none exists it is labelled "not supplied", never invented.

## 7. Checks and reporting
Before every push run and report REAL output (never claim what you did not run): `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run test:location` (add your test files to that script in `package.json`), `npm run build`.
You will not have the production database. Test the UI against fixtures: intercept `/api/admin/leader-registry/*`, `/api/administrative-units` and `/api/leader-directory` with Playwright route interception inside test files only (no mock data on production code paths). Take screenshots at 360, 768, 1280 and 1440 px of every new screen and attach them to the pull request. If something could not be run or verified, say exactly why.
Pull request description: purpose; files changed; migrations added; commands run with output tails; screenshots; a section "NOT DONE / UNSURE"; number of pushes used.

## 8. Specification summary (reference)
- Roles: National Super Admin (assigned by a controlled process, mandatory MFA); District Admin (created by Super Admin); Sector Admin (by District); Cell Admin (by Sector); optional Village contributor (by Cell); delegated staff (time-limited, scoped, audited); public visitor. No cross-district data access by changing a URL or query.
- Accounts: individual accounts, one person per account, usernames are identifiers not secrets, one-time activation or reset credentials shown once, passwords never readable by anyone, account status lifecycle (invited, active, suspended, recovery pending, revoked).
- Workspaces: one template per tier, many scoped instances (Ministry, District, Sector, Cell); consistent design system; dashboards with defined metrics (definition, period, source, last updated).
- Leader registry: public profile (name, title, unit, approved contacts, photo, office hours, priorities, verification badge and dates) separated from the confidential dossier (education, appointment letter, employment history, certifications, internal notes) at API and database level.
- Official communication centre (later milestone): inbox, compose, sent, drafts, important, archive, search, threads, priority, classification, deadlines, acknowledgements, private attachments, hierarchical recipients with a preview of the number and names of units that will receive a broadcast, honest delivery states, idempotent retries.
- Tasks, reports and official records; notifications; support centre; offline-tolerant drafts; audit of every sensitive action; accessibility WCAG 2.2 AA.

## 9. Milestones
M1 Leaders workspace (admin). M2 Public result and leader profile page. M3 Workspaces by tier and account provisioning (the privileged server route is designed and fails closed until the owner adds the server secret). M4 Official communication centre. M5 Tasks, reports, records, notifications, support, full three languages, accessibility pass.
