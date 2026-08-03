# Design System — Life Science Nexus

| | |
|---|---|
| **Status** | Design foundation v1 |
| **Date** | 2026-07-28 |
| **Companion** | `docs/BRAND.md`, `docs/POSITIONING.md` |

Design values: scientific credibility, commercial intelligence, structured
evidence, precision, calm authority, high information density without clutter.

All tokens live in `src/app/globals.css` (`@theme`, Tailwind v4). Components
live in `src/components/ui/` (primitives) and `src/components/brand/` (brand).

---

## 1. Color tokens

### 1.1 Core scales

| Token | Anchor | Usage |
|---|---|---|
| `nexus-25 … nexus-975` | `nexus-900` `#1B2B3A` | Dark surfaces, sidebar, tooltips, overlays. 900 is the brand navy. |
| `spectral-50 … spectral-950` | `spectral-600` `#1D6FE0` | Primary actions, links, focus rings, info. |
| `teal-50 … teal-950` | `teal-600` `#0E9488` | Secondary accent, validation-adjacent highlights. |

Legacy aliases kept stable for existing code: `navy-50…950` → `nexus-*`;
`accent` → `spectral-600`; `accent-hover` → `spectral-700`.

**Text-safe shades (AA, ≥ 4.5:1 on white):** `spectral-600+`, `teal-700+`,
`nexus-500+`. `teal-600` (3.74:1) is for graphics, icons, and large text only —
never body text.

### 1.2 Semantic status

Each status ships as a `bg` / `fg` / `border` triple. Use the triple together;
never recombine.

| Token set | fg on bg | Usage |
|---|---|---|
| `success`, `success-bg/fg/border` | 6.49:1 | Completed, healthy, positive deltas |
| `warning`, `warning-bg/fg/border` | 8.15:1 | Attention needed, approaching limits |
| `danger`, `danger-bg/fg/border` | 6.80:1 | Errors, destructive actions, disputes |
| `info`, `info-bg/fg/border` | 6.95:1 | Neutral information, tips |

### 1.3 Evidence lifecycle (the eight domain states)

Canonical usage is the `Badge` `evidence` variant with the `state` prop, which
applies these AA-verified pairs:

| State | fg / bg | Ratio | When to use |
|---|---|---|---|
| `unverified` | `#334155` / `#F1F5F9` | 9.45:1 | Captured by a user or import, no source attached yet |
| `source_captured` | `#154A93` / `#D9E8FD` | 6.95:1 | A public source is attached but not yet parsed/checked |
| `structurally_validated` | `#0E665E` / `#D7F1ED` | 5.74:1 | Passed schema/consistency checks (automated) |
| `analyst_reviewed` | `#166534` / `#DCFCE7` | 6.49:1 | A human analyst confirmed the claim against the source |
| `domain_expert_reviewed` | `#5B21B6` / `#EDE9FE` | 7.57:1 | Highest trust: confirmed by a domain expert |
| `superseded` | `#374151` / `#F3F4F6` | 9.37:1 | Replaced by a newer claim; kept for history |
| `disputed` | `#991B1B` / `#FEE2E2` | 6.80:1 | Conflicting sources; do not treat as truth |
| `expired` | `#78350F` / `#FEF3C7` | 8.15:1 | Was true, is stale (e.g. an old price observation) |

The single-color tokens (`evidence-unverified`, `evidence-source-captured`,
`evidence-validated`, `evidence-reviewed`, `evidence-expert-reviewed`,
`evidence-superseded`, `evidence-disputed`, `evidence-expired`) are text-safe on
white and on their own `/10` tints (all ≥ 4.78:1, measured) and are used by the
legacy badges and charts.

### 1.4 Visibility & demo

| Token set | Meaning |
|---|---|
| `visibility-canonical-bg/fg/border` | Canonical (shared, reviewed) data — quiet slate |
| `visibility-private`, `visibility-private-bg/fg/border` | Tenant-private overlay — amber, always visible as private |
| `demo`, `demo-bg/fg/border` | Synthetic demo data — violet, never confused with real data |

### 1.5 Charts

`chart-1` … `chart-6` categorical palette, always in sequence:
`#1D6FE0` spectral → `#0E9488` teal → `#D97706` amber → `#7C3AED` violet →
`#E11D48` rose → `#56758F` slate-blue. Never use evidence-state colors in
charts — color there is categorical, not semantic.

---

## 2. Typography

Loaded via `next/font/google` in `src/app/layout.tsx`:

| Token | Font | Usage |
|---|---|---|
| `font-sans` | Inter | Default UI text |
| `font-display` | Space Grotesk | Page titles, stat values, wordmark |
| `font-mono` | JetBrains Mono | SKUs, codes, identifiers, raw values |

Display scale (tight tracking baked in): `text-display-xl` (36/40, −0.025em)
down to `text-display-xs` (18/26, −0.01em). Body text uses the default
Tailwind scale (`text-sm` is the UI workhorse; `text-xs` for meta/labels).

**Numeric rule:** anything tabular — table cells with numbers, stat values,
deltas, prices — gets `tabular-nums` (or the `.tnum` helper). Never let
proportional figures jitter a column.

---

## 3. Radius, elevation, motion

| Token | Value | Usage |
|---|---|---|
| `rounded-md` | 6px | Controls: buttons, inputs, badges, small tiles |
| `rounded-lg` | 8px | Cards, sections, tables |
| `rounded-xl` | 12px | Overlays: dialogs, drawers |

