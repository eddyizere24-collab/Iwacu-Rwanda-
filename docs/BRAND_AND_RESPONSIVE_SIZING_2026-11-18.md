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
- Header icon controls (bell, accessibility eye, language) are one identical, light 44×44px square: the touch-target minimum.
- Header (2026-11-19 update): the owner's logo 03 is a stacked lockup, so it is shown at 44-46px high on its own light plate; header is 60px mobile / 66px desktop.
- Keep responsive layout mobile-first; no horizontal overflow at 320–360px.

## Implementation scope
- Use the owner's logo 03 exactly as supplied (pixel crop of the owner's artwork in public/brand/; never redrawn or recoloured). It has a light background, so it always sits on a light plate (#FDFCF8).
- App icons (192, 512, maskable 512, Apple touch 180) are the same logo centred on the same light background.
- Replace the header's basket/sun combination with that logo.
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


## 2026-11-19 follow-up
- Accessibility panel is rendered on document.body (portal) because the sticky header uses backdrop-filter, which made it the containing block of the fixed overlay and clipped the panel. The overlay scrolls, so the whole panel is reachable at any zoom or text size.
- Language menu closes on outside tap or Escape (the old full-screen fixed click-away layer had the same header-clipping problem).
- Footer: links, support contacts and data/photo credits are kept, but collapsed into one small opener.
- Ishakiro: compact header; starter questions behind one closed-by-default row; it no longer jumps to full screen when the question box is tapped on a phone (the full-screen button remains).
