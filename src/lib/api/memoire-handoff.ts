import { z } from "zod";

import type { NexusRepository } from "@/lib/data/repository";
import { demoTenantId } from "@/lib/env";
import { newId } from "@/lib/domain/id";
import {
  buildMemoireHandoff,
  HANDOFF_ACTION_KINDS,
  HANDOFF_ENTITY_TYPES,
  type HandoffActionKind,
  type HandoffEntityType,
  type MemoireHandoffPayload,
} from "@/lib/integrations/memoire";
import type { Claim, Source } from "@/lib/domain/types";

import { entityAppPath } from "./guards";

/**
 * Memoire handoff assembly for POST /api/v1/integrations/memoire/handoff.
 *
 * Loads the requested Nexus entity, distills display name + summary +
 * keyFacts + evidence references (from claims about the entity), builds the
 * contract payload via `buildMemoireHandoff` (which validates against
 * `handoffPayloadSchema`), and records an `outbound_handoff_record` for the
 * audit log. Kept in lib (not in the route) so tests can call it directly.
 */

export const handoffRequestSchema = z
  .object({
    entityType: z.enum(HANDOFF_ENTITY_TYPES),
    entityId: z.string().min(1),
    suggestedActionKind: z.enum(HANDOFF_ACTION_KINDS).optional(),
  })
  .strict();
export type HandoffRequest = z.infer<typeof handoffRequestSchema>;

const DEFAULT_ACTION: Record<HandoffEntityType, HandoffActionKind> = {
  organization: "create_account",
  competitor: "create_account",
  site: "create_account",
  person: "add_stakeholder",
  product: "create_opportunity_note",
  sku: "create_opportunity_note",
  installed_asset: "create_opportunity_note",
  market_signal: "review_signal",
  source_summary: "log_activity",
};

const ACTION_LABELS: Record<HandoffActionKind, string> = {
  create_account: "Create account in Memoire",
  create_opportunity_note: "Create opportunity note in Memoire",
  add_stakeholder: "Add stakeholder in Memoire",
  log_activity: "Log activity in Memoire",
  review_signal: "Review signal in Memoire",
};

interface LoadedHandoffEntity {
  displayName: string;
  summary: string;
  keyFacts: Record<string, string>;
  /** Claims-based evidence; empty when the entity has no claims. */
  subjectEntityId: string;
  appPath: string;
}

async function loadHandoffEntity(
  repo: NexusRepository,
  entityType: HandoffEntityType,
  entityId: string,
): Promise<LoadedHandoffEntity | null> {
  switch (entityType) {
    case "organization":
    case "competitor": {
      const org = await repo.getById("organization", entityId);
      if (!org) return null;
      return {
        displayName: org.name,
        summary: `${org.types.join(", ")} organization in ${org.country}.`,
        keyFacts: {
          country: org.country,
          types: org.types.join(", "),
          ...(org.website ? { website: org.website } : {}),
        },
        subjectEntityId: org.id,
        appPath: entityAppPath("organization", org.id),
      };
    }
    case "site": {
      const site = await repo.getById("site", entityId);
      if (!site) return null;
      const org = await repo.getById("organization", site.organizationId);
      return {
        displayName: site.name,
        summary: `${site.siteType} site${org ? ` of ${org.name}` : ""}.`,
        keyFacts: { siteType: site.siteType, ...(org ? { organization: org.name } : {}) },
        subjectEntityId: site.id,
        appPath: entityAppPath("site", site.id),
      };
    }
    case "person": {
      const person = await repo.getById("person", entityId);
      if (!person) return null;
      return {
        displayName: person.fullName,
        summary: person.title ? `${person.fullName}, ${person.title}.` : `${person.fullName}.`,
        keyFacts: {
          ...(person.title ? { title: person.title } : {}),
          ...(person.email ? { email: person.email } : {}),
          ...(person.phone ? { phone: person.phone } : {}),
        },
        subjectEntityId: person.id,
        appPath: entityAppPath("person", person.id),
      };
    }
    case "product": {
      const product = await repo.getById("product", entityId);
      if (!product) return null;
      return {
        displayName: product.name,
        summary: `${product.category} product (status: ${product.status}).`,
        keyFacts: { category: product.category, status: product.status },
        subjectEntityId: product.id,
        appPath: entityAppPath("product", product.id),
      };
    }
    case "sku": {
      const sku = await repo.getById("sku", entityId);
      if (!sku) return null;
      const product = await repo.getById("product", sku.productId);
      return {
        displayName: sku.name,
        summary: `SKU${sku.catalogueNumber ? ` ${sku.catalogueNumber}` : ""}${product ? ` of ${product.name}` : ""}.`,
        keyFacts: {
          ...(sku.catalogueNumber ? { catalogueNumber: sku.catalogueNumber } : {}),
          ...(sku.gtin ? { gtin: sku.gtin } : {}),
          ...(product ? { product: product.name } : {}),
          status: sku.status,
        },
        subjectEntityId: sku.id,
        appPath: entityAppPath("sku", sku.id),
      };
    }
    case "installed_asset": {
      const asset = await repo.getById("installed_asset", entityId);
      if (!asset) return null;
      const model = await repo.getById("asset_model", asset.assetModelId);
      const site = await repo.getById("site", asset.siteId);
      return {
        displayName: model?.model ?? asset.id,
        summary: `${model?.model ?? "Instrument"} installed${site ? ` at ${site.name}` : ""} (status: ${asset.status}).`,
        keyFacts: {
          status: asset.status,
          qualificationStatus: asset.qualificationStatus,
          ...(asset.serialNumber ? { serialNumber: asset.serialNumber } : {}),
          ...(site ? { site: site.name } : {}),
        },
        subjectEntityId: asset.id,
        appPath: entityAppPath("installed_asset", asset.id),
      };
    }
    case "market_signal": {
      const signals = await repo.listSignals({ pageSize: 100 });
      const signal = signals.items.find((candidate) => candidate.id === entityId);
      if (!signal) return null;
      return {
        displayName: `${signal.type} signal`,
        summary: `${signal.reason} Recommended: ${signal.recommendedAction}`,
        keyFacts: {
          type: signal.type,
          commercialRelevance: signal.commercialRelevance,
          confidence: String(signal.confidence),
          recommendedAction: signal.recommendedAction,
        },
        subjectEntityId: signal.id,
        appPath: "/signals",
      };
    }
    case "source_summary": {
      const source = await repo.getById("source", entityId);
      if (!source) return null;
      return {
        displayName: source.title,
        summary: `${source.type} source${source.publisher ? ` by ${source.publisher}` : ""}, captured ${source.capturedAt}.`,
        keyFacts: {
          type: source.type,
          ...(source.publisher ? { publisher: source.publisher } : {}),
          capturedAt: source.capturedAt,
        },
        subjectEntityId: source.id,
        appPath: "/sources",
      };
    }
  }
}

