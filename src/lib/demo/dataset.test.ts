import { describe, expect, it } from "vitest";

import type {
  EntityType,
  EntityTypeMap,
  EntityRef,
  NexusEntity,
  ProductEdgeTargetType,
} from "@/lib/domain/types";
import { ENTITY_TYPES, TENANT_SCOPED_ENTITY_TYPES } from "@/lib/domain/types";

import { ASSETS, DEMO_TENANT_ID, MEMBERSHIPS, ORGS, OTHER_TENANT_ID, PEOPLE, RESEARCH, SKUS, TENDER, USERS } from "./ids";
import { buildDemoDataset, demoDatasetStats } from "./index";

const FIXED_NOW = new Date("2026-07-01T00:00:00.000Z");
const dataset = buildDemoDataset(FIXED_NOW);

function recordsOf<K extends EntityType>(type: K): Array<EntityTypeMap[K]> {
  // Indexed access over the union key yields a union of arrays; the generic
  // caller already fixed K, so the cast back to EntityTypeMap[K] is safe.
  return (dataset[type] ?? []) as unknown as Array<EntityTypeMap[K]>;
}

function indexById(type: EntityType): Map<string, NexusEntity> {
  return new Map((recordsOf(type) as NexusEntity[]).map((record) => [record.id, record]));
}

/** Assert that `fromType.field` (string or string[]) resolves against `toType` whenever set. */
function expectReferences<K extends EntityType>(
  fromType: K,
  field: keyof EntityTypeMap[K] & string,
  toType: EntityType,
): void {
  const target = indexById(toType);
  for (const record of recordsOf(fromType)) {
    const value = (record as unknown as Record<string, unknown>)[field];
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined || item === null) continue;
      expect(
        target.has(item as string),
        `${fromType} ${record.id}: ${field} references missing ${toType} ${String(item)}`,
      ).toBe(true);
    }
  }
}

/** Assert an entityType+entityId pointer resolves. */
function expectEntityRef(ref: EntityRef, context: string): void {
  expect(
    indexById(ref.entityType).has(ref.entityId),
    `${context}: missing ${ref.entityType} ${ref.entityId}`,
  ).toBe(true);
}

const EDGE_TARGET_ENTITY: Record<ProductEdgeTargetType, EntityType> = {
  application: "application",
  method: "method",
  standard: "standard",
  organism: "organism",
  sample_type: "sample_type",
  industry: "industry",
  technology: "technology",
  test_type: "test_type",
  incubation_condition: "incubation_condition",
  preparation_method: "preparation_method",
};

