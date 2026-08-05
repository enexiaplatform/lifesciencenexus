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

- Completed: `src/lib/demo/` — 985 synthetic records, all `isDemo: true`, fictional names; portfolio spans the upstream → downstream → QC/R&D chain for Pharma API and Biopharma (cell culture media, process chemicals, chromatography, filtration, endotoxin testing, analytical columns, reference standards, water testing, single-use systems) plus the industrial-microbiology Vietnam wedge (culture media, QC organisms, EM/sterility equipment, tenders in all three pipeline states, installed base) with demand-side accounts on both sides (Delta Pharma micro-QC, Bach Dang Biologics mAb plant); every category shelf offers a two-brand, multi-model choice on the `/categories` browse pages; wired `DemoRepository` (tenant isolation `tenant_demo` vs `tenant_other`, live-computed signals, duplicate candidates via real engine).
- Completed: `supabase/migrations/` — 10 migrations, 118 tables, 355 RLS policies (deny-by-default; canonical read for authenticated; tenant-private via `is_tenant_member`; review actions via `has_tenant_role`; immutable price observations; people/contacts always tenant-private), pg_trgm + FTS indexes, federated `search_entities()`; `supabase/seed.sql`; offline gate `scripts/verify-migrations.mjs` (PASS, incl. `--demo-checks`); `scripts/verify-rls.sql`, `verify-data-isolation.sql` (require live DB — not executed); `docs/DATABASE.md`.
- Tests: 224 total — passing. Migrations added: 10. RLS coverage: 118/118 tables.
- Risks: RLS/DB verification against a live Supabase instance still pending (no credentials in this environment); seed demo users need matching auth.users rows (documented).

## Phase 2–7 — UI waves — ✅

- Completed: four workstreams, all placeholders replaced with working implementations (302 vitest tests green; production build green — 70+ routes):
  - **Market** (workflows D+E): organizations list/detail (+create), sites, laboratories, people (tenant-private notices), manufacturers, suppliers (evidence-gated "authorized" display), availability, tenders + detail (lots/items/bidders/award forms, renewal banner), installed base + detail (maintenance/qualification forms, consumable-gap highlighting).
  - **Products + Intelligence** (workflows A–C): products/product detail, flagship SKU page (packs, edges, listings, prices, equivalence, Memoire handoff dialog, add-to-research), reference browsers (brands/applications/methods/standards/organisms); equivalence workspace (8-dimension live scoring, configurable weights, exact-equivalent unknown-guard, review workflow, disclaimer); guided matching; spec comparison matrix (unknown ≠ not met, CSV/print); cost-per-test builder (17 components, FX snapshot discipline, breakdown, sensitivity, save/export); price intelligence (history charts, outliers, freshness, record dialog); signals (acknowledge/dismiss, handoff).
  - **Search + Research + Evidence**: federated /search (facets, match reasons, recent/saved searches, full keyboard), topbar quick-search, live dashboard (dashboardSummary), research workspace (entities/notes/findings 5 kinds/confidence summary/data gaps/export JSON+CSV+XLSX+print report), sources, evidence claims browser, review queue with reviewer actions.
  - **Data Ops + API + Integrations** (workflow F): 9-step import wizard (CSV/XLSX/paste, auto-mapping incl. Vietnamese synonyms, zod validation, duplicate review, visibility choice, import report), export center (CSV/JSON/XLSX with visibility guard), data-quality dashboard, entity-resolution queue (side-by-side, field-level merge, history), settings, integrations surface; API v1 (26 documented paths, auth/rate-limit/zod/error-envelope helpers, Memoire handoff POST, Atlas read ×6 with vendor-neutrality guard, openapi.json); 66 new tests.
- Integration pass: repository cache moved to `globalThis` (dev-mode server-action visibility); `npm run typecheck`/`lint`/`test` (302)/`build` all green; committed `91c97d5`.

## Phase 8 — Hardening — ✅

- Playwright E2E: **22/22 passing** — `tests/e2e/workflows.spec.ts` (6 tests, one per mandatory workflow A–F), `tests/e2e/a11y.spec.ts` (15 tests: skip link, keyboard nav, 5 dialog focus-trap/Escape, form accessible names, table `scope`), `smoke.spec.ts`. Rerun-safe against mutated demo state.
- A11y fixes landed: `scope="col"` on `TableHead` + two module tables.
- Security posture: headers in `next.config.ts`, deny-by-default RLS authored, API rate limiting + zod + error envelope, visibility guards in exports/handoffs/Atlas API, secrets only via env.

## Phase 9 — Documentation & release — ✅

- Docs complete: 23 files under `docs/` (incl. ARCHITECTURE, DATA_MODEL+ERD, EVIDENCE_MODEL+lifecycle, SECURITY_MODEL+visibility matrix, SEARCH_ARCHITECTURE, MEMOIRE_HANDOFF, ATLAS_API, IMPORT_GUIDE, DEPLOYMENT, OPERATIONS_RUNBOOK, KNOWN_LIMITATIONS — 11 items, ROADMAP) + README index; CHANGELOG 0.1.0 dated.
- Final gates (all run 2026-07-27): `npm run verify:production-readiness` → **exit 0** (typecheck + lint + 302 vitest + migrations verification + build); `verify:integrations` → PASS; `verify:demo-separation` → PASS (118/118 tables carry `is_demo`); Playwright 22/22.
- Repository: pushed to `github.com/enexiaplatform/lifesciencenexus` (branch `main`).

## Phase 10 — Landing visual upgrade — ✅

- Real product screenshots replace the pure-CSS hero mock: `scripts/capture-screenshots.mjs` (`npm run screenshots`) captures the demo workspace (dashboard, equivalence workspace, evidence, pre-filled compare matrix, loaded cost-per-test scenario) at 2× DPR into `public/screenshots/`, rasterizes `public/og.svg` → `public/og.png` (1200×630), `apple-icon.svg` → `src/app/apple-icon.png` (180×180), and with `--video` records a ~13s walkthrough clip (`demo.webm`, ~1MB). Screenshots depend on the demo dataset — re-run after demo-data changes.
- New `ScreenshotFrame` component (browser chrome + `next/image`/video); hero now plays the walkthrough clip with the dashboard still as poster; intelligence section gained a 3-shot product tour (equivalence, compare, cost-per-test).
- OG/Twitter metadata switched from `og.svg` to `og.png`; PNG apple touch icon added for iOS.
- Dead code removed: `src/components/module-placeholder.tsx` (unused).
- Tests: `tests/e2e/landing.spec.ts` gained a media assertion (hero video poster + 3 tour images load).

## Credential-blocked items (tracked honestly)

- Live Supabase project provisioning + migration apply + RLS verification scripts execution.
- Vercel deployment + smoke tests on the deployed URL.
- Real Memoire/Atlas runtime integration (contract + mocks + tests only, per plan).
- Playwright browser run (browsers not installed in this environment; spec + config ready).
