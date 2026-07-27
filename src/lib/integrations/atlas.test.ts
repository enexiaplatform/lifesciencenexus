import { describe, expect, it } from "vitest";

import {
  assertAtlasVendorNeutrality,
  ATLAS_READ_CONTRACT_VERSION,
  atlasEnvelopeSchema,
  atlasEvidenceSummarySchema,
  atlasMethodSummarySchema,
  atlasOrganismSummarySchema,
  atlasProductSummarySchema,
  atlasSkuSummarySchema,
  atlasStandardSummarySchema,
  atlasSupplierSummarySchema,
} from "./atlas";

describe("Atlas summary DTOs", () => {
  it("validates product, sku and standard summaries", () => {
    expect(
      atlasProductSummarySchema.parse({
        id: "atlas-p1",
        name: "Tryptic Soy Agar",
        manufacturerName: "Merck",
        category: "dehydrated_culture_media",
        status: "active",
      }),
    ).toMatchObject({ id: "atlas-p1" });
    expect(
      atlasSkuSummarySchema.parse({ id: "atlas-s1", productId: "atlas-p1", name: "TSA 500g", catalogueNumber: "1.05458.0500" }),
    ).toMatchObject({ catalogueNumber: "1.05458.0500" });
    expect(
      atlasStandardSummarySchema.parse({ id: "std-1", body: "ISO", code: "11133", title: "Microbiology of food chain — culture media" }),
    ).toMatchObject({ body: "ISO" });
  });

  it("validates organism, method, supplier and evidence summaries", () => {
    expect(
      atlasOrganismSummarySchema.parse({ id: "o1", genus: "Escherichia", species: "coli", strainCode: "ATCC 25922", gramReaction: "negative" }),
    ).toMatchObject({ strainCode: "ATCC 25922" });
    expect(atlasMethodSummarySchema.parse({ id: "m1", name: "Membrane filtration", standardCodes: ["ISO 7704"] })).toMatchObject({
      standardCodes: ["ISO 7704"],
    });
    expect(atlasSupplierSummarySchema.parse({ id: "s1", name: "VietLab", countries: ["VN"], manufacturers: ["Merck"] })).toMatchObject({
      countries: ["VN"],
    });
    expect(
      atlasEvidenceSummarySchema.parse({ sourceId: "src-1", sourceType: "manufacturer_catalogue", evidenceState: "analyst_reviewed", confidence: 0.9 }),
    ).toMatchObject({ confidence: 0.9 });
  });

  it("enforces the envelope contract version", () => {
    const envelope = atlasEnvelopeSchema(atlasProductSummarySchema);
    const data = { id: "p1", name: "TSA", category: "dehydrated_culture_media" };
    expect(envelope.safeParse({ contractVersion: ATLAS_READ_CONTRACT_VERSION, data }).success).toBe(true);
    expect(envelope.safeParse({ contractVersion: "nexus-atlas-read/v0", data }).success).toBe(false);
  });
});

describe("assertAtlasVendorNeutrality", () => {
  it("strips price and commercial fields at any depth", () => {
    const payload = {
      id: "p1",
      name: "TSA",
      pricing: { unitPrice: 500_000, currency: "VND" },
      offers: [{ price: 100, amount: 100 }, { price: 200 }],
    };
    const result = assertAtlasVendorNeutrality(payload);
    expect(result.sanitized).toEqual({ id: "p1", name: "TSA", pricing: {}, offers: [{}, {}] });
    expect(result.strippedFields).toContain("pricing.unitPrice");
    expect(result.strippedFields).toContain("pricing.currency");
    expect(result.strippedFields).toContain("offers[0].price");
    expect(result.strippedFields).toContain("offers[0].amount");
    expect(result.strippedFields).toContain("offers[1].price");
  });

  it("strips equivalence verdicts and commercial recommendations", () => {
    const result = assertAtlasVendorNeutrality({
      id: "s1",
      equivalenceClassification: "exact_equivalent",
      overallScore: 96,
      recommendedSupplier: "org-9",
    });
    expect(result.sanitized).toEqual({ id: "s1" });
    expect(result.strippedFields).toHaveLength(3);
  });

  it("leaves clean payloads untouched and does not mutate the input", () => {
    const clean = { id: "p1", name: "TSA", formats: ["powder", "granulated"] };
    const snapshot = JSON.parse(JSON.stringify(clean)) as unknown;
    const result = assertAtlasVendorNeutrality(clean);
    expect(result.sanitized).toEqual(clean);
    expect(result.strippedFields).toEqual([]);
    expect(clean).toEqual(snapshot);
  });

  it("matches forbidden keys case-insensitively", () => {
    const result = assertAtlasVendorNeutrality({ id: "x", Price: 10, COST: 5 });
    expect(result.sanitized).toEqual({ id: "x" });
    expect(result.strippedFields).toHaveLength(2);
  });
});
