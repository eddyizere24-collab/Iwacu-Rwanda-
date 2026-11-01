# IWACU RWANDA 2 — Boundary data licensing note

**Reviewed:** 2026-11-01  
**Purpose:** Practical reuse guidance for the NISR Village Boundary 2022 layer and OpenStreetMap (OSM) data. This is an engineering compliance note, not a legal opinion.

## Executive conclusion

| Dataset | Copy / store | Publicly republish | Main conditions |
|---|---|---|---|
| NISR Village Boundary 2022 | **Yes, under NISR's general CC BY 4.0 terms**, provided no dataset-specific embedded licence supersedes them. | **Yes**, including adapted/derived files and commercial use, subject to attribution, integrity and change disclosure. | Credit the National Institute of Statistics of Rwanda (NISR), link the dataset and CC BY 4.0 terms, identify changes, and do not imply NISR endorsement. |
| OpenStreetMap data | **Yes**, under ODbL 1.0. | **Yes**, subject to attribution and the ODbL share-alike rules for derivative databases. | Credit OpenStreetMap, link the copyright/licence page, keep notices, and publish an ODbL-compliant copy/alteration file when the ODbL requires it. |

**Important distinction:** NISR village-boundary data and OSM data do not become one licence simply because both appear on the same map. Keep their source data identifiable and separate. A public map/Produced Work can display independent datasets together; however, combining or adapting substantial OSM data into the same database may create an ODbL Derivative Database. Obtain legal review before publishing a unified mixed-source database.

## 1. NISR — Village Boundary 2022

### What the sources say

NISR's official Terms of Use say that NISR data and analysis are released under **Creative Commons Attribution 4.0 International (CC BY 4.0)**. The page expressly states that NISR data may be “copied, distributed, transmitted and freely adapted”, including for commercial purposes, if integrity is respected and NISR is acknowledged as the source.

The ArcGIS REST service for `Hosted/Village_Boundary_2022`, layer 3, identifies the layer as **Village Boundary 2022 (Open Data)** and its copyright text says: **“Village boundary data have been produced by NISR in 2022.”** The service description says the mapping covers 14,816 of 14,837 gazetted villages and notes that geographic coverage excludes some areas covered by Lake Kivu. Its attributes include hierarchical administrative IDs and names: province, district, sector, cell and village.

The ArcGIS service metadata does **not** expose a separate, more detailed licence statement in the material checked here. NISR's Terms of Use also expressly warn that some individual content may carry different embedded licensing conditions which supersede the general CC BY terms. Therefore, the practical conclusion is: **CC BY 4.0 applies under the general NISR terms unless a dataset-specific embedded notice, contract or later NISR instruction says otherwise.** Before a major public republication or a commercial data product, retain a copy of the terms and the layer metadata and seek written NISR confirmation if any conflicting notice appears.

### Practical permissions and conditions

- Copy, download, store in our own database, back up, convert formats, simplify, reproject, dissolve/aggregate, and republish NISR boundary data, provided the general CC BY 4.0 terms apply.
- Commercial use is allowed by the stated NISR terms; no NISR data-use fee is stated on that terms page.
- Preserve the accuracy/integrity of the source: do not misrepresent a modified or incomplete boundary as an unmodified official boundary.
- Give appropriate source credit, link to the source and licence, and state that IWACU made changes (for example, code normalization, reprojection, geometry simplification or parent-boundary aggregation).
- Do not suggest NISR endorses IWACU RWANDA 2. NISR's terms separately say its name/logo/trademarks must not be used as if it were an endorsement; obtain permission before using NISR logos or marks.
- Treat the 14,816/14,837 description and Lake Kivu coverage note as known dataset limitations. Do not call the layer a complete census of all current administrative areas.

### Recommended NISR attribution

> Source: National Institute of Statistics of Rwanda (NISR), Village Boundary 2022. Licensed under CC BY 4.0. Adapted by IWACU RWANDA 2 (changes: [state the actual changes]).

Link **NISR Terms of Use** and the **CC BY 4.0 legal code/deed** from the attribution or the dataset README. For a specific exported boundary file, also include the source layer name, 2022 vintage, retrieval date, coordinate reference system, and a note of geometry/attribute modifications.

## 2. OpenStreetMap — ODbL 1.0

### What the sources say

The OpenStreetMap Foundation (OSMF) says OSM geodata is licensed under the **Open Database License version 1.0 (ODbL)**. Its FAQ says anyone may use the data for personal, community, educational, commercial or government purposes, and that attribution is required. OSMF separately warns that the public `tile.openstreetmap.org` tile service has its own usage policy and is not a general unrestricted commercial tile service. This is a data licence, not a promise that OSM's public tile servers may be used as IWACU's production infrastructure.

