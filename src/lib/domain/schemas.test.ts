import { describe, expect, it } from "vitest";

import {
  createClaimSchema,
  createEquivalenceRecordSchema,
  createInstalledAssetSchema,
  createOrganizationSchema,
  createPersonSchema,
  createPriceObservationSchema,
  createSkuSchema,
  createTenderAwardSchema,
  isoDateString,
  updateOrganizationSchema,
} from "./schemas";
import { fullConfidence, makeEdgeEvidence } from "./test-helpers";

describe("isoDateString", () => {
  it("accepts ISO dates and datetimes", () => {
    expect(isoDateString.safeParse("2026-01-31").success).toBe(true);
    expect(isoDateString.safeParse("2026-01-31T09:30:00Z").success).toBe(true);
  });

  it("rejects non-ISO formats", () => {
    expect(isoDateString.safeParse("31/01/2026").success).toBe(false);
    expect(isoDateString.safeParse("yesterday").success).toBe(false);
  });
});

describe("createOrganizationSchema", () => {
  it("parses a valid payload and uppercases the country", () => {
    const parsed = createOrganizationSchema.parse({
      name: "  Merck KGaA ",
      types: ["manufacturer"],
      country: "de",
      identifiers: [{ scheme: "tax_code", value: "DE123" }],
    });
    expect(parsed.country).toBe("DE");
    expect(parsed.name).toBe("Merck KGaA");
  });

  it("rejects an empty types array and unknown keys", () => {
    expect(createOrganizationSchema.safeParse({ name: "X", types: [], country: "VN" }).success).toBe(false);
    expect(
      createOrganizationSchema.safeParse({ name: "X", types: ["manufacturer"], country: "VN", hacker: true }).success,
    ).toBe(false);
  });

  it("update schema accepts partial patches", () => {
    expect(updateOrganizationSchema.safeParse({}).success).toBe(true);
    expect(updateOrganizationSchema.safeParse({ country: "vn" }).success).toBe(true);
    expect(updateOrganizationSchema.safeParse({ country: "vnx" }).success).toBe(false);
  });
});

describe("createSkuSchema", () => {
  it("trims the catalogue number", () => {
    const parsed = createSkuSchema.parse({ productId: "p1", name: "TSA 500g", catalogueNumber: "  1.05458.0500  " });
    expect(parsed.catalogueNumber).toBe("1.05458.0500");
    expect(parsed.status).toBe("unknown");
    expect(parsed.alternateNames).toEqual([]);
  });
});

describe("createPriceObservationSchema", () => {
  const valid = {
    skuId: "s1",
    originalAmount: 1_000_000,
    originalCurrency: "vnd",
    observationDate: "2026-01-15",
    taxIncluded: true,
    geography: "VN",
    sourceId: "src-1",
    confidence: fullConfidence(),
    evidenceState: "source_captured" as const,
  };

  it("parses a valid observation with defaults", () => {
    const parsed = createPriceObservationSchema.parse(valid);
    expect(parsed.quantity).toBe(1);
    expect(parsed.isSynthetic).toBe(false);
    expect(parsed.originalCurrency).toBe("VND");
  });

  it("rejects vatRate outside 0–1", () => {
    expect(createPriceObservationSchema.safeParse({ ...valid, vatRate: 1.2 }).success).toBe(false);
    expect(createPriceObservationSchema.safeParse({ ...valid, vatRate: 0.1 }).success).toBe(true);
  });

  it("rejects validTo before validFrom", () => {
    expect(
      createPriceObservationSchema.safeParse({ ...valid, validFrom: "2026-06-01", validTo: "2026-01-01" }).success,
    ).toBe(false);
  });
});

describe("createTenderAwardSchema", () => {
  const valid = {
    awardedSupplierOrgId: "sup-1",
    amount: 500_000_000,
    currency: "VND",
    evidence: makeEdgeEvidence(),
  };

  it("requires a lot or item reference", () => {
    expect(createTenderAwardSchema.safeParse(valid).success).toBe(false);
    expect(createTenderAwardSchema.safeParse({ ...valid, lotId: "lot-1" }).success).toBe(true);
    expect(createTenderAwardSchema.safeParse({ ...valid, tenderItemId: "item-1" }).success).toBe(true);
  });
});

describe("createClaimSchema", () => {
  const valid = {
    subjectEntityType: "sku" as const,
    subjectEntityId: "s1",
    predicate: "distributed_by",
    objectValue: "org-9",
    sourceId: "src-1",
    confidence: fullConfidence(),
    reviewStatus: "unverified" as const,
  };

  it("accepts primitive and structured object values", () => {
    expect(createClaimSchema.safeParse(valid).success).toBe(true);
    expect(createClaimSchema.safeParse({ ...valid, objectValue: 42 }).success).toBe(true);
    expect(createClaimSchema.safeParse({ ...valid, objectValue: { distributor: "org-9" } }).success).toBe(true);
    expect(createClaimSchema.safeParse({ ...valid, objectValue: true }).success).toBe(true);
  });

  it("rejects out-of-range confidence dimensions", () => {
    const bad = { ...fullConfidence(0.5), sourceRecency: 2 };
    expect(createClaimSchema.safeParse({ ...valid, confidence: bad }).success).toBe(false);
  });
});

describe("createEquivalenceRecordSchema", () => {
  const valid = {
    sourceSkuId: "s1",
    candidateSkuId: "s2",
    classification: "functional_equivalent" as const,
    overallScore: 82.5,
    dimensionScores: {
      formula_composition: { score: 90, weight: 25 },
      local_availability: { score: null, weight: 5, note: "no import data yet" },
    },
    rationale: "Same base formulation; local availability unverified.",
    reviewState: "analyst_reviewed" as const,
  };

  it("accepts partial dimension maps with null (unknown) scores", () => {
    const parsed = createEquivalenceRecordSchema.parse(valid);
    expect(parsed.dimensionScores.local_availability?.score).toBeNull();
  });

  it("rejects scores above 100", () => {
    const bad = {
      ...valid,
      dimensionScores: { formula_composition: { score: 101, weight: 25 } },
    };
    expect(createEquivalenceRecordSchema.safeParse(bad).success).toBe(false);
  });
});

describe("person & installed asset schemas", () => {
  it("validates person email", () => {
    expect(createPersonSchema.safeParse({ fullName: "Nguyen Van A", email: "not-an-email" }).success).toBe(false);
    expect(createPersonSchema.safeParse({ fullName: "Nguyen Van A", email: "a@example.com" }).success).toBe(true);
  });

  it("rejects asset confidence outside 0–1", () => {
    const valid = {
      assetModelId: "m1",
      siteId: "site-1",
      status: "operational" as const,
      qualificationStatus: "unknown" as const,
      confidence: 0.9,
    };
    expect(createInstalledAssetSchema.safeParse(valid).success).toBe(true);
    expect(createInstalledAssetSchema.safeParse({ ...valid, confidence: 1.5 }).success).toBe(false);
  });
});
