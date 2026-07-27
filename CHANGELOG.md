# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Added

- Next.js 15 (App Router) + React 19 + TypeScript strict foundation with
  Tailwind CSS v4 design tokens (navy/slate scientific palette, evidence
  lifecycle status colors).
- App shell with collapsible sidebar, topbar, demo-mode badge, skip-to-content
  link, and mobile drawer navigation.
- Route skeletons for all planned modules: market (organizations, sites,
  laboratories, people, manufacturers, suppliers, tenders, installed base,
  availability), products (products, SKUs, brands, applications, methods,
  standards, organisms), intelligence (equivalence, matching, compare,
  cost per test, prices, signals), research (projects, sources, evidence,
  review), data operations (imports, exports, entity resolution, data
  quality), and settings.
- Static intelligence dashboard with section cards and quick-action grid.
- Hand-written shadcn-style UI primitives (button, input, textarea, select,
  badge, card, table, dialog, tabs, dropdown menu, label, separator,
  skeleton, tooltip).
- Environment layer with zod validation and automatic demo-mode fallback when
  Supabase is not configured.
- Supabase client helpers (browser, server, middleware) that degrade to null
  in demo mode.
- Tooling: Vitest unit tests, Playwright E2E scaffold, ESLint flat config,
  GitHub Actions CI.
