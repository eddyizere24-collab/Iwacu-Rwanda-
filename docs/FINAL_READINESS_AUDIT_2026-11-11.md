# IWACU RWANDA — final readiness audit

**Review date:** 11 November 2026  
**Working branch:** `feature/ishakiro-part-1-continuation-20261109`  
**Code baseline at review:** `0a6426a182db7dee12ed62ca00835bc0eaf055c7`  
**Production release:** not performed by this work

## Completed in the current implementation scope

- Seven public information pages exist: About, How IWACU Works, Rwanda's Administrative Structure, Data Sources and Boundaries, Privacy Policy, Contact, and Terms.
- Each page has Kinyarwanda, English and French content.
- Contact details supplied and authorised by the site owner are published in the global footer and Contact/Privacy pages in all three languages:
  - Phone: `+250792053086`
  - Email: `izereeddy244@gmail.com`
- Footer actions use `tel:` and `mailto:`; the Contact page has matching tap-to-call and tap-to-email links. The Privacy page identifies the supplied support email as a contact for privacy requests and tells visitors not to send passwords or identity numbers.
- The previous wording that claimed no public support contact existed has been removed from the three language versions of the Contact and Privacy pages.
- Automated tests now check the phone and email on the Contact and Privacy pages in all locales, and check that the direct call/email links exist in each localized Contact page.
- Sitemap review date updated to 11 November 2026.
- SEO foundations are in place: page metadata, canonical URLs, language alternates, sitemap, and robots rules excluding admin/API routes.
- AdSense remains gated off by default. No publisher ID or ad-slot ID has been fabricated. The ad code is suppressed for the Kinyarwanda interface and editorial-only placements do not appear on maps, location, leaders, Ishakiro, emergency, privacy, contact, terms or admin screens.
- `/ads.txt` is configured to return 404 until a real AdSense publisher ID is supplied, rather than publishing a fake record.

## Verification and evidence

- GitHub read-backs confirmed the contact details in the branch content, footer and page links.
- The branch contains the updated automated contact tests and the dated handoff notes.
- The last previously verified full CI pass was on commit `5872986a66bdf2f0cd1809dc5e6d8d353cf46328`: 197 assistant tests, 138 location/UI tests, 5 calibration tests, TypeScript, ESLint, and the Next.js production build passed. This prior result does not cover the contact changes made on 11 November.
- For the latest contact-update commit `0a6426a182db7dee12ed62ca00835bc0eaf055c7`, the GitHub combined-status endpoint returned no status entries. A fresh Actions result for that exact commit has therefore not been confirmed in this audit.
- No live Vercel Preview or physical-device visual test was completed for these latest changes.

## Items that remain before calling the whole site ready for public launch

1. **Latest CI:** obtain a fresh successful GitHub Actions run for the latest code, including the new contact assertions.
2. **Visual QA:** review the pages and footer on a real 360px phone, tablet and desktop. Confirm that the contact links are easy to tap and the footer remains compact.
3. **Vercel access and analytics:** the connected Vercel workspace showed the `ahabona` team and zero accessible projects. The project ID in the earlier handoff could not be retrieved under that team. The repository's `package.json` also does not contain `@vercel/analytics`. Traffic tracking and actual pageview totals are therefore not confirmed.
4. **Privacy/legal review:** the supplied phone and email now provide support channels, but the full legal identity of the data controller, any required business/office address, retention periods, provider agreements, security settings, and the process for handling privacy requests still need owner/legal review.
5. **AdSense eligibility:** Google's current supported-primary-language policy lists English and French but does not list Kinyarwanda. Because IWACU is Kinyarwanda-first, the site may not qualify even though ad code is suppressed in the Kinyarwanda interface. Google site approval cannot be promised. Review the official policy and consider a network that accepts Kinyarwanda or direct sponsorships if AdSense eligibility does not fit the site's language.
6. **Consent and approval:** do not enable ads until Google approves the site, the real publisher and slot IDs are supplied, the privacy policy is updated for the active ad configuration, and an appropriate certified CMP is configured for personalised ads to visitors in the EEA, UK or Switzerland.
7. **Traffic and revenue:** do not estimate income from guessed visitors. Use verified pageviews, ad impressions, Page RPM and actual hosting/database/AI/domain costs once analytics access is available.

## Release guardrails

- Keep the work on this feature branch until all checks and QA are complete.
- No merge to `main`, Production deploy, Vercel environment change, AdSense activation or Production Supabase SQL was performed or authorised by this audit.
- Do not describe the public site as updated until a release has been explicitly approved and the resulting live URL has been checked.
- Do not report the site as 100% launch-ready while the exact-commit CI, visual QA, analytics access and legal/AdSense reviews above remain open.

## Official policy references

- Google unsupported-language policy: https://support.google.com/publisherpolicies/answer/10436912
- Google privacy disclosures for publishers: https://support.google.com/adsense/answer/10502938
- Google certified CMP requirement for personalised ads in the EEA, UK and Switzerland: https://support.google.com/adsense/answer/13554116
