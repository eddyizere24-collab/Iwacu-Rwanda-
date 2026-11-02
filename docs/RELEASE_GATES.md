# Release gates (stage1)

Do not merge to production / mark nationwide until:

1. **Build** — `npm run build` green on CI and Vercel READY.
2. **Typecheck & lint** — no errors (`npm run typecheck`, `npm run lint`).
3. **Unit tests** — `npm test` passes (contacts, health, security, geo helpers).
4. **Health** — `/api/health` returns JSON; `status: ok` when env + DB configured.
5. **Locate** — `/api/locate` returns structured success or documented error codes (never HTML 500 for missing env).
6. **No invented data** — leaders and boundaries only from verified sources / admin workflow.
7. **Privacy** — phones masked in public responses; rate limits on locate / admin APIs.
8. **PWA** — `public/manifest.json` + `sw.js` present; offline emergency JSON available.

## Production promote

- Prefer promoting a green `stage1-clean` deployment.
- Or merge `stage1-clean` → `main` (no force-push).
- Set Vercel env vars before expecting live GPS/leader data.
