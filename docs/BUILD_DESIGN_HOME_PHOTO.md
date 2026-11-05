# Design work order: calm, photo-led, professional home page (visual layer only)

Branch: `design/home-photo-hero` (from `main`). Read `docs/BUILD_BRIEF.md` hard rules first (no secrets, no Production actions, additive work, at most 3 pushes, commit format `[AGENT] area: what - why - next`).

## Owner's verdict on the current look
The site must feel like a calm, premium, institutional product, not a school project. Reference quality: photo-led landing pages with one strong full-width photograph, large elegant type, generous white space, very little text. Real photography only: NO drawn or illustrated stand-ins, NO clip-art icons used as decoration, NO mock-up images.

## Absolute limits
- Change the visual layer only: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/AppHeader.tsx`, the class names and wrapper elements in `src/app/page.tsx`, and new font/image setup.
- Do NOT change any text, wording, data flow, API route, location logic, leaders logic, authentication or database. Keep every existing string. Add NO new marketing copy or explanations.
- Do NOT assume the visitor wants a village; the existing flow (district, sector, cell, village) stays as it is.
- Light appearance only (the dark toggle is already removed).

## Photograph
- Use the existing Rwanda hills photograph (Bigogwe farms, Wikimedia Commons, CC BY 4.0; the footer credit already exists and must stay).
- Make it a full-bleed hero image behind the top of the page (not behind the whole page). Position it so hills and sky are both visible; tune `object-position` for 360 px phones and for 1440 px screens.
- Serve it efficiently: create optimised WebP files in `public/images/` (`rwanda-hills-960.webp` at most 150 KB for phones, `rwanda-hills-1920.webp` at most 260 KB for large screens) and select by width with `<picture>`/`srcset` or `next/image` with `priority`. If the source file cannot be downloaded in your environment, keep the existing Wikimedia URL for now and say so in the pull request.
- No `filter: blur` or `background-attachment: fixed` on full-screen layers (they stutter on low-end Android). If softening is wanted, bake it into the image or use a gradient overlay.
- Legibility: overlay gradients so that text over the photo reaches WCAG AA (4.5:1). Typical: top `rgba(10,35,45,.55)` to bottom `rgba(10,35,45,.15)` to the page background, tuned by looking at the screenshots.

## Typography
- Headings: an elegant display face loaded with `next/font` (suggest `Fraunces` for H1/H2, weights 600 and 700, latin subset, `display: swap`). Body and controls: `Inter` (already used). H1 `clamp(2rem, 6vw, 3.75rem)`, tight tracking, line-height 1.05-1.1, white on the photo.
- Body 16 px minimum on phones; controls 44 px minimum height.

## Colour (Rwanda)
Tokens: ink `#0E2A35`, forest `#20603D`, sky `#00A3E0`, sun `#FAD201`, paper `#F6FAF8`. Forest green is the primary button colour. Sky and sun are accents only: a thin three-colour line (sky, sun, forest) under the header and as small details, never large flat areas. White text over the photo, ink text on cards.

## Layout and components
- Header: slim, white at about 92 % opacity, hairline bottom border, the existing logo and help button. A 3 px three-colour line under it.
- Hero: photograph, the existing headline and sub-text over it, and the existing location controls placed in a clean card (white at 92 %, radius 20-24 px, soft layered shadow, 1 px border at white 40 %). `backdrop-filter` only from 768 px upward; on phones use the solid card.
- All existing cards (hierarchy boxes, leaders list, picker, report, privacy) get one consistent style: white, radius 18-20 px, subtle shadow, 16-20 px padding, no heavy borders, consistent spacing scale (4/8/12/16/24/32).
- Content width: single column on phones; from 768 px a centred container up to 1120 px; from 1280 px the hero text and card sit side by side where the existing structure allows.
- Subtle motion only: 250-300 ms fade-up on first paint, disabled under `prefers-reduced-motion`.
- Do not rely on brittle selectors such as `section[class*="bg-gradient-to-b"]`; replace them with explicit class names.

## Quality gates
- `npx tsc --noEmit`, lint, `npm run test:location` and `npm run build` all pass.
- Playwright screenshots at 360x740, 768x1024, 1280x800 and 1440x900 for: first screen, location result with candidates, the leaders section, the footer. Put them in the pull request. No horizontal scroll at 320-1440 px.
- Lighthouse mobile: performance 80 or better, accessibility 95 or better.
- Open a DRAFT pull request into `main`; do not merge. The reviewer will compare the screenshots before anything is released.
