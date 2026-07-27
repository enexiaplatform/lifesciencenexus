import { z } from "zod";

import {
  AVAILABILITY_STATUSES,
  DATA_QUALITY_ISSUE_KINDS,
  DECISION_ROLES,
  ENTITY_TYPES,
  EQUIVALENCE_CLASSIFICATIONS,
  EQUIVALENCE_DIMENSIONS,
  EVIDENCE_STATES,
  IDENTIFIER_SCHEMES,
  INSTALLED_ASSET_STATUSES,
  ORGANIZATION_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_DOCUMENT_TYPES,
  PRODUCT_STATUSES,
  QUALIFICATION_STATUSES,
  RESEARCH_PROJECT_STATUSES,
  SITE_TYPES,
  SOURCE_TYPES,
  SUPPLIER_RELATIONSHIP_TYPES,
  TENDER_STATUSES,
  VENDOR_APPROVAL_STATUSES,
  VISIBILITIES,
} from "./types";

/**
 * Zod DTO schemas for create/update payloads across the domain.
 *
 * DTOs carry domain fields only — audit fields (id, createdAt, …) and tenant
 * context are assigned by the repository. `visibility`/`isDemo` are accepted
 * but optional; repositories apply their defaults (canonical for shared
 * reference data, tenant_private for overlay data).
 *
 * The Memoire handoff and field-observation contract payloads live with their
 * contract versions in `@/lib/integrations/memoire` and are re-exported here.
 */

export {
  buildMemoireHandoff,
  fieldObservationPayloadSchema,
  handoffPayloadSchema,
  MEMOIRE_HANDOFF_CONTRACT_VERSION,
  FIELD_OBSERVATION_CONTRACT_VERSION,
} from "@/lib/integrations/memoire";
export type { FieldObservationPayload, MemoireHandoffPayload } from "@/lib/integrations/memoire";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** ISO 8601 date or datetime string. */
export const isoDateString = z
  .string()
  .regex(ISO_DATE_RE, "Expected an ISO 8601 date or datetime (e.g. 2026-01-31 or 2026-01-31T09:30:00Z)");

/** ISO 3166-1 alpha-2, normalized to uppercase. */
export const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Expected an ISO 3166-1 alpha-2 country code");

/** ISO 4217, normalized to uppercase. */
export const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Expected an ISO 4217 currency code");

export const visibilitySchema = z.enum(VISIBILITIES);
export const evidenceStateSchema = z.enum(EVIDENCE_STATES);
export const entityTypeSchema = z.enum(ENTITY_TYPES);

/** Fraction 0–1 (rates, confidences). */
const fraction = z.number().min(0).max(1);

export const confidenceDimensionsSchema = z
  .object({
    sourceAuthority: fraction,
    sourceRecency: fraction,
    entityMatch: fraction,
    extraction: fraction,
    technicalEquivalence: fraction,
    geographicRelevance: fraction,
    commercialRelevance: fraction,
  })
  .strict();
export type ConfidenceDimensionsInput = z.infer<typeof confidenceDimensionsSchema>;

export const edgeEvidenceSchema = z
  .object({
    sourceId: z.string().min(1).optional(),
    confidence: fraction,
    validFrom: isoDateString.optional(),
    validTo: isoDateString.optional(),
    reviewerId: z.string().min(1).optional(),
    notes: z.string().optional(),
    state: evidenceStateSchema,
  })
  .strict();

const governance = {
  visibility: visibilitySchema.optional(),
  isDemo: z.boolean().optional(),
} as const;

// ---------------------------------------------------------------------------
// Organizations & sites
// ---------------------------------------------------------------------------

export const organizationIdentifierSchema = z
  .object({
    scheme: z.enum(IDENTIFIER_SCHEMES),
    value: z.string().trim().min(1),
  })
  .strict();

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(1),
    types: z.array(z.enum(ORGANIZATION_TYPES)).min(1),
    country: countryCode,
    website: z.string().url().optional(),
    identifiers: z.array(organizationIdentifierSchema).default([]),
    ...governance,
  })
  .strict();
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export const updateOrganizationSchema = createOrganizationSchema.partial();
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const createSiteSchema = z
  .object({
    organizationId: z.string().min(1),
    name: z.string().trim().min(1),
    siteType: z.enum(SITE_TYPES),
    addressId: z.string().min(1).optional(),
    ...governance,
  })
  .strict();
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export const updateSiteSchema = createSiteSchema.partial();
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const createProductSchema = z
  .object({
    familyId: z.string().min(1),
    manufacturerOrganizationId: z.string().min(1),
    name: z.string().trim().min(1),
    category: z.enum(PRODUCT_CATEGORIES),
    description: z.string().optional(),
    status: z.enum(PRODUCT_STATUSES).default("unknown"),
    successorProductId: z.string().min(1).optional(),
    predecessorProductId: z.string().min(1).optional(),
    ...governance,
  })
  .strict();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createSkuSchema = z
  .object({
    productId: z.string().min(1),
    catalogueNumber: z.string().trim().min(1).optional(),
    manufacturerCode: z.string().trim().min(1).optional(),
    gtin: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1),
    alternateNames: z.array(z.string().trim().min(1)).default([]),
    formatId: z.string().min(1).optional(),
    shelfLifeMonths: z.number().int().positive().optional(),
    storageCondition: z.string().trim().min(1).optional(),
    countryAvailability: z.array(countryCode).default([]),
    status: z.enum(PRODUCT_STATUSES).default("unknown"),
    successorSkuId: z.string().min(1).optional(),
    ...governance,
  })
  .strict();