describe("demo dataset integrity", () => {
  it("seeds every record as synthetic demo data", () => {
    let total = 0;
    for (const type of ENTITY_TYPES) {
      for (const record of recordsOf(type) as NexusEntity[]) {
        total += 1;
        expect(record.isDemo, `${type} ${record.id} must be isDemo`).toBe(true);
        expect(record.id).toBeTruthy();
        expect(record.createdAt).toBe(dataset.generatedAt);
      }
    }
    expect(total).toBeGreaterThan(150);
  });

  it("scopes tenant-scoped records to tenant_demo (plus the two tenant_other isolation records)", () => {
    const otherTenantRecords: string[] = [];
    for (const type of ENTITY_TYPES) {
      if (!TENANT_SCOPED_ENTITY_TYPES.has(type)) continue;
      // Memberships exist for both tenants by construction — they are tenancy
      // infrastructure, not the private records used to prove isolation.
      if (type === "tenant_membership") continue;
      for (const record of recordsOf(type) as Array<NexusEntity & { tenantId: string }>) {
        expect([DEMO_TENANT_ID, OTHER_TENANT_ID]).toContain(record.tenantId);
        expect(record.visibility).toBe("tenant_private");
        if (record.tenantId === OTHER_TENANT_ID) otherTenantRecords.push(record.id);
      }
    }
    expect(otherTenantRecords.sort()).toEqual([PEOPLE.phamThiLan, RESEARCH.otherProject].sort());
  });

  it("seeds the demo tenant with owner/analyst/viewer memberships", () => {
    const memberships = recordsOf("tenant_membership").filter((m) => m.tenantId === DEMO_TENANT_ID);
    const roleByUser = new Map(memberships.map((m) => [m.userId, m.role]));
    expect(roleByUser.get(USERS.demoOwner)).toBe("owner");
    expect(roleByUser.get(USERS.demoAnalyst)).toBe("analyst");
    expect(roleByUser.get(USERS.demoViewer)).toBe("viewer");
    expect(recordsOf("profile").map((p) => p.email)).toEqual(
      expect.arrayContaining(["demo_owner@nexus.demo", "demo_analyst@nexus.demo", "demo_viewer@nexus.demo"]),
    );
  });

  it("resolves every foreign-key-like reference", () => {
    expectReferences("organization_alias", "organizationId", "organization");
    expectReferences("organization_relationship", "fromOrgId", "organization");
    expectReferences("organization_relationship", "toOrgId", "organization");
    expectReferences("site", "organizationId", "organization");
    expectReferences("site", "addressId", "address");
    expectReferences("facility_unit", "siteId", "site");
    expectReferences("laboratory", "siteId", "site");
    expectReferences("production_line", "siteId", "site");
    expectReferences("employment_relationship", "personId", "person");
    expectReferences("employment_relationship", "organizationId", "organization");
    expectReferences("organization_contact", "personId", "person");
    expectReferences("organization_contact", "organizationId", "organization");
    expectReferences("organization_contact", "siteId", "site");
    expectReferences("brand", "ownerOrganizationId", "organization");
    expectReferences("product_family", "brandId", "brand");
    expectReferences("product", "familyId", "product_family");
    expectReferences("product", "manufacturerOrganizationId", "organization");
    expectReferences("product", "successorProductId", "product");
    expectReferences("product", "predecessorProductId", "product");
    expectReferences("sku", "productId", "product");
    expectReferences("sku", "formatId", "product_format");
    expectReferences("sku", "successorSkuId", "sku");
    expectReferences("pack_configuration", "skuId", "sku");
    expectReferences("product_document", "skuId", "sku");
    expectReferences("product_document", "productId", "product");
    expectReferences("product_document", "sourceId", "source");
    expectReferences("method", "standardIds", "standard");
    expectReferences("standard_version", "standardId", "standard");
    expectReferences("product_edge", "productId", "product");
    expectReferences("supplier_profile", "organizationId", "organization");
    expectReferences("supplier_profile", "manufacturers", "organization");
    expectReferences("distribution_agreement", "manufacturerOrgId", "organization");
    expectReferences("distribution_agreement", "distributorOrgId", "organization");
    expectReferences("supplier_listing", "supplierOrgId", "organization");
    expectReferences("supplier_listing", "skuId", "sku");
    expectReferences("availability_observation", "supplierOrgId", "organization");
    expectReferences("availability_observation", "skuId", "sku");
    expectReferences("commercial_terms", "supplierOrgId", "organization");
    expectReferences("price_observation", "skuId", "sku");
    expectReferences("price_observation", "packConfigurationId", "pack_configuration");
    expectReferences("price_observation", "supplierOrgId", "organization");
    expectReferences("price_observation", "sourceId", "source");
    expectReferences("price_component", "priceObservationId", "price_observation");
    expectReferences("tender", "buyerOrganizationId", "organization");
    expectReferences("tender", "siteId", "site");
    expectReferences("tender", "sourceId", "source");
    expectReferences("tender_lot", "tenderId", "tender");
    expectReferences("tender_item", "lotId", "tender_lot");
    expectReferences("tender_item", "mappedProductId", "product");
    expectReferences("tender_item", "mappedSkuId", "sku");
    expectReferences("tender_bidder", "organizationId", "organization");
    expectReferences("tender_bidder", "lotId", "tender_lot");
    expectReferences("tender_award", "lotId", "tender_lot");
    expectReferences("tender_award", "awardedSupplierOrgId", "organization");
    expectReferences("tender_award", "awardedManufacturerOrgId", "organization");
    expectReferences("tender_award", "awardedProductId", "product");
    expectReferences("tender_event", "tenderId", "tender");
    expectReferences("asset_model", "manufacturerOrgId", "organization");
    expectReferences("asset_model", "brandId", "brand");
    expectReferences("installed_asset", "assetModelId", "asset_model");
    expectReferences("installed_asset", "siteId", "site");
    expectReferences("installed_asset", "laboratoryId", "laboratory");
    expectReferences("installed_asset", "serviceProviderOrgId", "organization");
    expectReferences("asset_lifecycle_event", "installedAssetId", "installed_asset");
    expectReferences("maintenance_event", "installedAssetId", "installed_asset");
    expectReferences("maintenance_event", "providerOrgId", "organization");
    expectReferences("qualification_event", "installedAssetId", "installed_asset");
    expectReferences("consumable_compatibility", "assetModelId", "asset_model");
    expectReferences("consumable_compatibility", "skuId", "sku");
    expectReferences("consumption_model", "installedAssetId", "installed_asset");
    expectReferences("consumption_model", "skuId", "sku");
    expectReferences("vendor_approval", "organizationId", "organization");
    expectReferences("vendor_approval", "supplierOrgId", "organization");
    expectReferences("product_validation", "organizationId", "organization");
    expectReferences("product_validation", "skuId", "sku");
    expectReferences("trial_event", "organizationId", "organization");
    expectReferences("trial_event", "skuId", "sku");
    expectReferences("trial_event", "productValidationId", "product_validation");
    expectReferences("research_note", "projectId", "research_project");
    expectReferences("research_finding", "projectId", "research_project");
    expectReferences("research_finding", "evidenceClaimIds", "claim");
    expectReferences("research_project_entity", "projectId", "research_project");
    expectReferences("research_export", "projectId", "research_project");
    expectReferences("cost_per_test_scenario", "skuId", "sku");
    expectReferences("cost_per_test_scenario", "priceObservationId", "price_observation");
    expectReferences("equivalence_record", "sourceSkuId", "sku");
    expectReferences("equivalence_record", "candidateSkuId", "sku");
    expectReferences("equivalence_record", "evidenceClaimIds", "claim");
    expectReferences("claim", "sourceId", "source");
    expectReferences("evidence_review", "claimId", "claim");
    expectReferences("source_document", "sourceId", "source");
    expectReferences("tenant_membership", "tenantId", "tenant");
    expectReferences("profile", "defaultTenantId", "tenant");
  });

  it("resolves polymorphic pointers (edge targets, claim subjects, entity links)", () => {
    for (const edge of recordsOf("product_edge")) {
      expectEntityRef({ entityType: EDGE_TARGET_ENTITY[edge.targetType], entityId: edge.targetId }, `edge ${edge.id}`);
      expect(edge.evidence.sourceId, `edge ${edge.id} evidence source`).toSatisfy(
        (sourceId: unknown) => typeof sourceId === "string" && indexById("source").has(sourceId),
      );
    }
    for (const claim of recordsOf("claim")) {
      expectEntityRef(
        { entityType: claim.subjectEntityType, entityId: claim.subjectEntityId },
        `claim ${claim.id} subject`,
      );
    }
    for (const link of recordsOf("research_project_entity")) {
      expectEntityRef({ entityType: link.entityType, entityId: link.entityId }, `research link ${link.id}`);
    }
    for (const issue of recordsOf("data_quality_issue")) {
      expectEntityRef({ entityType: issue.entityType, entityId: issue.entityId }, `dq issue ${issue.id}`);
    }
    for (const candidate of recordsOf("duplicate_candidate")) {
      const target = indexById(candidate.entityType);
      expect(target.has(candidate.leftId)).toBe(true);
      expect(target.has(candidate.rightId)).toBe(true);
    }
  });

  it("keeps price observations synthetic, sourced and unreviewed", () => {
    const prices = recordsOf("price_observation");
    expect(prices.length).toBeGreaterThanOrEqual(8);
    for (const price of prices) {
      expect(price.isSynthetic).toBe(true);
      expect(indexById("source").has(price.sourceId)).toBe(true);
      expect(["unverified", "source_captured"]).toContain(price.evidenceState);
    }
    const currencies = new Set(prices.map((price) => price.originalCurrency));
    expect(currencies).toEqual(new Set(["VND", "USD"]));
    const visibilities = new Set(prices.map((price) => price.visibility));
    expect(visibilities).toEqual(new Set(["canonical", "tenant_private"]));
  });

  it("gives every claim a source and never over-reviews synthetic data", () => {
    const claims = recordsOf("claim");
    expect(claims.length).toBeGreaterThanOrEqual(15);
    for (const claim of claims) {
      expect(indexById("source").has(claim.sourceId), `claim ${claim.id} source`).toBe(true);
      expect(claim.reviewStatus).not.toBe("domain_expert_reviewed");
    }
    const states = new Set(claims.map((claim) => claim.reviewStatus));
    expect(states.has("unverified")).toBe(true);
    expect(states.has("source_captured")).toBe(true);
    expect(states.has("analyst_reviewed")).toBe(true);
  });

  it("computes the two seeded duplicate pairs with explanations", () => {
    const candidates = recordsOf("duplicate_candidate");
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    for (const candidate of candidates) {
      expect(candidate.status).toBe("pending");
      expect(candidate.matchedOn.length).toBeGreaterThan(0);
    }
    const orgPair = candidates.find((candidate) => candidate.entityType === "organization");
    expect([orgPair?.leftId, orgPair?.rightId].sort()).toEqual([ORGS.mekong, ORGS.mekongDup].sort());
    const skuPair = candidates.find((candidate) => candidate.entityType === "sku");
    expect([skuPair?.leftId, skuPair?.rightId].sort()).toEqual([SKUS.tsa500, SKUS.tsa500Dup].sort());
    expect(skuPair?.matchedOn.join(" ")).toMatch(/catalogue number match/);
  });

  it("anchors signal-relevant dates relative to generation time", () => {
    const generated = new Date(dataset.generatedAt).getTime();
    const day = 24 * 60 * 60 * 1000;

    const airSampler = recordsOf("installed_asset").find((asset) => asset.id === ASSETS.as100);
    const replacementIn = (Date.parse(airSampler?.expectedReplacementDate ?? "") - generated) / day;
    expect(replacementIn).toBeGreaterThan(0);
    expect(replacementIn).toBeLessThanOrEqual(120);

    const tender = recordsOf("tender").find((record) => record.id === TENDER.tender);
    const award = new Date(tender?.awardDate ?? "");
    award.setUTCMonth(award.getUTCMonth() + (tender?.contractPeriodMonths ?? 0));
    const contractEndsIn = (award.getTime() - generated) / day;
    expect(contractEndsIn).toBeGreaterThan(0);
    expect(contractEndsIn).toBeLessThanOrEqual(150);

    const stalest = Math.max(
      ...recordsOf("price_observation").map((price) => (generated - Date.parse(price.observationDate)) / day),
    );
    expect(stalest).toBeGreaterThan(180);
  });

  it("covers the workflow-one minimums (manufacturers, brands, families, SKUs, sources)", () => {
    const stats = demoDatasetStats(dataset) as Record<string, number>;
    const manufacturers = recordsOf("organization").filter((org) => org.types.includes("manufacturer"));
    expect(manufacturers.length).toBeGreaterThanOrEqual(3);
    expect(stats.brand).toBeGreaterThanOrEqual(3);
    expect(stats.product_family).toBeGreaterThanOrEqual(4);
    expect(stats.sku).toBeGreaterThanOrEqual(10);
    expect(stats.source).toBeGreaterThanOrEqual(8);
    expect(stats.claim).toBeGreaterThanOrEqual(15);
    expect(stats.price_observation).toBeGreaterThanOrEqual(8);

    const categories = new Set(recordsOf("product_family").map((family) => family.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);

    const edgedTargets = new Set(recordsOf("product_edge").map((edge) => edge.targetId));
    const applications = recordsOf("application").filter((record) => edgedTargets.has(record.id));
    const standards = recordsOf("standard").filter((record) => edgedTargets.has(record.id));
    const organisms = recordsOf("organism").filter((record) => edgedTargets.has(record.id));
    expect(applications.length).toBeGreaterThanOrEqual(4);
    expect(standards.length).toBeGreaterThanOrEqual(4);
    expect(organisms.length).toBeGreaterThanOrEqual(5);
  });

  it("marks memberships for both tenants", () => {
    const tenantIds = new Set(recordsOf("tenant_membership").map((membership) => membership.tenantId));
    expect(tenantIds).toEqual(new Set([DEMO_TENANT_ID, OTHER_TENANT_ID]));
    expect(recordsOf("tenant_membership").map((membership) => membership.id)).toContain(MEMBERSHIPS.demoOwner);
  });
});
