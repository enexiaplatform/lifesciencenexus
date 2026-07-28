# Memoire Handoff — Nexus → Memoire

| | |
|---|---|
| **Status** | Contract `nexus-handoff/v1` implemented mock-first (builder + API route + UI + contract tests); no live Memoire endpoint exists yet |
| **Date** | 2026-07-28 |
| **Sources of truth** | `src/lib/integrations/memoire.ts` · `src/lib/api/memoire-handoff.ts` · `src/app/api/v1/integrations/memoire/handoff/route.ts` · `src/components/integrations/memoire-handoff.tsx` |

One-way, user-initiated push of a Nexus entity into the user's own Memoire
workspace as an account/opportunity seed. Design contract:
`docs/INTEGRATION_CONTRACTS.md` Contract A. Memoire has **no inbound endpoint
today**, so delivery is file/clipboard-based; the schemas below are the ones
Memoire will eventually ingest unchanged.

## Payload: `nexus-handoff/v1`

Built and validated by `buildMemoireHandoff()` — the builder can only return
contract-valid payloads (`handoffPayloadSchema.parse` on construction).
Unknown versions are rejected by the `z.literal` check. Field-by-field:

| Field | Type | Notes |
|---|---|---|
| `contractVersion` | literal `"nexus-handoff/v1"` | reject on mismatch |
| `handoffId` | string | fresh id per build; recorded in the audit log |
| `sentAt` | ISO 8601 datetime | generation time (injectable for tests) |
| `source.system` | literal `"life_science_nexus"` | |
| `source.tenantId` | string | tenant the handoff originated from |
| `source.entityUrl` | string | canonical URL of the entity page in Nexus (deep link back) |
| `entity.nexusEntityId` | string | stable Nexus id — becomes Memoire `external_source_key` |
| `entity.entityType` | enum, 9 values | `organization`, `site`, `person`, `product`, `sku`, `installed_asset`, `competitor`, `market_signal`, `source_summary` |
| `entity.displayName` | string | Vietnamese names pass through unmodified (Memoire dedupe is diacritic-insensitive) |
| `entity.summary` | string | plain text distilled from the entity; no AI-generated pitch (Memoire no-AI contract) |
| `entity.keyFacts` | `Record<string,string>` | flat string map — Memoire renders it verbatim |
| `entity.evidenceRefs[]` | array of `{claimId?, sourceId, sourceType, evidenceState}` | Nexus evidence ids only — resolvable later via API; no evidence content embedded |
| `visibilityWarning` | string, min 1 | **mandatory** human-readable sensitivity notice; default `DEFAULT_VISIBILITY_WARNING` warns about tenant-private commercial intelligence |
| `suggestedAction.kind` | enum | `create_account`, `create_opportunity_note`, `add_stakeholder`, `log_activity`, `review_signal` (advisory; per-entity-type defaults in `memoire-handoff.ts`) |
| `suggestedAction.label` | string | e.g. "Create account in Memoire" |
| `deepLinkPlaceholder` | string, optional | reserved `https://memoire…/import?source=nexus&payload=…` shape; Memoire has no such route today |

`.strict()` everywhere — extra keys are contract violations.

## Generation & audit

`POST /api/v1/integrations/memoire/handoff` with body
`{entityType, entityId, suggestedActionKind?}` (zod-validated, 422 on bad
body, 404 on unknown entity). The route loads the entity, distills
displayName/summary/keyFacts, attaches claim-based evidence refs, builds the
payload, and **records an `outbound_handoff_record`** (`targetSystem:
"memoire"`, full payload, `status`) — the tenant-private audit trail of every
handoff. Statuses: `prepared` → `copied` / `downloaded` / `sent` →
`acknowledged`. The response is `{ data: payload, meta: { handoffRecordId } }`.

## Delivery modes (implemented)

All three are user-initiated from the entity page
(`src/components/integrations/memoire-handoff.tsx`):

1. **Copy JSON** — "Copy for Memoire" writes the pretty-printed payload to
   the clipboard (status `copied`).
2. **Download file** — `nexus-handoff-<handoffId>.json` (status
   `downloaded`), importable through Memoire's existing import path.
3. **Deep-link placeholder** — reserved URL shape only; degrades to
   instructions because Memoire has no inbound route (status `prepared`).

Handoffs are disabled for demo sessions (ADR 0004): the button renders with an
explanatory tooltip and demo data never flows into integrations.

## How Memoire ingests (no Memoire changes needed for v1)

Verified receiver facts (`docs/PREFLIGHT_AUDIT.md`,
`docs/INTEGRATION_CONTRACTS.md` §A.3):

- Import-metadata columns `source_system`, `external_source_key`,
  `source_hash`, `import_batch_id` exist on `accounts`, `opportunities`,
  `stakeholders`, `sales_activities`, `operating_context`, with unique indexes
  for idempotent upserts (Memoire migration
  `20260618090000_founder_core_import_metadata.sql`).
- Service-role import CLI `scripts/import-founder-core.mjs` (dry-run default,
  `source_hash` dedupe, chunked upserts, `--rollback`, audited via
  `import_batches` / `import_row_results`).
- Mapping: `entity.nexusEntityId → external_source_key`, constant
  `source_system='nexus'`, `source_hash` = hash of the payload.
- **Name-keyed tolerance:** Memoire joins accounts by name; the handoff must
  tolerate Memoire renaming/merging the account. Nexus treats the Memoire row
  as a private fork and never syncs it back — Nexus *seeds*, never maintains
  state in Memoire.

## Return path: `nexus-field-observation/v1` (draft)

`fieldObservationPayloadSchema` in `src/lib/integrations/memoire.ts` — the
future Memoire → Nexus flow (Contract D in `docs/INTEGRATION_CONTRACTS.md`).
Two zod literals encode the governance contract:

- `visibility: z.literal("tenant_private")` — observations **always** land in
  Layer B;
- `reviewStatus: z.literal("unverified")` — **always** pending review; they
  can never enter the graph as canonical facts directly.

Observation types: `supplier`, `product_usage`, `price`, `installed_base`,
`vendor_approval`. Promotion to canonical happens only through the publish
workflow (`docs/EVIDENCE_MODEL.md`). Memoire's anonymization posture applies:
raw conversation text and counterparty PII are stripped before export. Not
built yet — schema + parser (`parseFieldObservationPayload`) only.

## Contract tests

`src/lib/integrations/memoire.test.ts` (golden payloads, strict-parse
rejections, determinism via injected `now`/`handoffId`) plus
`src/lib/api/memoire-handoff.ts` consumers tested through
`src/lib/api/routes.test.ts`. Run with `npm run verify:integrations`
(`vitest run src/lib/integrations`).