export type CreateSkuInput = z.infer<typeof createSkuSchema>;
export const updateSkuSchema = createSkuSchema.partial();
export type UpdateSkuInput = z.infer<typeof updateSkuSchema>;

export const createPackConfigurationSchema = z
  .object({
    skuId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().trim().min(1),
    unitsPerPack: z.number().int().positive().optional(),
    description: z.string().trim().min(1).optional(),
    ...governance,
  })
  .strict();
export type CreatePackConfigurationInput = z.infer<typeof createPackConfigurationSchema>;
export const updatePackConfigurationSchema = createPackConfigurationSchema.partial();
export type UpdatePackConfigurationInput = z.infer<typeof updatePackConfigurationSchema>;

export const createProductDocumentSchema = z
  .object({
    skuId: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    docType: z.enum(PRODUCT_DOCUMENT_TYPES),
    title: z.string().trim().min(1),
    sourceId: z.string().min(1),
    ...governance,
  })
  .strict()
  .refine((value) => value.skuId !== undefined || value.productId !== undefined, {
    message: "A product document must reference a skuId or a productId",
  });
export type CreateProductDocumentInput = z.infer<typeof createProductDocumentSchema>;

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

export const createPriceObservationSchema = z
  .object({
    skuId: z.string().min(1),
    packConfigurationId: z.string().min(1).optional(),
    supplierOrgId: z.string().min(1).optional(),
    originalAmount: z.number().nonnegative(),
    originalCurrency: currencyCode,
    observationDate: isoDateString,
    validFrom: isoDateString.optional(),
    validTo: isoDateString.optional(),
    taxIncluded: z.boolean(),
    vatRate: fraction.optional(),
    incoterm: z.string().trim().min(1).optional(),
    geography: z.string().trim().min(1),
    customerSegment: z.string().trim().min(1).optional(),
    quantity: z.number().positive().default(1),
    sourceId: z.string().min(1),
    confidence: confidenceDimensionsSchema,
    evidenceState: evidenceStateSchema,
    isSynthetic: z.boolean().default(false),
    ...governance,
  })
  .strict()
  .refine((value) => !value.validFrom || !value.validTo || value.validTo >= value.validFrom, {
    message: "validTo must not be before validFrom",
    path: ["validTo"],
  });
export type CreatePriceObservationInput = z.infer<typeof createPriceObservationSchema>;
export const updatePriceObservationSchema = createPriceObservationSchema.innerType().partial();
export type UpdatePriceObservationInput = z.infer<typeof updatePriceObservationSchema>;

// ---------------------------------------------------------------------------
// Tenders
// ---------------------------------------------------------------------------

export const createTenderSchema = z
  .object({
    code: z.string().trim().min(1),
    title: z.string().trim().min(1),
    buyerOrganizationId: z.string().min(1),
    siteId: z.string().min(1).optional(),
    publicationDate: isoDateString.optional(),
    submissionDeadline: isoDateString.optional(),
    awardDate: isoDateString.optional(),
    contractPeriodMonths: z.number().int().positive().optional(),
    country: countryCode,
    status: z.enum(TENDER_STATUSES).default("unknown"),
    sourceId: z.string().min(1),
    ...governance,
  })
  .strict();
export type CreateTenderInput = z.infer<typeof createTenderSchema>;
export const updateTenderSchema = createTenderSchema.partial();
export type UpdateTenderInput = z.infer<typeof updateTenderSchema>;

export const createTenderLotSchema = z
  .object({
    tenderId: z.string().min(1),
    name: z.string().trim().min(1),
    description: z.string().optional(),
    ...governance,
  })
  .strict();
export type CreateTenderLotInput = z.infer<typeof createTenderLotSchema>;

