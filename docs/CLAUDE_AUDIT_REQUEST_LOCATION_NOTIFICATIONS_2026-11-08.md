# Claude AI audit request — IWACU RWANDA location and notifications

**Date:** 2026-11-08  
**Repository:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-  
**Production URL:** https://iwacu-rwanda-2.vercel.app/  
**Open follow-up PR:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/24

## Your assignment

Act as a senior Next.js / React / browser geolocation / Android Web Push / Supabase security reviewer. Audit the actual repository and the merged and unmerged changes below. Do not simply approve the intended design. Find defects, race conditions, privacy problems, stale state, broken UX, and performance bottlenecks. Be strict and evidence-based.

The owner trusts this review and is emotionally invested in the result. Be respectful and direct. Do not hide defects to be encouraging.

## Repository state to inspect

1. PR #21 — merged initial location notifications and archive:
   - Merge: `f03e8a26baf9e5ead0846d1c78b927285ce9f64b`
   - https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/21

2. PR #22 — merged local-first notifications and phone-local archive:
   - Merge: `d3536803bbb2500f3874633e026c60e150e0c414`
   - https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/22

3. PR #24 — open follow-up for persisting the last place and unread count:
   - Branch: `fix/persist-location-and-notification-badge`
   - Review the latest head commit shown by GitHub, not an earlier commit.
   - https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/24

4. Read the change ledger:
   - `docs/LOCATION_NOTIFICATION_CHANGELOG_2026-11-08.md`

5. Main files to inspect, plus every relevant caller, test, helper, and Service Worker:
   - `src/hooks/useLocation.ts`
   - `src/app/page.tsx`
   - `src/components/LocationChangeNotifications.tsx`
   - `src/components/AppHeader.tsx`
   - `src/app/amenyesha/page.tsx`
   - `src/lib/notification-archive.ts`
   - `src/lib/geofence-monitor.ts`
   - `src/lib/administrative-transition-messages.ts`
   - `public/sw.js`
   - `src/app/api/push/**`
   - `src/lib/location-ui-contract.test.ts`
   - `.github/workflows/location-engine-checks.yml`

## Owner's exact problems

The owner reports these defects from actual use:

1. Location notifications arrive late, or sometimes do not arrive at all.
2. After IWACU shows the person's location, the phone should show a system notification almost immediately. Target: ideally under 500 ms measured **from the moment the location result is already available**, not from the initial GPS tap. Do not pretend GPS/RPC/boundary calculation itself can always complete in 500 ms.
3. The bell in the site header must show how many new notifications are waiting: 1, 2, 3, and so on. The count must update when a new local notice is added, remain after route navigation, and clear when the user has read the archive. New notices after opening the archive must count again.
4. A user navigates to another page inside IWACU and then returns to the home page without moving. The previously displayed location and related results must remain visible. The current page must not start a fresh location lookup and replace the result with a loading screen just because the route was revisited.
5. A user may deliberately tap “Menya aho ndi” to request a fresh location. That action should update the saved result only when a valid new result has actually been computed.
6. The notification must encourage the user to tap it and return to IWACU to see current information. The notification click should open the correct site page.
7. Keep the UI simple and mobile-first. Do not add large new dashboards, popups, or unrelated features.

## Design choices that must be preserved

- Notification history and the last displayed successful location result should be kept on the user's phone/browser storage, not moved into a new server archive or third-party tracker.
- Local device storage is not the same as native Android app storage. State exactly what happens if the user clears Chrome/site data, changes browser, or uses another phone.
- Do not invent a universal guarantee that a browser can read GPS after Chrome is closed. Continuous background GPS when the browser is closed requires a native Android foreground location service and explicit OS permissions; it is outside this web-only change.
- The user wants the app to show a real system notification on an Android phone, not only a message inside the website.
- Preserve existing accurate location classifier behavior. A cached previously confirmed result may be restored as the *last known result*, but never relabel it as a new GPS measurement or as a newly verified fix.
- Do not regress current GPS accuracy handling, supported hierarchy, boundary-confidence checks, or village/administrative transition rules.

## Required audit questions

