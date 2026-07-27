# DATABASE.md — Life Science Nexus database layer

PostgreSQL 15+ on Supabase. 118 tables across 10 idempotent migrations under
`supabase/migrations/`, implementing the four-layer model of
[ADR 0002](ADR/0002-four-layer-data-model.md) and the demo policy of
[ADR 0004](ADR/0004-demo-mode-and-data-policy.md). Column names are snake_case
mirrors of `src/lib/domain/types.ts`.

## Migrations

| File | Contents | Tables |
|---|---|---|
| `20260727000000_extensions_and_helpers.sql` | pg_trgm + pgcrypto (pgvector deferred — no proven use case); `is_tenant_member()`, `has_tenant_role()`, `set_updated_at()`, `touch_audit_log()`, `handle_new_user()` | 0 |
| `20260727000001_tenancy.sql` | tenants, profiles (+ auth.users provisioning trigger), tenant_memberships, api_clients, integration_connections | 5 |
| `20260727000002_organizations.sql` | geographies, addresses, organizations, aliases/identifiers/relationships/classifications, sites + sub-units, tenant-private people/contacts | 18 |
| `20260727000003_products.sql` | brands → families → products → skus/packs/formats/documents; 11 scientific reference tables; 8 evidence-carrying product edge tables | 28 |
| `20260727000004_suppliers_prices.sql` | supplier profiles/agreements/listings, availability/stock/lead-time observations, commercial terms; immutable `price_observations` ledger + components/FX/normalizations/benchmarks/review events | 15 |
| `20260727000005_tenders_assets.sql` | tenders + lots/items/bidders/awards/documents/events; asset models; tenant-private installed base + lifecycle/maintenance/qualification streams | 17 |
| `20260727000006_validation_research.sql` | vendor approvals, product/method validations, trials, qualification statuses/evidence; research workspace (projects/questions/collections/notes/findings/exports/saved views); cost-per-test scenarios | 15 |
| `20260727000007_evidence_integration.sql` | sources/documents/snapshots, claims, reviews, assignments, DQ issues, change requests, merge events, audit_log; integration sync/errors/handoffs, external references; opportunity signals, equivalence records, duplicate candidates; import staging. Also adds deferred `source_id` FKs and attaches audit triggers | 20 |
| `20260727000008_indexes_search.sql` | pg_trgm GIN indexes, FTS tsvector generated columns (organizations, products, skus, sources), supporting btrees, `search_entities()` | — |
| `20260727000009_rls.sql` | `ENABLE ROW LEVEL SECURITY` + policies on all 118 tables; anon revoked everywhere | — |

## Column & layer discipline (ADR 0002)

Every table carries: `id uuid pk default gen_random_uuid()`,
`created_at`/`updated_at` (trigger-maintained), `created_by`/`updated_by`
(→ auth.users), `visibility` (`'canonical' | 'tenant_private'`, **no default** —
forgetting to classify is a constraint violation), `is_demo`,
`archived_at` (soft delete).

- **Canonical-capable tables** also carry a nullable `tenant_id` with the
  layer CHECK: `(visibility='canonical' AND tenant_id IS NULL) OR
  (visibility='tenant_private' AND tenant_id IS NOT NULL)`.
- **Tenant-scoped tables** carry `tenant_id NOT NULL` (visibility is thereby
  forced to `tenant_private`).
- `people`, `organization_contacts`, `contact_observations` additionally have
  `CHECK (visibility = 'tenant_private')` — PII can never become canonical.
- Slugs (`unique`) act as human-readable secondary identifiers on
  organizations, products, skus, standards.

## RLS model summary

Deny by default: `anon` has **no privileges** on any public table.
`authenticated` has table grants; row access is governed by policies:

| Table group | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| Canonical-capable (70 tables) | `visibility='canonical'` → all authenticated; `tenant_private` → `is_tenant_member(tenant_id)` | tenant-private rows only, with `has_tenant_role(tenant_id, '{owner,admin,analyst}')` |
| Review/publish (5: evidence_reviews, review_assignments, change_requests, entity_merge_events, price_review_events) | same as above | tenant-private rows with `has_tenant_role(..., '{owner,admin,reviewer}')` |
| Tenant-scoped (37) | `is_tenant_member(tenant_id)` | `is_tenant_member(tenant_id)` (one FOR ALL policy) |
| tenants | members | insert: any authenticated (onboarding); update: owner/admin |
| profiles | self + co-members | self only |
| tenant_memberships | members of the tenant | self-join or owner/admin |
| api_clients, integration_connections | members | owner/admin |
| audit_log | members (or platform entries) | **no policies** — inserts only via the SECURITY DEFINER `touch_audit_log()` trigger; write grants revoked from authenticated |
| price_observations | canonical or member | no DELETE policy (append-only); UPDATE of `original_amount`/`original_currency`/`observation_date` forbidden by trigger — corrections via `supersedes_id` revision rows |

