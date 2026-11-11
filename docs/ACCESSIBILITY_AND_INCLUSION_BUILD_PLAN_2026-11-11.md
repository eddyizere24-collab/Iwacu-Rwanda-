# IWACU RWANDA — Accessibility & Inclusion Build Plan
**Date:** 2026-11-11  
**Repository:** `eddyizere24-collab/Iwacu-Rwanda-`  
**Baseline:** `main` at `5c9702c516af80be2526ece90f442e11a676a8f6`  
**Working branch:** `feature/accessibility-inclusion-20261111`  
**Production / deployment:** No production changes or deployment are authorized by this plan.

## 1. Product promise

IWACU must not leave residents behind because they cannot see, hear, read, write, use a mouse, afford mobile data, or reliably access a strong network. Accessibility is a core service requirement, not a decorative setting or a separate inferior version of the platform.

The normal IWACU experience must remain intact. New assistance should be optional, discoverable, privacy-respecting, mobile-first, and progressively enhanced. No location, leader, contact, sign-language content, or other public fact may be invented to fill an accessibility gap.

## 2. Current baseline reviewed

The live home page was fetched from `https://iwacu-rwanda-2.vercel.app/` with JavaScript-rendered page extraction. The main source files on `main` were reviewed: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/AppHeader.tsx`, `LocationButton.tsx`, `AiSearchAssistant.tsx`, `EmergencyStrip.tsx`, `HelpModal.tsx`, `MapPinPicker.tsx`, `VillagePicker.tsx`, `LocaleProvider.tsx`, `LanguageSwitcher.tsx`, and `public/sw.js`.

### Existing strengths to preserve
- The document language is set from the selected locale, and the platform supports Kinyarwanda, English, and French.
- The application has a semantic `main#main-content` landmark.
- The location action has a descriptive accessible name and exposes its busy state.
- The assistant's message area uses a polite live region; its expanded view has Escape handling, a keyboard focus loop, and focus restoration.
- Several controls already have accessible names, hidden decorative icons, visible focus styles, and live status/error messages.
- The global stylesheet establishes a 44 px minimum target baseline, and some animations already honor `prefers-reduced-motion`.
- The service worker caches the national location index; the village picker can use cached data offline.
- Emergency numbers are stored in the app and the emergency strip advertises offline availability.
- A non-map village picker exists, which is an important alternative to interacting with a map.

### Gaps and risks found in the source
1. **No skip link:** the layout provides `main#main-content`, but there is no first-focusable “Skip to main content” link.
2. **No user-facing accessibility controls:** no text-size setting, high-contrast mode, or dedicated low-data mode was found in the reviewed UI.
3. **Reading and writing barriers:** Ishakiro currently accepts typed text in a textarea. No microphone / speech-input control or read-aloud control was found.
4. **Sign-language gap:** no Rwanda Sign Language (RSL) video/help experience was found in the reviewed components.
5. **Dialogs need a shared accessibility pattern:** the expanded Ishakiro view has custom keyboard handling, but Help, Privacy, and Emergency dialogs declare dialog semantics without equivalent visible focus management, Escape behavior, and focus restoration in their current components.
6. **Location results need an explicit announcement contract:** the loading and error states are announced, but the success/result transition should be reviewed and given one clear screen-reader announcement without reading the entire result repeatedly.
7. **Map dependence risk:** map interaction is not a sufficient path for blind users or residents with limited dexterity. The list-based picker must remain a first-class, clearly discoverable alternative, and every drag action must have a non-drag alternative.
8. **Small secondary text:** several labels and source notes are rendered at 10–12 px. These need contrast, scaling, and readability checks at real mobile sizes.
9. **Touch target exceptions:** some component utilities specify 32 px or 40 px despite the global 44 px baseline. Review each interactive target and spacing; do not assume the global rule overrides more specific utility classes.
10. **Reduced motion is partial:** some animations are disabled, but the preference needs to cover all decorative movement and animated loading treatments consistently.
11. **Low-data limitations:** the offline location index and emergency contacts are useful, but map tiles and live AI requests still require connectivity. Photo backgrounds also add data cost. The UI must explain what remains available offline.
12. **Testing evidence is missing:** this was a source and live-content review, not a completed TalkBack, VoiceOver, keyboard-only, or WCAG conformance audit.

## 3. Build principles / non-negotiable safeguards

