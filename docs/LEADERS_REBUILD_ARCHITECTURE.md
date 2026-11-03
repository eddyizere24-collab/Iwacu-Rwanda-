# IWACU RWANDA — Leader Registry V2 Architecture

**Status:** Phase 1 review completed; Phase 2 foundation proposed on a feature branch.  
**Baseline:** `main` at `9437bf0581efb4881e30eaa008b214d4267dbe82`.  
**Production:** Supabase project `buexgewxypvkqmphvfec`; schema inspection only. No production DDL or data writes were performed.  
**Related draft:** PR #13 remains open and draft; it is not the architecture target.

## 1. Review findings

The current Production database has 17,423 canonical administrative boundaries and zero rows in `public.leaders`. One authenticated `admin_profiles` record exists at country scope with the super-admin flag set. The current database also has an append-only-protected `audit_logs` table, private RBAC helper functions, and a simple `leaders` table.

The present `leaders` table combines a human's name, position, location, appointment dates and contact data in one row. Its existing verification state is limited to `pending`, `approved` and `rejected`. That is not sufficient for identity/appointment separation, evidence review, public-consent controls, confidential dossier access or leadership transitions.

The old application layer is not safe to keep as the active administration:
- `main`'s leader API uses mock-data helpers and a legacy `x-iwacu-admin-token` gate.
- The main admin dashboard starts with a fabricated national session.
- The previous add/edit flows contained prefilled sample names, contacts, image URLs and dossier details.
- Bulk import began with sample CSV rows, sent a success count without checking HTTP status and included an `is_verified` input.
- Dossier fields existed in UI/types, but there is no matching persisted confidential dossier table in the live schema.
- The draft PR #13 improves parts of location/public UI and has a better Supabase Auth session path, but still writes the one-row `leaders` model and has no independent position, identity, contact-visibility or dossier architecture. It also models Province as an admin tier, contrary to the governance specification.

## 2. Governing hierarchy

Administrative geography and authority remain separate concepts.

| Authority tier | Required scope |
| --- | --- |
| National Super Admin | Country boundary |
| District Admin | One District and descendants |
| Sector Admin | One Sector and descendants |
| Cell Admin | One Cell and its Villages |
| Village account | Disabled unless separately approved |

Province is only a geographic grouping. It is not an administrator tier or workspace. Village remains a canonical data layer; a Village account is not assumed.

Every selected administrative place must resolve to the existing `public.boundaries.id` and its parent relationship. The UI must not write labels or client-supplied scope strings as authority.

## 3. New module boundaries

1. **Person registry** — one persistent identity per real person; no office title or appointment dates.
2. **Position catalogue** — approved position definitions, translated titles and the required boundary level. It is intentionally not pre-seeded with invented offices.
3. **Appointment registry** — one record per appointment, tied to person, approved position and canonical boundary UUID. Transfers and later appointments create new rows.
4. **Verification** — one current case per appointment, evidence rows and an immutable decision history. The submitter cannot approve their own case.
5. **Public profile** — separate, explicitly published public projection for an approved appointment.
6. **Contacts** — separate values with private-by-default visibility and explicit publication approval.
7. **Confidential dossier** — separate tables for education/work/administrative notes and private document metadata. No public API selects these tables.
8. **History and audit** — appointment transition events and append-only leader audit events. Official appointments are archived/ended, not hard-deleted.
9. **Authority assignments and delegation** — role assignment, canonical scope, time bounds and narrowly enumerated capabilities. No Province tier and no client-side/localStorage authority.

## 4. Data model introduced by the foundation migration

- `admin_role_assignments`, `admin_delegations`
- `leader_people`, `leader_positions`, `leader_appointments`
- `leader_verification_cases`, `leader_appointment_evidence`, `leader_verification_decisions`
- `leader_public_profiles`, `leader_contacts`
- `leader_dossiers`, `leader_dossier_documents`
- `leader_appointment_events`, `leader_audit_events`
- `leader_directory_public` (security-invoker public projection)

The migration is additive. It leaves `public.boundaries`, the location engine, the old `public.leaders` table and existing audit data untouched. The one existing national super-admin assignment is mapped into the new role-assignment table when the migration is eventually applied. Province-scoped legacy profiles are not elevated or mapped to a new role.

## 5. Permission model

Database row policies and server authorization both evaluate the signed-in Supabase Auth user, active role assignment, effective dates, canonical boundary ancestry, action and data classification.

