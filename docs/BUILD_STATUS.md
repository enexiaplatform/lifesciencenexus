# Build Status — Life Science Nexus

Updated after each major phase. Legend: ✅ done · 🟡 in progress · ⬜ pending

## Phase 0 — Audit and contracts — ✅

- Completed: preflight audit of Atlas (Bio-Wiki-Pro-Claude) and Memoire (repos + deployments); ecosystem boundaries; entity ownership matrix; integration contracts (Nexus→Memoire handoff `nexus-handoff/v1`, Atlas←Nexus read `nexus-atlas-read/v1`, no DB FKs across products); ADRs 0001–0004; product scope + positioning.
- Files: `docs/PREFLIGHT_AUDIT.md`, `docs/ECOSYSTEM_BOUNDARIES.md`, `docs/ENTITY_OWNERSHIP_MATRIX.md`, `docs/INTEGRATION_CONTRACTS.md`, `docs/ADR/0001-0004`, `docs/PRODUCT_SCOPE.md`, `docs/POSITIONING.md`
- Decisions: Supabase chosen for RLS multi-tenancy (Atlas has no RLS; Memoire is single-user); four-layer data model (canonical / tenant-private / derived / execution refs) with `visibility` discipline; mock-first integrations with contract tests; dual backend (demo in-repo dataset vs Supabase).
- Tests: n/a (docs phase)

## Phase 1 — Foundation — ✅

- Completed: Next.js 15.5 + React 19 + strict TS + Tailwind v4 scaffold; app shell with 8 nav sections / 31 items; all 40 required routes; hand-written shadcn-style UI primitives (14); zod-validated env with demo-mode fallback; Supabase client factories (null-safe); security headers; CI workflow (typecheck/lint/test/build + gated Supabase job); Playwright config + smoke spec; README/CONTRIBUTING/SECURITY/CHANGELOG; `.env.example`.
- Tests: 4 (utils smoke) — passing. Build: passing (34 static + 10 dynamic routes).

## Phase 1b — Domain core — ✅

- Completed: full domain model (`src/lib/domain/types.ts`, 79 entity types); zod DTOs; pure engines: units/pack parsing, cost-per-test + sensitivity, equivalence scoring/classification (configurable weights, unknown-dimension guards, disclaimer), price normalization (FX snapshot mandatory, tax handling, IQR outliers, freshness), product matching, entity resolution (duplicate scoring + merge plans), signal generation (12 rules), confidence aggregation, freshness, permissions matrix, search ranker (typo-tolerant, match reasons), CSV/report export; repository seam (`NexusRepository`); integration contracts (Memoire handoff + field-observation return path; Atlas read DTOs + vendor-neutrality guard).
- Tests: 193 total — passing (incl. contract tests with golden payloads).

## Phase 1c — Demo dataset + database layer — ✅

- Completed: `src/lib/demo/` — 306 synthetic records, all `isDemo: true`, fictional names, industrial-microbiology Vietnam wedge; covers all six workflows incl. near-duplicate pairs, stale prices, expiring agreements, tender ending ~45d, asset replacement due ~60d; wired `DemoRepository` (tenant isolation `tenant_demo` vs `tenant_other`, live-computed signals, duplicate candidates via real engine).
- Completed: `supabase/migrations/` — 10 migrations, 118 tables, 355 RLS policies (deny-by-default; canonical read for authenticated; tenant-private via `is_tenant_member`; review actions via `has_tenant_role`; immutable price observations; people/contacts always tenant-private), pg_trgm + FTS indexes, federated `search_entities()`; `supabase/seed.sql`; offline gate `scripts/verify-migrations.mjs` (PASS, incl. `--demo-checks`); `scripts/verify-rls.sql`, `verify-data-isolation.sql` (require live DB — not executed); `docs/DATABASE.md`.
- Tests: 224 total — passing. Migrations added: 10. RLS coverage: 118/118 tables.
- Risks: RLS/DB verification against a live Supabase instance still pending (no credentials in this environment); seed demo users need matching auth.users rows (documented).

## Phase 2–7 — UI waves — 🟡

- In progress: four parallel workstreams — Market module (organizations→installed base, workflows D+E); Products + Intelligence (SKU pages, equivalence workspace, matching, compare, cost-per-test, prices, signals; workflows A–C); Search + Research + Dashboard + Evidence review; Data Ops (CSV/XLSX ingestion wizard, entity resolution, data quality) + API v1 + integrations surface (workflow F + contracts).
- Remaining: integration pass (full build + conflict sweep), hardening, E2E, deployment prep.

## Credential-blocked items (tracked honestly)

- Live Supabase project provisioning + migration apply + RLS verification scripts execution.
- Vercel deployment + smoke tests on the deployed URL.
- Real Memoire/Atlas runtime integration (contract + mocks + tests only, per plan).
- Playwright browser run (browsers not installed in this environment; spec + config ready).
