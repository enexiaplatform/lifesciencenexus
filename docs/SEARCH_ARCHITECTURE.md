# Search Architecture — Life Science Nexus

| | |
|---|---|
| **Status** | Demo ranker live; Postgres path shipped in migrations, exercised once the Supabase backend lands |
| **Date** | 2026-07-28 |
| **Sources of truth** | `src/lib/domain/search-rank.ts` · `supabase/migrations/20260727000008_indexes_search.sql` · `src/components/search/` |

One federated search contract, two implementations — selected by the active
data backend, invisible to the UI.

## The two paths

| | Demo ranker (runtime today) | Postgres (Supabase backend) |
|---|---|---|
| Code | `src/lib/domain/search-rank.ts` (`rankSearch`) | `public.search_entities(query, result_limit)` SQL function |
| Algorithm | token Jaccard + trigram Dice + exact/prefix boosts | pg_trgm `%` / `similarity()` + ILIKE, GIN-indexed |
| Runs where | in-process (server component or API route) | in-database |
| Explanation | `matchReasons[]` per result | `similarity` score per row |
| Federation | all name-bearing entities via repository | 6 canonical families in v1 |

### Demo ranker

Pure, deterministic, zero-dependency. For each `SearchableRecord`
(`{entityType, id, name, aliases?, catalogueNumber?, identifiers?}`):

1. **Exact matches** (dominate): exact name, exact catalogue number, exact
   alias, exact identifier value (codes normalized uppercase alphanumeric, so
   `ACM-1101` ≡ `acm 1101`).
2. **Fuzzy base** — best of: token Jaccard (`tokenJaccard`), name trigram
   Dice (`trigramDice` — padded trigram multiset, typo-tolerant), alias
   trigram Dice.
3. **Prefix boosts** for name/alias prefixes (query length ≥ 2).
4. Score = `min(1, max(exact, base) + boost)`, default `minScore` 0.2, limit
   20.

Every result carries `matchReasons` — human-readable strings like
`"catalogue number match"`, `"name ~0.71 similarity"`,
`"token overlap 0.60"`, `"alias prefix match"` — so the UI can always answer
"why is this here?". That is the **relevance explanation contract**: no
opaque scores anywhere in the product.

### Postgres path

`20260727000008_indexes_search.sql` ships:

- **pg_trgm GIN indexes** on name/alias/catalogue-number columns across
  organizations, sites, people, brands, product families, products, SKUs,
  standards, sources, organisms (`genus || ' ' || species`).
- **FTS**: generated `search_vector` tsvector columns + GIN indexes on
  organizations, products, skus, sources.
- **`search_entities(text, integer)`** — `SECURITY INVOKER`, `STABLE`,
  pinned `search_path`; unions trigram/ILIKE matches over six canonical
  families (organization, product, sku, brand, standard, source), ordered by
  `similarity()` desc. Returns `(entity_type, id, title, subtitle,
  similarity)`.

Note the function filters `visibility = 'canonical'` and `archived_at is
null` — federated search over Layer A only; tenant-private records are found
through scoped list views, not the shared search. Uniqueness helpers in the
same migration (partial unique indexes on `(product_id, catalogue_number)`
and organism strain) double as natural keys for import dedup.

## UX surface

- `/search` (`src/app/(core)/search` + `src/components/search/search-client.tsx`):
  full-page federated search, results grouped by entity family, score and
  `matchReasons` shown per hit.
- Quick search (`src/components/search/quick-search.tsx`): palette-style
  component with **full keyboard support** — ArrowUp/ArrowDown move the
  active hit (scrolled into view), Enter opens it, selection resets whenever
  the result set changes.
- **Zero-result handling**: an explicit `No results for "<query>".` state —
  no silent empty page, no fabricated suggestions. The evidence-first rule
  applies to search too: absence of a match is shown as absence.

## API

`GET /api/v1/search?q=…` (`src/app/api/v1/search/route.ts`) goes through the
standard `withApi` pipeline and the repository `search()` method, so it
inherits the active backend's ranker and the canonical-only rule for
anonymous callers.

## Deferred: pgvector

pgvector is intentionally **not installed** (migration 0000 comment): no
proven use case yet, and trigram + FTS cover the current corpus (hundreds of
entities, Vietnamese + English names). Semantic/vector search for duplicate
detection and fuzzy cross-language matching is a v0.3 evaluation item — see
`docs/ROADMAP.md` and ADR 0002's "regenerable Layer C" constraint (embeddings
would be a derived artifact, rebuilt wholesale, never hand-maintained).
