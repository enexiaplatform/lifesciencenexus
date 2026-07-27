# ADR 0004: Demo Mode and Data Policy

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-27 |
| **Related** | ADR 0002 (layers), `docs/INTEGRATION_CONTRACTS.md` |

## Context

Three forces shape this decision:

1. **Nexus must be demonstrable before any tenant has real data.** A market graph with no
   market data shows empty tables; the first sales conversation needs a populated,
   believable graph.
2. **The ecosystem has scars here.** Atlas shipped legacy fictional lab-equipment content
   (`client/src/data/mockData.ts:1072`, routes retired 2026-07) that blurred the line
   between demo and real. Memoire's production DB contains *real* commercial data (VND,
   Vietnam pharma fixtures) — a reminder that once real tenant data exists, any mixing
   with synthetic data is dangerous.
3. **Memoire's working precedent**: demo/sample isolation via an `isSample` flag, enforced
   by a build-time contract test (`verify:data-isolation`), plus `VITE_ENABLE_DEMO_MODE`.

## Decision

### Dual data backend

Nexus runs against one of two data backends, selected at boot:

- **Supabase** — when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and
  server-side service key) are configured. Full four-layer behavior, RLS enforced.
- **In-repo demo dataset** — when env is absent. A read-only, version-controlled dataset
  under `src/demo/` loaded through the same repository interface (pattern credit: Atlas's
  `IStorage`/`DatabaseStorage` seam — the interface, not the code). No network, no auth,
  no writes.

The selection is explicit in config, logged at startup, and shown in the UI chrome
("Demo data" banner). There is no silent fallback: misconfigured production env fails
closed (error page), never open into demo.

### Demo tenant separation

- Demo data lives in its own tenant id (`tenant_demo`) distinct from any real tenant, and
  demo content in the canonical layer is additionally marked `is_demo: true` so it can be
  filtered or purged wholesale.
- Demo sessions are anonymous, read-mostly, and cannot trigger the publish workflow into
  the real canonical layer (the demo backend has no write path at all; the Supabase demo
  tenant's policies forbid canonical writes).
- A build-time contract test (Memoire pattern) asserts demo records never appear in
  non-demo query paths.

### Synthetic record policy

- **Every synthetic record is labeled `Demo`** in its display name (e.g. "Công ty CP Dược
  phẩm ABC (Demo)") and carries `is_demo: true`. No unlabeled synthetic rows anywhere.
- **Synthetic prices are never presented as verified.** Demo price rows have
  `verification_status: 'provisional'` at best, are excluded from Layer A `verified`
  filters, and are visually badged in the UI. This mirrors the product's core promise:
  canonical means verified (ADR 0002); demo data must not teach users to distrust that.
- **All contacts in demo data are fictional** — invented names, `example.com`-style or
  clearly fake `.demo` addresses, no phone numbers that could map to real people. No real
  person's name may appear attached to a demo organization.
- Demo organizations use invented company names; where realism requires anchoring to real
  *public* facts (e.g. a real ISO standard, a real regulation), those reference rows are
  real-but-public and do not need the `Demo` label — only entity rows do.
- Demo data never flows into integrations: the Nexus→Memoire handoff is disabled for
  demo sessions (button renders with an explanatory tooltip), and the market API excludes
  `is_demo` rows unless explicitly requested with `?demo=true`.

### Cleanup path

`is_demo` + `tenant_demo` make demo content bulk-deletable with a single scoped query.
Before the first real tenant onboards, a migration removes all demo rows from the canonical
layer of the production instance; demo continues to exist in the in-repo dataset and in
preview environments.

## Consequences

- Phase 0 can demo and E2E-test with zero infrastructure (in-repo dataset) while the
  Supabase path develops in parallel behind the same repository interface.
- The labeling and verification rules cost a small amount of schema and UI work
  (`is_demo`, badges, filters) but protect the product's central trust claim.
- Rejected alternatives: seeding demo rows into real tenant tables unlabeled (Atlas's
  mockData mistake); a separate demo deployment sharing the production DB (violates
  tenant separation); AI-generated demo prose stored in the graph (unverifiable content
  has no place in a truth-bearing store — generator scripts must use deterministic
  templates).
