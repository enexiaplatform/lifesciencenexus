# Entity Ownership Matrix

| | |
|---|---|
| **Status** | Normative for Phase 0+ |
| **Date** | 2026-07-27 |
| **Companion** | `docs/ECOSYSTEM_BOUNDARIES.md` (the *why*), `docs/INTEGRATION_CONTRACTS.md` (the *how*) |

One row per entity/concept. Exactly one **canonical owner** per row — the system whose
write wins. Other columns show where projections, private copies, or references may live.

**Legend** — ✅ canonical owner · ◐ holds a projection / private copy / reference · — none

| Entity / concept | Nexus canonical (Layer A) | Nexus tenant-private (Layer B) | Memoire | Atlas | Flow direction & notes |
|---|:---:|:---:|:---:|:---:|---|
| Organizations (manufacturers, pharma/food plants, distributors) | ✅ | ◐ | ◐ | — | Nexus → Memoire one-way handoff writes `source_system='nexus'` + `external_source_key`; Memoire row stays a name-keyed private copy (`UNIQUE(user_id,name)`). Atlas keeps free-text `companyName` only. |
| Facilities / laboratories (sites of organizations) | ✅ | ◐ | — | — | New canonical concept; neither sister has site-level entities today. |
| Accounts (your commercial relationship to an org) | — | — | ✅ | — | Relationship state (`relationship_status`, targets, ka_flag) is Memoire-only. Nexus must not store per-tenant relationship data on canonical orgs. |
| Contacts / people (your counterparts) | — | ✅ | ✅ | — | Memoire owns the user's contacts (uuid FK to accounts). Nexus Layer B may hold tenant-observed contact facts (e.g. "QC manager at site X") as private overlay; canonical Layer A holds only public figures (published authors, listed signatories). |
| Stakeholders / MEDDIC roles on a deal | — | — | ✅ | — | Memoire-only. Never crosses into Nexus. |
| Products (market entities: instruments, kits, media, reagents) | ✅ | ◐ | — | ◐ | Nexus → Atlas read-only API. Memoire keeps free-text `product_or_solution`/`brand` with optional Nexus link. Distinct from Atlas's *own* catalog (`server/products.ts`). |
| SKUs / pack sizes / catalog numbers | ✅ | ◐ | — | ◐ | Nexus → Atlas read-only API. No SKU concept exists in either sister today. |
| Brands | ✅ | ◐ | — | — | Canonical brand → manufacturer mapping. Memoire `brand` free text may link out. |
| Market prices (list/observed price evidence) | ✅ (verified public only) | ✅ (quoted/negotiated) | — | ◐ | Quoted prices live in Layer B only, never canonical without review. Atlas reads public price *bands* via API, attributed, never as vendor selection. |
| Quotes (a commercial offer to a customer) | — | — | ✅ | — | Memoire header-level quotes (amount/currency/status; no line items). Nexus never issues quotes. Atlas `quote_requests` is inbound engagement requests — different concept, stays in Atlas. |
| Opportunities / pipeline | — | — | ✅ | ◐ | Memoire-only (stages mapped to canonical `new→…→won/lost`). Atlas `quote_requests` pipeline is engagement-scoped and remains Atlas-internal. |
| Commitments (promises with due-date history) | — | — | ✅ | — | Commercial Kernel. Nexus Layer D may hold a *reference* to a commitment id, never its content. |
| Threads (derived commercial storyline) | — | — | ✅ | — | Derived at read time by `deriveThreads.ts`; Nexus stores nothing thread-shaped. |
| Standards (ISO, pharmacopoeia, AOAC, national regs) | ✅ | ◐ | — | ◐ | Nexus canonical registry; Atlas consumes via read-only API as *reference data* for its compiler — Atlas's executable rules still never auto-update from external evidence (Atlas governance rule). |
| Methods (test methods, SOP archetypes) | ✅ (as market entities) | ◐ | — | ✅ (as compiler domain) | Dual representation by design: Atlas's method graph is decision logic; Nexus's method entities are market reference (who offers it, which standards cite it). Neither replaces the other. |
| Applications (use cases per industry segment) | ✅ | ◐ | — | ◐ | Nexus canonical; Atlas may read for context. |
| Organisms (target organisms for micro testing) | ✅ | ◐ | — | ◐ | Nexus canonical taxonomy; Atlas microbiology domain pack stays its own decision content. |
| Evidence (market evidence: listings, tender awards, publications) | ✅ | ◐ | — | ✅ (lab-decision evidence) | Different evidence classes. Nexus `EvidenceRecord`-style rows support market facts; Atlas `EvidenceRecord` supports lab decisions. No shared table; Atlas reads Nexus evidence via API with kind `regulatory-context`/`benchmark` mapping. |
| Tenders / bids | ✅ | ✅ (bid strategy notes) | — | — | New canonical concept. Public award notices → Layer A after verification; tenant pursuit notes → Layer B. |
| Installed base (assets at sites: instrument X at plant Y) | ✅ (verified) | ✅ (observations) | — | — | Field observations land in Layer B first; promotion to canonical only via reviewed publish workflow (ADR 0002). |
| Suppliers / distributors (as market actors) | ✅ | ✅ (terms, contacts) | — | ◐ | Nexus canonical supplier graph. Atlas RFQ outputs keep anonymous `Supplier A/B/C` slots; real supplier data must not be merged into Atlas vendor-neutral outputs. |
| Market signals (price moves, launches, recalls, hiring) | ✅ (derived, Layer C) | ✅ | ◐ | — | Nexus Layer C aggregates. Memoire `sales_activities` jsonb signals stay personal; future `field_observation` return path feeds Layer B only. |
| Research / publications | ✅ | ◐ | — | ◐ | Nexus indexes as market evidence. Atlas Academy content stays Atlas-owned educational material. |
| Lab planning models / blueprints | — | — | — | ✅ | Atlas compiler output. Nexus stores at most a Layer D reference (e.g. "blueprint id exists"), never model content. |
| Academy / educational content | — | — | — | ✅ | Atlas MDX pipeline (`content/academy`, `content/blog`). Nexus method/standard pages are reference data, not courses. |
| Win/loss history | — | — | ✅ | — | Memoire `deals` anonymized archive. Nexus market-share inference may consume only via the future reviewed observation path — never direct table access. |
| Validation status (product/method validation state) | ✅ | ✅ | — | ◐ | Nexus canonical registry (e.g. AOAC/ISO validation listings); tenant-private validation work-in-progress in Layer B. |

## Rules for reading this matrix

1. **One ✅ per row.** If a feature needs an entity that is ✅ elsewhere, integrate — do
   not copy. If it seems to need a second ✅, the feature is out of bounds; escalate to an
   ADR.
2. **◐ in Nexus Layer B never implies Layer A.** Tenant-private observations reach the
   canonical layer only through the reviewed publish workflow (ADR 0002).
3. **◐ in Memoire is always per-user and private.** Nexus reads nothing from Memoire;
   Memoire projections of Nexus entities arrive only through the documented handoff.
4. **◐ in Atlas is read-only from Nexus's side.** Nexus never writes to Atlas; Atlas
   decides what to consume and remains vendor-neutral when presenting it.
5. Rows are concepts, not table names. Physical schemas are designed in Nexus Phase 1 and
   must be traceable back to a single ✅ row here.
