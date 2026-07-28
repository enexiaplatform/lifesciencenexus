# Operations Runbook — Life Science Nexus

| | |
|---|---|
| **Status** | v0.1 operating procedures (founder-testing phase) |
| **Date** | 2026-07-28 |
| **Related** | `docs/SECURITY_MODEL.md` (verification scripts), `docs/EVIDENCE_MODEL.md` (review semantics), `docs/DEPLOYMENT.md` |

## Daily

- **Review queue (`/review`)** — clear or triage new claims in `unverified` /
  `source_captured`, plus anything past `reviewByDate`. SLA (v0.1 target):
  first human look within 2 business days; `analyst_reviewed` within 5 for
  canonical-bound claims. Every transition writes an `evidence_review` — no
  silent state changes.
- **Data-quality dashboard (`/admin/data-quality`)** — check new
  `data_quality_issue` rows (kinds: `missing_field`, `inconsistent_value`,
  `stale_evidence`, …). Stale-evidence issues older than a week get a
  re-source or an `expired` transition.
- **Signals (`/signals`)** — acknowledge or dismiss new opportunity signals;
  `sent_to_memoire` only via the explicit handoff action (audit-logged).

## Weekly

- **Evidence freshness** — prices: any `price_observation` older than
  `PRICE_STALE_AFTER_DAYS` (180) generates a `price_stale` signal; review the
  signal queue for re-sourcing. General evidence buckets: `aging` > 90 d,
  `stale` > 180 d (`src/lib/domain/freshness.ts`).
- **Duplicate queue (`/admin/entity-resolution`)** — triage
  `duplicate_candidate` rows (auto-detection threshold 0.65): merge via
  `mergeEntities` (writes an `entity_merge_event`) or dismiss with a reason.
- **Import audit** — review recent import batches: error rates, skipped
  duplicates, and any batch committed with `canonical` visibility (should be
  rare and always review-gated).
- **Handoff log** — review `outbound_handoff_records` for unexpected volume
  or payloads; confirm every record carries a `visibilityWarning`.

## Incident playbooks

### Build failure (CI or Vercel)

1. Reproduce locally: `npm run check` (typecheck + lint + unit tests), then
   `npm run build`.
2. Contract-test failures in `src/lib/integrations/` mean payload drift —
   fix the code, not the golden payload, unless the contract is being
   deliberately versioned.
3. Do not merge on red; CI is the gate (`.github/workflows/ci.yml`).

### Migration failure

1. Migrations are idempotent — first re-run the failing file; many failures
   are transient dependency ordering.
2. Run `npm run verify:evidence` offline to localize the structural problem.
3. Fix forward: new migration, never edit an applied one (forward-only
   policy, `docs/DEPLOYMENT.md` §7).
4. After recovery on a live DB: `npm run verify:rls`.

### RLS regression (suspected data leak or over-blocking)

1. `npm run verify:rls` — RLS enabled on all 118 tables, anon revoked,
   policy spot-checks.
2. `npm run verify:data-isolation` — cross-tenant isolation proof (needs demo
   auth users, `docs/DATABASE.md` §Verification).
3. If a leak is confirmed: revoke the offending policy immediately
   (statement in a new migration), rotate `NEXUS_API_KEY` if API exposure is
   suspected, and audit `audit_log` for reads during the window.
4. Remember the asymmetry: canonical writes are service-role only — if a
   tenant role wrote canonical data, the service key is the suspect, not RLS.

### Demo-data contamination (demo rows in a real tenant view)

1. Confirm scope with an `is_demo` audit query:
   `select count(*) from <table> where is_demo and tenant_id is distinct from 'tenant_demo';`
   (per canonical-capable table) and check the API: demo rows must only
   appear with `?demo=true`.
2. `npm run verify:demo-separation` re-checks the structural assertions
   offline.
3. Purge path: scoped delete on `is_demo = true` / `tenant_demo` (ADR 0004
   cleanup). Investigate the entry path (import with wrong visibility, seed
   re-run) before purging.

### Rate-limit / API abuse

The limiter is per-instance in-memory (60 req/min per key+route). If a
consumer legitimately needs more, the short-term fix is a per-consumer key
with a documented exception; the real fix is the shared-store swap noted in
`docs/KNOWN_LIMITATIONS.md`.

## Backup & restore

- Supabase hosted: daily automated backups on paid tiers; **PITR** (point-in-
  time recovery) is the recommended add-on for production — restore to a new
  project and re-point env vars.
- Logical backup for self-managed recovery: `pg_dump` the `public` schema.
- `audit_log` and `price_observations` are append-only — never "clean them
  up"; they are the recovery trail for disputes.

## Monitoring suggestions (not yet wired)

- Vercel: function error rate + p95 on `/api/v1/*` routes.
- Supabase: database CPU/connections, slow-query log (watch
  `search_entities` and price-observation scans), storage growth.
- Synthetic checks: `/api/v1/search?q=test` and `/api/v1/openapi.json`
  returning 200 (the post-deploy smoke list, `docs/DEPLOYMENT.md` §6).
- Alert on any non-empty `strippedFields` in Atlas API logs — it means
  commercial data almost leaked (`docs/ATLAS_API.md`).
