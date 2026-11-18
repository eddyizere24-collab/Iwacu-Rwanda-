# IWACU RWANDA brand and responsive sizing update

**Date:** 18 November 2026  
**Branch:** `design/iwacu-sun-wordmark-isoko-scale-20261118`  
**Status:** Draft implementation for owner review; no Production deployment.

## Brand decision
- Replaces the separate Agaseke + small sun header mark with the owner's selected third concept: one sunrise symbol, a green horizon, a fine Rwanda-blue line, and the IWACU RWANDA wordmark.
- No basket/agaseke imagery is used in the primary logo or header.
- Adds a compact SVG favicon and reuses it for the manifest and location-notification icon.

## Responsive sizing
- Reference inspected: the owner's live Isoko website at `https://isoko-marketplace-9i69.onrender.com` and its `ISOKO_VISUAL_SYSTEM_2026-11-15.md`.
- Borrowed only the compact sizing principles: approximately 15px base text on small phones, a 56–60px compact header, measured gutters/spacing, quiet borders and small headings.
- Preserves IWACU Rwanda's own colours: blue `#00A3E0`, yellow `#FAD201`, green `#20603D`.
- Reduces the location action from 64px to 48px while keeping the site's accessible touch targets.
- Reduces the home hero's top padding, wordmark area and title scale.

## Accessibility and preserved behaviour
- Uses rem-based type sizes so the existing 125%, 150% and 200% Accessibility text preferences continue to scale.
- Keeps the 44px minimum touch-target rule on header controls.
- No location detection, geofence, automatic movement updates, location archive, leaders, Ishakiro, database, authentication, or admin workflow was changed.
- This work is isolated on a branch. Do not merge, deploy to Production, change environment variables, or run Production SQL without owner release approval.