**1px-border-first:** surfaces are separated by `border-slate-200`, not shadow.
Shadows only lift interactive or overlaid surfaces:

| Token | Usage |
|---|---|
| `shadow-xs` | Resting controls, cards (barely-there) |
| `shadow-sm` | Raised controls, popovers |
| `shadow-md` | Dropdowns, sticky bars |
| `shadow-lg` | Dialogs, drawers |

**Focus ring:** `focus-visible:ring-2 focus-visible:ring-spectral-600
focus-visible:ring-offset-2` (offset-1 inside dense inputs). Every interactive
element must show it.

**Motion:** `--motion-fast` 120ms (hover/focus), `--motion-normal` 160ms
(overlays, entrances), `--motion-slow` 240ms (large panels). Ease-out curve
`cubic-bezier(0.2, 0, 0, 1)`. Named animations: `animate-fade-in`,
`animate-overlay-in/out`, `animate-dialog-in/out`, `animate-shimmer`. No
bounce, no spring, no animation over 240ms.

---

## 4. Components (`src/components/ui/`)

### Primitives (existing exports, refined)

- **Button** — variants `default` (spectral), `secondary`, `outline`, `ghost`,
  `destructive`, `link`; sizes `sm/default/lg/icon`.
- **Badge** — variants `default`, `secondary`, `outline`, `destructive`,
  `success`, `warning`, `info`, plus canonical:
  - `variant="evidence" state={…}` — the eight evidence states (see §1.3).
  - `variant="visibility" visibility="canonical" | "tenant_private"`.
  - `variant="demo"` — synthetic data marker.
- **Card** family — flat white, `shadow-xs`, 8px radius.
- **Table** — `compact` prop for data-dense views (`px-2 py-1 text-xs` rows).
  Numbers right-aligned with `tabular-nums`.
- **Dialog** — 12px radius, 160ms entrance (`animate-dialog-in`), navy overlay.
- **Input / Textarea / Select** — `h-9`, spectral focus ring, error styling
  driven by `aria-invalid` (red border + ring); always pair with `Label`.
- **Tabs, Tooltip, Separator, Skeleton** — Skeleton uses `animate-shimmer`.

### Canonical composites (new — use these in the polish wave)

| Component | Purpose |
|---|---|
| `PageHeader` | `title` (display font), `description`, `breadcrumb` slot, `actions` slot. Once per page. |
| `SectionCard` | Titled content section with `description`, header `actions`, `flush` for edge-to-edge tables. |
| `StatCard` | `label`, `value` (display font, tabular-nums), `delta` + `deltaTone`, `hint`. |
| `EmptyState` | `icon` (lucide), `title`, `description`, single `action`. |
| `StatusDot` | Inline status dot, tones `default/success/warning/danger/info/demo`; pass `label` for a11y. |

### Brand (`src/components/brand/`)

| Component | Purpose |
|---|---|
| `Logo` | The node-graph "N" mark. `size`, `variant="color" \| "mono"` (currentColor), `title` for a11y. |
| `Wordmark` | Mark + "Life Science Nexus" in Space Grotesk; optional `href`, `showText`. |

### Landing (`src/components/landing/`)

| Component | Purpose |
|---|---|
| `ScreenshotFrame` | Browser-chrome frame (3 dots + address-bar caption) around a real product screenshot (`next/image`) or walkthrough clip (`videoSrc`, still as poster). |

Landing media are real captures from the demo workspace, regenerated with
`npm run screenshots` (`scripts/capture-screenshots.mjs`) whenever the demo
dataset or app UI changes. Re-run after demo-data changes.

Static assets: `public/logo.svg`, `public/logo-lockup.svg`, `public/og.svg`
(source), `public/og.png` (rasterized for OG/Twitter — many platforms ignore
SVG), `public/screenshots/*.png` + `demo.webm` (generated).

---

## 5. Density rules

- Default density: `h-9` controls, `px-3 py-2` table cells, `p-5` card padding.
- Dense views (review queues, price tables, comparison matrices):
  `Table compact`, `Button size="sm"`, `text-xs` meta text.
- Never mix densities inside one section; density is chosen per view, not
  per element.
- White space is structural: sections separate with 1px borders and `mb-6`,
  not with bigger shadows or colored panels.

## 6. Accessibility rules

1. Focus order follows DOM order; every interactive element shows the spectral
   focus ring. Skip link is first in `layout.tsx`.
2. Text contrast ≥ 4.5:1 (measured pairs in §1; verification script output
   recorded in the design-foundation handoff). Large text/graphics ≥ 3:1.
3. Color never carries meaning alone: badges have text labels, `StatusDot`
   pairs with text or takes `label`, deltas include a `+`/`−` sign in text.
4. Form errors set `aria-invalid` on the control and link a message with
   `aria-describedby`; the red styling follows the attribute, not a class.
5. Icon-only buttons take an `aria-label`; decorative icons get
   `aria-hidden="true"`.
6. Motion is informational, short (≤ 240ms), and non-essential; the UI is
   fully usable with `prefers-reduced-motion`.

---

## 7. Dark mode

Not shipped. The palette is structured so a dark theme remaps semantic tokens
(surface/foreground/evidence triples) without touching component classes.
When scheduled, remap in a `@media (prefers-color-scheme: dark)` or `.dark`
block — do not add `dark:` variants per component.