### A. Notification speed and reliability
- Trace one notification from successful location result through local archive save, permission check, Service Worker readiness, and `showNotification`.
- Identify every awaited operation and every network request on this path.
- Confirm whether a welcome/system notification occurs on every successful location action or only once per day. Is that consistent with the owner's expectation?
- Identify exactly why no banner is shown if permission is denied/default, Service Worker is installing, browser tab is hidden, or phone power/battery restrictions apply.
- Determine whether calling `navigator.serviceWorker.ready` can block this path and whether the registration is already active when the location result appears.
- Verify that failures are visible and do not silently count as successfully delivered.
- Measure/estimate the **post-result** time separately from GPS, RPC, map boundary fetch, and geofence computation. Propose practical improvements.
- Do not reintroduce server/network waits to the active-page local-notification path without proving that they are necessary.

### B. Local archive and badge count
- Check that local notices are saved before the badge updates.
- Check same-tab updates (a browser `storage` event does not fire in the same tab that writes localStorage), other-tab updates, ordering, duplicates, malformed JSON, quota errors, and timestamp collisions.
- Check whether a new notification can be accidentally treated as already read because `createdAt` and last-seen timestamps occur in the same millisecond.
- Check whether opening the archive marks the right items read and whether items added while the archive page is open appear without a stale page.
- Verify the badge displays 1, 2, 3 … 99+ and has an accessible label.
- Recommend whether a monotonic sequence or per-item read marker is safer than a timestamp cutoff. If current design is unsafe, propose or implement the smallest robust fix.

### C. Location state persistence
- Verify that a valid previous result survives navigation to another route and returning to `/`.
- Verify that the first client hydration does not overwrite saved data with the initial `idle` state.
- Verify that auto-location does not run when a valid result is already saved, while an explicit user tap still runs a new location attempt.
- Verify `reset()` removes persisted state.
- Check malformed/partial storage, storage quota errors, older saved payload schemas, and storage blocked by the browser.
- A restored result must be marked as last known (with its original time if practical); it must not be described as a newly measured location.
- Check whether active leader selection, displayed results, or other state that matters to the user is lost after route navigation.

### D. Service Worker and Android
- Inspect `public/sw.js`, registration and activation, notificationclick routing, Android Chrome behavior, and permission checks.
- Confirm that clicking the notification opens IWACU's home page and the reminder copy is clear.
- Explain what happens when the page is closed. Do not claim background GPS or a new Web Push subscription exists if the code no longer registers one.
- Identify any conflict between PR #21 server-push features and PR #22 local-only choice. Remove unused/confusing code only if safe, with evidence.

### E. Regressions and security
- Check no API keys or private VAPID secrets are exposed to client code or logs.
- Check localStorage data is scoped to this browser origin and is not sent to a third party.
- Check new code has not weakened the location accuracy or administrative boundary rules.
- Check no other route or shared layout regression was introduced.
- Check Kinyarwanda text, page navigation, and Android touch targets.

## Verification you must perform

Run the real project commands from the current branch:

- `npm ci`
- `npm run lint`
- `npm run test:location`
- `npm run check:no-accuracy-rejection`
- `npm run typecheck`
- `npm run build`

Also inspect the actual GitHub Actions run and Vercel status. A missing/pending/cancelled check is not a pass. Vercel preview deployment may be blocked by the free daily deployment quota; report that honestly. Do not upgrade plans or incur costs.

Do not use Production credentials or query personal user data. Do not modify either Supabase project. In particular, **never touch** the legacy Supabase reference `agwfnpwootwsgsdeohcd`. The only production project previously authorized for IWACU is `buexgewxypvkqmphvfec`, but this audit should not need to change the database.

## Requested output

Return:

1. **VERDICT:** PASS / PASS WITH LIMITATIONS / FAIL.
2. A concise summary of what is correct.
3. Every defect, ranked P0 / P1 / P2, with exact file path, line numbers, reproduction steps, user impact, and evidence.
4. Which defects PR #24 fixes and which it does not.
5. Whether the user's under-500 ms post-result target is technically met, measured, estimated, or still unverified. Never invent a measurement.
6. Exact fixes to make, with a minimal patch if practical. Do not change production or merge a PR.
7. Exact test commands and raw pass/fail results.
8. Physical Android tests still needed, clearly separated from CI tests.
9. The latest commit SHA reviewed and all evidence URLs.

If you find a real defect, do not conceal it or mark the work as passed. Explain the cause and the safest correction. Never say “all tests passed” unless the actual raw results prove it.
