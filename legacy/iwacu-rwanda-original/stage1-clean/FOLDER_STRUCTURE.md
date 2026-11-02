# Folder structure

```
.
├── README.md  DEPLOYMENT.md  SECURITY_AUDIT.md  FOLDER_STRUCTURE.md
├── package.json  tsconfig.json  next.config.ts  eslint.config.mjs  tailwind.config.ts  postcss.config.mjs  playwright.config.ts
├── .env.example  .gitignore  .github/workflows/ci.yml
├── docs/        ROADMAP, STATUS, RELEASE_GATES, DATA_INGESTION, NATIONWIDE_ROLLOUT, TESTING_DATABASE, EXECUTION_LOG, MERGE_REPORT
├── sql/
│   ├── migrations/   001_core_schema.sql  002_leaders_workflow.sql
│   └── tests/        00_supabase_stub.sql  002_leaders_workflow.test.sql
├── scripts/     ingest-boundaries.ts            # the one validated boundary loader
├── public/      sw.js  manifest.json  icons/
├── tests/       *.test.ts  unit/*.test.ts  e2e/public.spec.ts
└── src/
    ├── middleware.ts                            # gates /admin/dashboard on a Supabase session
    ├── app/
    │   ├── layout.tsx  page.tsx  globals.css    # public site
    │   ├── admin/    layout.tsx  login/page.tsx  dashboard/page.tsx
    │   ├── auth/callback/route.ts               # completes the magic-link login
    │   └── api/
    │       ├── locate/route.ts                  # GPS -> village + hierarchy + leaders
    │       ├── leaders/route.ts                 # public: verified leaders, masked phone
    │       ├── leaders/[id]/reveal-phone/route.ts   # POST: CSRF + rate limit + audit
    │       ├── admin/leaders/route.ts           # admin list / create / edit / verify / reject / archive
    │       ├── ai-router/route.ts               # optional Groq place-name router (not wired to the UI yet)
    │       └── health/route.ts
    ├── components/   LocationButton  LeaderCard  ErrorDisplay  ThemeToggle  admin/LeaderEditForm
    ├── hooks/        useLocation.ts
    ├── lib/
    │   ├── admin/leaders.ts                     # admin validation + status machine (pure, tested)
    │   ├── geo/          gps.ts  hierarchy.ts  ingest-validate.ts
    │   ├── leaders/public.ts                    # leader row -> public shape (phone masked)
    │   ├── offline/sector-cache.ts   turf-logic.ts
    │   ├── security/     mask.ts  origin.ts  rate-limit.ts  redact.ts  redirect.ts
    │   ├── supabase/     client.ts  server.ts
    │   └── utils/errors.ts   i18n.ts   health.ts
    └── types/        api.ts  boundary.ts  leader.ts  location.ts
```

Path alias: `@/` maps to `src/`.
