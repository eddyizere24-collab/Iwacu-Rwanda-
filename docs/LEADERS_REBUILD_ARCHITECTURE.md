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
- National Super Admin access requires Supabase Auth AAL2. The server checks the session's authenticator assurance level, and restrictive database RLS policies repeat the check on all 15 registry tables so direct Data API calls cannot bypass it. AAL1 may read only the user's own role assignment to reach the MFA flow; registry reads and writes remain blocked.

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

- Phase 1 repository / Production review: completed against the baseline stated above.
- Database foundation: the additive migration defines identity, positions, appointments, verification/evidence metadata, public profiles and contacts, confidential dossiers, retained history, delegation and audit. It includes row-level scope policies, guard triggers, a public security-invoker projection and atomic submission/verification RPCs.
- PostgreSQL 17 contract workflow: **PASS** on GitHub Actions run #197 (`41709014474`) for PR head `cc5373b38d5860c91c31e0a210e1ac9171a2e535`. The job built the disposable baseline, applied this migration and completed the RLS/workflow contract tests. The fixtures exist only in the ephemeral test database; no Production Supabase database was used.
- Security regressions covered by the latest contract: a same-scope editor cannot alter the type, label or value of an already-public contact while retaining an older approval; only a higher-scope reviewer can re-approve the changed public fields. A shared person identity linked to more than one district cannot be corrected by a local administrator lacking edit scope in every linked territory. Person-level dossier audit changes are recorded against each linked administrative unit, while a District A administrator cannot read District B audit events. The contract also verifies that ending one appointment hides its public contact without hiding another appointment's approved contact.
- API foundation: server-validated Supabase Auth session, active database role assignment lookup, appointments, verification decisions, position catalogue, profiles, contacts, confidential dossier, evidence metadata, history, audit and public-directory endpoints.
- National Super Admin MFA: TOTP setup/challenge UI, server-side AAL2 enforcement, and restrictive AAL2 checks across all 15 registry tables. The database contract now tests AAL1 denial, AAL1 self-role visibility for MFA routing, AAL1 non-national workflow access and AAL2 restoration.
- Administration UI: the legacy fake role-picker/localStorage login is replaced with Supabase Auth. The legacy dashboard route redirects to the new registry dashboard. The new UI includes appointment/evidence-metadata submission, verification review, National-only position catalogue, versioned legal-identity correction with retained history, higher-scope-approved public-contact controls, and appointment details for profiles, contacts, dossier and history.
- Public integration: the location results page passes its resolved administrative scope to the public directory. The view only exposes records that are currently approved and published. An empty directory is correct while there are no real approved Production leader records.

### Remaining before release

- Latest application workflow: **PASS** on GitHub Actions run #385 (`41709014386`) for PR head `cc5373b38d5860c91c31e0a210e1ac9171a2e535`. ESLint, location/locate-protection tests, accuracy rejection guards, TypeScript and Next.js Production build all completed successfully.
- Obtain a Vercel Preview build and perform authenticated and public browser checks. GitHub/Vercel has reported the Free-plan daily deployment limit (api-deployments-free-per-day, over 100 deployments that day). No Preview or Production deployment is claimed for the latest branch head.
- Complete required Kinyarwanda, English and French UI translations and responsive/manual accessibility review.
- Complete real-account TOTP enrollment/challenge testing in a working Preview, verify that Supabase Auth allows TOTP enrollment and verification, and define a documented recovery path if the National Super Admin loses the authenticator.
- Implement and test secure private evidence/photo upload only after the owner resolves the evidence/file policy decisions (including allowed file types, size limits, scanning, access and retention). The current evidence route records metadata only; it does not upload files or issue signed links.
- Build the missing administrator assignment/delegation management interface and endpoints only after the governance permissions and delegation rules are approved.
- Validate official position codes/titles, position-specific evidence and approver requirements, public-contact publication rules, platform/data-controller authority, first National Super Admin setup, and the remaining open governance decisions (including the Village-account question).
- Complete real Supabase Auth/scope/separation-of-duties/public-directory E2E checks and phone-sized manual review.
- Obtain explicit Product Owner RELEASE approval before any Production migration or deployment.

### Release safety

- The V2 migration has **not** been applied to Production.
- No fake, sample or fixture leader/position data has been inserted into Production.
- The location engine and canonical boundaries were not altered by this V2 rebuild.
- PR #14 remains Draft and unmerged; PR #13 remains separate. Do not merge either automatically.
- Production remains unchanged. A green isolated database workflow is not proof of Preview or Production deployment.