/** Up to five evidence references from claims about the entity. */
async function evidenceRefsFor(
  repo: NexusRepository,
  subjectEntityId: string,
): Promise<MemoireHandoffPayload["entity"]["evidenceRefs"]> {
  const claims = await repo.list("claim", {
    filters: { subjectEntityId },
    pageSize: 5,
  });
  const refs: MemoireHandoffPayload["entity"]["evidenceRefs"] = [];
  for (const claim of claims.items as Claim[]) {
    const source: Source | null = await repo.getById("source", claim.sourceId);
    if (!source) continue;
    refs.push({
      claimId: claim.id,
      sourceId: source.id,
      sourceType: source.type,
      evidenceState: claim.reviewStatus,
    });
  }
  return refs;
}

export type HandoffResult =
  | { ok: true; payload: MemoireHandoffPayload; handoffRecordId: string }
  | { ok: false; reason: "not_found"; message: string };

export async function buildAndRecordHandoff(
  repo: NexusRepository,
  request: HandoffRequest,
  tenantId: string | null,
): Promise<HandoffResult> {
  const loaded = await loadHandoffEntity(repo, request.entityType, request.entityId);
  if (!loaded) {
    return {
      ok: false,
      reason: "not_found",
      message: `${request.entityType} ${request.entityId} not found`,
    };
  }

  const kind = request.suggestedActionKind ?? DEFAULT_ACTION[request.entityType];
  const handoffId = newId();
  const payload = buildMemoireHandoff({
    tenantId: tenantId ?? demoTenantId,
    entityUrl: loaded.appPath,
    entity: {
      nexusEntityId: request.entityId,
      entityType: request.entityType,
      displayName: loaded.displayName,
      summary: loaded.summary,
      keyFacts: loaded.keyFacts,
      evidenceRefs: await evidenceRefsFor(repo, loaded.subjectEntityId),
    },
    suggestedAction: { kind, label: ACTION_LABELS[kind] },
    // Memoire is not configured yet — the deep link is a placeholder.
    deepLinkPlaceholder: `https://memoire.example/integrations/nexus/handoffs/${handoffId}`,
    handoffId,
  });

  const record = await repo.createEntity("outbound_handoff_record", {
    targetSystem: "memoire",
    payload: payload as unknown as Record<string, unknown>,
    status: "prepared",
    visibility: "tenant_private",
    isDemo: false,
    tenantId: tenantId ?? demoTenantId,
  });

  return { ok: true, payload, handoffRecordId: record.id };
}
