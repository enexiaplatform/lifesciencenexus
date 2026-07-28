import { z } from "zod";

import {
  countryCode,
  createEquivalenceRecordSchema,
  createInstalledAssetSchema,
  createOrganizationSchema,
  createPersonSchema,
  createPriceObservationSchema,
  createProductSchema,
  createSiteSchema,
  createSkuSchema,
  createTenderSchema,
  currencyCode,
  isoDateString,
  organizationIdentifierSchema,
} from "@/lib/domain/schemas";
import {
  DECISION_ROLES,
  EVIDENCE_STATES,
  INSTALLED_ASSET_STATUSES,
  ORGANIZATION_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  QUALIFICATION_STATUSES,
  SITE_TYPES,
  SUPPLIER_RELATIONSHIP_TYPES,
  TENDER_STATUSES,
} from "@/lib/domain/types";

import type { ImportKind } from "./templates";

/**
 * Per-row validation for the import wizard.
 *
 * Rows arrive as string records keyed by template field (post-mapping). Each
 * kind has a pipeline: cell coercion (strings -> numbers/booleans/lists,
 * Vietnamese-friendly booleans) -> DTO assembly (reference cells renamed to
 * their id fields, import-time defaults injected) -> the domain create schema
 * from `@/lib/domain/schemas`. Reference values are shape-checked here and
 * resolved to real records by the import runner; an unresolved reference is a
 * run-time row error, not a validation error.
 */

export interface RowError {
  path: string;
  message: string;
  code: string;
}

export interface RowValidation {
  rowIndex: number;
  errors: RowError[];
}

export interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  /** Only rows with errors. */
  rows: RowValidation[];
}

export type ParsedRow = { ok: true; dto: Record<string, unknown> } | { ok: false; errors: RowError[] };

/**
 * Placeholder injected where the domain schema demands a sourceId. The import
 * runner replaces it with the batch's import_record source id.
 */
export const IMPORT_SOURCE_PLACEHOLDER = "import-batch-source";

/** Default confidence for imported price observations (human-entered data). */
export const IMPORT_PRICE_CONFIDENCE = {
  sourceAuthority: 0.6,
  sourceRecency: 0.8,
  entityMatch: 0.9,
  extraction: 1,
  technicalEquivalence: 0.5,
  geographicRelevance: 0.8,
  commercialRelevance: 0.6,
} as const;

// ---------------------------------------------------------------------------
// Cell coercion helpers
// ---------------------------------------------------------------------------

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const requiredString = z.string().trim().min(1, "Required");
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());

const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());
const optionalInt = z.preprocess(emptyToUndefined, z.coerce.number().int().optional());
const optionalFraction = z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(1).optional());
const requiredNumber = z.preprocess(
  (value) => (emptyToUndefined(value) === undefined ? value : Number(value)),
  z.number({ invalid_type_error: "Expected a number" }),
);

const optionalDate = z.preprocess(emptyToUndefined, isoDateString.optional());

/** true/yes/1/x -> true; false/no/0 -> false (case-insensitive); empty -> undefined. */
function booleanCell(defaultValue?: boolean) {
  return z.preprocess((value) => {
    const cleaned = emptyToUndefined(value);
    if (cleaned === undefined) return defaultValue;
    const text = String(cleaned).trim().toLowerCase();
    if (["true", "yes", "1", "x", "co", "có", "dung", "đúng"].includes(text)) return true;
    if (["false", "no", "0", "khong", "không", "sai"].includes(text)) return false;
    return cleaned;
  }, z.boolean());
}

/** Semicolon/comma-separated list cell; empty -> undefined. */
function listCell<T extends z.ZodTypeAny>(item: T, options: { min?: number } = {}) {
  const base = options.min ? z.array(item).min(options.min) : z.array(item);
  return z.preprocess((value) => {
    const cleaned = emptyToUndefined(value);
    if (cleaned === undefined) return undefined;
    return String(cleaned)
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter((part) => part !== "");
  }, base.optional());
}

/** "scheme:value; scheme:value" -> OrganizationIdentifier[]. */
const identifiersCell = z.preprocess((value) => {
  const cleaned = emptyToUndefined(value);
  if (cleaned === undefined) return undefined;
  return String(cleaned)
    .split(/[;]/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => {
      const separator = part.indexOf(":");
      if (separator === -1) return { scheme: part, value: "" };
      return { scheme: part.slice(0, separator).trim(), value: part.slice(separator + 1).trim() };
    });
}, z.array(organizationIdentifierSchema).optional());

// ---------------------------------------------------------------------------
// Per-kind row schemas (cells -> DTO -> domain create schema)
// ---------------------------------------------------------------------------

