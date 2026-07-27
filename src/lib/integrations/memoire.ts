import { z } from "zod";

import { newId } from "../domain/id";
import { EVIDENCE_STATES, SOURCE_TYPES } from "../domain/types";

/**
 * Memoire integration contracts.
 *
 * Two versioned contracts:
 *  1. `nexus-handoff/v1` — Nexus → Memoire: push a commercial entity
 *     (account, opportunity note, stakeholder, signal) into the execution
 *     layer. Every payload carries a `visibilityWarning` because handoffs
 *     may reference tenant-private intelligence, and evidence references so
 *     Memoire can show why Nexus asserts something.
 *  2. `nexus-field-observation/v1` — Memoire → Nexus (future return path):
 *     field reps push observations back. They ALWAYS arrive tenant-private
 *     and unverified (pending review) — schemas enforce both literally.
 *
 * Unknown contract versions are rejected by the z.literal checks.
 */

export const MEMOIRE_HANDOFF_CONTRACT_VERSION = "nexus-handoff/v1";
export const FIELD_OBSERVATION_CONTRACT_VERSION = "nexus-field-observation/v1";

const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/;
const isoDateTime = z.string().regex(ISO_DATETIME_RE, "Expected an ISO 8601 datetime");

// ---------------------------------------------------------------------------
// Nexus → Memoire handoff
// ---------------------------------------------------------------------------

export const HANDOFF_ENTITY_TYPES = [
  "organization",
  "site",
  "person",
  "product",
  "sku",
  "installed_asset",
  "competitor",
  "market_signal",
  "source_summary",
] as const;
export type HandoffEntityType = (typeof HANDOFF_ENTITY_TYPES)[number];

export const handoffEvidenceRefSchema = z
  .object({
    claimId: z.string().min(1).optional(),
    sourceId: z.string().min(1),
    sourceType: z.enum(SOURCE_TYPES),
    evidenceState: z.enum(EVIDENCE_STATES),
  })
  .strict();

export const HANDOFF_ACTION_KINDS = [
  "create_account",
  "create_opportunity_note",
  "add_stakeholder",
  "log_activity",
  "review_signal",
] as const;
export type HandoffActionKind = (typeof HANDOFF_ACTION_KINDS)[number];

export const handoffPayloadSchema = z
  .object({
    contractVersion: z.literal(MEMOIRE_HANDOFF_CONTRACT_VERSION),
    handoffId: z.string().min(1),
    sentAt: isoDateTime,
    source: z
      .object({
        system: z.literal("life_science_nexus"),
        tenantId: z.string().min(1),
        /** Canonical URL of the entity inside Nexus (for deep links back). */
        entityUrl: z.string().min(1),
      })
      .strict(),
    entity: z
      .object({
        nexusEntityId: z.string().min(1),
        entityType: z.enum(HANDOFF_ENTITY_TYPES),
        displayName: z.string().min(1),
        summary: z.string(),
        /** Flat string map — Memoire renders it verbatim. */
        keyFacts: z.record(z.string()),
        evidenceRefs: z.array(handoffEvidenceRefSchema),
      })
      .strict(),
    /** Mandatory human-readable data-sensitivity warning. */
    visibilityWarning: z.string().min(1),
    suggestedAction: z
      .object({
        kind: z.enum(HANDOFF_ACTION_KINDS),
        label: z.string().min(1),
      })
      .strict(),
    deepLinkPlaceholder: z.string().optional(),
  })
  .strict();
export type MemoireHandoffPayload = z.infer<typeof handoffPayloadSchema>;

/** Default sensitivity notice; callers may override with something stricter. */
export const DEFAULT_VISIBILITY_WARNING =
  "Contains tenant-private commercial intelligence from Life Science Nexus (quoted prices, contacts or installed-base observations). Do not redistribute outside the tenant workspace.";

export interface BuildMemoireHandoffInput {
  tenantId: string;
  /** Canonical URL of the entity inside Nexus. */
  entityUrl: string;
  entity: MemoireHandoffPayload["entity"];
  suggestedAction: MemoireHandoffPayload["suggestedAction"];
  visibilityWarning?: string;
  deepLinkPlaceholder?: string;
  /** Defaults to a fresh UUID. */
  handoffId?: string;
  /** Defaults to the current time; inject for deterministic tests. */
  now?: Date | string;
}

/**
 * Build a handoff payload and validate it against the contract schema — the
 * builder can only return contract-valid payloads.
 */
export function buildMemoireHandoff(input: BuildMemoireHandoffInput): MemoireHandoffPayload {
  const sentAt =
    input.now === undefined
      ? new Date().toISOString()
      : input.now instanceof Date
        ? input.now.toISOString()
        : input.now;
  const payload: MemoireHandoffPayload = {
    contractVersion: MEMOIRE_HANDOFF_CONTRACT_VERSION,
    handoffId: input.handoffId ?? newId(),
    sentAt,
    source: {
      system: "life_science_nexus",
      tenantId: input.tenantId,
      entityUrl: input.entityUrl,
    },
    entity: input.entity,
    visibilityWarning: input.visibilityWarning ?? DEFAULT_VISIBILITY_WARNING,
    suggestedAction: input.suggestedAction,
    ...(input.deepLinkPlaceholder !== undefined ? { deepLinkPlaceholder: input.deepLinkPlaceholder } : {}),
  };
  return handoffPayloadSchema.parse(payload);
}

/** Strictly parse an inbound/stored handoff payload; throws on any contract violation. */
export function parseMemoireHandoff(data: unknown): MemoireHandoffPayload {
  return handoffPayloadSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Memoire → Nexus field-observation return path (future)
// ---------------------------------------------------------------------------

export const FIELD_OBSERVATION_TYPES = [
  "supplier",
  "product_usage",
  "price",
  "installed_base",
  "vendor_approval",
] as const;
export type FieldObservationType = (typeof FIELD_OBSERVATION_TYPES)[number];

/**
 * A field observation pushed from Memoire into Nexus. Two literals encode the
 * governance contract: observations are ALWAYS `tenant_private` and ALWAYS
 * arrive `unverified` (pending review) — they can never enter the graph as
 * canonical facts directly.
 */
export const fieldObservationPayloadSchema = z
  .object({
    contractVersion: z.literal(FIELD_OBSERVATION_CONTRACT_VERSION),
    observationId: z.string().min(1),
    tenantId: z.string().min(1),
    observedAt: isoDateTime,
    observerId: z.string().min(1).optional(),
    observationType: z.enum(FIELD_OBSERVATION_TYPES),
    /** Observation-type-specific body; validated per type at ingestion time. */
    payload: z.record(z.unknown()),
    visibility: z.literal("tenant_private"),
    reviewStatus: z.literal("unverified"),
    notes: z.string().optional(),
  })
  .strict();
export type FieldObservationPayload = z.infer<typeof fieldObservationPayloadSchema>;

/** Strictly parse an inbound field observation; throws on any contract violation. */
export function parseFieldObservationPayload(data: unknown): FieldObservationPayload {
  return fieldObservationPayloadSchema.parse(data);
}