export const createTenderItemSchema = z
  .object({
    lotId: z.string().min(1),
    description: z.string().trim().min(1),
    requiredSpecification: z.string().optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().trim().min(1).optional(),
    mappedProductId: z.string().min(1).optional(),
    mappedSkuId: z.string().min(1).optional(),
    ...governance,
  })
  .strict();
export type CreateTenderItemInput = z.infer<typeof createTenderItemSchema>;

export const createTenderAwardSchema = z
  .object({
    lotId: z.string().min(1).optional(),
    tenderItemId: z.string().min(1).optional(),
    awardedSupplierOrgId: z.string().min(1),
    awardedManufacturerOrgId: z.string().min(1).optional(),
    awardedProductId: z.string().min(1).optional(),
    amount: z.number().nonnegative(),
    currency: currencyCode,
    awardDate: isoDateString.optional(),
    evidence: edgeEvidenceSchema,
    ...governance,
  })
  .strict()
  .refine((value) => value.lotId !== undefined || value.tenderItemId !== undefined, {
    message: "An award must reference a lotId or a tenderItemId",
  });
export type CreateTenderAwardInput = z.infer<typeof createTenderAwardSchema>;

// ---------------------------------------------------------------------------
// Installed base
// ---------------------------------------------------------------------------

export const createInstalledAssetSchema = z
  .object({
    assetModelId: z.string().min(1),
    siteId: z.string().min(1),
    laboratoryId: z.string().min(1).optional(),
    serialNumber: z.string().trim().min(1).optional(),
    installationDate: isoDateString.optional(),
    status: z.enum(INSTALLED_ASSET_STATUSES).default("unknown"),
    qualificationStatus: z.enum(QUALIFICATION_STATUSES).default("unknown"),
    serviceProviderOrgId: z.string().min(1).optional(),
    expectedReplacementDate: isoDateString.optional(),
    estimatedAnnualConsumption: z.number().nonnegative().optional(),
    confidence: fraction,
    ...governance,
  })
  .strict();
export type CreateInstalledAssetInput = z.infer<typeof createInstalledAssetSchema>;
export const updateInstalledAssetSchema = createInstalledAssetSchema.partial();
export type UpdateInstalledAssetInput = z.infer<typeof updateInstalledAssetSchema>;

// ---------------------------------------------------------------------------
// Sources & claims
// ---------------------------------------------------------------------------

export const createSourceSchema = z
  .object({
    type: z.enum(SOURCE_TYPES),
    title: z.string().trim().min(1),
    publisher: z.string().trim().min(1).optional(),
    url: z.string().url().optional(),
    publishedAt: isoDateString.optional(),
    capturedAt: isoDateString,
    documentId: z.string().min(1).optional(),
    notes: z.string().optional(),
    ...governance,
  })
  .strict();
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export const updateSourceSchema = createSourceSchema.partial();
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;

export const claimObjectValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.unknown()),
  z.array(z.unknown()),
]);

export const createClaimSchema = z
  .object({
    subjectEntityType: entityTypeSchema,
    subjectEntityId: z.string().min(1),
    predicate: z.string().trim().min(1),
    objectValue: claimObjectValueSchema,
    sourceId: z.string().min(1),
    effectiveDate: isoDateString.optional(),
    reviewByDate: isoDateString.optional(),
    confidence: confidenceDimensionsSchema,
    reviewStatus: evidenceStateSchema,
    reviewerId: z.string().min(1).optional(),
    contradictingClaimIds: z.array(z.string().min(1)).default([]),
    ...governance,
  })
  .strict();
export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export const updateClaimSchema = createClaimSchema.partial();
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>;

export const createDataQualityIssueSchema = z
  .object({
    kind: z.enum(DATA_QUALITY_ISSUE_KINDS),
    entityType: entityTypeSchema,
    entityId: z.string().min(1),
    field: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1),
    severity: z.enum(["low", "medium", "high"]),
    status: z.enum(["open", "acknowledged", "resolved", "wont_fix"]).default("open"),
    ...governance,
  })
  .strict();
export type CreateDataQualityIssueInput = z.infer<typeof createDataQualityIssueSchema>;

// ---------------------------------------------------------------------------
// Research workspace
// ---------------------------------------------------------------------------

export const createResearchProjectSchema = z
  .object({
    title: z.string().trim().min(1),
    question: z.string().trim().min(1),
    scope: z.string().optional(),
    geographyCodes: z.array(z.string().trim().min(1)).default([]),
    industryCodes: z.array(z.string().trim().min(1)).default([]),
    status: z.enum(RESEARCH_PROJECT_STATUSES).default("active"),
    ...governance,
  })
  .strict();
