# Claude AI — independent audit request: IWACU RWANDA location, notifications and return-state

**Date:** 2026-11-08  
**Repository:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-  
**Production URL:** https://iwacu-rwanda-2.vercel.app/  
**Canonical follow-up PR:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/23  
**Branch:** `fix/retain-location-and-unread-notices`  
**Code head to review:** `4192d5c1cfe7c0647b106adb76190f7fcca8558a`

## Assignment

Act as an independent senior reviewer for Next.js / React, browser geolocation, Service Workers, Android Chrome notifications, local browser storage, and Supabase security. Review the actual repository and diffs; do not merely accept the PR description. Find real bugs, race conditions, missed events, misleading UI, privacy leaks, performance bottlenecks and regressions. Be strict, factual and respectful.

**Do not modify files, push commits, merge a PR, deploy to Production, change Vercel settings, or modify either Supabase project.** Report proposed corrections only. The owner wants to know the defects before any release.

## Relevant change history

1. **PR #21 — first location-notification/archive release**  
   https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/21  
   Merged commit: `f03e8a26baf9e5ead0846d1c78b927285ce9f64b`  
   Added welcome/administrative/geofence notifications, archive UI, private server archive and Web Push infrastructure, plus migration/RLS protections.

2. **PR #22 — local-first notifications**  
   https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/22  
   Merged commit: `d3536803bbb2500f3874633e026c60e150e0c414`  
   Made the active notification flow save to this phone's browser storage and show through the Service Worker without waiting for the server. The archive became phone/browser-local. Administrative notices are emitted together rather than serially.

3. **PR #23 — canonical open follow-up**  
   https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/23  
   Branch: `fix/retain-location-and-unread-notices`  
   Code head: `4192d5c1cfe7c0647b106adb76190f7fcca8558a`  
   This is the single follow-up PR to review for location persistence, unread count, read state and Service Worker prewarming.

4. Read these repository documents:
   - `docs/LOCATION-NOTIFICATIONS.md`
   - `docs/STATUS.md`

PR #24 was created accidentally while the existing PR #23 was overlooked. It duplicates some of the same requirements with a less complete timestamp-based unread counter and no 24-hour location expiry. PR #24 is not the canonical change and must not be merged. Do not spend time reviewing it as the proposed final implementation; compare only if needed to explain why PR #23 is preferable.

## Owner's exact user-facing requirements

1. When IWACU has finished showing a location result, a system notification should appear on the phone as quickly as technically possible.
2. Target: ideally **under 500 ms from the already-computed location event to the phone's notification being displayed**. This target is not from the initial GPS tap. Never invent a measurement or guarantee a result that was not timed on a real phone.
3. A real numeric unread count should appear on the header bell: 1, 2, 3 … 99+. It updates when a new local notice is stored, remains correct across navigation / tabs, and clears only the notices the user has actually opened/read. A later notice must count again.
4. If a person opens another IWACU page and comes back home without moving, the last location and its related screen content should remain visible. The app must not discard it and display only a fresh loading screen simply because the route was revisited.
5. The previous location must be clearly described as the last known result, not falsely labelled as a newly measured GPS fix.
6. A deliberate tap on “Menya aho ndi” must still initiate a fresh location attempt. The stored result should only be replaced by a valid fresh result.
7. Opening the notification archive should mark the notices that are actually shown there as read. Notices that arrive after that must become unread.
8. Notification copy should encourage the visitor to tap it and return to IWACU to view current information.
9. Keep the interface simple and mobile-first.

## Non-negotiable architecture and privacy constraints

- Location results and notification history should stay in the current phone's browser storage. Do not send a new copy of the location result or notification history to a server or third-party analytics service.
- Be precise: localStorage belongs to a specific browser profile and origin, not permanently to the physical phone. Clearing Chrome/site data, changing browser, or changing phone may remove or not carry over this history.
- A normal website cannot continuously discover GPS after Chrome is fully closed or suspended. Background GPS needs a native Android foreground location service and explicit OS permission; that is outside this web-only PR.
- A Service Worker can show a local notification after it receives an event while the app's code is running. Do not claim that this local-only design wakes the app or detects movement after Chrome is closed.
- Preserve current classifier confidence, accuracy handling, supported hierarchy, boundary confidence and geofence calculations. A cached display snapshot must never become an artificial GPS measurement or increase confidence.
- Production Supabase project is `buexgewxypvkqmphvfec`. **Never touch** legacy project `agwfnpwootwsgsdeohcd`. This audit must not need credentials or database writes.

## Files to inspect (follow every relevant import and caller)

