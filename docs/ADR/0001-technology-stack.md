# ADR 0001: Technology Stack

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-27 |
| **Context sources** | `docs/PREFLIGHT_AUDIT.md` |

## Context

Nexus is a greenfield product that must ship fast while introducing something neither
sister product has: a **shared canonical graph with multi-tenant private overlays**. The
preflight audit established the ecosystem baseline:

- **Atlas**: React 18 SPA (Vite 7) + Express 5, custom cookie-session auth, plain
  Postgres + Drizzle, **no RLS**, application-level authorization only, no tenancy model.
- **Memoire**: React 19 SPA (Vite 8), **Supabase** (Auth + Postgres + RLS on every table,
  `REVOKE ALL FROM anon`, policies `auth.uid() = user_id`), 26 ordered idempotent
  migrations, no ORM, Vercel serverless functions.

Both sisters deploy to Vercel. Neither has SSR/SEO needs that constrain us, but Nexus has
public-facing canonical entity pages (market reference value depends on discoverability),
so server rendering is genuinely useful for the first time in the ecosystem.

Key requirement analysis:

1. **RLS-based multi-tenancy is a Nexus-only need.** Canonical data is readable by all
   tenants; Layer B overlays must be strictly tenant-isolated. Memoire proves the Supabase
   RLS pattern works in this ecosystem but only for single-user rows; Atlas proves that
   application-level-only authorization is the risky path we want the database to backstop.
2. **No component library can be inherited.** Atlas uses shadcn/Radix, Memoire uses a
   bespoke "Enexia" system — sharing UI across repos does not exist and is not wanted.
3. **Contract discipline is the ecosystem norm** (Atlas versioned Zod contracts, Memoire
   `verify-*.mjs` build gates); the stack must make schema-first contracts cheap.

## Decision

| Concern | Choice |
|---|---|
| Framework | **Next.js 15, App Router** (RSC where useful, route handlers for the API) |
| Language | **TypeScript, `strict: true` everywhere** (including API routes — Memoire's loose `api/` tsconfig is a documented risk we will not repeat) |
| Styling | **Tailwind CSS v4** (fresh design system; no shadcn/Radix dependency, consistent with both sisters having their own UI identity) |
| Data platform | **Supabase**: Postgres + **Row Level Security** + Supabase Auth + Storage |
| Schema/migrations | SQL migrations applied in filename order (Memoire pattern: idempotent, ordered, reviewed), *not* `db:push` (Atlas's drift-prone workflow) |
| Validation | **Zod** for all inbound payloads and integration contracts (versioned literals, Atlas pattern) |
| Data grids | **TanStack Table** (entity browsing is the core UX: dense, sortable, filterable tables) |
| Charts | **Recharts** (already proven in Atlas for market-style visualizations) |
| Unit tests | **Vitest** |
| E2E tests | **Playwright** (both sisters use it; shared institutional knowledge) |
| Build gates | Bespoke `verify-*.ts` contract scripts wired into CI (Memoire pattern: boundary, isolation, and contract tests fail the build) |
| Hosting | **Vercel** (matches both sisters; single operational model) |

## Rationale

- **Supabase over Atlas's Express/Drizzle pattern**: the four-layer model (ADR 0002) needs
  tenant isolation enforced in the database, not only in application code. RLS policies
  (`tenant_id = auth.jwt() ->> 'tenant_id'` for Layer B; world-readable Layer A) give
  defense in depth that Atlas's stack cannot provide without a rewrite. Memoire's RLS
  posture (`REVOKE ALL FROM anon`, explicit policies) is our reference implementation.
- **Supabase over Memoire's exact shape**: Memoire is single-user-per-account by design;
  Nexus tenants are organizations with multiple seats, so we adopt Supabase but design our
  own tenant model (`tenants`, `tenant_memberships`) rather than copying Memoire's
  `auth.uid() = user_id` policies.
- **Next.js over another Vite SPA**: public canonical pages benefit from SSR/SEO; API route
  handlers let us ship the read-only market API (Contract B in
  `docs/INTEGRATION_CONTRACTS.md`) in the same deployable.
- **Zod + contract tests**: direct adoption of the two patterns the audit flagged as most
  valuable in each sister.

## Consequences

- Easier: tenant isolation, auth (Supabase Auth instead of a bespoke session stack),
  storage for evidence attachments, Vercel operations parity with sisters.
- Harder: RLS policy design for a *shared* canonical layer is new ground (Memoire's
  policies are all single-user); policy tests become a first-class deliverable.
- Deliberately rejected: sharing Memoire's Supabase project (would collapse tenancy
  boundaries); adopting Drizzle/Express (would re-create Atlas's no-RLS posture);
  adopting shadcn (would couple our UI identity to Atlas's).
