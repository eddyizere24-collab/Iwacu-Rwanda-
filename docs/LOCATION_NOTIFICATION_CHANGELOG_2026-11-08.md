# IWACU RWANDA — Location and notification change log

**Date:** 2026-11-08  
**Repository:** `eddyizere24-collab/Iwacu-Rwanda-`  
**Production Supabase project:** `buexgewxypvkqmphvfec` (the legacy `agwfnpwootwsgsdeohcd` project must never be used)

This record separates merged code changes from checks that have and have not been proven on a physical Android phone.

## PR #21 — First location notification release

- **PR:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/21
- **Merge commit:** `f03e8a26baf9e5ead0846d1c78b927285ce9f64b`
- Added the first-use welcome notification after a location result.
- Added administrative exit/entry notices and GPS-accuracy-aware village boundary approach notices.
- Added the notification archive page, local browser archive, visitor-scoped server archive endpoints and bell navigation.
- Added private push subscription / event tables and RLS protections in Production Supabase.
- Recorded checks included successful build/type checks and a production archive-page read with an anonymous HttpOnly visitor cookie.

**Limits:** That browser test did not prove actual notification banners on a physical Android device. A web page cannot obtain continuous GPS after Chrome is closed; native Android foreground location tracking was not implemented.

## PR #22 — Local-first, faster active-page notifications

- **PR:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/22
- **Merge commit:** `d3536803bbb2500f3874633e026c60e150e0c414`
- Changed the archive to use this phone's browser storage, not a remote server archive.
- Removed the server network request from the active-page notification display path: save locally first, then show through the Service Worker.
- Started the place-name index lookup alongside village-boundary lookup.
- Started administrative notices together rather than serially with a 180 ms pause.
- Notification wording invites the visitor back to IWACU.

**Limits:** The phone archive is local to this browser profile. Clearing browser/site data may delete it. The source of a location/boundary event can still take time to calculate, and Android/Chrome scheduling means a universal <500 ms OS banner cannot be promised. The app's new flow does not register fresh remote push subscriptions; therefore do not claim that these local notifications wake a closed browser.

## PR #24 — Keep the last place visible and show unread counts

- **PR:** https://github.com/eddyizere24-collab/Iwacu-Rwanda-/pull/24
- **Branch:** `fix/persist-location-and-notification-badge`
- **Latest source commit at time of this note:** `ac881a5d0aa5ae4aa74c598ce9ca87cd76361ed8` (the branch also contains the changelog and Claude audit brief commits)
- Stores the last successful, classifier-confirmed location result in this device's browser storage.
- Restores that result when the home page is opened again.
- Skips automatic GPS refresh on return when a valid saved result exists; the visitor can still choose “Menya aho ndi” to request a fresh result.
- Adds a red numeric badge for unread local notifications to the header bell (1, 2, 3 … 99+).
- Clears the unread count when the archive is opened.
- Sends an in-page event so the header count refreshes immediately after a new notice is saved.

**This PR is not yet merged into main.** The first test run (#531) exposed a static contract that prohibited all `localStorage.getItem` in the location hook. The contract was updated narrowly to continue forbidding IP-based or inferred guesses while explicitly allowing restoration of a previously successful device result. The next run (#532) was cancelled after another branch update, so there is no current complete CI pass recorded for the latest head. Vercel reported the free deployment/build-rate limit for the Preview check. Do not describe PR #24 as released until a fresh CI run passes, it is merged, and Production is confirmed to be serving the merge commit.

## Required physical-device verification

On a real Android phone and the Production URL, record the exact device/browser version and check:

1. Give IWACU location and notification permissions.
2. Tap “Menya aho ndi”. Record elapsed time from the place result appearing to the system notification being visible.
3. Confirm the notice is in the local archive and the bell increments.
4. Open the archive; confirm the badge clears. Generate another notice; confirm the badge increments again.
5. Navigate to another page and return home without moving; confirm the last displayed place remains and no automatic “Turimo gushaka aho uri…” screen replaces it.
6. Tap “Menya aho ndi” explicitly; confirm a fresh lookup begins and then updates the saved place.
7. Repeat with notifications denied, browser offline, GPS accuracy wide/poor, and Service Worker not yet ready. The UI must fail visibly but gracefully and must not claim a banner was delivered if it was not.

A recorded CI pass is not a substitute for these device tests. Do not print API keys, service-role keys, private VAPID keys, or personal coordinates into GitHub comments.

## Current engineering caveats for reviewers

- Confirm that the saved result schema is validated before restoration and that reset removes the saved result.
- Confirm that returning to the home page does not overwrite the saved result with an initial idle state or trigger a background auto-locate.
- Confirm badge counting handles timestamps, storage events, and the same-tab custom event without double counting.
- Confirm archive opening marks only the currently stored notices as read and that new notices after opening still increment the count.
- Confirm no UI state from a prior page is incorrectly presented as a new GPS fix.
- Measure notification latency from result computation separately from GPS/RPC/boundary-calculation time.
- Check permission denial, service-worker readiness, Android battery restrictions, and app/browser suspension.
- Do not introduce a remote location archive or third-party user tracking. The owner chose on-device location/notification storage.