- `src/hooks/useLocation.ts`
- `src/app/page.tsx`
- `src/components/LocationChangeNotifications.tsx`
- `src/components/AppHeader.tsx`
- `src/app/amenyesha/page.tsx`
- `src/lib/notification-archive.ts` and its tests
- `src/lib/location-ui-contract.test.ts`
- `src/lib/geofence-monitor.ts`
- `src/lib/administrative-transition-messages.ts`
- `public/sw.js`
- `src/app/api/push/**` and related VAPID helpers (identify legacy/unused paths after PR #22)
- `.github/workflows/location-engine-checks.yml`
- `docs/LOCATION-NOTIFICATIONS.md`
- `docs/STATUS.md`

## Audit checklist

### A. Notification path and latency
- Trace a complete notice from location/geofence event calculation through archive write, Service Worker lookup/readiness, permission check and `showNotification`.
- List each awaited operation and each network request between event availability and the OS notification call.
- Determine if the Service Worker is already active/prewarmed before the event. Can `navigator.serviceWorker.ready` wait indefinitely or long enough to violate the target?
- Verify behavior for permission = granted, default, and denied; Service Worker missing/installing/activating; browser tab backgrounded; Android battery restrictions; device offline; browser closed.
- Identify whether welcome notification is intentionally sent only once per day or on each successful fresh location. Decide whether this matches the owner's request and explain.
- Confirm errors are visible and the UI does not say a notification was delivered when only a local archive record was saved.
- Separate timing into: GPS acquisition; classifier/RPC; nearby polygon/map request; geofence calculation; post-result local archive save; Service Worker readiness; OS notification scheduling. State which components can be optimized.
- If possible, perform repeatable post-result timing measurements on an actual Android phone. If not, state **UNMEASURED**. Never infer a numeric benchmark from code inspection.
- Do not add a server request to the local display path unless absolutely necessary and supported by evidence.

### B. Archive and unread counter
- Verify `countUnreadNotificationArchive`, read-ID persistence, unique ID generation, and event names.
- Test same-tab custom events (native `storage` events do not fire in the tab that wrote the value), cross-tab updates, sort stability, duplicates, malformed JSON, quota/storage errors and browser refresh.
- Verify opening the archive marks only the currently displayed items as read. Check notices arriving while the archive page remains open: do they display and become read consistently, without stale badge state?
- Check truncation/retention of the read-ID list (currently designed to retain a bounded history). Could an old still-stored notice become unread again after its read ID is evicted?
- Check timestamp collisions and whether per-item read IDs correctly avoid the same-millisecond cutoff race.
- Confirm badge shows 1, 2, 3 … 99+, has an accessible screen-reader label, and refreshes when notices are written on the same page.
- Verify storage write failure doesn't silently pretend the notice is saved or the badge updated.

### C. Location persistence and route navigation
- Verify the saved result's schema validation, timestamp, expiry (24 hours), future timestamp rejection, malformed and partial data handling, and storage-blocked behavior.
- Verify the saved result is restored before an auto-location attempt can replace the display with a blank/loading state.
- Verify the previous place stays visible during automatic refresh, and only a valid fresh response replaces it.
- Verify explicit “Menya aho ndi” still starts a new device location request even if a cached location exists.
- Verify a failed refresh keeps the last-known display without implying it is fresh.
- Verify reset clears persisted result and the screen returns to the expected state.
- Verify route navigation restores the main location and related content; check whether active leader selection / expanded state matters and is lost.
- Check React Strict Mode / remount behavior and races between restore effect, persist effect, route transition, reset and an in-flight GPS request.
- Confirm UI visibly labels the restored item as last known with a useful original timestamp or age. If the timestamp is not displayed, report that gap.

### D. Service Worker / Android interaction
- Inspect install, activate, update, cleanup, registration, and notification click handling in `public/sw.js`.
- Confirm notification click opens the correct IWACU route and that its message invites the user to return.
- Identify whether PR #21's server push routes/tables/VAPID remain active, legacy, or unused after PR #22. Check whether subscriptions are still created anywhere. Do not assume server push wakes the browser if the client no longer registers subscriptions.
- Explain what happens while page is open, hidden, suspended, and fully closed.
- Do not propose hidden background location tracking or silent OS permission requests.

### E. Security and regressions
- Search for API keys, service role keys and private VAPID keys in client bundles, logs, tests or commits. Do not print secret values.
- Confirm notification and location localStorage never leaves this origin except through explicit user-authorized flows already present.
- Verify no changes weaken location accuracy gates or administrative/geofence rules.
- Check header links, archive routing, notificationclick routing, Kinyarwanda copy and mobile tap targets.
- Note every unused server API/schema artifact that may confuse future contributors; recommend cleanup only when safe and scoped.

## Verification

A known passing GitHub Actions run exists for PR #23 code head:
- Run #530: https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/42485862982
- Recorded successful stages: dependency install, ESLint, location/locate-protection tests, accuracy static gate, accuracy JavaScript guard, TypeScript, production build.
- Verify this run in GitHub rather than relying only on this note.

Run the current code checkout commands if you have an environment and permission:
- `npm ci`
- `npm run lint`
- `npm run test:location`
- `npm run check:no-accuracy-rejection`
- `npm run typecheck`
- `npm run build`

Vercel Preview for PR #23 was blocked by the Free plan daily deployment quota (`api-deployments-free-per-day`, >100/day). Do not upgrade the plan or trigger excessive builds. Distinguish this hosting failure from GitHub CI. No Production deployment of PR #23 is claimed.

Do not use Production credentials, read personal user data, change environment variables, run database migrations, write to Supabase, deploy, or merge. No secrets are required for this audit.

## Required report

Return these sections:

1. **VERDICT:** PASS / PASS WITH LIMITATIONS / FAIL.
2. What is correct and supported by evidence.
3. Every defect ranked P0 / P1 / P2, with exact file path and line numbers, reproducible steps, user impact and evidence.
4. Which of the owner's problems PR #23 fixes, partially fixes, or does not fix.
5. The notification target status: measured / estimated / unmeasured. Report actual values and device/browser details only if physically measured.
6. Exact recommended corrections, with a minimal patch or code snippet where helpful. Do not change the repository.
7. Test names and raw results; distinguish previously verified run #530 from any new rerun.
8. Physical Android tests still required, with tap-by-tap steps and expected outcomes.
9. Latest commit SHA examined and all GitHub/source evidence links.

Do not hide defects to reassure the owner. If the evidence is incomplete, say so. Do not say "all tests passed" unless current raw output proves it. Do not mark the PR ready for merge merely because CI passed; the owner requested an independent quality review too.
