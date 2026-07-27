import { z } from "zod";

import { EVIDENCE_STATES, GRAM_REACTIONS, PRODUCT_STATUSES, SOURCE_TYPES, STANDARD_BODIES } from "../domain/types";

/**
 * Atlas read-contract DTOs (`nexus-atlas-read/v1`).
 *
 * Atlas is the vendor-neutral product/reference knowledge layer. The
 * ecosystem contract is strict about this:
 *
 *   - Atlas `selectsVendor = false` — it must never rank or recommend a
 *     supplier, distributor or commercial source.
 *   - Atlas `assertsProductEquivalence = false` — equivalence verdicts are a
 *     Nexus responsibility and must never flow into Atlas payloads.
 *   - Consequently prices, costs, commercial terms and equivalence scores are
 *     forbidden fields in anything bound for Atlas; use
 *     {@link assertAtlasVendorNeutrality} on every outbound payload to strip
 *     them (and log what was stripped) instead of trusting callers.
 *
 * These DTO schemas describe what Nexus READS from Atlas: reference data only.
 */

export const ATLAS_READ_CONTRACT_VERSION = "nexus-atlas-read/v1";

const nonEmpty = z.string().min(1);

export const atlasProductSummarySchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    manufacturerName: nonEmpty.optional(),
    familyName: nonEmpty.optional(),
    brandName: nonEmpty.optional(),
    category: nonEmpty,
    status: z.enum(PRODUCT_STATUSES).optional(),
  })
  .strict();
export type AtlasProductSummary = z.infer<typeof atlasProductSummarySchema>;

export const atlasSkuSummarySchema = z
  .object({
    id: nonEmpty,
    productId: nonEmpty,
    name: nonEmpty,
    catalogueNumber: nonEmpty.optional(),
    gtin: nonEmpty.optional(),
    formatName: nonEmpty.optional(),
    shelfLifeMonths: z.number().int().positive().optional(),
    storageCondition: nonEmpty.optional(),
  })
  .strict();
export type AtlasSkuSummary = z.infer<typeof atlasSkuSummarySchema>;

export const atlasStandardSummarySchema = z
  .object({
    id: nonEmpty,
    body: z.enum(STANDARD_BODIES),
    code: nonEmpty,
    title: nonEmpty,
    currentVersion: nonEmpty.optional(),
  })
  .strict();
export type AtlasStandardSummary = z.infer<typeof atlasStandardSummarySchema>;

export const atlasApplicationSummarySchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    description: z.string().optional(),
  })
  .strict();
export type AtlasApplicationSummary = z.infer<typeof atlasApplicationSummarySchema>;

export const atlasMethodSummarySchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    description: z.string().optional(),
    standardCodes: z.array(nonEmpty).default([]),
  })
  .strict();
export type AtlasMethodSummary = z.infer<typeof atlasMethodSummarySchema>;

export const atlasOrganismSummarySchema = z
  .object({
    id: nonEmpty,
    genus: nonEmpty,
    species: nonEmpty,
    strainCode: nonEmpty.optional(),
    gramReaction: z.enum(GRAM_REACTIONS).optional(),
  })
  .strict();
export type AtlasOrganismSummary = z.infer<typeof atlasOrganismSummarySchema>;

export const atlasSupplierSummarySchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    countries: z.array(nonEmpty),
    /** Manufacturer organization names this supplier carries (reference data, no commercial terms). */
    manufacturers: z.array(nonEmpty).default([]),
  })
  .strict();
export type AtlasSupplierSummary = z.infer<typeof atlasSupplierSummarySchema>;

export const atlasEvidenceSummarySchema = z
  .object({
    sourceId: nonEmpty,
    sourceType: z.enum(SOURCE_TYPES),
    evidenceState: z.enum(EVIDENCE_STATES),
    confidence: z.number().min(0).max(1).optional(),
    claimCount: z.number().int().nonnegative().optional(),
  })
  .strict();
export type AtlasEvidenceSummary = z.infer<typeof atlasEvidenceSummarySchema>;

/** Wrap a payload schema in the versioned Atlas envelope. */
export function atlasEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z
    .object({
      contractVersion: z.literal(ATLAS_READ_CONTRACT_VERSION),
      data: dataSchema,
    })
    .strict();
}

// ---------------------------------------------------------------------------
// Vendor-neutrality guard
// ---------------------------------------------------------------------------

/**
 * Fields that must never cross into Atlas (case-insensitive key match):
 * pricing/commercial data and equivalence verdicts.
 */
export const ATLAS_FORBIDDEN_FIELDS = [
  "price",
  "prices",
  "unitprice",
  "quotedprice",
  "priceobservation",
  "priceobservations",
  "amount",
  "currency",
  "cost",
  "costpertest",
  "effectivecostpertest",
  "commercialterms",
  "discount",
  "margin",
  "equivalenceverdict",
  "equivalenceclassification",
  "equivalencerecord",
  "overallscore",
  "dimensionscores",
  "recommendedsupplier",
] as const;

const FORBIDDEN_SET: ReadonlySet<string> = new Set(ATLAS_FORBIDDEN_FIELDS);

export interface VendorNeutralityResult<T> {
  /** Deep clone with forbidden fields removed at every nesting level. */
  sanitized: T;
  /** Dotted paths of every stripped field (for audit logging). */
  strippedFields: string[];
}

/**
 * Strip pricing / commercial-recommendation fields from an Atlas-bound
 * payload. Never mutates the input; reports every stripped path so the caller
 * can log or fail loudly when something tried to leak commercial data.
 */
export function assertAtlasVendorNeutrality<T>(payload: T): VendorNeutralityResult<T> {
  const strippedFields: string[] = [];
  const sanitized = stripDeep(payload, "", strippedFields) as T;
  return { sanitized, strippedFields };
}

function stripDeep(value: unknown, path: string, strippedFields: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => stripDeep(item, `${path}[${index}]`, strippedFields));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (FORBIDDEN_SET.has(key.toLowerCase())) {
        strippedFields.push(childPath);
        continue;
      }
      out[key] = stripDeep(child, childPath, strippedFields);
    }
    return out;
  }
  return value;
}