const organizationsRow = z
  .object({
    name: requiredString,
    types: listCell(z.enum(ORGANIZATION_TYPES), { min: 1 }),
    country: z.preprocess(emptyToUndefined, countryCode),
    website: optionalString,
    identifiers: identifiersCell,
  })
  .transform((cells) => cells)
  .pipe(createOrganizationSchema);

const sitesRow = z
  .object({
    organization: requiredString,
    name: requiredString,
    siteType: z.preprocess(emptyToUndefined, z.enum(SITE_TYPES)),
  })
  .transform((cells) => ({
    organizationId: cells.organization,
    name: cells.name,
    siteType: cells.siteType,
  }))
  .pipe(createSiteSchema);

const productsRow = z
  .object({
    family: requiredString,
    manufacturer: requiredString,
    name: requiredString,
    category: z.preprocess(emptyToUndefined, z.enum(PRODUCT_CATEGORIES)),
    description: optionalString,
    status: z.preprocess(emptyToUndefined, z.enum(PRODUCT_STATUSES).optional()),
  })
  .transform((cells) => ({
    familyId: cells.family,
    manufacturerOrganizationId: cells.manufacturer,
    name: cells.name,
    category: cells.category,
    description: cells.description,
    status: cells.status,
  }))
  .pipe(createProductSchema);

const skusRow = z
  .object({
    product: requiredString,
    name: requiredString,
    catalogueNumber: optionalString,
    manufacturerCode: optionalString,
    gtin: optionalString,
    format: optionalString,
    shelfLifeMonths: optionalInt,
    storageCondition: optionalString,
    countryAvailability: listCell(countryCode),
    status: z.preprocess(emptyToUndefined, z.enum(PRODUCT_STATUSES).optional()),
  })
  .transform((cells) => ({
    productId: cells.product,
    name: cells.name,
    catalogueNumber: cells.catalogueNumber,
    manufacturerCode: cells.manufacturerCode,
    gtin: cells.gtin,
    formatId: cells.format,
    shelfLifeMonths: cells.shelfLifeMonths,
    storageCondition: cells.storageCondition,
    countryAvailability: cells.countryAvailability,
    status: cells.status,
  }))
  .pipe(createSkuSchema);

const pricesRow = z
  .object({
    sku: requiredString,
    amount: requiredNumber,
    currency: z.preprocess(emptyToUndefined, currencyCode),
    observationDate: z.preprocess(emptyToUndefined, isoDateString),
    geography: requiredString,
    supplier: optionalString,
    taxIncluded: booleanCell(false).optional(),
    vatRate: optionalFraction,
    quantity: optionalNumber,
  })
  .transform((cells) => ({
    skuId: cells.sku,
    supplierOrgId: cells.supplier,
    originalAmount: cells.amount,
    originalCurrency: cells.currency,
    observationDate: cells.observationDate,
    geography: cells.geography,
    taxIncluded: cells.taxIncluded ?? false,
    vatRate: cells.vatRate,
    quantity: cells.quantity,
    // Import-time injections; sourceId replaced by the batch source record.
    sourceId: IMPORT_SOURCE_PLACEHOLDER,
    confidence: IMPORT_PRICE_CONFIDENCE,
    evidenceState: "source_captured" as const,
    isSynthetic: false,
  }))
  .pipe(createPriceObservationSchema);

/**
 * Supplier-profile create DTO. The domain schemas module has no
 * createSupplierProfileSchema, so this mirrors the SupplierProfile type with
 * the same primitives (strict, governance fields optional like other DTOs).
 */
const createSupplierProfileLike = z
  .object({
    organizationId: z.string().min(1),
    relationshipType: z.enum(SUPPLIER_RELATIONSHIP_TYPES),
    manufacturers: z.array(z.string().min(1)).default([]),
    countries: z.array(countryCode).min(1),
    visibility: z.enum(["canonical", "tenant_private"]).optional(),
    isDemo: z.boolean().optional(),
  })
  .strict();

const suppliersRow = z
  .object({
    organization: requiredString,
    relationshipType: z.preprocess(emptyToUndefined, z.enum(SUPPLIER_RELATIONSHIP_TYPES)),
    countries: listCell(countryCode, { min: 1 }),
    manufacturers: listCell(z.string().min(1)),
  })
  .transform((cells) => ({
    organizationId: cells.organization,
    relationshipType: cells.relationshipType,
    countries: cells.countries,
    manufacturers: cells.manufacturers,
  }))
  .pipe(createSupplierProfileLike);

const tendersRow = z
  .object({
    code: requiredString,
    title: requiredString,
    buyer: requiredString,
    country: z.preprocess(emptyToUndefined, countryCode),
    publicationDate: optionalDate,
    submissionDeadline: optionalDate,
    awardDate: optionalDate,
    contractPeriodMonths: optionalInt,
    status: z.preprocess(emptyToUndefined, z.enum(TENDER_STATUSES).optional()),
  })
  .transform((cells) => ({
    code: cells.code,
    title: cells.title,
    buyerOrganizationId: cells.buyer,
    country: cells.country,
    publicationDate: cells.publicationDate,
    submissionDeadline: cells.submissionDeadline,
    awardDate: cells.awardDate,
    contractPeriodMonths: cells.contractPeriodMonths,
    status: cells.status,
    sourceId: IMPORT_SOURCE_PLACEHOLDER,
  }))
  .pipe(createTenderSchema);