- Build on a feature branch. Do not merge to `main`, modify production Supabase, change Vercel settings, or deploy as part of this work without the owner's explicit release instruction.
- Preserve all existing location, leaders, emergency, notifications, and Ishakiro workflows.
- Do not make GPS, microphone, camera, notification, or audio permissions appear on page load. Ask only after a clear, user-initiated action, and explain why the permission is requested.
- Every voice interaction must also provide a visible text transcript and an editable/manual fallback.
- Never claim Kinyarwanda speech recognition or synthetic speech works until the target Android/browser combinations have been tested. Browser voice availability varies by device and installed voices.
- If a Kinyarwanda text-to-speech voice is unavailable, do not speak Kinyarwanda with an unrelated language voice. Use human-recorded, approved Kinyarwanda instruction clips for a small set of fixed guidance steps, or leave read-aloud unavailable with a clear explanation.
- Rwanda Sign Language content must be created or reviewed by fluent Deaf RSL contributors. Do not invent signs, use unvalidated avatars, or present auto-generated signing as authoritative.
- No audio-only critical information. Keep text, visible labels, transcripts, captions, and call numbers available.
- Do not hide essential content or reduce functionality in simplified/low-data modes. They change presentation and delivery, not access to services.
- Persist preferences locally and provide an obvious one-tap reset to the default IWACU appearance.

## 4. Proposed user experience

### A. Universal accessibility foundation
- Add a keyboard-visible skip link before the header and make the main landmark programmatically focusable.
- Give each page one clear `h1`, ordered section headings, named navigation landmarks, and descriptive form labels.
- Standardize dialog behavior in one reusable accessible-dialog pattern: move focus into the dialog, keep Tab/Shift+Tab inside, close on Escape where safe, restore focus to the opener, and prevent background interaction while modal.
- Announce only meaningful state changes: location found, location uncertainty, no result, network/offline state, message sent, and emergency sheet opened. Avoid duplicate or overly chatty live regions.
- Make the non-map list/picker available without first having to manipulate the map.
- Ensure focus remains visible and is not hidden behind sticky navigation, floating help, or the emergency strip.

### B. User-controlled display settings
Provide a small, clearly named “Korohereza gukoresha” / “Accessibility” control in a consistent location. The panel should contain:
- Text size: normal, large, extra-large, and maximum supported setting (up to 200%).
- High contrast: stronger text/background/border contrast without relying on color alone.
- Reduce movement: honor the operating-system preference and provide an in-app option.
- Low-data view: keep every existing IWACU photo and visual treatment. Reduce map tile fetching only after the visitor enables the setting; keep the map optional and the village-list alternative visible.
- Reset settings: return to the default presentation without clearing other user data.

All settings must work with keyboard and screen readers, be persistent on that device, and not change the default view for users who do not select them.

### C. Blind and low-vision access
- Test the whole core journey with Android TalkBack and at least one desktop screen reader.
- Make location status and final confirmed/estimated location readable in a concise order.
- Provide a text/list route for every map action; no essential task may require dragging, visual map reading, or color recognition.
- Check contrast against WCAG 2.2 AA: normal text 4.5:1, large text 3:1, and non-text controls/focus indicators as applicable.
- Support browser zoom and text scaling without clipped content, horizontal scrolling, or obscured controls.

### D. Deaf and hard-of-hearing access
- Preserve visible text for all notifications, instructions, and emergency information.
- Caption and transcribe every future instructional video.
- Add RSL instructional clips for the most important journeys only after Deaf community co-design and review. Start with: find my location, correct my location, find/contact local leaders, use Ishakiro, and call emergency services.
- Do not make sound or vibration the only signal for a notification or status change.

### E. People who cannot read or write comfortably
Create an optional “Uburyo bworoshye” / “Easy use” journey:
- Large, familiar action cards with both a clear pictogram and a short spoken/plain-language label.
- Three prominent first steps: “Menya aho uri”, “Bona abayobozi”, and “Baza Iwacu AI”.
- A guided one-step-at-a-time help flow with a visible “Subira” and “Funga” action.
- An explicit “Vuga ikibazo” microphone action, only where the device supports the requested locale. Show the recognized words before sending; the person can correct or cancel.
- An explicit “Soma igisubizo” action for supported text-to-speech voices, with pause/stop controls and no automatic audio.
- For fixed guidance in Kinyarwanda, prefer short human-recorded clips made with informed consent and community review when device TTS is not available.
- Keep all of these functions usable without voice, so someone in a noisy place or sharing a phone is not blocked.