Canonical rows have `tenant_id IS NULL`, so `has_tenant_role()` fails and the
write policies do not apply: **canonical writes are possible only through the
service role**, which Supabase equips with `BYPASSRLS`. That is the publish
pipeline's door (ADR 0002): change request → review → service-role write.
Never expose the service key to the client.

`is_tenant_member()` / `has_tenant_role()` are `SECURITY DEFINER STABLE` with
pinned `search_path` — safe to call from policies on `tenant_memberships`
itself (no RLS recursion).

## Setup

### 1. Create a Supabase project

- Hosted: create a project at <https://supabase.com/dashboard>, then
  `supabase link --project-ref <ref>`.
- Local: `supabase start` (uses `supabase/config.toml`; DB on port 54322).

### 2. Apply migrations

```bash
npm run db:migrate          # = supabase db push
```

Or with plain psql, in filename order:

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

All migrations are idempotent (`CREATE … IF NOT EXISTS`, `DO` blocks,
`DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE OR REPLACE TRIGGER`),
so re-running is safe.

### 3. Seed demo data

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

The seed creates `tenant_demo` + `tenant_other`, canonical reference rows
(VN geographies, ISO 11133:2014, ATCC strains — all `is_demo=true`), and
fictional demo orgs/products/SKUs labeled `(Demo)`.

**Demo users limitation:** `profiles`/`tenant_memberships` reference
`auth.users`, which the seed cannot create. Create the two demo users first
(Supabase Dashboard → Authentication, or the Admin API) with the fixed UUIDs
from the seed header (`11111111-…`, `22222222-…`), then re-run the seed.
Without them the profile/membership inserts are skipped with a NOTICE and
the tenant-context verification below cannot simulate users.

## Verification

| Script | Needs live DB? | Command |
|---|---|---|
| Structural migration gate | no | `npm run verify:evidence` |
| Demo-separation checks (adds ADR 0004 assertions) | no | `npm run verify:demo-separation` |
| RLS enabled everywhere, anon revoked, policy spot-checks | yes | `npm run verify:rls` |
| Cross-tenant isolation proof (needs demo auth users) | yes | `npm run verify:data-isolation` |
| Integration contract tests | no | `npm run verify:integrations` |
| Full production gate | no | `npm run verify:production-readiness` |

For `verify:rls` / `verify:data-isolation`, set `DATABASE_URL` to a Postgres
connection string (Supabase Dashboard → Project Settings → Database →
Connection string, use the *direct* connection), e.g.
`postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`.
Run them from Git Bash (the scripts use `$DATABASE_URL` shell expansion).

## Notes & conventions

- **Layer C tables** (price_normalizations, price_benchmarks,
  opportunity_signals, equivalence_records, duplicate_candidates) are written
  by engines via service role and carry full lineage (`computed_from`,
  `triggering_record_ids`, `evidence_claim_ids`) — never hand-edited.
- **Evidence edges** (product_* edges, relationships, listings, awards,
  compatibilities, vendor approvals) carry the flattened `EdgeEvidence`:
  `source_id`, `confidence` (0–1), `valid_from`, `valid_to`, `reviewer_id`,
  `notes`, `evidence_state` (8-state CHECK mirroring `EVIDENCE_STATES`).
- `claims.confidence` / `price_observations.confidence` are `jsonb` holding
  the 7-dimension `ConfidenceDimensions`.
- `cost_per_test_scenarios` is included beyond the original table list: it is
  part of the canonical entity model (`EntityTypeMap.cost_per_test_scenario`)
  and belongs to the research workspace family (tenant-private).
- Review/workflow tables (evidence_reviews, change_requests, …) keep the TS
  `BaseEntity` shape; `tenant_id` records the *acting* tenant so reviewer-role
  RLS is enforceable.
- `source_id` columns in migrations 2–6 get their FK to `public.sources` in
  migration 7 (sources did not exist yet) via an idempotent `DO` block.
- pgvector is intentionally not installed (see migration 1 comment).
