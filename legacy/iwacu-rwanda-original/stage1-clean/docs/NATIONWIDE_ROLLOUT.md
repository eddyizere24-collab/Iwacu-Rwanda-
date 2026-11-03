# Nationwide rollout

## Principles

1. **Official data only** — boundaries from authorized sources; leaders from verified admins.
2. **District by district** — enable after boundary verification_status = verified.
3. **No silent gaps** — UI must say when data is not yet available (`DATA_NOT_AVAILABLE`).

## Checklist per district

1. Ingest GeoJSON → `admin_nodes` + `boundaries`.
2. Human QA of polygons (gaps/overlaps).
3. Set verification_status = verified.
4. Onboard sector/cell leaders via admin (pending → verified).
5. Spot-check `/api/locate` at 3 known points.
6. Document in `docs/EXECUTION_LOG.md`.

## Communication

- Public messaging in Kinyarwanda first.
- Emergency numbers always available offline from `public/emergency-national.json`.
