# IWACU RWANDA — Location notifications and on-phone history

## Current implementation

- The first successful location result of the day triggers a welcome notification.
- When a user crosses confirmed administrative boundaries, the app can show exit/entry messages for the changed province, district, sector, cell and village levels.
- When supported by reported GPS accuracy, the app can show approach messages at 250 m, 100 m, 50 m and 5 m. It suppresses a distance warning when the GPS uncertainty is wider than the threshold.
- Notifications are written to the current phone browser's local archive first, then shown through the active Service Worker when OS notification permission is granted. The location-notification path does not wait for a server request.
- The archive at `/amenyesha` reads only the local phone-browser archive. It groups records by Rwanda local date and time.
- The header bell displays the number of unread local notifications. Opening `/amenyesha` marks the notifications currently on the phone as read.
- The archive is limited to the latest 500 notification records on that browser profile.
- The last successfully resolved place is kept locally for up to 24 hours so navigating away and returning does not blank the result. On return, IWACU starts a fresh location check and keeps the previous result visible until a new result arrives. “Ongera ushake” clears this saved result.

## Speed target and what is measured

The critical notification path now saves locally and calls the Service Worker directly; it no longer waits for a server archive write, remote visitor lookup, VAPID key fetch or server push response. The Service Worker is warmed up before the first location result when possible, and place-name index loading overlaps the boundary lookup.

The intended target is to display the phone notification within 500 ms after the app has already calculated and recognized the location event. This is a target, not a verified device measurement. Android/Chrome scheduling, Service Worker activation, GPS acquisition and boundary calculations can still take longer. No source-code or CI check can guarantee the OS will paint every notification in under 500 ms; that requires stopwatch/performance testing on real supported Android phones.

## Phone-only storage

The archive and unread/read state use browser storage on the same phone and browser profile. They are not uploaded or synchronized to the server by the active client flow. Clearing Chrome site data, uninstalling the browser or switching browsers can remove or separate that history. The old server archive / Web Push API and database objects remain in the repository as legacy infrastructure, but the active notification component no longer registers remote push subscriptions or sends notification events to those endpoints.

## Browser and background behavior

A website can watch device location while its page is active and can request a fresh location when the visitor returns to IWACU after previously granting permission. The browser's OS notification permission is separate from location permission.

A normal website cannot continuously obtain fresh GPS fixes after its page is suspended or closed. A local Service Worker notification can only be created after IWACU has received a location event while its code is running. Continuous Android tracking therefore still requires a separately installed Android application or native wrapper with an explicitly user-started location foreground service, Android location permissions, and a persistent system notification that informs the user location access is active. Android background location access must not be requested silently; the visitor must be able to stop tracking.

## Verification gates

- GitHub Actions must pass lint, unit tests, accuracy gates, TypeScript and Production build for each code PR.
- The unread-count utility has a unit test covering unread and read IDs.
- The archive and location-result persistence still require an actual Android navigation test: determine location, open `/amenyesha`, return home, confirm the previous place remains visible, and confirm a new result replaces it only when received.
- The unread badge requires a real-device test with several notifications, opening the archive to clear the count, then receiving one new notification.
- The under-500 ms target requires repeated timed measurements on real Android phones. Do not claim that target is met until those measurements exist.
- Notification permission, Service Worker display and Android OS notification settings must be tested on an actual device.
- This change does not implement GPS tracking after Chrome is fully closed.

## Historical server implementation

PR #21 introduced server-side archive and Web Push API infrastructure, its database migration and rollback, and documentation. PR #22 changed the active client to phone-only storage and local Service Worker delivery to avoid network latency. The server routes, tables and VAPID configuration remain available in source/configuration as legacy code and must not be described as the current active notification storage path.
