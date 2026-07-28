import type { NexusRepository } from "@/lib/data/repository";
import type { EntityType } from "@/lib/domain/types";

/**
 * Export row builders for /api/exports/[family].
 *
 * Every family flattens its entities into scalar rows (CSV/XLSX-friendly).
 * VISIBILITY GUARD: tenant_private rows are included only when the caller
 * explicitly requested them AND is authenticated as that tenant (enforced in
 * the route); canonical rows are always included. The resulting `scope`
 * records which policy was applied — it lands in the JSON payload and the
 * audit entry so exports stay explainable.
 */

export const EXPORT_FAMILIES = [
  "organizations",
  "products",
  "skus",
  "prices",
  "tenders",
  "installed-assets",
  "sources",
  "signals",
  "research-findings",
] as const;
export type ExportFamily = (typeof EXPORT_FAMILIES)[number];

export function isExportFamily(value: string): value is ExportFamily {
  return (EXPORT_FAMILIES as readonly string[]).includes(value);
}

export type FlatRow = Record<string, string | number | boolean | null>;

export interface BuiltExport {
  family: ExportFamily;
  entityType: EntityType;
  rows: FlatRow[];
  /** Column keys in stable order (union over rows, first-seen order). */
  columns: string[];
  scope: "canonical" | "canonical+tenant_private";
}

const FAMILY_ENTITY_TYPE: Record<ExportFamily, EntityType> = {
  organizations: "organization",
  products: "product",
  skus: "sku",
  prices: "price_observation",
  tenders: "tender",
  "installed-assets": "installed_asset",
  sources: "source",
  signals: "opportunity_signal",
  "research-findings": "research_finding",
};

type AnyRecord = Record<string, unknown>;

function scopeRows<T extends { visibility: string }>(items: readonly T[], includeTenantPrivate: boolean): T[] {
  return includeTenantPrivate ? [...items] : items.filter((item) => item.visibility === "canonical");
}

export async function buildExportRows(
  repo: NexusRepository,
  family: ExportFamily,
  includeTenantPrivate: boolean,
): Promise<BuiltExport> {
  const scope: BuiltExport["scope"] = includeTenantPrivate ? "canonical+tenant_private" : "canonical";
  let rows: FlatRow[] = [];

  switch (family) {
    case "organizations": {
      const paged = await repo.list("organization", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((org) => ({
        id: org.id,
        name: org.name,
        types: org.types.join(";"),
        country: org.country,
        website: org.website ?? null,
        identifiers: org.identifiers.map((identifier) => `${identifier.scheme}:${identifier.value}`).join(";"),
        visibility: org.visibility,
        isDemo: org.isDemo,
      }));
      break;
    }
    case "products": {
      const paged = await repo.list("product", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        status: product.status,
        familyId: product.familyId,
        manufacturerOrganizationId: product.manufacturerOrganizationId,
        visibility: product.visibility,
        isDemo: product.isDemo,
      }));
      break;
    }
    case "skus": {
      const paged = await repo.list("sku", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((sku) => ({
        id: sku.id,
        name: sku.name,
        catalogueNumber: sku.catalogueNumber ?? null,
        gtin: sku.gtin ?? null,
        productId: sku.productId,
        status: sku.status,
        shelfLifeMonths: sku.shelfLifeMonths ?? null,
        countryAvailability: sku.countryAvailability.join(";"),
        visibility: sku.visibility,
        isDemo: sku.isDemo,
      }));
      break;
    }
    case "prices": {
      const paged = await repo.list("price_observation", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((price) => ({
        id: price.id,
        skuId: price.skuId,
        supplierOrgId: price.supplierOrgId ?? null,
        originalAmount: price.originalAmount,
        originalCurrency: price.originalCurrency,
        observationDate: price.observationDate,
        geography: price.geography,
        taxIncluded: price.taxIncluded,
        evidenceState: price.evidenceState,
        isSynthetic: price.isSynthetic,
        sourceId: price.sourceId,
        visibility: price.visibility,
        isDemo: price.isDemo,
      }));
      break;
    }
    case "tenders": {
      const paged = await repo.list("tender", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((tender) => ({
        id: tender.id,
        code: tender.code,
        title: tender.title,
        buyerOrganizationId: tender.buyerOrganizationId,
        country: tender.country,
        status: tender.status,
        publicationDate: tender.publicationDate ?? null,
        submissionDeadline: tender.submissionDeadline ?? null,
        awardDate: tender.awardDate ?? null,
        visibility: tender.visibility,
        isDemo: tender.isDemo,
      }));
      break;
    }
    case "installed-assets": {
      const paged = await repo.list("installed_asset", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((asset) => ({
        id: asset.id,
        assetModelId: asset.assetModelId,
        siteId: asset.siteId,
        serialNumber: asset.serialNumber ?? null,
        installationDate: asset.installationDate ?? null,
        status: asset.status,
        qualificationStatus: asset.qualificationStatus,
        confidence: asset.confidence,
        visibility: asset.visibility,
        isDemo: asset.isDemo,
      }));
      break;
    }
    case "sources": {
      const paged = await repo.list("source", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((source) => ({
        id: source.id,
        type: source.type,
        title: source.title,
        publisher: source.publisher ?? null,
        url: source.url ?? null,
        publishedAt: source.publishedAt ?? null,
        capturedAt: source.capturedAt,
        visibility: source.visibility,
        isDemo: source.isDemo,
      }));
      break;
    }
    case "signals": {
      const paged = await repo.listSignals({ pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((signal) => ({
        id: signal.id,
        type: signal.type,
        reason: signal.reason,
        recommendedAction: signal.recommendedAction,
        commercialRelevance: signal.commercialRelevance,
        confidence: signal.confidence,
        status: signal.status,
        generatedAt: signal.generatedAt,
        triggeringRecordIds: signal.triggeringRecordIds.join(";"),
        visibility: signal.visibility,
        isDemo: signal.isDemo,
      }));
      break;
    }
    case "research-findings": {
      const paged = await repo.list("research_finding", { pageSize: 1000 });
      rows = scopeRows(paged.items, includeTenantPrivate).map((finding) => ({
        id: finding.id,
        projectId: finding.projectId,
        kind: finding.kind,
        text: finding.text,
        evidenceClaimIds: finding.evidenceClaimIds.join(";"),
        visibility: finding.visibility,
        isDemo: finding.isDemo,
      }));
      break;
    }
  }

  const columns: string[] = [];
  for (const row of rows as AnyRecord[]) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return { family, entityType: FAMILY_ENTITY_TYPE[family], rows, columns, scope };
}
