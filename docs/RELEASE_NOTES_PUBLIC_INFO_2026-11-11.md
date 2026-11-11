# IWACU RWANDA — public information pages release

**Date:** 11 November 2026  
**Target base:** `main` at `820749782b03434a36b0d0da509b9bfbde9130ed`  
**Release branch:** `release/public-info-pages-20261111`  
**Purpose:** publish the new public information, contact, privacy and SEO pages without merging the unrelated 250-commit Ishakiro continuation history.

## Included

- Seven public information routes: About, How it works, Rwanda's administration, Data sources, Privacy, Contact and Terms.
- Kinyarwanda, English and French page content with localized metadata and language alternates.
- Owner-provided support phone `+250792053086` and email `izereeddy244@gmail.com` in the compact footer, Contact page and Privacy Policy. Phone/email links use `tel:` and `mailto:`.
- Correction of the first-level picker wording to **4 Provinces and the City of Kigali**; Kigali is not described as a fifth Province. Translation regression tests cover English and French.
- Compact footer navigation and collapsed image/source credits; the emergency strip stays in normal page flow so it does not cover page content.
- SEO metadata, canonical language URLs, sitemap, robots rules, and dynamic `ads.txt` handling.
- AdSense loading remains disabled unless real publisher and ad-slot IDs are configured and the enable flag is explicitly switched on. Kinyarwanda pages suppress ad code; no publisher IDs or credentials were added.
- CI test scripts include the new localized page/contact regression suite.

## Deliberately not included

- No unrelated Ishakiro engine, model-routing, database, leader-registry or admin changes from the long-running feature branch.
- No Production Supabase SQL, environment variables, AdSense activation or new analytics configuration.
- No Vercel Preview is requested for this release branch; `vercel.json` disables deployment for this branch only to conserve the deployment allowance. The `main` Production branch remains enabled.

## Release gate

This release is intended to merge to `main` only after this exact branch passes GitHub Actions. The public Production URL must then be checked for the seven routes, correct contact links, three languages, sitemap/robots behavior, and absence of active ads. Do not report the website as updated until the actual public URL returns the new content.
