# IWACU RWANDA: contact privacy and responsive sizing

**Date:** 16 November 2026  
**Branch:** `fix/iwacu-contact-privacy-responsive-20261116`

## Contact and privacy
- Removed the GitHub account/repository link from the public Contact page in Kinyarwanda, English and French.
- Kept the owner-provided support phone and email, including their tap-to-call and tap-to-email actions.
- Added a regression test to ensure the three Contact language versions do not expose a GitHub code link.

## Responsive sizing
- Added a modest responsive root scale for small phones, larger phones/tablets and medium tablets.
- Reduced the home hero title's minimum size so it no longer dominates narrow phone screens.
- Reduced information-page title sizing on phones and tablets while retaining larger desktop display sizing.
- Preserved the existing 44px minimum touch-target rule and the visitor's explicit accessibility text-size preferences.
- No location, boundary, leader, Ishakiro, database or service-worker behavior was changed.

## Release and verification boundaries
- Changes are isolated on this feature branch. `main` and the Production deployment were not changed.
- Do not report these changes as live until CI and a real-device visual check pass, the owner approves release, and the live Contact page is rechecked.
- The GitHub repository's current visibility is still **public**. This branch does not change repository visibility.