### F. Rural, low-income, and low-connectivity access
- Add the opt-in low-data view; load maps only when requested and retain the location-list fallback.
- Keep the offline national location index and emergency numbers available, and test their cache lifecycle.
- Make offline status explicit: distinguish “available offline” from “requires internet”, especially for live Ishakiro answers and remote leader/contact refreshes.
- Keep the established photo design and every existing photograph. Low-data mode must not hide, remove, or replace photos; it reduces map tile requests only.
- Avoid large mandatory downloads, accounts, paid services, or new recurring vendor costs for essential access.
- Investigate an offline help bundle and carefully scoped offline leader directory only if the data can be verified, safely cached, and kept current.


## 4.1 Owner-approved visual guardrail

**The existing visual identity and photographs must remain.** The owner explicitly rejected removing or hiding photographs as a data-saving tactic. Keep the existing Bigogwe, Akagera, Volcanoes, tea, and gorilla imagery, the Rwanda palette, Imigongo details, hero treatment, and current service layout. Accessibility controls must be a small, quiet addition that does not crowd or redesign the header. New assistance appears only when a visitor turns it on, except the compact access control and its public information link.

The low-data preference is deliberately narrow: it adjusts Leaflet tile fetching and skips optional village-boundary overlay downloads after the visitor opens the map. It must not change photo visibility, crop, colour treatment, or the visual identity. Any future image optimization requires a separate review and must preserve the same photographs and visual result.

## 4.2 Implementation snapshot — 2026-11-11

Work has started on `feature/accessibility-inclusion-20261111`, based on `main` at `5c9702c516af80be2526ece90f442e11a676a8f6`.

Implemented in source on this branch:
- Keyboard-visible skip link and a focusable main landmark.
- Shared keyboard dialog behavior for Help, Privacy, Emergency, and the accessibility settings panel: initial focus, Tab/Shift+Tab containment, Escape to close, and focus restoration.
- One concise screen-reader announcement for the resolved location/estimate.
- A small eye-icon access control in the existing header; it opens a keyboard-accessible settings panel.
- Locally stored preferences for text scaling (100%, 125%, 150%, 200%), higher contrast, reduced motion, easy-use mode, and low-data map behavior. A reset control returns the presentation preferences to their defaults.
- An optional easy-use panel with large, labelled actions for location, local leaders, Ishakiro, emergency calls, and a direct text-based village picker. It does not replace the normal home page. The village list remains reachable during GPS lookup and in offline/error states; map interaction is optional.
- User-initiated speech input for Ishakiro where the browser exposes speech recognition. Recognized words remain editable, are announced to screen readers, and are never sent automatically. Voice controls stop recording when the assistant is minimized or closed.
- Read-aloud controls for AI answers only when a voice matching the actual answer language is installed; the code waits briefly for asynchronous browser voice registration and provides pause, resume, and stop. It does not substitute an unrelated language voice when a Kinyarwanda voice is unavailable.
- A public inclusion page at `/ubufasha-buri-wese`, linked from the footer and Help panel, included in the multilingual sitemap, with localized metadata and explanations in Kinyarwanda, English, and French. It explains that browser voice recognition may be processed by the browser/device provider and that IWACU only submits recognized text after the visitor selects Send.
- Automated unit tests for safe preference parsing plus source-contract tests for the skip link, stored settings, easy-use routes, user-controlled permissions, transcript review, language-matched speech, reduced motion, photo preservation, the public RSL disclaimer, and online/offline service labels. A dedicated GitHub Actions workflow runs these with existing regression tests, TypeScript, ESLint, and a build without deployment.