export type CreateResearchProjectInput = z.infer<typeof createResearchProjectSchema>;
export const updateResearchProjectSchema = createResearchProjectSchema.partial();
export type UpdateResearchProjectInput = z.infer<typeof updateResearchProjectSchema>;

// ---------------------------------------------------------------------------
// Equivalence records
// ---------------------------------------------------------------------------

export const dimensionScoreSchema = z
  .object({
    /** 0–100; null = unknown (never silently zero). */
    score: z.number().min(0).max(100).nullable(),
    weight: z.number().min(0),
    note: z.string().optional(),
  })
  .strict();

export const createEquivalenceRecordSchema = z
  .object({
    sourceSkuId: z.string().min(1),
    candidateSkuId: z.string().min(1),
    classification: z.enum(EQUIVALENCE_CLASSIFICATIONS),
    overallScore: z.number().min(0).max(100),
    dimensionScores: z.record(z.enum(EQUIVALENCE_DIMENSIONS), dimensionScoreSchema),
    rationale: z.string().trim().min(1),
    differences: z
      .array(
        z
          .object({
            dimension: z.enum(EQUIVALENCE_DIMENSIONS),
            description: z.string().trim().min(1),
            severity: z.enum(["minor", "moderate", "major"]).optional(),
          })
          .strict(),
      )
      .default([]),
    validationConsiderations: z.array(z.string().trim().min(1)).default([]),
    evidenceClaimIds: z.array(z.string().min(1)).default([]),
    reviewerId: z.string().min(1).optional(),
    reviewState: evidenceStateSchema,
    lastReviewedAt: isoDateString.optional(),
    ...governance,
  })
  .strict();
export type CreateEquivalenceRecordInput = z.infer<typeof createEquivalenceRecordSchema>;
export const updateEquivalenceRecordSchema = createEquivalenceRecordSchema.partial();
export type UpdateEquivalenceRecordInput = z.infer<typeof updateEquivalenceRecordSchema>;

// ---------------------------------------------------------------------------
// Suppliers & commercial overlay
// ---------------------------------------------------------------------------

export const createSupplierListingSchema = z
  .object({
    supplierOrgId: z.string().min(1),
    skuId: z.string().min(1),
    relationshipType: z.enum(SUPPLIER_RELATIONSHIP_TYPES),
    evidence: edgeEvidenceSchema,
    ...governance,
  })
  .strict();
export type CreateSupplierListingInput = z.infer<typeof createSupplierListingSchema>;
export const updateSupplierListingSchema = createSupplierListingSchema.partial();
export type UpdateSupplierListingInput = z.infer<typeof updateSupplierListingSchema>;

export const createAvailabilityObservationSchema = z
  .object({
    supplierOrgId: z.string().min(1),
    skuId: z.string().min(1),
    country: countryCode,
    observedAt: isoDateString,
    status: z.enum(AVAILABILITY_STATUSES),
    leadTimeDays: z.number().int().nonnegative().optional(),
    ...governance,
  })
  .strict();
export type CreateAvailabilityObservationInput = z.infer<typeof createAvailabilityObservationSchema>;
export const updateAvailabilityObservationSchema = createAvailabilityObservationSchema.partial();
export type UpdateAvailabilityObservationInput = z.infer<typeof updateAvailabilityObservationSchema>;

export const createVendorApprovalSchema = z
  .object({
    organizationId: z.string().min(1),
    supplierOrgId: z.string().min(1),
    status: z.enum(VENDOR_APPROVAL_STATUSES),
    validTo: isoDateString.optional(),
    evidence: edgeEvidenceSchema,
    ...governance,
  })
  .strict();
export type CreateVendorApprovalInput = z.infer<typeof createVendorApprovalSchema>;
export const updateVendorApprovalSchema = createVendorApprovalSchema.partial();
export type UpdateVendorApprovalInput = z.infer<typeof updateVendorApprovalSchema>;

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const createPersonSchema = z
  .object({
    fullName: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().trim().min(1).optional(),
    notes: z.string().optional(),
    ...governance,
  })
  .strict();
export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export const updatePersonSchema = createPersonSchema.partial();
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

export const createOrganizationContactSchema = z
  .object({
    personId: z.string().min(1),
    organizationId: z.string().min(1),
    siteId: z.string().min(1).optional(),
    decisionRoles: z.array(z.enum(DECISION_ROLES)).default([]),
    isPrimary: z.boolean().default(false),
    notes: z.string().optional(),
    ...governance,
  })
  .strict();
export type CreateOrganizationContactInput = z.infer<typeof createOrganizationContactSchema>;
export const updateOrganizationContactSchema = createOrganizationContactSchema.partial();
export type UpdateOrganizationContactInput = z.infer<typeof updateOrganizationContactSchema>;
