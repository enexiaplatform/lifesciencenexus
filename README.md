# Life Science Nexus

Industry and Product Intelligence Graph for life science markets. The initial
wedge is **industrial microbiology in Vietnam**: mapping organizations,
products, prices, tenders, installed base, and the evidence behind them into a
single queryable graph.

The app runs out of the box in **demo mode** with synthetic data — every demo
record is labeled "Demo". Connect Supabase to work against a real backend.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first config via `@theme` in `src/app/globals.css`)
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) — optional; the app
  falls back to demo mode when env vars are absent
- **zod** for env and data validation
- **@tanstack/react-table**, **recharts**, **lucide-react**
- Hand-written shadcn-style UI primitives on **Radix** + **cva** + **cn()**
- **Vitest** + Testing Library (unit), **Playwright** (E2E), ESLint 9 flat config
- **papaparse** + **xlsx** (SheetJS) for import/export pipelines

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you are redirected to `/dashboard` in demo mode.
No environment variables are required.

### Supabase setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Apply the database schema from [`supabase/migrations`](supabase/migrations).
3. Restart `npm run dev`. The topbar badge switches from "Demo workspace" to
   "Supabase".

`NEXUS_DATA_BACKEND=demo|supabase` forces the backend explicitly; without it,
the backend is auto-detected. `SUPABASE_SERVICE_ROLE_KEY` is server-only and
must never be exposed to the browser — see [SECURITY.md](SECURITY.md).

## Scripts

| Script                | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the dev server                           |
| `npm run build`       | Production build                               |
| `npm start`           | Serve the production build                     |
| `npm run lint`        | ESLint (flat config, eslint-config-next)       |
| `npm run typecheck`   | `tsc --noEmit`                                 |
| `npm test`            | Unit tests (Vitest, jsdom)                     |
| `npm run test:watch`  | Unit tests in watch mode                       |
| `npm run test:e2e`    | E2E tests (Playwright; starts dev server)      |
| `npm run check`       | typecheck + lint + unit tests                  |

## Project layout

- `src/app/` — App Router with route groups: `(core)`, `(market)`,
  `(products)`, `(intelligence)`, `(research)`, `(ops)`, `(settings)`
- `src/components/app-shell/` — sidebar + topbar shell used by all modules
- `src/components/ui/` — hand-written shadcn-style primitives
- `src/lib/` — env (`env.ts`), utils, Supabase clients
- `supabase/migrations/` — database schema (applied by data-platform work)
- `tests/e2e/` — Playwright specs
- `docs/` — product and architecture documentation

## Documentation

See [`docs/`](docs/) for product scope, data model, and architecture notes.