Not yet complete or verified:
- Rwanda Sign Language videos. The public information page explicitly says these are being prepared and reviewed with Deaf RSL users; no invented or unreviewed signing is presented as available.
- Human-recorded Kinyarwanda help audio.
- Real-device TalkBack, keyboard-only, contrast-ratio, 200% reflow, and low-connectivity sessions. CI validates the source, but this manual device matrix is still required.
- Automated axe-core scans and complete review of every component and route.
- Latest successful GitHub Actions run: [Accessibility and inclusion checks #43007836911](https://github.com/eddyizere24-collab/Iwacu-Rwanda-/actions/runs/43007836911), commit `e59923f7e0b05ed9e5b7441f05e898a86e5a0a66`. Accessibility preference + source-contract tests, location/assistant regression tests, TypeScript, ESLint, and the production build all passed. This is CI evidence only; it does not replace TalkBack, browser, screen-reader, contrast, reflow, or low-connectivity testing.

The working branch is not merged to `main`. No production database or Vercel settings were changed by this work, and no Production release is authorized. The linked Vercel automatic check for this branch has separately reported the account's `build-rate-limit`; no preview/Production build is being claimed.


### Additional low-connectivity and QA safeguards

The optional Easy-use service cards now state which journeys require internet and which phone-cached options may work offline. They distinguish:
- The saved village list, which can work offline only when its data was cached on the phone.
- Current leader information and Iwacu AI searches, which need internet.
- Emergency phone calls, which do not require internet data, although the mobile telephone network and a working phone service are still required.

The source-contract tests deliberately check that these limitations remain explicit and that all existing photo references remain in the design. They are regression guards, not a substitute for manual user testing.

## 5. Delivery phases

| Phase | Scope | Acceptance evidence |
|---|---|---|
| 0 — Baseline | Map the core journeys; add automated accessibility checks and a manual test checklist. | Baseline report; no regressions in existing location, leaders, emergency, and Ishakiro tests. |
| 1 — Foundation | Skip link, heading/landmark fixes, accessible dialog behavior, announced results, focus visibility, touch-target review, complete reduced-motion support. | Keyboard-only journey passes; modal focus/escape/restore checks pass; axe scan has no critical/serious violations on core pages. |
| 2 — Access controls | Text size, high contrast, reduced movement, low-data view, persistent preferences and reset. | Settings are reachable by keyboard/TalkBack, persist across reloads, and do not break normal layout at 200% text scale. |
| 3 — Voice and easy use | User-initiated speech input, transcripts, read-aloud where the requested language voice exists, human-recorded Kinyarwanda help where needed, simplified guided journey. | Device/browser capability matrix; tests for unavailable voice, denied permission, cancellation, transcript editing, pause/stop, and manual fallback. |
| 4 — RSL content | Co-designed, reviewed RSL clips, captions, transcripts, and poster fallbacks for core journeys. | Approval from fluent Deaf RSL reviewers; every clip has text/caption alternatives and no essential information is video-only. |
| 5 — Low-connectivity validation | Offline and low-data audits on entry-level Android devices and constrained mobile data. | Core location and emergency routes verified offline; clear network labels; measured bundle/image transfer reductions. |
| 6 — Release readiness | Community usability sessions and WCAG 2.2 AA-focused review across the critical journeys. | Findings resolved or explicitly documented; owner release approval before production rollout. |

## 6. Testing matrix

Test the following critical journeys rather than checking only the home page:

1. Open IWACU and identify the three main service actions.
2. Find a location with GPS permission already granted.
3. Find/correct a location without a map, mouse, or drag gesture.
4. Read the returned location and distinguish a confirmed result from an estimate.
5. Find a local leader and use the call/contact action.
6. Open emergency numbers and initiate a phone call.
7. Ask Ishakiro a question, receive an answer, and continue the conversation.
8. Change language and accessibility preferences; reload and verify persistence.
9. Repeat the essential location/emergency steps with no network.

Required methods:
- Android Chrome with TalkBack; Android touch-only use on an entry-level device.
- Keyboard only (Tab, Shift+Tab, Enter, Space, Escape) on desktop.
- Browser zoom and 200% text scaling; narrow viewport / reflow.
- Color contrast measurements and automated axe-core scan.
- Manual review of modal focus, status announcements, input labels, image alternatives, and visible focus.
- Test voice features separately on browsers/devices that actually expose Kinyarwanda recognition or speech voices; record unavailable combinations honestly.

## 7. Definition of done

IWACU is ready to call inclusive only when a resident can reach the essential location, local-leader, and emergency services without being forced to read small text, type a sentence, drag a map marker, hear audio, see color distinctions, or maintain a fast/paid internet connection. Assistive modes must preserve the normal service and verified data. Accessibility claims must be backed by test evidence, not by the presence of ARIA labels or a toolbar.

## 8. References

- W3C, Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/
- W3C WAI, WCAG 2.2 additions: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- W3C WAI, clear and understandable content (supplemental cognitive accessibility guidance): https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/
- W3C WAI, accessibility principles: https://www.w3.org/WAI/fundamentals/accessibility-principles/
