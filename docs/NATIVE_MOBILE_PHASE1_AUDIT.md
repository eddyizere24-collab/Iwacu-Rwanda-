# IWACU RWANDA Native Mobile App — Phase 1 Feasibility Audit

**Date:** 2026-11-26  
**Status:** Phase 1 audit only. No application code, website code, Production configuration, Vercel settings, or Supabase data were changed.  
**Repository:** [eddyizere24-collab/Iwacu-Rwanda-](https://github.com/eddyizere24-collab/Iwacu-Rwanda-)  
**Audited base:** `main` at `0fca0ea6f7bd67bbc3cf1ab83284527091dc80a0`

## 1. Product requirement (owner direction)

Build a **real native mobile application**, with independently implemented native screens and navigation for Android and iOS.

- Do not convert the website into a WebView wrapper.
- Do not treat the existing PWA as the requested mobile application.
- Keep the existing website and its current release process intact.
- Reuse existing backend services and data contracts where safe; do not copy or migrate the Production database.
- The mobile app must support real device capabilities when appropriate and permitted by Android/iOS: location, camera, media/files, notifications, secure credential storage, biometric unlock, sharing, and offline behavior.
- No Production deployment, schema mutation, Vercel setting/environment change, or public store submission without explicit owner approval.

## 2. What exists in the repository today

### Existing web application

The default branch is a TypeScript project using:

- Next.js `15.1.0`, React `19.0.0`, TypeScript `5.7.2`.
- Supabase JS/SSR for backend and authentication integration.
- Turf.js for geospatial calculations.
- Existing AI dependencies and Next.js API routes.
- A root `package.json` with web-specific scripts and dependencies.

The existing API route groups include administrative units, AI routing, emergency information, health, map/ikarita, Ishakiro, leader directory, leaders, locate/location context, location feedback, push, remote agent, and report number.

This is a useful backend foundation, but the API/authentication contracts must be audited before the mobile client consumes them. In particular, mobile-safe authentication, token handling, rate limits, and server-only secrets must be verified; service-role secrets must never enter the mobile binary.

### Existing PWA is not a native app

The repository has `public/manifest.json` and `public/sw.js`, including standalone display and offline behavior. That is an installable web-app path, not the native Android/iOS product requested by the owner. It will remain separate and unchanged.

### Native application scaffold: not found on the audited main branch

The root tree and `package.json` contain no native app scaffold or dependencies for:

- `expo`
- `react-native`
- `android/`
- `ios/`
- `app.json` / `app.config.*`
- `eas.json`

Branch-name searches found no existing Expo, Android, iOS, or native-app implementation branch. A branch named `fix/mobile-data-location-20261107` exists, but its name alone does not establish that it contains a native app; it requires separate inspection before reuse.

## 3. Candidate architecture

**Recommended candidate for the next decision gate: Expo + React Native + TypeScript + Expo Router.**

This is a native UI/application approach, not a WebView wrapper. It fits the repository's existing TypeScript/React skills and lets the mobile app have its own screens, navigation, lifecycle, native permission handling, and device integrations.

Suggested isolation:

- Keep the existing Next.js website at the repository root.
- Add a separate mobile application directory (proposed: `apps/mobile/`) with its own app configuration, dependencies, navigation, assets, tests, and build profiles.
- Initially consume existing Next.js API endpoints over HTTPS.
- Extract only verified, platform-neutral TypeScript contracts into a shared package when justified.
- Do not move the web UI into React Native, rewrite the website, or modify Production backend behavior as part of the mobile bootstrap.

Potential native modules, selected only after feature-level review:

- Location and foreground/background location: Expo Location.
- Camera and media selection: Expo Camera / Image Picker.
- Push/local notifications: Expo Notifications.
- Secure tokens and local secrets: Expo Secure Store.
- Device unlock: Expo Local Authentication.
- File access and sharing: Expo File System / Sharing.
- Background jobs and offline storage: evaluate per Android/iOS capability, battery policy, privacy, and permission constraints.

No application feature should claim unrestricted access to a phone. Android and iOS enforce different permissions and background-execution limits; each capability needs explicit permission, a clear fallback, and device testing.

## 4. Can ChatGPT and Claude work with this choice?

### ChatGPT / GitHub control

The current GitHub connection can read repository files, create isolated branches, commit files, open pull requests, inspect CI status, and retrieve workflow logs/artifacts. That is sufficient to maintain native TypeScript source through GitHub and review automated test results.

GitHub Actions can run the project checks. Expo's GitHub Action can authenticate with an `EXPO_TOKEN` secret and invoke Expo CLI / EAS CLI for builds or updates.

**Important setup dependency:** the repository currently has no Expo project link or `EXPO_TOKEN` secret verified. The owner must create/authorize the Expo account and add the token as a protected GitHub Actions secret when the project is ready. Never commit the token to source code or place it in chat.

### Claude collaboration

There is no direct Claude execution/connector available inside this ChatGPT session. Collaboration can still be coordinated through shared GitHub branches, commits, pull requests, and review instructions so Claude can inspect the same source and leave review feedback when given the PR/repository. This is shared-repository coordination, not an automatic direct ChatGPT-to-Claude session.

## 5. Build and cost feasibility

Expo's current Free plan lists up to **15 Android builds and 15 iOS builds**, a low-priority queue, and 60 minutes of CI/CD workflow usage. This can support a careful early build/test cycle if the quotas remain sufficient. Builds have **not** been triggered during this audit.

Expo Build can create installable Android and iOS artifacts in the cloud and can be triggered from CI/GitHub. This avoids requiring the owner to operate a Mac or run a terminal for every build.

Distribution constraints are different by platform:

- **Android:** an installable APK can be generated for private testing and installed directly on an Android device. Full public distribution on Google Play currently requires a Play Console developer registration fee of **US$25 one time**. Google also documents a separate limited-distribution option with no registration fee and a 20-device limit; that is not the same as public Play Store distribution.
- **iPhone:** an iOS Simulator build can be created without an Apple Developer membership, but it is not installable on a physical iPhone. Installing on a physical iPhone through ad hoc/development distribution and publishing to the App Store require a paid Apple Developer Program membership, currently **US$99 per year**.

These store/account charges are external platform requirements, not charges imposed by the mobile app code. No account signup, payment, build, or store submission was made.

## 6. CI and repository safety observations

- Existing GitHub workflows validate web, location, Ishakiro, accessibility, and related contracts. No Android/iOS build workflow exists on the audited main branch.
- The latest audited `main` commit is `0fca0ea6f7bd67bbc3cf1ab83284527091dc80a0` (2026-11-26 05:36:54 UTC).
- The combined status endpoint returned a single `Vercel` status of `failure` for that commit. This is not evidence of a native build failure; there is no native build workflow yet. Do not interpret it as a successful Production release.
- All future mobile work must be isolated from `main` and must not trigger Vercel production deployment. Native-only paths and branch filters should be used for mobile CI.

## 7. Required checks before locking the technology

1. Independently review this audit and proposed Expo/React Native architecture (including Claude review via GitHub).
2. Inspect existing API/authentication contracts for mobile-safe use, especially locate, Ishakiro, leaders, notifications, and user/session handling.
3. Inspect the existing `fix/mobile-data-location-20261107` branch to establish whether it contains reusable work or only web/mobile-browser changes.
4. Define the minimum native feature matrix and device permission behavior for Android and iOS.
5. Verify Expo account/project access and the protected GitHub secret path before any cloud build.
6. Add a mobile-only CI workflow that runs static checks and tests without deploying the website.
7. Produce an Android internal APK and an iOS Simulator build as the first build proof. Physical iPhone installation is a separate gated step requiring Apple signing membership and device registration.
8. Only after those checks pass, confirm the final architecture and begin implementation. Store submission remains a separate owner-approved release.

## 8. Phase 1 conclusion

Expo + React Native is the strongest candidate found so far because it provides a real native application, TypeScript/React alignment with the existing repository, native device modules, and cloud builds integrated with GitHub/CI. It is **recommended, not yet frozen** until the API/security review, Claude review, and build-control checks above are complete.

**No native code or Production systems were changed in Phase 1.**
