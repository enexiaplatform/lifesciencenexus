# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-27

Founder-testing release. All six mandatory workflows run end-to-end in demo
mode; Supabase schema/RLS authored and offline-verified (live-DB verification
pending credentials — see `docs/KNOWN_LIMITATIONS.md`).

### Added

- **Domain core** (`src/lib/domain/`): 79-entity type model with four-layer
  visibility discipline (canonical / tenant-private / derived / execution
  refs); zod DTOs; pure engines — unit/pack parsing, cost-per-test with
  sensitivity analysis and mandatory FX-snapshot conversion, SKU equivalence
  scoring with configurable weights and unknown-dimension guards, price
  normalization (tax, IQR outliers, freshness), guided product matching,
  entity resolution (duplicate scoring, field-level merge plans), opportunity
  signal generation (12 rules), confidence aggregation, role permission
  matrix, typo-tolerant search ranker with match reasons, CSV/report export.
- **Demo dataset** (`src/lib/demo/`): 306 synthetic records — all labeled
  `Demo`, fictional organizations/people, `isSynthetic` prices — covering all
  six workflows, with tenant isolation (`tenant_demo` vs `tenant_other`) and
  live-computed signals and duplicate candidates.
- **Database** (`supabase/migrations/`): 10 migrations, 118 tables, 355 RLS
  policies (deny-by-default; canonical read for authenticated; tenant-private
  via membership; reviewer-gated publish; immutable price observations),
  pg_trgm + full-text search indexes, federated `search_entities()`, seed,
  offline verification (`scripts/verify-migrations.mjs`) and live-DB scripts
  (`verify-rls.sql`, `verify-data-isolation.sql`).
- **Market modules**: organizations, sites, laboratories, people
  (tenant-private), manufacturers, suppliers (evidence-gated relationship
  claims), availability, tenders with lots/items/bidders/awards, installed
  base with lifecycle/qualification tracking.
- **Product intelligence**: equivalence workspace (8 weighted dimensions,
  review workflow, regulatory disclaimer), guided product matching,
  specification comparison matrix (unknown ≠ not met), cost-per-test builder
  with sensitivity and export, price intelligence (history, outliers,
  freshness), opportunity signals with explainable reasons.
- **Research workspace**: projects with entity collections, notes, findings
  (verified fact / interpretation / assumption / unknown / recommendation),
  confidence summary, data gaps, exports (JSON/CSV/XLSX/print report).
- **Federated search**: facets, match explanations, recent/saved searches,
  keyboard navigation, topbar quick-search.
- **Data operations**: 9-step CSV/XLSX import wizard (auto-mapping incl.
  Vietnamese synonyms, zod validation, duplicate review, visibility choice,
  import report), export center, entity-resolution merge queue, data-quality
  dashboard.
- **API v1**: 26 documented endpoints (`/api/v1/openapi.json`), API-key auth,
  per-instance rate limiting, zod validation, uniform error envelope.
- **Integrations**: Memoire one-way handoff (`nexus-handoff/v1`, copy JSON /
  download / deep-link placeholder, outbound log), Atlas read-only API
  (`nexus-atlas-read/v1`, canonical-only, vendor-neutrality guard stripping
  commercial fields), field-observation return-path contract (draft).
- **Testing**: 302 Vitest unit/contract/route tests; 22 Playwright E2E tests
  covering all six mandatory workflows plus accessibility smoke (focus traps,
  keyboard nav, form names, table semantics).
- **Docs**: 23 files under `docs/` incl. preflight audit, ecosystem
  boundaries, entity ownership matrix, integration contracts, 4 ADRs,
  architecture/data/evidence/security/search models, import/deployment/runbook
  guides, known limitations, roadmap, build status.

### Fixed

- `TableHead` and two module tables now render `scope="col"` (a11y).
- Repository cache moved to `globalThis` so dev-mode server-action mutations
  are visible to subsequent renders.
