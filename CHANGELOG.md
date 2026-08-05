# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Second models per sterility brand + cross-type equivalence records** (demo
  dataset 874 → 904 records): SteriTest ST-300 high-throughput dual-head
  system and SteriPump SP-1000 compact system give each sterility brand a
  two-model lineup on the shelf. Two new equivalence assessments extend the
  workspace beyond media: SteriTest ST-200 vs SteriPump SP-3000 (equipment,
  ~74 functional_equivalent) and EndoZyme rFC vs DeltaTest LAL gel-clot
  (~62 closest_alternative with a major difference on alternative-method
  validation under USP <85>). Both new models carry asset models, canister
  compatibilities, listings, prices and availability.

### Added (earlier in this cycle)

- **Analytical QC / R&D wave** (demo dataset 763 → 874 records). Four more
  schema-level categories (migration
  `20260803000002_extend_product_categories_round2.sql`):
  `analytical_chromatography` (PicoSep C18 UHPLC vs AuriSep C18 HPLC, new
  manufacturer PicoSep Analytics JP, anchored to the new USP <621>),
  `reference_standards` (VestaRef acetaminophen RS vs OrizonRef endotoxin
  CSE), `water_testing` (AuroraChrom coliform P/A kit vs DeltaWater MF kit,
  anchored to the new ISO 9308-1), and `single_use_systems` (NovaraFlex
  50 L bioreactor bag vs KestrelFlex 100 L mixing bag). New reference
  entities: Analytical QC + Water quality testing applications, HPLC method,
  Assay (HPLC) test type. Category metadata, VI/EN synonyms and "how to
  choose" hints for all four shelves.

### Added (earlier in this cycle)

- **Depth pass across the whole dataset** (demo dataset 704 → 763 records):
  pack-size variants with their own pack economics (TSA 100 g / 5 kg, CHO-Max
  100 L process scale, SteriCan 50/box bulk), price-history pairs for the
  SteriPump canisters and the Protein A resin (both below the
  unusual-increase threshold), SDS/CoA/certificate documents for the
  ethanol, resin, filter, medium and QC pellets, a third tender in the
  missing pipeline state (RRH-2026-003, closed/in evaluation, for endotoxin
  reagents and biological indicators with two competing bids and a
  deadline-extension event), commercial terms for all three distributors,
  a biopharma research project ("mAb downstream consumables — Vietnam" with
  the full capture → polishing → sterile filtration → BET chain linked), two
  more customer contacts (NFS procurement officer, An Giang QA), a pending
  vendor approval at Song Huong and a planned USP <71> validation of the
  Meridian canisters at Delta Pharma.

### Added (earlier in this cycle)

- **Shelf completion: every category now offers a two-brand choice** (demo
  dataset 639 → 704 records). The last single-brand and empty shelves are
  filled: SteriPump closed sterility canisters (Meridian, second brand on the
  sterility-consumables shelf — and the SP-3000's own-brand canister option
  alongside cross-brand SteriCan), DeltaPlate 55 mm contact plates (second
  EM-consumables brand), OrizonQC E. coli ATCC 8739 QC pellets (second
  reference-materials brand, new OrizonQC brand), and the previously empty
  microbiology-lab-accessories shelf (Condor PetriTurn turntable + SteriPump
  sterile inoculating loops). Plus: evidence-review history for the LAL USP
  <85> claim and the RRH tender incumbency claim, one new data-quality issue
  (missing GTIN on the AG-90), and three more demo geographies (Da Nang, Can
  Tho, Hai Phong).

### Added (earlier in this cycle)