- Read/edit is allowed only within the assigned area and its descendants.
- Verification requires an administrator at a strictly higher geographic authority tier than the appointment's unit; the appointment submitter is forbidden from deciding their own case.
- Dossier access is National/District by default. Lower-tier dossier access requires an explicit time-limited delegation.
- Position-catalogue and administrator-assignment management are national-only in this foundation.
- No hard-delete policy is provided for leader registry records.
- Public reads are limited to published profiles for approved, current appointments, with only explicitly approved public contacts.
- Confidential dossier, evidence storage keys and private contacts are not in the public projection.

## 6. Decisions intentionally not fabricated

The position catalogue is empty until its official codes/titles and required scopes are reviewed and approved. The PDF records an open decision about evidence types and approval responsibility (D-10), and several account/record-policy decisions remain open. The implementation must not turn an old enum or sample data into an assertion that a title or appointment is currently official.

The following remain release gates:
- confirmation of platform/data-controller authority and the initial National Super Admin process;
- official position catalogue, translated titles and evidence requirements;
- public-contact publication rules and approved public photo upload bucket/limits;
- document size/type limits, scanning and retention schedule;
- exact lower-tier dossier permissions and delegation policy;
- verified current authoritative administrative boundary source, beyond treating the 2022 NISR extract as proof of present-day legal boundaries.

## 7. Release and migration discipline

The SQL file in this branch is a proposal, **not applied to Production**. Before any database deployment:
1. Run the migration in an isolated local/test Supabase database with the matching baseline migrations.
2. Run the RLS and workflow integration tests with fixture users/units in that isolated database.
3. Review grants and policies, including anonymous direct table access and view invocation.
4. Review the migration SQL and rollback/recovery procedure.
5. Obtain explicit Product Owner release approval.

No leader demo rows are inserted in Production. The present one-admin situation cannot yet prove a two-person submitter/reviewer workflow with real authorised leaders. Do not relax separation-of-duties merely to manufacture a demonstration.

## 8. Current status (3 November 2026)

### Implemented on this feature branch

- Phase 1 repository / Production review: completed.
- Phase 2 database foundation: all V2 tables, constraints, scope helpers, RLS policies, history/audit triggers, the public security-invoker view and atomic application RPCs are present in the additive migration.
- PostgreSQL 17 contract workflow: **PASS** on GitHub Actions run `41695756112` (run #113). It applied the test baseline, migration and RLS/workflow contract tests in an ephemeral database. No Production database was used.
- API foundation: Supabase Auth session validation, scoped role lookup, appointment submission RPC, version-checked verification decision RPC, position catalogue, public profile, contacts, confidential dossier, evidence metadata, history and audit endpoints are present.
- Administration UI: the former fake role-picker/localStorage login has been replaced by Supabase Auth. The old dashboard route redirects to the new Leader Registry dashboard. The dashboard has appointment submission, reviewer actions, National-only position catalogue, audit, and appointment detail panels for profiles, contacts, dossier and history.
- Public integration: the location results page now passes its resolved administrative scope to the public Leader Directory. It displays only records that the database view determines are currently approved and published. With zero real Production leader records, an empty public directory is the correct result.

### Remaining before release

- Run a fresh uninterrupted ESLint, unit-test, TypeScript and production-build workflow against the latest combined UI changes. A prior run passed after replacing the legacy dashboard, but later runs were cancelled during dependency installation as branch commits arrived.
- Vercel Preview currently reports a build-rate-limit / upgrade restriction. No claim is made that the newest UI is running on a Preview URL.
- Configure and test private evidence/dossier file storage, upload limits, scanning and retention. The current evidence endpoint records metadata only; it does not upload a file.
- Review and validate official position codes, evidence categories, public contact rules, the platform/data-controller authority and the first National Super Admin process before release.
- Complete E2E checks of Supabase Auth, scope-limited administration, separation of duties, public directory filtering, and phone-sized UI.
- Obtain explicit Product Owner release approval before Production migration or deployment.

### Release safety

- The V2 migration has **not** been applied to Production.
- No Production leader fixture or fabricated leader was inserted.
- The location engine and canonical boundaries were not altered by the V2 rebuild.
- PR #14 remains Draft and unmerged. PR #13 remains separate; do not merge either automatically.
- Production website remains unchanged. Preview build-rate limiting is not evidence of a successful deployment.
