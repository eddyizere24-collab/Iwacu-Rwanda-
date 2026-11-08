# IWACU RWANDA — Location notifications and history

## What this branch implements

- The first successful device location creates a welcome notification.
- Confirmed administrative transitions create separate exit and welcome messages for each changed level: province, district, sector, cell and village.
- Boundary approach messages use the supported 250 m, 100 m, 50 m and 5 m thresholds. A message is suppressed when reported GPS uncertainty is wider than the threshold.
- The notification archive page is available at `/amenyesha`, with a bell entry in the site header.
- The archive groups events by Rwanda local date and time, merges local and server history, de-duplicates by event ID and paginates server history.
- The browser keeps a local fallback archive. The server schema stores notification copy and delivery state, not raw coordinates.
- Notification history is scoped by a random visitor ID carried in a Secure, HttpOnly, SameSite cookie. The ID is not sent in a URL.
- Web Push subscription endpoints and encryption keys remain server-side and are inaccessible to anon/authenticated database roles.

## Browser and background behavior

A normal website can watch device location while its page is active and can attempt a fresh location lookup when the visitor returns to IWACU after previously granting location permission. The browser's OS notification permission is separate from location permission.

A website cannot continuously obtain fresh GPS fixes after its page is suspended or closed. Web Push can display a server-generated message while the page is closed, but it cannot independently discover that the phone crossed into another village.

Continuous Android tracking therefore requires a separately installed Android application or native wrapper with an explicitly user-started location foreground service, Android location permissions, and the persistent system notification that informs the user that location access is active. Android background location access is sensitive and must not be requested silently. The visitor must be able to stop tracking.

## Production release gates

This branch does not apply its database migration or configure VAPID credentials in Production. Before enabling server archive and push delivery in Production:

1. Review and apply `sql/migrations/20261108_01_location_web_push.sql` to the approved Production Supabase project only.
2. Configure valid VAPID public/private keys and a valid VAPID subject in the Vercel Production environment. Do not place private keys in source code or browser responses.
3. Verify subscription registration, event idempotency, notification archive reads, expired-subscription cleanup and delivery on supported Android browsers.
4. Verify that a notification can be opened to the archive page and that the archive remains available after closing and reopening the site.
5. Test on real Android devices and confirm the visible location-service consent and stop behavior before enabling continuous background tracking.

## Current verification notes

- The isolated notification database contract applies the migration, verifies RLS/grants/indexes/idempotency, inserts a test event and verifies rollback.
- Location engine CI also runs lint, location tests, accuracy gates, TypeScript and production build.
- A Vercel preview failure caused by the team's build-rate limit is not a successful preview deployment and must not be described as one.
- Passing GitHub CI does not prove that Production migration, VAPID setup, device push delivery or Android background tracking is live.
