import type {
  AvailabilityObservation,
  BaseEntity,
  Claim,
  ConfidenceDimensions,
  ConsumableCompatibility,
  DistributionAgreement,
  EdgeEvidence,
  InstalledAsset,
  Organization,
  PriceObservation,
  Product,
  ProductEdge,
  ProductValidation,
  Sku,
  SupplierListing,
  Tender,
  VendorApproval,
} from "./types";

/**
 * Shared fixtures for domain engine tests. Deterministic ids/timestamps;
 * every factory accepts Partial overrides so tests state only what matters.
 */

let counter = 0;
export function uniqueId(prefix = "t"): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export const TEST_ISO = "2026-01-01T00:00:00.000Z";

export function baseFields(overrides: Partial<BaseEntity> = {}): BaseEntity {
  return {
    id: uniqueId(),
    createdAt: TEST_ISO,
    updatedAt: TEST_ISO,
    createdBy: "tester",
    updatedBy: "tester",
    visibility: "canonical",
    isDemo: true,
    ...overrides,
  };
}

export function fullConfidence(value = 0.8): ConfidenceDimensions {
  return {
    sourceAuthority: value,
    sourceRecency: value,
    entityMatch: value,
    extraction: value,
    technicalEquivalence: value,
    geographicRelevance: value,
    commercialRelevance: value,
  };
}

export function makeEdgeEvidence(overrides: Partial<EdgeEvidence> = {}): EdgeEvidence {
  return { confidence: 0.8, state: "source_captured", ...overrides };
}

export function makeOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    ...baseFields(),
    name: `Org ${uniqueId("org")}`,
    types: ["manufacturer"],
    country: "VN",
    identifiers: [],
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    ...baseFields(),
    familyId: uniqueId("fam"),
    manufacturerOrganizationId: uniqueId("mfr"),
    name: `Product ${uniqueId("prod")}`,
    category: "dehydrated_culture_media",
    status: "active",
    ...overrides,
  };
}

export function makeSku(overrides: Partial<Sku> = {}): Sku {
  return {
    ...baseFields(),
    productId: uniqueId("prod"),
    name: `SKU ${uniqueId("sku")}`,
    alternateNames: [],
    countryAvailability: [],
    status: "active",
    ...overrides,
  };
}

export function makeProductEdge(overrides: Partial<ProductEdge> = {}): ProductEdge {
  return {
    ...baseFields(),
    productId: uniqueId("prod"),
    targetType: "standard",
    targetId: uniqueId("std"),
    evidence: makeEdgeEvidence(),
    ...overrides,
  };
}

export function makePriceObservation(overrides: Partial<PriceObservation> = {}): PriceObservation {
  return {
    ...baseFields(),
    skuId: uniqueId("sku"),
    originalAmount: 1_000_000,
    originalCurrency: "VND",
    observationDate: "2026-01-15",
    taxIncluded: false,
    geography: "VN",
    quantity: 1,
    sourceId: uniqueId("src"),
    confidence: fullConfidence(),
    evidenceState: "source_captured",
    isSynthetic: false,
    ...overrides,
  };
}

export function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    ...baseFields(),
    subjectEntityType: "sku",
    subjectEntityId: uniqueId("sku"),
    predicate: "has_attribute",
    objectValue: "value",
    sourceId: uniqueId("src"),
    confidence: fullConfidence(),
    reviewStatus: "source_captured",
    contradictingClaimIds: [],
    ...overrides,
  };
}

export function makeInstalledAsset(overrides: Partial<InstalledAsset> = {}): InstalledAsset {
  return {
    ...baseFields(),
    tenantId: "tenant-1",
    assetModelId: uniqueId("model"),
    siteId: uniqueId("site"),
    status: "operational",
    qualificationStatus: "unknown",
    confidence: 0.8,
    ...overrides,
  };
}

export function makeTender(overrides: Partial<Tender> = {}): Tender {
  return {
    ...baseFields(),
    code: `TD-${uniqueId("n")}`,
    title: "Media supply tender",
    buyerOrganizationId: uniqueId("buyer"),
    country: "VN",
    status: "awarded",
    sourceId: uniqueId("src"),
    ...overrides,
  };
}

export function makeDistributionAgreement(
  overrides: Partial<DistributionAgreement> = {},
): DistributionAgreement {
  return {
    ...baseFields(),
    manufacturerOrgId: uniqueId("mfr"),
    distributorOrgId: uniqueId("dist"),
    relationshipType: "authorized_distributor",
    countries: ["VN"],
    evidence: makeEdgeEvidence(),
    ...overrides,
  };
}

export function makeSupplierListing(overrides: Partial<SupplierListing> = {}): SupplierListing {
  return {
    ...baseFields(),
    supplierOrgId: uniqueId("sup"),
    skuId: uniqueId("sku"),
    relationshipType: "authorized_distributor",
    evidence: makeEdgeEvidence(),
    ...overrides,
  };
}

export function makeConsumableCompatibility(
  overrides: Partial<ConsumableCompatibility> = {},
): ConsumableCompatibility {
  return {
    ...baseFields(),
    assetModelId: uniqueId("model"),
    skuId: uniqueId("sku"),
    evidence: makeEdgeEvidence(),
    ...overrides,
  };
}

export function makeVendorApproval(overrides: Partial<VendorApproval> = {}): VendorApproval {
  return {
    ...baseFields(),
    tenantId: "tenant-1",
    organizationId: uniqueId("cust"),
    supplierOrgId: uniqueId("sup"),
    status: "approved",
    evidence: makeEdgeEvidence(),
    ...overrides,
  };
}

export function makeProductValidation(
  overrides: Partial<ProductValidation> = {},
): ProductValidation {
  return {
    ...baseFields(),
    tenantId: "tenant-1",
    organizationId: uniqueId("cust"),
    skuId: uniqueId("sku"),
    status: "in_progress",
    ...overrides,
  };
}

export function makeAvailabilityObservation(
  overrides: Partial<AvailabilityObservation> = {},
): AvailabilityObservation {
  return {
    ...baseFields(),
    supplierOrgId: uniqueId("sup"),
    skuId: uniqueId("sku"),
    country: "VN",
    observedAt: "2026-06-01",
    status: "in_stock",
    ...overrides,
  };
}
