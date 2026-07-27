# ADR 0003: Integration via API Contracts, Not Shared Data

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-27 |
| **Related** | `docs/INTEGRATION_CONTRACTS.md` (the contracts themselves), `docs/PREFLIGHT_AUDIT.md` §3 |

## Context

Nexus must exchange data with two live sister products whose data postures make any
shared-storage approach unsafe:

- **Atlas** has no RLS and no tenancy model; authorization is application-level in
  Express. Putting Nexus tables in Atlas's database — or vice versa — would bypass one
  side's authorization entirely. Its `db:push` schema workflow also means schema drift is
  not caught by migration review.
- **Memoire** has RLS on every table with `auth.uid() = user_id` policies — deliberately
  single-user-per-account, documented in its CommercialScope. Any shared-read concept
  fights every existing policy and its contract-tested data-isolation boundary
  (`verify:data-isolation`).

Additionally, the three products run different auth systems (cookie sessions, Supabase
JWT, Supabase JWT with a future tenant claim) — there is no identity substrate on which
shared rows could be authorized.

## Decision

1. **No shared tables, no shared databases, no cross-product DB foreign keys.** Each
   product owns its database exclusively. This is a permanent architectural invariant,
   not a Phase 0 expedient.
2. **Stable API identifiers.** Every cross-product reference uses the source system's
   stable id — Nexus issues `nexus_<type>_<ulid>` ids — never names, emails, or surrogate
   row numbers. (Memoire's name-keyed account joins are exactly the fragility this avoids;
   its `external_source_key` columns are the receiver-side precedent.)
3. **`external_entity_references` table for links.** When a Nexus entity relates to an
   Atlas or Memoire object, the relationship is a content-free reference row (Contract C,
   `docs/INTEGRATION_CONTRACTS.md`): target system, object type, opaque ref,
   dangling-tolerant, one-hop. Never a FK, never an embedded copy.
4. **Versioned contracts, mock-first.** Every integration surface is a Zod schema with a
   version literal (Atlas `quality-lab-input/v1` pattern), shipped with fixtures and a mock
   server, and guarded by consumer-driven contract tests in CI that fail the build on
   drift (Memoire `verify-*.mjs` pattern). No live endpoint is consumed before its mock
   contract has passed on both sides.
5. **One-way flows by default.** Nexus → Memoire handoff (Contract A); Atlas ← Nexus
   read-only market API (Contract B). The only future inbound flow is the reviewed
   `field_observation` path into tenant-private Layer B (Contract D). Nexus never pulls
   from either sister's private stores.

```mermaid
sequenceDiagram
    participant Dev as Nexus developer
    participant Mock as Contract mock (tests/contracts)
    participant CI as CI contract tests
    participant Live as Live sister product
    Dev->>Mock: implement against Zod schema + fixtures
    Mock->>CI: consumer-driven tests
    CI-->>Dev: pass/fail (build gate)
    CI->>Live: only after mock contract is green on both sides
    Note over Live: v1 frozen once consumed live;<br/>breaking change = version bump
```

## Consequences

- Sister products need **zero schema changes** for Nexus Phase 0: Memoire receives handoffs
  through existing `external_source_key` columns and its import CLI; Atlas consumes a
  read-only API.
- Deletion/renaming in one product can never cascade into another (dangling references are
  a designed-for UI state, "unavailable").
- Contract tests become release blockers — a deliberate cost, matching the ecosystem's
  existing discipline.
- Rejected alternatives: shared Supabase project (collapses tenancy boundaries); ETL into a
  shared warehouse (creates a fourth, unowned source of truth); event bus (no consumer
  exists today; adds infrastructure before the first contract is even exercised).
