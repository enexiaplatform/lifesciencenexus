# Roadmap — Life Science Nexus

| | |
|---|---|
| **Status** | Planning document; phases re-planned at each gate |
| **Date** | 2026-07-28 |
| **Related** | `docs/KNOWN_LIMITATIONS.md` (numbered items referenced below), `docs/BUILD_STATUS.md` |

## v0.1 — Founder testing (current)

Green build: typecheck / lint / 302 vitest tests / `next build` pass.

- Full domain core (79 entity types, 8 pure engines), repository seam with
  demo backend (763 synthetic records, `tenant_demo`).
- All UI modules: Market, Products, Intelligence, Search, Research/Review,
  Data Ops (import wizard, entity resolution, data quality), Settings.
- API v1 surface + `openapi.json`; Memoire handoff + Atlas read API as
  versioned contracts with golden contract tests (mock-first).
- Supabase schema shipped offline-verified: 10 migrations, 118 tables, 355
  RLS policies, pg_trgm + FTS + `search_entities()`.
- **Exit criteria:** founder can run the six workflows end-to-end in demo
  mode and say which one earns the first real tenant.

## v0.2 — Real backend

| Item | Scope | Depends on |
|---|---|---|
| Live Supabase verification | provision project, apply migrations, run `verify:rls` + `verify:data-isolation` (limitation 1) | Supabase credentials |
| `SupabaseRepository` implementation | replace the throwing stub (limitation 2); same `NexusRepository` seam, no UI changes | live verification |
| Auth UI with Supabase Auth | sign-in/up, session via `src/middleware.ts`, tenant membership flow; demo users via Admin-API script (limitation 11) | SupabaseRepository |
| Remaining 7 signal rules | new_factory_or_lab, facility_expansion, new_production_line, regulatory_change, missing_local_supplier, portfolio_whitespace, cross_sell_gap — each behind explicit source-type gates (limitation 7) | source ingestion for the new feeds |
| Review assignments | route claims to named reviewers (`review_assignments` table exists), workload view on `/review` | auth UI |
| Per-consumer API keys | wire the existing `api_clients` table; JWT verification replacing the static key (limitation 8) | auth UI |

**Exit criteria:** first real tenant works entirely on Supabase; demo data
purged from the production canonical layer (ADR 0004 cleanup path).

## v0.3 — Live integrations & smarter matching

| Item | Scope | Depends on |
|---|---|---|
| Memoire inbound endpoint (PR to Memoire) | receiver for `nexus-handoff/v1` using `external_source_key` + import CLI path; Nexus side is already contract-complete (limitation 9) | Memoire maintainers; v0.2 auth |
| Atlas consumption (PR to Atlas) | Atlas reads `nexus-atlas-read/v1` endpoints for products/standards/methods grounding; attribution per contract | v0.2 (canonical data live) |
| pgvector evaluation | semantic embeddings as a **derived** Layer C artifact for duplicate detection and cross-language (VI/EN) matching; compare against current trigram ranker on the entity-resolution queue's precision/recall; install only if measurably better (deferred per migration 0000 note) | enough real duplicates to evaluate |
| AI-assisted evidence extraction (optional) | behind `NEXUS_ENABLE_AI_EXTRACTION` (default `false`) and the documented guardrails: extraction output lands `unverified`, tenant-private, always source-attached, never auto-published; the flag exists in `.env.example` today | explicit founder decision; review-capacity headroom |
| Shared rate-limit store | Redis/KV swap for the token bucket (limitation 5) | multi-instance deployment need |

**Exit criteria:** one sister product consumes one contract in production;
v1 contracts freeze for live consumers (90-day overlap policy on bumps).

## v1.0 — Multi-tenant GA

| Item | Scope | Depends on |
|---|---|---|
| Tenant onboarding & admin | self-serve tenant creation, membership management, per-tenant demo sandbox | v0.2 auth |
| Data-steward operations | publish-queue staffing model, SLAs from `docs/OPERATIONS_RUNBOOK.md` enforced with metrics | v0.2 review assignments |
| New verticals beyond micro-VN | **by configuration, not re-architecture**: vertical = seed packs of categories/applications/standards/organisms + geography; the industrial-microbiology Vietnam wedge is the reference pack | proven wedge economics |
| E2E suite expansion | Playwright beyond the smoke spec; remove the chromium-1223 fallback (limitation 4) | CI browser install |
| PDF/report renderer | only if founder testing proves demand (limitation 6) | report format spec |

**Exit criteria:** ≥ 3 real tenants, publish workflow holding its SLA,
ecosystem contracts consumed live in both directions.
