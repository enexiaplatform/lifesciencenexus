# Atlas Read API — Atlas ← Nexus

| | |
|---|---|
| **Status** | Contract `nexus-atlas-read/v1` implemented (6 endpoint groups, DTO schemas, vendor-neutrality guard, contract tests); no live Atlas consumer yet |
| **Date** | 2026-07-28 |
| **Sources of truth** | `src/lib/integrations/atlas.ts` · `src/lib/api/atlas.ts` · `src/app/api/v1/integrations/atlas/` |

Atlas reads canonical market/reference data from Nexus to ground its outputs
in real products and standards — without ever becoming a market database
itself. Design contract: `docs/INTEGRATION_CONTRACTS.md` Contract B.
Read-only: there is no POST/PUT/PATCH on this surface.

## Endpoints

All under `/api/v1/integrations/atlas/`, all `GET`, all through the standard
`withApi` pipeline (auth → rate limit → handler → envelope, see
`docs/ARCHITECTURE.md`):

| Endpoint group | DTO schema | Returns |
|---|---|---|
| `GET /products` | `atlasProductSummarySchema` | `{id, name, manufacturerName?, familyName?, brandName?, category, status?}` |
| `GET /standards` | `atlasStandardSummarySchema` | `{id, body, code, title, currentVersion?}` |
| `GET /applications` | `atlasApplicationSummarySchema` | `{id, name, description?}` |
| `GET /methods` | `atlasMethodSummarySchema` | `{id, name, description?, standardCodes[]}` |
| `GET /organisms` | `atlasOrganismSummarySchema` | `{id, genus, species, strainCode?, gramReaction?}` |
| `GET /suppliers` | `atlasSupplierSummarySchema` | `{id, name, countries[], manufacturers[]}` — names only, no commercial terms |

Every response is the versioned envelope:

```json
{
  "data": {
    "contractVersion": "nexus-atlas-read/v1",
    "data": [ /* DTO items */ ],
    "strippedFields": []
  },
  "meta": { "total": 42 }
}
```

(The outer `{data, meta}` is the API v1 envelope; the inner object is the
`AtlasResponse` contract payload.) All DTO schemas are `.strict()` — extra
keys are contract violations, and unknown contract versions are rejected by
the `z.literal` check.

## Hard rules

1. **Canonical-only.** Collectors query the repository with
   `filters: { visibility: "canonical" }`. Tenant-private (Layer B) records
   never leave through these endpoints — structurally, not by convention.
2. **Vendor neutrality is enforced, not trusted.** Atlas's contract is
   `selectsVendor: false`, `assertsProductEquivalence: false` — it must never
   rank vendors or carry equivalence verdicts. Nexus enforces this on the
   way out: every payload passes `assertAtlasVendorNeutrality()`
   (`src/lib/integrations/atlas.ts`), which deep-clones the payload and
   strips any of the 20 forbidden field names (case-insensitive, at any
   nesting depth): `price(s)`, `unitPrice`, `quotedPrice`,
   `priceObservation(s)`, `amount`, `currency`, `cost`, `costPerTest`,
   `effectiveCostPerTest`, `commercialTerms`, `discount`, `margin`,
   `equivalenceVerdict`, `equivalenceClassification`, `equivalenceRecord`,
   `overallScore`, `dimensionScores`, `recommendedSupplier`. Stripped dotted
   paths are returned in `strippedFields` for audit logging — **it should
   always be empty**; a non-empty value means something tried to leak
   commercial data and should be treated as a bug.
3. **Attribution.** Consumers display `source: "Life Science Nexus"` with the
   entity's canonical URL when surfacing Nexus data.
4. **No write surface, no rule feed-back.** Nexus evidence does not
   auto-update Atlas executable rules (Atlas governance invariant).
5. **Stability.** Ids are permanent; deleted entities should return
   `410 Gone` with a `replaced_by` pointer rather than 404 (contract rule —
   archive-based soft delete keeps ids resolvable).

An evidence DTO (`atlasEvidenceSummarySchema` — `{sourceId, sourceType,
evidenceState, confidence?, claimCount?}`) is defined for the public-reference
evidence feed described in Contract B; it ships with the endpoint expansion.

## How Atlas should consume

- Over the HTTP API only. **No database access** — Atlas has no RLS, so a
  shared DB would bypass Nexus's tenant isolation; cross-product DB access is
  forbidden by ADR 0003.
- Pin the contract version; breaking changes bump `nexus-atlas-read/vN`.
- Treat `strippedFields` non-empty as an alarm, not data.
- **Never copy Nexus content into Atlas articles/reference packs**: Atlas
  links or calls; it does not fork the market graph (ecosystem boundary —
  Atlas must not become a market entity graph, Nexus must not host Atlas
  copies). Layer D `external_entity_references` is the mechanism for pointing
  at Atlas objects from Nexus.

## Contract tests

`src/lib/integrations/atlas.test.ts` — DTO round-trips, strict-mode
rejections, and golden tests proving the vendor-neutrality guard strips
nested commercial fields without mutating the input. Run with
`npm run verify:integrations` (`vitest run src/lib/integrations`).