The OSMF's attribution guidance requires visible, readable attribution near the map or Produced Work, with a way to access the data origin and licence. Its accepted text includes **“© OpenStreetMap contributors”**. It recommends making the attribution link to `openstreetmap.org/copyright`, which explains the sources and ODbL.

### Practical permissions and conditions

- Copy, store, adapt and republish OSM data. It is not restricted to non-commercial use.
- If publicly conveying an OSM database, a substantial extraction, or an OSM-derived database, include the ODbL text or URI and keep copyright/database-right/licence notices intact.
- If you create a public **Derivative Database** by adapting, modifying, extending or extracting a substantial part of OSM data into a new database, the publicly used derivative database must be under ODbL (or a compatible licence). The ODbL also requires a machine-readable copy of the derivative database or a file/method containing all alterations to be offered to recipients; online access must be free.
- If OSM data is used in a **Produced Work** such as a map image or interactive map, the Produced Work itself can use its own terms. You must still provide attribution and, if it is generated from a Derivative Database, comply with the specific ODbL offer/share obligations for the derivative database.
- A **Collective Database** of independent databases is treated differently from a Derivative Database. The independent non-OSM component does not automatically become ODbL merely because it is assembled alongside OSM. Preserve clear dataset boundaries, provenance and licence metadata so the components remain demonstrably independent.
- Do not import NISR CC BY 4.0 data into the OSM database without OSMF's approval/process. OSMF's FAQ says imports of data under incompatible licences need particular care. This is a restriction on contribution/import **into OSM**, not a blanket ban on displaying separate NISR and OSM layers together in IWACU.
- Avoid a live dependency on OSM's standard public tile servers. Use data extracts and tiles/files hosted under our control, while following ODbL attribution and any applicable tile/data terms.

### Recommended OSM attribution

> Map data © OpenStreetMap contributors, available under the Open Database License (ODbL).

Make **OpenStreetMap** link to `https://www.openstreetmap.org/copyright` and include the ODbL 1.0 URI in the dataset README/metadata. For a database export, put licence and attribution notices inside the export directory (for example, `ATTRIBUTION.md` and `LICENSES/ODbL-1.0.txt`), not only in the app footer.

## 3. IWACU implementation rules

1. Tag every source-derived file/table with source name, source URL, dataset/version date, retrieval date, applicable licence and modification history.
2. Keep NISR and OSM source geometries in separately identifiable tables/files. If a product needs a combined layer, build a view/Produced Work over the separate sources rather than silently overwriting one with the other. A view does not by itself settle licence classification; preserve lineage.
3. Provide visible map attribution for each source actually used in that map. A single map can show both the NISR credit and OSM credit; do not use one to imply the other supplied the data.
4. For a public OSM-derived database, publish the ODbL notices and the required machine-readable derivative/alteration offer. Keep that distribution separable from the NISR CC BY data.
5. Do not reuse NISR logos or claim NISR approval without permission.
6. Keep copies of the exact terms, source metadata, raw download manifest, checksums and transformation scripts alongside each release.

## 4. Sources checked

1. **NISR — Terms of Use:** https://www.statistics.gov.rw/index.php/terms-use  
   General NISR CC BY 4.0 position; copied/adapted data permissions; acknowledgement and integrity requirement; exception for embedded licences.
2. **NISR — Village Boundary 2022 FeatureServer:** https://gis-server.statistics.gov.rw/server/rest/services/Hosted/Village_Boundary_2022/FeatureServer  
   Layer 3 description, vintage, source copyright text, administrative ID fields and coverage caveat.
3. **Creative Commons — CC BY 4.0:** https://creativecommons.org/licenses/by/4.0/  
   Licence deed and legal code for attribution, adaptations, commercial reuse and no implied endorsement.
4. **OpenStreetMap Foundation — Licence and Legal FAQ:** https://osmfoundation.org/wiki/Licence_and_Legal_FAQ  
   ODbL 1.0, user permissions, public-use, Produced Work, Derivative Database and Collective Database explanations, and separate tile-service caution.
5. **OpenStreetMap Foundation — Attribution Guidelines:** https://osmfoundation.org/wiki/Attribution_Guidelines  
   Where and how attribution should be displayed, including database and interactive-map scenarios.
6. **Open Data Commons — ODbL 1.0 legal text:** https://opendatacommons.org/licenses/odbl/1-0/  
   Sections 4.2–4.6: notices, Produced Work attribution, share-alike, collective-database limits and machine-readable derivative/alteration offer.

## 5. Legal caution

This is a source-based engineering assessment, not legal advice for Rwanda or any other jurisdiction. OSMF expressly says its FAQ is not legal advice; the ODbL itself also recommends qualified legal advice. Before a public release of a merged NISR/OSM boundary database, ask a qualified lawyer to confirm whether the actual storage/transformation design is a Collective Database or Derivative Database and obtain written NISR clarification if a layer-specific notice conflicts with the general terms.
