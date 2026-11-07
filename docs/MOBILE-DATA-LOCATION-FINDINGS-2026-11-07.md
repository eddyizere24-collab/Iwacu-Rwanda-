# Mobile-data location investigation — 2026-11-07

## Executive finding

The website does **not** deliberately require Wi-Fi to send requests. The current client uses the browser Geolocation API and normal HTTPS requests, so mobile data is a supported transport. However, this is not the same as the website directly reading a mobile operator's cell towers.

Before this branch, the client labelled a low-power browser request as `network`; that was only an application label, not proof that Airtel/MTN cell towers were queried. This branch now requests high-accuracy device location for both the initial one-shot fix and the continuing watch. The browser/Android operating system still chooses the actual provider. A normal website does not receive raw serving/neighboring cell IDs, Wi-Fi scan results, or radio measurements from this API. The standard says the source is implementation-dependent and `enableHighAccuracy` is only a hint.

This explains why connecting Wi-Fi can appear to fix the site immediately: Android can use nearby Wi-Fi access points as a strong location signal, while a mobile-data-only visit may leave the phone with a slower or coarser cell/GNSS estimate. Mobile data is the internet connection; it does not itself guarantee that Android has produced a device-location fix.

## What was confirmed in this repository

- Before this branch, `src/hooks/useLocation.ts` called `getCurrentPosition` in low-power mode and `watchPosition` in high-accuracy mode. This branch now requests `enableHighAccuracy: true` for both, with `maximumAge: 0`. There is no native Android location bridge.
- There is no `TelephonyManager`, `getAllCellInfo()`, `LocationManager.NETWORK_PROVIDER`, Capacitor package/configuration, or checked-in `android/` native app project.
- The former low-power callback was labelled `network`, but that never meant the web app had queried Airtel/MTN cell towers directly.
- The Vercel IP estimate is only a weak fallback. Mobile operator gateways/NAT may geolocate to another place or outside Rwanda, so IP cannot be treated as device coordinates.
- The existing API's confidence/back-off logic appropriately avoids claiming a specific village when the supplied coordinate/radius does not support it. An unreliable source coordinate cannot be repaired by polygon mathematics alone.

## Web-layer changes on this branch

Branch: `fix/mobile-data-location-20261107`

- Do not mark a device location as resolved merely because the browser emitted raw coordinates. Mark it only after the location API (or local fallback) successfully resolves a result.
- Do not display the Vercel IP estimate as a location. Mobile-carrier IP gateways can point to Kigali or another gateway city rather than the phone. The API may still use request IP headers internally as a weak tie-breaker between device-coordinate candidates; it cannot introduce a place by itself.
- Do not display a previous confirmed village or last-known coordinate as if it were the current position. Each tap begins with fresh browser location requests.
- When no current device result is ready after three seconds, keep the search state open and say explicitly that no unverified place is being shown. Do not replace the waiting state with a random/equal-province result.
- Request a fresh high-accuracy device fix from the initial call and the continuing watch. Both set `maximumAge: 0`, so stale browser-cached coordinates are not accepted as a fresh answer.
- Evaluate high-accuracy-request results even when the reported uncertainty is above 100 m. The server still decides the finest supported administrative level; this patch does not force a village.
- Hold the first resolved answer briefly so the two browser request callbacks can be compared before a place is displayed. Keep one selected hierarchy path rather than flashing an interim city/region followed by another.
- When the low-power and high-accuracy-request coordinates materially disagree, prefer the high-accuracy-request result only when its reported radius is bounded (at most 1,500 m or three times the low-power radius). A conflicting low-power response cannot replace a high-accuracy-request response.
- This comparison concerns browser request modes only. The word high-accuracy is not proof that the device used GPS; the operating system still chooses the provider.
- Do not create an exact village from a representative point. The offline representative-point fallback can return only administrative levels whose local weighted share passes a threshold; very broad accuracy may return no representative-point result.
- If the online locate API fails, try the already packaged/cached Rwanda boundary data with the same coordinates instead of stopping at a notice.
- Replace UI text that seemed to imply Wi-Fi was the preferred location source with wording that explicitly supports mobile data and Wi-Fi as internet transports. The representative-point fallback warning now says it does not establish a village.

These are web-flow reliability improvements. They reduce misleading first answers and unsupported village claims, but they do not add direct cell-tower reading or guarantee an exact location indoors.

## Immediate Android settings to check

On Android 12/13:
1. Settings → Location → Location services → Location Accuracy → turn **Improve Location Accuracy ON**.
2. In Location services, enable **Wi-Fi scanning** and **Bluetooth scanning**. The Wi-Fi radio can remain disconnected; scanning is a separate setting.
3. Settings → Apps → Chrome → Permissions → Location → allow while using; choose **Precise**.
4. Chrome site permissions for the Iwacu domain should also allow Location and Precise.

