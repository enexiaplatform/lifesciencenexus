# Brand — Life Science Nexus

| | |
|---|---|
| **Status** | Brand foundation v1 |
| **Date** | 2026-07-28 |
| **Companion** | `docs/DESIGN_SYSTEM.md`, `docs/POSITIONING.md` |

Life Science Nexus is the industry and product intelligence graph for
life-science markets. The brand must feel like what it is: a verified,
evidence-backed factual substrate — precise, calm, and dense with signal.

---

## 1. Logo

The mark is a **node-graph "N"**: three nodes (circles) connected by edges
that trace an N silhouette inside a rounded square. It says *graph* and
*Nexus* in one glyph. No beaker, no leaf, no DNA helix.

Files: `public/logo.svg` (mark), `public/logo-lockup.svg` (mark + wordmark),
`src/components/brand/logo.tsx`, `src/components/brand/wordmark.tsx`.
App icons: `src/app/icon.svg`, `src/app/apple-icon.svg`.

### Rules

- **Clear space:** on all sides, at least the height of one node (¼ of the
  mark's width).
- **Minimum size:** 16px digital (favicon), 24px in-app, 0.25in print. Below
  24px use the mark without the wordmark.
- **Color:** the mark's rounded square carries the only gradient in the
  system — navy `#1B2B3A` → spectral `#1D6FE0`, diagonal, two stops. Nodes and
  edges are always white in the color mark. The `mono` variant (edges and
  nodes only, `currentColor`) is for nav chrome, footers, and single-color
  contexts.
- **Don'ts:** don't redraw or re-proportion the nodes; don't add a fourth
  node at the open corner (the asymmetry is the signature); don't put the
  gradient on anything else — no gradient backgrounds, buttons, or text;
  don't place the color mark on navy (use `mono` in white); don't outline,
  shadow, rotate, or animate the mark.

---

## 2. Color story

- **Nexus navy** (`#1B2B3A`) is authority and structure — the sidebar, the
  dark surfaces, the frame around the data.
- **Spectral blue** (`#1D6FE0`) is action and inquiry — links, primary
  buttons, focus. It appears where the user can *do* something.
- **Teal** (`#0E9488`) is the secondary accent — validation-adjacent
  highlights, secondary chart series.
- **Evidence colors** form the trust ladder: slate (unverified) → blue
  (source captured) → teal (validated) → green (analyst reviewed) → violet
  (expert reviewed), with gray (superseded), red (disputed), amber (expired)
  as the caution states. The ladder is the product's honesty made visible;
  never repurpose these hues for decoration.

Full tokens and measured contrast pairs: `docs/DESIGN_SYSTEM.md`.

---

## 3. Typography story

- **Inter** — the voice of the interface. Neutral, legible at small sizes,
  dense without cramping.
- **Space Grotesk** — the voice of the brand. Display font for page titles,
  stat values, and the wordmark. Geometric, technical, slightly engineered —
  used sparingly so it stays special.
- **JetBrains Mono** — the voice of the data. SKUs, identifiers, codes, raw
  values: anything a user might copy into another system.
- Numbers in tables and stats always use tabular figures.

---

## 4. Voice & tone

Precise, evidence-first, calm. We state what is known, how we know it, and
what is uncertain — in that order.

- Write like an analyst's note: short sentences, concrete nouns, numbers with
  units and dates.
- Label provenance everywhere: "Source captured", "Analyst reviewed",
  "Demo data". Never imply verification we haven't done.
- Empty states and errors say what happened and what to do next. No apology
  theater, no exclamation marks.

**Banned vocabulary** (hype words that erode scientific credibility):
*revolutionary, game-changing, cutting-edge, AI-powered, magic(ally),
seamless, supercharge, unlock, unleash, disrupt, next-gen, world-class,
best-in-class, synergy, leverage* (as a verb), *delve, journey* (as a metaphor).
Prefer: *verified, measured, observed, recorded, compared, sourced.*

---

## 5. Iconography

- Lucide only (`lucide-react`). No emoji as icons, no custom one-off glyphs
  without design review.
- Sizes: **16px** inline with text, **20px** standalone/header actions.
- Stroke: **1.75** (set `strokeWidth={1.75}` when an icon carries a control);
  keep stroke consistent within a view.
- Icons are functional — navigation, actions, status. Never decorative
  illustration. Decorative instances get `aria-hidden="true"`.

---

## 6. Imagery

- **No stock photography** of smiling people, lab coats, handshakes, or
  glass-and-steel offices.
- **No AI clichés:** no robots, glowing brains, neural-network headshots,
  purple-space gradients.
- **Allowed motif:** abstract graph and molecular structures — nodes, edges,
  lattices — in the brand palette on navy or white, used sparingly (social
  card, auth screens). See `public/og.svg`.
- Data visualizations are the real imagery of this product; keep them flat,
  grid-lined, and in the `chart-1…6` palette.

---

## 7. Ecosystem relationship

Nexus shares the family navy (`#1B2B3A`) and blue accent lineage with its
sister products (Memoire "Enexia", Atlas), and borrows Atlas's Space Grotesk
as its display voice. The node-graph "N" mark and the spectral blue
(`#1D6FE0`) are Nexus's own — they should not be reused by sister products.
