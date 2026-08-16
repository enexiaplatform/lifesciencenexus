# Known Limitations — Life Science Nexus

| | |
|---|---|
| **Status** | Honest register as of v0.1 (founder-testing build) |
| **Date** | 2026-07-28 |
| **Rule** | Every limitation has an impact statement and a remediation path. If an item is fixed, remove it here and update `docs/BUILD_STATUS.md` via the orchestrator. |

## Data & backend

### 1. No live Supabase verification in the build environment
The 10 migrations / 118 tables / 355 RLS policies passed the **offline**
structural gate (`npm run verify:evidence`, `--demo-checks`), but
`scripts/verify-rls.sql` and `scripts/verify-data-isolation.sql` need a live
database and have **never been executed**.
- **Impact:** RLS correctness is proven by construction and review, not by
  execution. A policy bug could ship undetected.
- **Remediation:** provision a Supabase project, run `npm run verify:rls` and
  `npm run verify:data-isolation` (see `docs/DATABASE.md` §Verification) as
  the first v0.2 task, before any real tenant data.

### 2. Supabase repository backend is not implemented
`src/lib/data/supabase-repository.ts` **throws** "not yet implemented" — the
demo in-memory backend is the only runtime today. Failing loudly is
deliberate (fail-closed rather than serving an empty database as real data).
- **Impact:** any deployment with Supabase env vars set errors until the
  repository ships; multi-process persistence does not exist yet.
- **Remediation:** implement `SupabaseRepository` against the shipped schema
  (v0.2, `docs/ROADMAP.md`); the seam (`NexusRepository`) means no UI/API
  changes are needed.

### 3. Dev-mode persistence is per-process
The demo backend keeps mutations (imports, merges, acknowledgements) in
memory; a server restart or a second instance loses/diverges them.
- **Impact:** imported data in demo mode does not survive restarts; not
  suitable for anything but evaluation.
- **Remediation:** item 2 (Supabase backend). No patch for demo mode — its
  ephemerality is by design (ADR 0004).

## Testing & tooling

### 4. Playwright browser revision workaround
Browsers were not installable in the build environment; `playwright.config.ts`
resolves Chromium via `PLAYWRIGHT_CHROMIUM_PATH`, then the managed install,
then a hard-coded cached `chromium-1223` fallback path for offline Windows
machines. Only a smoke spec (`tests/e2e/smoke.spec.ts`) exists.
- **Impact:** E2E coverage is minimal and the cached-revision fallback can
  silently test a stale Chromium.
- **Remediation:** run `npx playwright install --with-deps chromium` in CI
  (already in the gated Supabase E2E job); remove the fallback once every
  environment can download browsers; grow the spec suite.

### 5. Rate limiting is per-instance
`src/lib/api/rate-limit.ts` is an in-memory token bucket (60 req/min per
key+route). On a multi-instance deployment each instance gets its own bucket.
- **Impact:** effective limit ≈ 60 × instance count; a determined client can
  exceed the intended ceiling.
- **Remediation:** swap the store for Redis/KV — the function signature
  (injectable clock, pure result) was designed for exactly that swap.

## Product surface

### 6. PDF export = print-to-PDF
Exports are CSV / JSON / XLSX (`/api/exports/[family]`); "PDF" means the
browser's print dialog on report-style pages.
- **Impact:** no controlled PDF layout, no paginated branded reports.
- **Remediation:** a server-side renderer only when a concrete report format
  is requested; CSV/XLSX cover the data-handoff use cases today.

### 7. Signal rules cover 12 of 19 signal types
Implemented (`src/lib/domain/signals.ts`): equipment_replacement_due,
consumable_pullthrough, tender_renewal_expected, supplier_agreement_expired,
price_stale, competitor_product_discontinued, asset_without_consumables,
vendor_approval_gap, validation_pending, repeated_stock_issue,
unusual_price_increase, incomplete_product_coverage.
Not implemented: new_factory_or_lab, facility_expansion,
new_production_line, regulatory_change, missing_local_supplier,
portfolio_whitespace, cross_sell_gap.
- **Impact:** those 7 types never fire; they need external feeds (news,
  regulatory watchlists, construction permits) Nexus does not ingest yet.
- **Remediation:** v0.2 — rule stubs behind source-type gates; each rule
  ships with evidence requirements, not heuristics alone.

## Auth & integrations

### 8. API auth is a static key / demo mode, not OAuth
`src/lib/api/auth.ts` checks `x-api-key` against `NEXUS_API_KEY`; unset ⇒
open demo mode. No per-consumer keys, no JWT verification yet.
- **Impact:** one shared credential; rotation revokes everyone; demo mode is
  anonymous-readable by design but must never carry real tenant data.
- **Remediation:** swap the key check for Supabase JWT verification — the
  `ApiAuth` shape (tenantId + authenticated) was designed so handlers do not
  change; `api_clients` table already exists for per-consumer keys.

### 9. No live Memoire/Atlas runtime integration
Both integrations are contract + mocks + golden contract tests only
(`docs/MEMOIRE_HANDOFF.md`, `docs/ATLAS_API.md`). Memoire has no inbound
endpoint; Atlas has no consumer wired.
- **Impact:** handoffs stop at copy/download; the Atlas API has no real
  traffic proving the DTOs under load.
- **Remediation:** v0.3 — Memoire inbound endpoint PR (receiver side),
  Atlas consumption PR; contracts are frozen at v1 the moment either side
  consumes live (`docs/INTEGRATION_CONTRACTS.md` §Versioning).

### 10. Mobile = capture-friendly, not full parity
The UI is responsive and usable for field capture (quick notes, photos of
quotes via upload), but dense workspaces (equivalence, entity resolution,
import mapping) are desktop-first.
- **Impact:** field users can capture but not curate from a phone.
- **Remediation:** scoped mobile improvements driven by founder-testing
  feedback; no separate app planned.

## Process

### 11. Seed demo users require manual auth provisioning
`supabase/seed.sql` cannot create `auth.users`; demo profiles/memberships are
skipped (NOTICE) unless the two fixed-UUID users are created first.
- **Impact:** `verify:data-isolation` cannot simulate users on a freshly
  seeded project.
- **Remediation:** documented in `docs/DATABASE.md` §Setup; a Supabase seed
  function or Admin-API script is the v0.2 fix.

### 12. Auth UI has never run against a live Supabase project
Phase 11 shipped the full auth surface (`/login`, `/signup`,
`/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/sign-out`,
middleware gating via `decideAccess`, app-shell account menu), but this
environment has no Supabase credentials: the gating logic is covered by unit
tests and the demo-mode paths by Playwright, while the authenticated flows
(email confirmation, password recovery, session refresh, redirect gating)
have never executed end-to-end.
- **Impact:** a wiring mistake in the Supabase-specific paths (redirect URLs,
  cookie handling, email templates) would only surface at first deployment.
- **Remediation:** with the v0.2 Supabase provisioning (item 1), run the
  smoke checklist in `docs/DEPLOYMENT.md` §Supabase Auth setup against a
  staging project before inviting the first tenant.

### 13. Legal pages pending counsel review
`/legal/privacy` and `/legal/terms` were drafted to match the codebase's
actual behavior (synthetic demo data, no analytics cookies, RLS isolation,
Supabase/Vercel subprocessors, Singapore governing law) but have not been
reviewed by legal counsel.
- **Impact:** clauses may not match the operating entity's jurisdiction or
  contractual needs once real tenants sign.
- **Remediation:** counsel review before the first paid tenant; update the
  "Last updated" date on both pages when revised.
