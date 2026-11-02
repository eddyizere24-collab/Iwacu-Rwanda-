# Data ingestion

Official administrative boundaries and emergency data only. No invented geometries.

## Prerequisites

1. Supabase project with `postgis` and `ltree` enabled.
2. Run `sql/apply_all.sql` (or migrations 001 → 002 → 003 in order).
3. Service role key available for bulk insert scripts.

## Boundaries

Use `scripts/ingest-boundaries.ts` with verified GeoJSON from official sources.

```bash
npx tsx scripts/ingest-boundaries.ts path/to/official.geojson
```

Rules:
- Only features with valid MultiPolygon / Polygon.
- Parent hierarchy must resolve (province → district → sector → cell).
- Mark `verification_status = verified` only after human review.

## Emergency national numbers

Seeded via `sql/seed/001_emergency_national.sql` and mirrored in `public/emergency-national.json` for offline PWA.

## Leaders

Leaders are never bulk-invented. Admins create/edit via `/admin` after auth. Status workflow: pending → verified | rejected | archived.