const installedAssetsRow = z
  .object({
    assetModel: requiredString,
    site: requiredString,
    laboratory: optionalString,
    serialNumber: optionalString,
    installationDate: optionalDate,
    status: z.preprocess(emptyToUndefined, z.enum(INSTALLED_ASSET_STATUSES).optional()),
    qualificationStatus: z.preprocess(emptyToUndefined, z.enum(QUALIFICATION_STATUSES).optional()),
    confidence: optionalFraction,
  })
  .transform((cells) => ({
    assetModelId: cells.assetModel,
    siteId: cells.site,
    laboratoryId: cells.laboratory,
    serialNumber: cells.serialNumber,
    installationDate: cells.installationDate,
    status: cells.status,
    qualificationStatus: cells.qualificationStatus,
    confidence: cells.confidence ?? 0.5,
  }))
  .pipe(createInstalledAssetSchema);

/**
 * Contacts create a person plus an organization_contact link. Person fields
 * are validated through the domain person schema; the organization reference
 * and contact extras are checked here and resolved at import time.
 */
const contactsRow = z
  .object({
    fullName: createPersonSchema.shape.fullName,
    title: createPersonSchema.shape.title,
    email: createPersonSchema.shape.email,
    phone: createPersonSchema.shape.phone,
    organization: requiredString,
    decisionRoles: listCell(z.enum(DECISION_ROLES)),
    isPrimary: booleanCell(false).optional(),
  })
  .transform((cells) => ({
    person: {
      fullName: cells.fullName,
      title: cells.title,
      email: cells.email,
      phone: cells.phone,
    },
    organizationId: cells.organization,
    decisionRoles: cells.decisionRoles ?? [],
    isPrimary: cells.isPrimary ?? false,
  }));

const equivalenceCandidatesRow = z
  .object({
    sourceSku: requiredString,
    candidateSku: requiredString,
    classification: z.preprocess(
      emptyToUndefined,
      z.enum(["exact_equivalent", "functional_equivalent", "closest_alternative", "not_recommended_substitute"]),
    ),
    overallScore: z.preprocess(
      (value) => (emptyToUndefined(value) === undefined ? value : Number(value)),
      z.number().min(0).max(100),
    ),
    rationale: requiredString,
    reviewState: z.preprocess(emptyToUndefined, z.enum(EVIDENCE_STATES).optional()),
  })
  .transform((cells) => ({
    sourceSkuId: cells.sourceSku,
    candidateSkuId: cells.candidateSku,
    classification: cells.classification,
    overallScore: cells.overallScore,
    rationale: cells.rationale,
    dimensionScores: {},
    differences: [],
    validationConsiderations: [],
    evidenceClaimIds: [],
    reviewState: cells.reviewState ?? ("unverified" as const),
  }))
  .pipe(createEquivalenceRecordSchema);

const ROW_SCHEMAS: Record<ImportKind, z.ZodType<unknown, z.ZodTypeDef, unknown>> = {
  organizations: organizationsRow,
  sites: sitesRow,
  products: productsRow,
  skus: skusRow,
  prices: pricesRow,
  suppliers: suppliersRow,
  tenders: tendersRow,
  "installed-assets": installedAssetsRow,
  contacts: contactsRow,
  "equivalence-candidates": equivalenceCandidatesRow,
};

/** Zod issues -> flat row errors. */
function toRowErrors(error: z.ZodError): RowError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(row)",
    message: issue.message,
    code: issue.code,
  }));
}

/** Validate one mapped row; returns the assembled DTO on success. */
export function parseImportRow(kind: ImportKind, row: Record<string, string>): ParsedRow {
  const result = ROW_SCHEMAS[kind].safeParse(row);
  if (result.success) {
    return { ok: true, dto: result.data as Record<string, unknown> };
  }
  return { ok: false, errors: toRowErrors(result.error) };
}

/** Validate all mapped rows; aggregates per-row errors. */
export function validateRows(kind: ImportKind, rows: readonly Record<string, string>[]): ImportSummary {
  const invalid: RowValidation[] = [];
  rows.forEach((row, rowIndex) => {
    const parsed = parseImportRow(kind, row);
    if (!parsed.ok) invalid.push({ rowIndex, errors: parsed.errors });
  });
  return {
    total: rows.length,
    valid: rows.length - invalid.length,
    invalid: invalid.length,
    rows: invalid,
  };
}
