# Contributing

## Ground rules

- TypeScript `strict` is on; keep it clean. No `any` without a comment saying
  why.
- Run `npm run check` (typecheck + lint + unit tests) before pushing. CI runs
  the same plus `npm run build`.
- Never commit `.env*` files or any Supabase service-role material. Use
  `.env.local` locally; `.env.example` documents every variable.
- `.audit/` contains reference material and `docs/` is owned by the product
  track — do not modify either from engineering work.

## Code conventions

- App Router server components by default; add `"use client"` only where
  interactivity requires it.
- UI primitives live in `src/components/ui/` and follow the shadcn-style
  pattern: `cva` variants + `cn()` (`src/lib/utils.ts`). Extend an existing
  primitive before inventing a new one.
- Design tokens come from `@theme` in `src/app/globals.css` — use the `navy`,
  `accent`, and `evidence-*` utilities instead of hard-coded hex values.
- Every data read must work in demo mode. Missing Supabase env returns a null
  client; never throw on absent configuration.
- Unit tests sit next to source as `*.test.ts(x)`; E2E specs live in
  `tests/e2e/`.

## Commit style

Small, focused commits with imperative messages describing the change.
Reference the module or route affected (e.g. "app-shell: add mobile drawer").
