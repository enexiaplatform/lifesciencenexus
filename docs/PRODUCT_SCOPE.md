# Product Scope — Life Science Nexus

| | |
|---|---|
| **Status** | Phase 0 scope definition |
| **Date** | 2026-07-27 |
| **Companion** | `docs/POSITIONING.md`, `docs/ECOSYSTEM_BOUNDARIES.md` |

## What Nexus is

An **Industry and Product Intelligence Graph for life-science markets**: a structured,
evidence-backed graph connecting organizations, facilities, laboratories, people,
manufacturers, brands, products, SKUs, applications, methods, standards, organisms,
suppliers, prices, tenders, installed assets, validation status, and market evidence.

Concretely, Nexus is:

- **A canonical reference layer** — verified public market facts with evidence refs and
  verification status (Layer A), queryable as a graph and over a read-only API.
- **A private intelligence overlay** — each tenant's quoted prices, field observations,
  installed-base sightings, and notes, isolated per tenant and attachable to canonical
  entities (Layer B).
- **A derived-intelligence engine** — equivalence scores, cost-per-test, market signals,
  computed from A + B, labeled as derived (Layer C).
- **A referral hub** — references out to where work happens: Atlas for lab planning,
  Memoire for commercial execution (Layer D).

## What Nexus is not

Boundary enforcement per `docs/ECOSYSTEM_BOUNDARIES.md`; the short list:

- ❌ **Not a CRM** — no pipelines, forecasts, activities, or "my accounts" (Memoire's job).
- ❌ **Not a lab-planning tool** — no blueprints, capacity models, or method-selection
  compilers (Atlas's job).
- ❌ **Not a quoting/ordering tool** — Nexus records observed market prices; it never
  issues quotes or manages PO/delivery/payment.
- ❌ **Not an academy** — standards/method pages are reference data, not courses.
- ❌ **Not a vendor-recommendation engine dressed as neutral guidance** — derived scores
  are market-facing and labeled; URS/RFQ-style outputs belong to Atlas.
- ❌ **Not a shared database** for any other product — API contracts only (ADR 0003).

## Primary users

**Phase 0–1 (wedge user):** the **country-level commercial leader in industrial
microbiology** — e.g. a country manager or senior sales lead at a micro diagnostics
manufacturer/distributor operating in Vietnam. Their questions: *Which plants have QC
labs? What is installed there now? Which standards drive their testing? Who supplies them
today, at what observed prices? Where are the tenders?* Today they answer these from
personal spreadsheets, distributor hearsay, and memory — Nexus replaces that with a
verified graph plus their own private overlay.

**Later phases (same product, no re-architecture):**

- Product managers mapping SKU positioning and equivalence against competitors.
- Application specialists checking method/standard coverage per organism and industry.
- Distributor sales managers researching accounts before territory visits.
- Marketing/strategy analysts tracking launches, recalls, and price moves as signals.
- Data-steward/ops roles running the publish review queue (ADR 0002).

## Initial wedge

**Industrial Microbiology in Vietnam** — QC microbiology in pharma and food manufacturing.

Why this wedge:

- **Bounded and graph-shaped**: a countable set of plants, labs, suppliers, products, and
  tenders; the graph can plausibly approach completeness.
- **Standards-driven purchasing**: pharmacopoeia/ISO/AOAC methods dictate acceptable
  products — exactly the structure a graph serves better than spreadsheets.
- **Ecosystem synergy**: Memoire's production usage is already Vietnam pharma commercial
  work (VND currency, Vietnam fixtures in the audit), and Atlas has a microbiology domain
  pack — Nexus data is immediately useful to both sister products via the documented
  contracts.

**Configurability rule:** geography and vertical are **configuration, not code**. Vietnam
and industrial microbiology are the first dataset and seed configuration; the schema,
taxonomy, and importers must accept a new country or vertical (e.g. "Singapore, food
safety") as data + config. Nothing in the entity model may hard-code country, currency
(VND is a default, not a constraint — Memoire made the same choice for VND), language, or
vertical-specific fields.

## Phase 0 deliverables (scope guardrail)

1. This documentation set (`docs/`).
2. App scaffold per ADR 0001 with dual data backend per ADR 0004.
3. Read-only browsing of a demo-seeded graph for the wedge (organizations, products, SKUs,
   standards, suppliers, tenders).
4. The Nexus→Memoire handoff (Contract A) in copy/download form, and the market API
   (Contract B) against the demo dataset.
5. Contract tests and boundary checks in CI.

Out of Phase 0: publish workflow UI, Layer C derivations beyond a stub, Contract D,
multi-seat tenant administration.
