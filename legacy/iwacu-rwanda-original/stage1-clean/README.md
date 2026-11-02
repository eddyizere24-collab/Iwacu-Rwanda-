# IWACU RWANDA

Civic web app (PWA) that lets a person in Rwanda find the **village, cell, sector and district** they are in using GPS,
and see their local leaders. Built for the **whole country from day one** — nothing in the code or database is tied to a
single district.

**Languages**: Kinyarwanda (primary) · English (secondary)  
**Privacy**: no accounts for citizens, no profile, no location history; phone numbers are masked until the user asks (see `SECURITY_AUDIT.md`).

> **Status (see `docs/STATUS.md` for the honest, current picture):** the code is written and the unit tests pass, but the
> app has **not yet been built, deployed or run against a database**, and it contains **no boundary or leader data**.
> It is not ready for public use. The plan to get there is `docs/ROADMAP.md`.

## How it works

1. The browser asks for GPS (position + accuracy) and sends it to `POST /api/locate`.
2. The database (PostGIS) draws a circle of the GPS accuracy, intersects it with **verified village polygons** and returns a
   ranked list with a confidence percentage. Parents (cell → sector → district → country) come from explicit parent links.
3. Leaders for the village and each parent are returned **only if verified and current**; phone numbers are masked.
4. If the person is offline, a cached sector boundary pack can still tell them where they are (leaders are not shown offline).

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) · React 19 · Tailwind CSS · Lucide |
| Backend | Next.js route handlers (Node runtime) |
| Database | Supabase (PostgreSQL + PostGIS + ltree) |
| Rate limiting | Upstash Redis (required in production) |
| AI (optional) | Groq function-calling only — never receives personal or leader data |
| Offline | Service worker (app shell) + IndexedDB sector packs + Turf.js |
| Admin auth | Supabase Auth (email magic link) + RLS + middleware gate |

## Administrative hierarchy

`country (RW) → province → district → sector → cell → village`. Every unit has a unique `scope_code` that starts with `RW`
(format enforced by the database) and an explicit `parent` link. Codes must come from an **approved code table** and are never
invented from names (see `docs/DATA_INGESTION.md`).

## Quick start (development)

```bash
cp .env.example .env.local     # fill the values (see table below)
npm install
# Database: apply sql/migrations/001_core_schema.sql then 002_leaders_workflow.sql on a Supabase project
npm run dev
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Public anon key |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Server-only key. Never expose to the browser |
| UPSTASH_REDIS_REST_URL / _TOKEN | **Yes in production** | Shared rate limiting. Sensitive routes **refuse requests** in production without it |
| TRUSTED_IP_HEADER | No | Name of the client-IP header on hosts other than Vercel/Cloudflare |
| GROQ_API_KEY / GROQ_MODEL | No | Optional AI place-name router; the app works without it |
| NEXT_PUBLIC_APP_URL | No | Canonical origin |
| IP_GEO_API_KEY | No | Reserved. **Not used by any code today** |

## Commands

```bash
npm run typecheck
npm run lint
npm test                 # node:test unit tests via tsx, no network needed
npm run test:e2e         # Playwright (needs browsers and a running app)
npm run db:test            # SQL tests (needs psql + PostGIS, see docs/TESTING_DATABASE.md)
npm run ingest:boundaries -- --file <geojson> --source ... --dry-run
```

## Documentation

| File | Purpose |
|------|---------|
| `docs/ROADMAP.md` | The six stages from today to a finished product (Kinyarwanda) |
| `docs/STATUS.md` | What is verified, what is not |
| `docs/RELEASE_GATES.md` | Checklist that must be green before release |
| `docs/DATA_INGESTION.md` | How boundary data must be obtained and loaded |
| `docs/NATIONWIDE_ROLLOUT.md` | The national data model and load order |
| `docs/TESTING_DATABASE.md` | Running the SQL tests |
| `DEPLOYMENT.md` | Step-by-step deployment (Supabase, Upstash, Vercel) |
| `SECURITY_AUDIT.md` | Security and privacy controls and what is still unverified |
| `FOLDER_STRUCTURE.md` | Where things live |
| `docs/EXECUTION_LOG.md`, `docs/MERGE_REPORT.md` | History of what each work session did |

## Data rule

Official boundaries must come from an authoritative owner (NISR / National Land Authority or equivalent), with source, date and
licence recorded. **Never fabricate boundaries.** Placeholder *leaders* are allowed for testing only and must be clearly flagged
(planned in Stage 5 of the roadmap) so a citizen is never shown a made-up person as a real leader.

## License

Proprietary — IWACU RWANDA project.
