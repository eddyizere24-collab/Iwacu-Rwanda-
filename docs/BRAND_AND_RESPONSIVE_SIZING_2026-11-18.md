# IWACU RWANDA brand and responsive sizing update

Date: 2026-11-18
Status: Owner-selected concept 03 translated into a code proposal; not merged or deployed.

## Approved brand decision
- Use the third selected logo concept: a rising sun, calm horizon and the words “IWACU RWANDA”.
- No agaseke/basket imagery in the official logo.
- Keep Rwanda's national colours: green as the main wordmark/horizon colour, yellow for the sun, and a restrained blue accent.
- Preserve the site's existing Rwanda identity, photos, Imigongo details and page functionality.

## Responsive sizing reference
The owner asked IWACU to follow the compact scale reviewed on the ISOKO project, not to copy ISOKO's marketplace layout or brand:
- Header: 52px mobile / 58px desktop.
- Body baseline: 15px.
- Heading scale: approximately 18–24px, with compact line height.
- Main “Menya aho uri” action: 48px high, 15px label, restrained icon and shadow.
- Header icon controls retain at least 44×44px touch targets.
- Narrow-screen header logo reduces to about 126px wide.
- Keep responsive layout mobile-first; no horizontal overflow at 320–360px.

## Implementation scope
- Add reusable SVG-based IWACU RWANDA wordmark and app icon.
- Replace the header's basket/sun combination with the selected sun + wordmark lockup.
- Update app metadata and PWA manifest icon paths.
- Reduce the location action's visual weight without reducing its tap target.
- Add compact global heading and body sizing while retaining accessibility text-scale preferences.
- No location logic, leader data, authentication, database, environment, or Production deployment changes.

## Required verification before merge/release
- Run typecheck, build, existing accessibility and location tests.
- Capture and inspect 360×800, 412×915, tablet and desktop layouts.
- Confirm no horizontal overflow, clipped language/accessibility controls, or obscured header content.
- Verify the new app icon and logo assets load.
- Do not merge or deploy until checks pass and the owner authorizes release.
