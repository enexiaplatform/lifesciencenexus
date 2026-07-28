# Deployment — Life Science Nexus

| | |
|---|---|
| **Status** | Procedure defined; live deployment itself is credential-blocked in the build environment (`docs/KNOWN_LIMITATIONS.md`) |
| **Date** | 2026-07-28 |
| **Targets** | Vercel (app) + Supabase (Postgres 15+) |

## 1. Supabase project

- Hosted: create a project at <https://supabase.com/dashboard>, then
  `supabase link --project-ref <ref>`.
- Local dev alternative: `supabase start` (uses `supabase/config.toml`, DB on
  port 54322).

## 2. Apply migrations

```bash
npm run db:migrate          # = supabase db push
```

or with plain psql, in filename order:

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

All 10 migrations (`20260727000000`…`20260727000009`) are idempotent
(`CREATE … IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`,
`CREATE OR REPLACE TRIGGER`) — re-running is safe. Result: 118 tables, 355
RLS policies, pg_trgm + FTS indexes, `search_entities()`.

Offline gate before/after: `npm run verify:evidence` (structural) and
`npm run verify:demo-separation` (ADR 0004 assertions). Live-DB checks once
credentials exist: `npm run verify:rls`, `npm run verify:data-isolation`
(needs `DATABASE_URL`, direct connection string).

## 3. Seed (optional, demo data)

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

Creates `tenant_demo` + `tenant_other`, canonical reference rows and
fictional demo entities (all `is_demo=true`, names labeled `(Demo)`).

**Demo-users caveat:** `profiles`/`tenant_memberships` reference
`auth.users`, which the seed cannot create. Create the two demo users first
(Supabase Dashboard → Authentication, or the Admin API) with the fixed UUIDs
from the seed header (`11111111-…`, `22222222-…`), then re-run the seed;
without them the profile/membership inserts are skipped with a NOTICE.

## 4. Environment variables

From `.env.example` (copy to `.env.local` locally; set in Vercel project
settings for deployment):

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | for Supabase backend | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | for Supabase backend | Publishable anon key; safe for browser (RLS enforces) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | for publish pipeline/engine writes | Bypasses RLS; never expose to the browser, never commit |
| `NEXUS_DATA_BACKEND` | server | no | Force `supabase` or `demo`; default auto-detect |
| `NEXUS_DEMO_TENANT_ID` | server | no | Tenant id for the demo dataset (default `demo-tenant`) |
| `NEXUS_ENABLE_AI_EXTRACTION` | server | no | Feature flag, default `false` |
| `MEMOIRE_INTEGRATION_URL` / `ATLAS_INTEGRATION_URL` | server | no | Integration endpoints (optional) |
| `NEXUS_API_KEY` | server | for non-demo API auth | Static API v1 key checked against `x-api-key`; unset ⇒ API runs in demo mode (`src/lib/api/auth.ts`). Not in `.env.example` — set it in production |

With no Supabase vars set, the app runs in demo mode — this is deliberate and
visible ("Demo workspace" badge). Misconfiguration fails closed, never
silently into demo for a production URL.

## 5. Vercel project

- Framework preset: **Next.js**; build command `npm run build`
  (`next build`); install `npm ci`. Node ≥ 20 (`engines`; CI uses Node 22).
- Set the env vars above in Project Settings → Environment Variables.
- Every PR is already gated by `.github/workflows/ci.yml`
  (typecheck/lint/vitest/build); the Supabase E2E job runs when repo variable
  `SUPABASE_E2E_ENABLED = 'true'` with the Supabase secrets configured.

## 6. Post-deploy smoke checklist

- `/` redirects to `/dashboard`; topbar shows the expected backend badge
  ("Demo workspace" vs "Supabase").
- `/search?q=media` returns grouped results with match reasons.
- `/organizations`, `/products`, `/signals`, `/imports`, `/review` render.
- `GET /api/v1/search?q=test` → `{ data, meta }` envelope (401 if
  `NEXUS_API_KEY` set and no `x-api-key`).
- `GET /api/v1/openapi.json` → 200, valid spec.
- `GET /api/v1/integrations/atlas/products` → envelope with
  `contractVersion: "nexus-atlas-read/v1"` and empty `strippedFields`.
- Run `npm run verify:rls` and `npm run verify:data-isolation` against the
  live database (first time only, plus after any migration change).

## 7. Rollback

- **App:** Vercel instant rollback to the previous deployment (Deployments →
  ⋯ → Rollback). Migrations are **forward-only**: never hand-edit an applied
  migration; fixes ship as new idempotent migrations. Rollback of app code is
  always safe because old code tolerates newer additive schema.
- **Data:** Supabase PITR / backups for catastrophic recovery — see
  `docs/OPERATIONS_RUNBOOK.md`.

## 8. Demo vs production data separation (ADR 0004)

Before the first real tenant onboards:

- [ ] Demo content lives only in `tenant_demo` / `is_demo = true` — verify
      with `npm run verify:demo-separation` and the isolation script.
- [ ] Demo sessions cannot trigger the publish workflow; handoffs are
      disabled in demo (button tooltip).
- [ ] Market API excludes `is_demo` rows unless `?demo=true`.
- [ ] Bulk-delete demo rows from the production canonical layer with the
      scoped `is_demo` / `tenant_demo` query (cleanup path, ADR 0004).
- [ ] `NEXUS_DATA_BACKEND` unset or `supabase` on the production deployment;
      demo remains for local dev and preview environments.