- **Full-process portfolio: upstream → downstream → QC for Pharma API and
  Biopharma** (demo dataset 487 → 639 records). Five new product categories
  (schema-level, with migration `20260803000001_extend_product_categories.sql`
  refreshing the category CHECK constraints): `cell_culture_media` (CHO-Max
  basal medium vs DeltaGrow feed), `process_chemicals` (VestaPure USP ethanol
  vs NovaraCell PBS), `purification_chromatography` (AuriSelect Protein A
  resin vs KestrelFlow Q membrane capsules), `process_filtration` (SteriFlow
  0.22 µm sterilizing-grade cartridges vs AuriFlow TFF cassettes),
  `endotoxin_testing` (OrizonEndo rFC animal-free assay vs DeltaTest LAL
  gel-clot, both anchored to the new USP <85> standard). Five new fictional
  manufacturers (Novara Bioprocess CH, Kestrel Filtration US, Auriga
  Separations SE, Vesta Chemicals DE, Orizon BioAnalytics NL) routed through
  the existing Mekong/Saigon/Hong Ha distributor channels; new reference
  entities (upstream cell culture / API synthesis / downstream purification /
  sterile filtration / endotoxin testing applications, affinity
  chromatography method, endotoxin test type, cell-culture-broth and
  bulk-drug-substance sample types); category metadata + VI/EN synonyms and
  "how to choose" hints for every new shelf.

### Added (earlier in this cycle)

- **Equipment shelves rounded out** (demo dataset 427 → 487 records): every
  equipment category now has at least two competing brands to compare —
  AirGuard AG-90 open-plate air sampler (90 mm plates from any brand, vs the
  AS-100's proprietary contact plates) and PartiCount PC-90 handheld particle
  counter (both Meridian, via Saigon Scientific); the previously empty
  biological-indicators shelf gains DeltaSeed G. stearothermophilus spore
  strips (ISO 11138 evidenced) vs SteriSure self-contained ampoules
  (conformance unverified) with the new ISO 11138-1 standard, the organism
  ATCC 12980 and a sterilization-validation application. All equipment models
  carry asset models + consumable compatibilities so shelves show each
  brand's consumable ecosystem.
- **"How to choose" guidance for every category shelf** (dehydrated vs ready
  media trade-offs, QC strain passage limits, sampler plate ecosystems, BI
  organism/method matching, …) in `src/components/products/categories.ts`.

### Added (earlier in this cycle)

- **Category browse shelves** (`/categories`, `/categories/[category]`): buyer
  entry point when the need is a product TYPE, not a known brand/SKU. Each
  shelf lists brands and models side by side — applications, standards, latest
  price, availability, suppliers, and (for equipment) compatible consumables —
  plus "how to choose" hints and a deep link into `/compare`. Category
  metadata + VI/EN synonym matcher in `src/components/products/categories.ts`;
  search now shows "Matching categories" cards (e.g. "closed sterility
  testing system" → sterility testing equipment shelf); nav gains a
  Categories item; product-list category badges link to the shelf.
- **Sterility testing equipment demo data**: two competing closed sterility
  testing systems — Condor SteriTest ST-200 and Meridian SteriPump SP-3000
  (new manufacturer Meridian Lab Systems, IT) — with SKUs, packs, manuals,
  USP <71> / membrane-filtration edges, supplier listings, prices,
  availability (in stock vs limited/45-day lead), asset models, one installed
  ST-200 at Delta Pharma (consumable_pullthrough), and cross-brand SteriCan
  canister compatibility. Demo dataset 387 → 427 records.

### Added (earlier in this cycle)

- **Demo dataset enrichment** (`src/lib/demo/`): 306 → 387 synthetic records.
  Second account thread (food safety): Aurora BioWorks (chromogenic-media
  manufacturer) with AuroraChrom coliform agar + Listeria ready plates,
  Hong Ha Scientific (northern distributor) with agreement/listings/prices,
  Song Huong Dairy (Hue) with site/lab/contact/incubator asset, Northern
  Food Safety Center with an open tender (NFS-2026-007) mapped to the new
  SKUs; ISO 6579-1 / 11290-1 standards, Listeria + Salmonella organisms,
  raw-milk sample type, pathogen-detection application, and a dairy
  research project. All records remain fictional, `isDemo: true`, and
  within existing test invariants (tenant isolation, duplicate pairs,
  signal anchors).

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
