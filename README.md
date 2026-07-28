# Life Science Nexus

Industry and Product Intelligence Graph for life science markets. The initial
wedge is **industrial microbiology in Vietnam**: mapping organizations,
products, prices, tenders, installed base, and the evidence behind them into a
single queryable graph.

The app runs out of the box in **demo mode** with synthetic data — every demo
record is labeled "Demo". Connect Supabase to work against a real backend.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first config via `@theme` in `src/app/globals.css`)
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) — optional; the app
  falls back to demo mode when env vars are absent
- **zod** for env and data validation
- **@tanstack/react-table**, **recharts**, **lucide-react**
- Hand-written shadcn-style UI primitives on **Radix** + **cva** + **cn()**
- **Vitest** + Testing Library (unit), **Playwright** (E2E), ESLint 9 flat config
- **papaparse** + **xlsx** (SheetJS) for import/export pipelines

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you are redirected to `/dashboard` in demo mode.
No environment variables are required.

### Supabase setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Apply the database schema from [`supabase/migrations`](supabase/migrations).
3. Restart `npm run dev`. The topbar badge switches from "Demo workspace" to
   "Supabase".

`NEXUS_DATA_BACKEND=demo|supabase` forces the backend explicitly; without it,
the backend is auto-detected. `SUPABASE_SERVICE_ROLE_KEY` is server-only and
must never be exposed to the browser — see [SECURITY.md](SECURITY.md).

## Scripts

| Script                | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the dev server                           |
| `npm run build`       | Production build                               |
| `npm start`           | Serve the production build                     |
| `npm run lint`        | ESLint (flat config, eslint-config-next)       |
| `npm run typecheck`   | `tsc --noEmit`                                 |
| `npm test`            | Unit tests (Vitest, jsdom)                     |
| `npm run test:watch`  | Unit tests in watch mode                       |
| `npm run test:e2e`    | E2E tests (Playwright; starts dev server)      |
| `npm run check`       | typecheck + lint + unit tests                  |

## Project layout

- `src/app/` — App Router with route groups: `(core)`, `(market)`,
  `(products)`, `(intelligence)`, `(research)`, `(ops)`, `(settings)`
- `src/components/app-shell/` — sidebar + topbar shell used by all modules
- `src/components/ui/` — hand-written shadcn-style primitives
- `src/lib/` — env (`env.ts`), utils, Supabase clients
- `supabase/migrations/` — database schema (applied by data-platform work)
- `tests/e2e/` — Playwright specs
- `docs/` — product and architecture documentation

## Documentation

| Document | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview: repository seam, dual backend, four data layers, module map, request flow |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Canonical entity model: families, relationships, visibility discipline, immutable price observations, ER diagram |
| [docs/EVIDENCE_MODEL.md](docs/EVIDENCE_MODEL.md) | 8 evidence states, 7 confidence dimensions, claim structure, review + publish workflows, lifecycle diagram |
| [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) | RLS policy model, API security, visibility matrix, secret management, data deletion |
| [docs/SEARCH_ARCHITECTURE.md](docs/SEARCH_ARCHITECTURE.md) | Demo ranker vs Postgres pg_trgm/FTS, relevance explanations, keyboard UX, pgvector deferral |
| [docs/DATABASE.md](docs/DATABASE.md) | Migration inventory (10 files, 118 tables), column/layer discipline, setup and verification scripts |
| [docs/MEMOIRE_HANDOFF.md](docs/MEMOIRE_HANDOFF.md) | Nexus→Memoire `nexus-handoff/v1` payload, delivery modes, audit log, field-observation return path |
| [docs/ATLAS_API.md](docs/ATLAS_API.md) | Atlas←Nexus read-only API: 6 endpoint groups, DTOs, canonical-only rule, vendor-neutrality guard |
| [docs/IMPORT_GUIDE.md](docs/IMPORT_GUIDE.md) | 9-step ingestion wizard, 10 templates with columns and VI synonyms, validation, idempotency |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Supabase deployment, env vars, migrations, smoke checklist, rollback |
| [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) | Daily/weekly ops, review SLAs, incident playbooks, backup/restore, monitoring |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | Honest limitation register with impact and remediation per item |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased plan: v0.1 founder testing → v0.2 real backend → v0.3 live integrations → v1.0 GA |
| [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) | What Nexus is and is not; primary users; initial wedge |
| [docs/POSITIONING.md](docs/POSITIONING.md) | Market positioning vs alternatives |
| [docs/ECOSYSTEM_BOUNDARIES.md](docs/ECOSYSTEM_BOUNDARIES.md) | Nexus/Atlas/Memoire ownership split and must-not-become lists |
| [docs/ENTITY_OWNERSHIP_MATRIX.md](docs/ENTITY_OWNERSHIP_MATRIX.md) | Per-entity ownership across the three products |
| [docs/INTEGRATION_CONTRACTS.md](docs/INTEGRATION_CONTRACTS.md) | Versioned cross-product contracts A–D and testing policy |
| [docs/PREFLIGHT_AUDIT.md](docs/PREFLIGHT_AUDIT.md) | Verified audit of the Atlas and Memoire codebases the ecosystem design builds on |
| [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md) | Phase-by-phase build log and credential-blocked items |
| [docs/ADR/0001-technology-stack.md](docs/ADR/0001-technology-stack.md) | ADR: Next.js 15 + Supabase/RLS stack choice |
| [docs/ADR/0002-four-layer-data-model.md](docs/ADR/0002-four-layer-data-model.md) | ADR: canonical / tenant-private / derived / execution-reference layers + publish workflow |
| [docs/ADR/0003-integration-via-api-contracts.md](docs/ADR/0003-integration-via-api-contracts.md) | ADR: no shared databases; versioned API contracts only |
| [docs/ADR/0004-demo-mode-and-data-policy.md](docs/ADR/0004-demo-mode-and-data-policy.md) | ADR: dual data backend and synthetic-record labeling policy |