Google documents that Location Accuracy combines available GPS, Wi-Fi, mobile-cellular signals and motion sensors. When Location Accuracy is off, its service uses only GPS and device sensors; apps may then receive a slower, less accurate or unavailable fix. The separate Wi-Fi scanning setting means Wi-Fi scanning can assist location without joining a Wi-Fi network.

## What is required for a true cell-network-first implementation

A browser-only Next.js site cannot force Chrome to give it raw cell identifiers. A proper second phase requires a native Android shell/plugin (for example, an Android app wrapper with a small Kotlin bridge) that can use:

- Android `LocationManager.NETWORK_PROVIDER` where available, which is the OS network-location provider for nearby cellular/Wi-Fi signals.
- Google Play services `FusedLocationProviderClient.getCurrentLocation()` for a fresh best-current estimate, with the age of any returned/cached fix checked.
- GNSS as a parallel refinement source.
- Optionally `TelephonyManager.getAllCellInfo()` for serving/neighbor cell observations, only with the required permissions and Android restrictions respected. Android documentation notes cell info can be cached; timestamps must be checked rather than assuming it is fresh.

Privacy safeguards for that phase:
- Request foreground precise location only when the citizen taps “Menya aho ndi”.
- Do not collect IMEI, IMSI, phone number, SIM serial, or persistent device identifiers.
- Do not store raw cell identifiers. Use them transiently only for lookup, then discard.
- Explain and obtain consent for any external tower-lookup provider; rate-limit and minimize transmitted measurements.

## Candidate tower-lookup data sources and costs

- **OpenCellID**: public/community cell database with an API and a limited free allowance (commonly documented as 1,000 lookups/day per user). It requires cell identifiers such as MCC/MNC, LAC/TAC and cell ID. Coverage is crowdsourced and may be sparse for some operators/areas in Rwanda; it must be tested before depending on it. Its database terms require attribution and license review.
- **Unwired Labs**: offers cellular/Wi-Fi lookup products and a limited developer tier, but the free developer terms are not a safe default for a public/production service without checking the current permitted use.
- **Google Geolocation API**: accepts `cellTowers` and `wifiAccessPoints`, but requires a Google API key and billing setup. It is not selected as the default because the project requires a zero-cost path.

No provider should be assumed to know every Rwandan tower. A provider can return no match when its radio database has a gap.

## Accuracy and response-time reality

Google's published guidance says common macro cell towers often produce radii from hundreds of metres to several kilometres, and under 100 m is uncommon; small indoor cells can be much more precise. Therefore a cell-only result may support a sector, cell, or district, but must not automatically claim a village. A fresh Android fused-location request may use a fresh computation or a recent cached location and can still return no fix before its timeout.

A public third-party snapshot of OpenCellID-derived Rwanda records dated 2026-11-06 lists 3,559 Airtel cell records but only 8 LTE records in that dataset; the MTN snapshot lists 1,326 records, almost all GSM. These are community observations, **not** the operators' full tower inventories, and must not be mistaken for nationwide coverage. OpenCellID itself warns that coverage is uneven by operator and radio technology and cannot guarantee every cell will be found. This makes the free database useful for a controlled pilot, not a dependable sole source for all Rwandan 4G users.

The product should return a quick, clearly labelled best-supported result and continue refining it. A 1–2 second exact village result cannot be guaranteed in every building, on every device/operator, from cell data alone.

## Rwanda field validation required before production

Use the same Android phone and record time-to-first-fix, reported radius, selected administrative level, whether the Wi-Fi radio was OFF, and whether Location Accuracy/scanning were ON. Do not upload exact home coordinates.

- Airtel mobile data, Wi-Fi OFF: Kigali urban outdoors; indoors; then another area outside Kigali.
- MTN mobile data, Wi-Fi OFF: repeat the same set.
- Wi-Fi ON as a control condition.
- Location Accuracy OFF versus ON, as a controlled comparison.
- Compare the browser-only branch against the future native cell-provider prototype.

Only real phone measurements can establish whether OpenCellID (or another provider) has usable coverage for the specific Rwandan towers and whether its results are good enough.

## Sources

- W3C Geolocation API: https://www.w3.org/TR/geolocation/
- Google Android Location Accuracy and Wi-Fi/Bluetooth scanning: https://support.google.com/android/answer/3467281
- Android LocationManager network provider: https://developer.android.com/reference/android/location/LocationManager#NETWORK_PROVIDER
- Android Fused Location Provider: https://developers.google.com/android/reference/com/google/android/gms/location/FusedLocationProviderClient
- Android TelephonyManager cell information: https://developer.android.com/reference/android/telephony/TelephonyManager#getAllCellInfo()
- Google Geolocation API cell/Wi-Fi request and accuracy guidance: https://developers.google.com/maps/documentation/geolocation/requests-geolocation
- OpenCellID API: https://opencellid.org/
- OpenCellID data and API documentation: https://wiki.opencellid.org/wiki/API
- Unwired Labs LocationAPI: https://unwiredlabs.com/
- RURA National Numbering Plan: https://www.rura.rw/
