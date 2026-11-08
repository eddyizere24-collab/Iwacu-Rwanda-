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

- Do not display an IP estimate, an old confirmed village, or a stale last-known coordinate as the phone's current position. Each tap starts a fresh device Location request with `maximumAge: 0`.
- Both the initial `getCurrentPosition` and continuing `watchPosition` request high-accuracy Location. This is only a browser hint; Android chooses the actual provider.
- Keep the first-result arbitration delay at 200 ms after the first server-resolved response.
- Run the national-boundary classifier and main confidence RPC concurrently. The route no longer waits for a second center-point RPC or a separate carrier-IP district RPC.
- Resolve hierarchy names from the bundled NISR index instead of making an extra PostgREST metadata request for every locate call.
- Keep the SQL function's zero-area nearest-village assignments as a best-fit village/cell lineage when an uncertainty sample falls in a forest, boundary gap, or area with no polygon overlap. These rows are not treated as polygon proof: `no_village_mass` reduces the supported score, and the UI marks a child village/cell as a best-fit estimate when a coarser level is the strongest supported result.
- Keep one coherent descendant hierarchy instead of deleting the village/cell whenever district or province is the best-supported level. Unrelated villages from other districts are not shown as the chosen path.
- The UI distinguishes a supported village-level result from a village shown only as the nearest best-fit child of a coarser supported area.
- Serve the correction picker from the bundled official scope-code index (province → district → sector → cell → village), not repeated Supabase queries. Parent-child links use canonical scope codes, and the phone caches each list for offline use.
- A read-only Production log check found repeated PostgREST statement-timeout errors on the old root-level `boundaries?level=province` picker request at 17:13, 19:32, 19:54 and 20:00 UTC on 2026-11-07. The static picker removes this database dependency.
- Mobile data and Wi-Fi remain internet transports; the website still cannot directly read Airtel/MTN cell identifiers.

These changes target the two observed failures: slow extra database work and an empty village path when the uncertainty samples fall outside official polygons. They expose one best-fit village/cell while keeping its evidence level distinct from a confirmed location. They do not add direct cell-tower reading.

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
