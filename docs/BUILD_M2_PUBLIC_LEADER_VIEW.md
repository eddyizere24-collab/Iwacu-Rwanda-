# Milestone M2: Public result and leader profile page

Branch: `feature/m2-public-leader-view`, created from the branch containing this file after M1 is reviewed. Read `docs/BUILD_BRIEF.md` first; every rule there applies.

Decision from the product owner: a citizen must NOT see "where you are" first and "the leaders" later in a separate section. When the person confirms a place, the place and its leaders appear together in one calm view. It must look professional and uncluttered on phone, tablet and computer.

## Current code
- Home page `src/app/page.tsx` (candidate places and the leader section, `<PublicLeaderDirectory candidates={leaderCandidates} />` around line 495) and `src/components/PublicLeaderDirectory.tsx` (about 270 lines: leader rows, thumbnail via public storage URL, photo modal).
- Data: `POST /api/leader-directory` with `{"candidates":[{"scope_code":"RW-..."}]}` (1 to 3 candidates) returns `{status, unavailable, candidates:[{place:{id,scope_code,name_kiny,name_eng,level}, confidence, leaders:[...]}], shared_leaders:[...]}`; types in `src/lib/leaders/public-directory.ts`. Honest confidence words live in `src/lib/leaders/confidence.ts` (Byizewe, Giciriritse, Gicye); never show raw scores as probabilities.
- View `public.leader_directory_public` already exposes: `appointment_id`, `display_name`, position titles, unit name and level, `effective_from`, `biography`, `office_hours`, `service_priorities`, photo keys, `public_contacts` (type, label, value; approved and public only). It does NOT expose a verification date.

## Task 1: one combined result view
1. Before confirmation: every candidate card shows, besides the place name and the confidence word, a compact preview of the main leader of that exact unit (small circular photo or initials, name, title). The citizen can recognise the right place from the leader.
2. After the person taps "Ndiye" on a candidate: show ONE view with the breadcrumb Intara > Akarere > Umurenge > Akagari > Umudugudu; the leaders of that exact place (photo at the left, name, title, verification chip, whole row tappable); then one compact group "Abayobozi bo hejuru" for parent levels (cell, sector, district) shown once. Use `leaders` of the chosen candidate and `shared_leaders` from the response; keep the "Si hano?" correction route.
3. Responsive: single column on phones; from 768 px two columns (place and breadcrumb on one side, leaders on the other); from 1280 px bounded width. No horizontal scroll at 320-1440 px.
4. Doubt is visible: every leader row shows its verification state and "Yemejwe ku wa <date>"; when a position at the place has no approved leader show "Amakuru y'umuyobozi ntaruzuzwa" with a "Tubwire" action. If a place has several valid holders of the same position (for example two vice-mayors) show them all.
5. Add `verified_at` to the public view with ONE additive migration (`create or replace view` adding the column at the end; source: the approved verification case decision date; grant anon only that one extra column on `leader_verification_cases`; add contract tests proving anon still cannot read other verification columns and that unapproved or unpublished leaders never appear). Update `public-directory.ts` and its test.

## Task 2: citizen feedback
"Hari ikibazo kuri aya makuru?" on every leader row and on the profile page (wrong leader, wrong place, wrong phone number, other). New additive table `public.leader_public_feedback` (appointment or place reference, category, short text up to 500 characters, created_at, status). RLS: anon and authenticated may INSERT only; nobody but authorised administrators may SELECT. Constraints that limit abuse (text length, category check). API route `src/app/api/leader-feedback/route.ts` with zod validation and a clear Kinyarwanda confirmation after the server accepted it. Admin side listing of feedback is part of M3, not M2.

## Task 3: leader profile page (the "room")
New server-rendered page `src/app/abayobozi/[appointmentId]/page.tsx` (UUID validated; 404 otherwise). One bounded query to `leader_directory_public` by `appointment_id`. Content: large photo (MAIN size, 160-200 px, initials fallback), name, position title, place with breadcrumb, working hours (`office_hours`), goals and service priorities (`service_priorities`), biography, public contacts as tappable links (phone `tel:`, email `mailto:`, social links opened safely with `rel="noopener noreferrer"`; only the approved public ones), office location text, last verified date, and the feedback action. Never any confidential dossier field. Basic Open Graph metadata. Back link to the result view. Works as a shareable link on phone, tablet and computer.

## Task 4: quality
Dictionary keys in `src/lib/i18n/leaders.ts`; unit tests for the mapping and sanitising logic (no confidential field can pass; empty states); tests that the page never requests more than the 1 to 3 candidate scopes; Playwright fixture tests with screenshots at 360, 768, 1280 and 1440 px for: result with leader, result without leader, several holders, slow network, profile page with and without photo.

## Definition of done for M2
All tasks; `tsc`, lint, tests and build green; migration, rollback and contract test added and registered in the workflow; screenshots in the pull request; at most 3 pushes.
