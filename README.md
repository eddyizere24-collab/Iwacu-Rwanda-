# IWACU RWANDA

Civic technology platform that lets Rwandan citizens discover their exact administrative location and local leaders using GPS, IP, or manual search — with extreme geospatial precision and strict NCSA Law compliance.

**MVP Scope**: Gasabo District only.

## Stack

- **Frontend**: Next.js 15 (App Router) · React 19 · Tailwind CSS · shadcn/ui · Lucide · Inter
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + PostGIS)
- **AI**: Groq (Function Calling only — Zero PII)
- **Offline**: Service Worker + Turf.js
- **Maps**: MapLibre GL

## Quick Start

```bash
cp .env.example .env.local
# Fill Supabase + Groq keys

npm install
npm run dev
```

## Database

1. Create a Supabase project with PostGIS enabled.
2. Run `sql/schema.sql` in the SQL Editor.
3. Ingest Gasabo boundaries: `npm run ingest:boundaries`
4. Seed leaders: `npm run seed:leaders`

## Security Highlights (NCSA No. 058/2021)

- Citizens are 100 % anonymous.
- Groq receives only natural-language queries and returns function-call intents. Zero personal or leader data ever reaches the LLM.
- Phone numbers are masked at the API layer and only become `tel:` links after explicit user action.
- Admin writes use optimistic locking (`version` column). Concurrent edits return HTTP 409 + diff.
- RLS enforces scope-prefix authorization for admins.

## Geospatial Confidence Algorithm

1. Create a circular polygon from `(lat, lng, accuracy_m)` using `ST_Buffer` (geography).
2. Intersect with active ADM5 (village) polygons.
3. Compute intersection area / circle area → confidence percentage.
4. If multiple villages intersect → return ranked list (e.g. “60 % Village A, 40 % Village B”).
5. Propagate the same confidence ratios up the hierarchy (never force 100 %).
6. If max confidence < 5 % → `CONFIDENCE_TOO_LOW`.

Offline mode performs the identical calculation with Turf.js against the cached Gasabo GeoJSON.

## Error States Implemented

GPS Denied · GPS Accuracy > 150 m · Outside Rwanda · Point in Gap · Point in Overlap · Confidence < 5 % · Missing Leader Contact · Network / 502 · 404 · Slow Network (skeleton) · Offline Cache · Browser Not Supported · Rate Limit · Concurrent Edit Conflict (409) · Leader Missing.

## Project Structure

See `FOLDER_STRUCTURE.md`.

## Data attribution

Inkomoko y'imipaka: National Institute of Statistics of Rwanda (CC BY 4.0); ikarita: OpenStreetMap contributors (ODbL)

The NISR source is the `Village_Boundary_2022` FeatureServer, layer 3 (“Village Boundary 2022 (Open Data)”). Its layer metadata copyright text states: “Village boundary data have been produced by NISR in 2022”. NISR's general terms apply CC BY 4.0 unless a different licence is embedded in that specific content. OSM data are under ODbL; keep the NISR source and OSM-only map data as separately identifiable datasets and do not merge NISR data into an OSM tile file.

- NISR terms: https://statistics.gov.rw/terms-use
- NISR layer metadata: https://gis-server.statistics.gov.rw/server/rest/services/Hosted/Village_Boundary_2022/FeatureServer/3
- OpenStreetMap licence and attribution: https://www.openstreetmap.org/copyright

## License

Proprietary — IWACU RWANDA project.
