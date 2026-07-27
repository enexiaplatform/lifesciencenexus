# Integration Contracts

| | |
|---|---|
| **Status** | Proposed — contracts versioned as `v1`, mock-first before any live call |
| **Date** | 2026-07-27 |
| **Basis** | `docs/PREFLIGHT_AUDIT.md` (all receiver-side facts verified against the repo clones) |

## 0. Non-negotiable principles

1. **No shared tables, no shared databases, no cross-product DB foreign keys.** Atlas has
   no RLS (a shared DB would bypass its Express-level authorization); Memoire's RLS is
   deliberately single-user. Integration happens over versioned API/JSON contracts only.
2. **Stable identifiers.** Every cross-product reference uses the source system's stable id
   (Nexus: `nexus_<type>_<ulid>`), never names, emails, or row numbers.
3. **Versioned payloads.** Every contract is a Zod schema with a literal `version` field
   (pattern credit: Atlas's `quality-lab-input/v1` contracts). Breaking changes bump the
   version; consumers pin versions.
4. **Mock-first.** Each contract ships with a mock server/fixtures and contract tests
   (pattern credit: Memoire's `verify-*.mjs` build gates) before either side wires a live
   endpoint.
5. **One-way by default.** Nexus does not pull from Atlas or Memoire private stores.
   Inbound data to Nexus arrives only via Contract D (future) into tenant-private Layer B.

## Contract A — Nexus → Memoire: one-way entity handoff (`nexus-handoff/v1`)

**Purpose.** A Nexus user looking at a canonical organization (or product, supplier,
tender) pushes it into their own Memoire workspace as an account/opportunity seed.

**Receiver reality (verified).** Memoire has **no inbound entity or webhook endpoint** —
`api/` exposes only health, billing, stripe-webhook, product-events, request-access,
client-log, export, delete-account. What Memoire *does* have:

- Import metadata columns `source_system`, `external_source_key`, `source_hash`,
  `import_batch_id` on `accounts`, `opportunities`, `stakeholders`, `sales_activities`,
  `operating_context`, with unique indexes for idempotent upserts
  (migration `20260618090000_founder_core_import_metadata.sql`).
- A service-role import CLI, `scripts/import-founder-core.mjs` (dry-run default,
  `source_hash` dedupe, chunked upserts, `--rollback`, audited via
  `import_batches` / `import_row_results`).
- Kernel `SourceMetadata` reserving `sourceType: 'email'|'calendar'|'crm'|'erp'`.

### A.1 Payload

```json
{
  "version": "nexus-handoff/v1",
  "nexus_entity_id": "nexus_org_01J9ZQ7K4M8T2V0XW6C3R5YBNA",
  "display_name": "Công ty CP Dược phẩm ABC (Demo)",
  "entity_type": "organization",
  "canonical_url": "https://nexus.example.com/org/nexus_org_01J9ZQ7K4M8T2V0XW6C3R5YBNA",
  "summary": "Pharma manufacturer, Hai Phong. Sterile + oral solid dose. QC micro lab on site; 3 tenders observed 2025–2026.",
  "evidence_refs": [
    "nexus_ev_01J9ZQB3... (GMP certificate listing, public-reference)",
    "nexus_ev_01J9ZQH9... (tender award notice, 2026-03)"
  ],
  "visibility_warning": "Contains tenant-private Layer B notes. Do not share this file outside your workspace.",
  "suggested_memoire_action": "create_account",
  "timestamp": "2026-07-27T07:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `version` | literal `"nexus-handoff/v1"` | Zod literal; reject on mismatch |
| `nexus_entity_id` | string, `nexus_<type>_<ulid>` | Becomes Memoire `external_source_key` |
| `display_name` | string | Vietnamese names pass through unmodified — Memoire's `accountIdentity.ts` is diacritic-insensitive and handles dedupe |
| `entity_type` | `organization \| product \| supplier \| tender` | v1 set; extend by version bump |
| `canonical_url` | URL | Deep link back to the Nexus entity page |
| `summary` | string, ≤ 500 chars | Plain text, no markdown, no AI-generated pitch (respects Memoire's no-AI contract) |
| `evidence_refs` | string[] | Nexus evidence ids only — Memoire can resolve them later via API; no evidence *content* is embedded |
| `visibility_warning` | string | Required whenever any Layer B (tenant-private) field contributed to the payload |
| `suggested_memoire_action` | `create_account \| link_account \| create_opportunity_seed` | Advisory; Memoire UI may ignore |
| `timestamp` | ISO 8601 | Generation time |

### A.2 Delivery channels (all three, user-initiated)

1. **Copyable JSON** — "Copy for Memoire" button on the Nexus entity page.
2. **Downloadable file** — `<entity>.nexus-handoff.json`, importable through Memoire's
   existing import path.
3. **Deep-link placeholder** — `https://memoire.example.com/import?source=nexus&payload=…`
   shape reserved; Memoire has no such route today, so the link degrades to instructions.

### A.3 Memoire-side ingestion (no Memoire changes required for v1)

- Map: `nexus_entity_id → external_source_key`, constant `source_system='nexus'`,
  `source_hash` = FNV/SHA of payload (matches Memoire's `ingestionSource.ts` convention).
- Upsert path: the service-role CLI (`scripts/import-founder-core.mjs`) or a user-driven
  CSV/JSON import reusing the same columns — idempotent by the existing unique indexes, so
  re-imports never duplicate accounts.
- **Name-keyed tolerance:** Memoire joins accounts by name (`accountKey()`, threads derived
  by name). The handoff must write `external_source_key` and *tolerate* Memoire renaming or
  merging the account (`account_merges`); Nexus treats the Memoire row as a private fork
  and never tries to sync it back.
- **Local-first caveat:** a stale Memoire client can overwrite externally pushed fields;
  therefore Nexus only *seeds* and never maintains state in Memoire.

## Contract B — Atlas ← Nexus: read-only market API (`nexus-market-api/v1`)

**Purpose.** Atlas (and later other consumers) reads canonical market data to ground its
outputs in real products/standards — without ever becoming a market database itself.

**Atlas reality (verified).** No outbound webhooks or market-data APIs exist today; Atlas
needs no schema change to consume a read-only API. Its vendor-neutrality contract
(URS/RFQ v1 Zod literals `vendorNeutral:true`, `selectsVendor:false`,
`assertsProductEquivalence:false`) is contractual and governs how Nexus data may be
presented.

### B.1 Surface

Base: `https://nexus.example.com/api/v1/` — all endpoints `GET`, JSON, paginated
(`cursor`), `ETag` + `Cache-Control`, API-key auth (per-consumer key, not user JWT).

| Endpoint | Returns |
|---|---|
| `/products` `/products/{id}` | Market products (instruments, kits, media, reagents) |
| `/skus` `/skus/{id}` | SKUs, pack sizes, catalog numbers |
| `/standards` `/standards/{id}` | ISO / pharmacopoeia / AOAC / national standards registry |
| `/methods` `/methods/{id}` | Methods as market entities |
| `/applications` | Application areas per industry segment |
| `/organisms` | Target-organism taxonomy |
| `/suppliers` `/suppliers/{id}` | Supplier/distributor graph |
| `/evidence` `/evidence/{id}` | Public-reference market evidence only |

### B.2 Hard rules

- **Canonical-only.** The API serves Layer A (verified public) and Layer C (derived,
  labeled as derived). Tenant-private Layer B is *never* exposed to external consumers.
- **Vendor neutrality is the consumer's contract, Nexus's data shape.** Nexus responses are
  factual (entity + attribute + evidence ref). Nexus does not emit rankings framed as lab
  recommendations, "best product" fields, or anything Atlas would have to refuse under
  `selectsVendor:false`. Derived Layer C scores are namespaced (`derived.equivalence_score`)
  and labeled `"derived": true` so Atlas can exclude them from vendor-neutral outputs.
- **Attribution.** Consumers display `source: "Life Science Nexus"` with the entity's
  canonical URL when surfacing Nexus data.
- **No write surface.** There is no POST/PUT/PATCH on this API. Atlas evidence and rules
  stay Atlas's; Nexus evidence does not auto-update Atlas executable rules (Atlas
  governance invariant).
- **Stability.** ids are permanent; deleted entities return `410 Gone` with a `replaced_by`
  pointer rather than 404.

## Contract C — Cross-product references inside Nexus (`external_entity_references`)

Since DB-level FKs across products are forbidden, Nexus Layer D stores references in a
dedicated table:

| Column | Type | Notes |
|---|---|---|
| `id` | `nexus_ref_<ulid>` | |
| `nexus_entity_id` | text | Which Nexus entity the reference hangs off |
| `target_system` | `atlas \| memoire` | |
| `target_object_type` | text | e.g. `atlas.blueprint`, `memoire.commitment` |
| `target_object_ref` | text | Opaque id/URL in the target system — **never** a DB FK |
| `created_by_tenant` | uuid | References can be tenant-private |
| `visibility` | `canonical \| tenant` | Same discipline as ADR 0002 |
| `created_at` | timestamptz | |

Rules: references are **dangling-tolerant** (target may be deleted; Nexus renders
"unavailable"), **content-free** (no copies of Atlas blueprint content or Memoire
commitment text), and **one-hop** (no chaining references through references).

## Contract D — Future: Memoire → Nexus `field_observation` return path (`field-observation/v0-draft`)

**Status: draft, not to be built in Phase 0.** Captured now so Phase 0 schemas reserve room.

- Shape: tenant-observed market facts (quoted price, installed-base sighting, supplier
  visit note) exported *by explicit user action* from Memoire, imported into **Nexus
  Layer B only**, stamped `source: memoire`, `provenance: field_observation`.
- **Never** lands in the canonical layer directly; promotion only via the reviewed publish
  workflow (ADR 0002). Memoire's anonymization posture applies: raw conversation text and
  counterparty PII are stripped before export.
- Precedent inside Memoire: `deals` anonymized archive shows the sanitization bar.

## Versioning and testing

- Each contract = one Zod schema module + fixtures + a mock server in `tests/contracts/`.
- CI runs consumer-driven contract tests on every PR (fail the build on drift — the
  Memoire `verify-*.mjs` pattern).
- Breaking change = version bump + 90-day overlap where feasible; v1 endpoints are frozen
  once any sister product consumes them live.
