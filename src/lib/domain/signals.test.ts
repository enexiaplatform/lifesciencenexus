import { describe, expect, it } from "vitest";

import type { SignalSnapshot } from "./signals";
import { generateSignals } from "./signals";
import {
  makeAvailabilityObservation,
  makeConsumableCompatibility,
  makeDistributionAgreement,
  makeInstalledAsset,
  makePriceObservation,
  makeProduct,
  makeProductValidation,
  makeSupplierListing,
  makeTender,
  makeVendorApproval,
} from "./test-helpers";

const NOW = "2026-07-01T00:00:00.000Z";

function snapshot(overrides: Partial<SignalSnapshot> = {}): SignalSnapshot {
  return {
    installedAssets: [],
    tenders: [],
    priceObservations: [],
    distributionAgreements: [],
    products: [],
    supplierListings: [],
    consumableCompatibilities: [],
    vendorApprovals: [],
    productValidations: [],
    availabilityObservations: [],
    now: NOW,
    ...overrides,
  };
}

function typesOf(result: ReturnType<typeof generateSignals>) {
  return result.map((signal) => signal.type);
}

describe("generateSignals — individual rules", () => {
  it("flags equipment replacement due within 180 days", () => {
    const due = makeInstalledAsset({ expectedReplacementDate: "2026-10-01" });
    const far = makeInstalledAsset({ expectedReplacementDate: "2027-06-01" });
    const retired = makeInstalledAsset({ status: "retired", expectedReplacementDate: "2026-08-01" });
    const result = generateSignals(snapshot({ installedAssets: [due, far, retired] }));
    const replacements = result.filter((signal) => signal.type === "equipment_replacement_due");
    expect(replacements).toHaveLength(1);
    expect(replacements[0].triggeringRecordIds).toEqual([due.id]);
    expect(replacements[0].reason).toMatch(/2026-10-01/);
    expect(replacements[0].expiresAt).toBe("2026-10-01");
  });

  it("flags tender renewals from contract period end within 120 days", () => {
    const tender = makeTender({ awardDate: "2025-10-01", contractPeriodMonths: 12, status: "awarded" });
    const published = makeTender({ status: "published", awardDate: "2025-10-01", contractPeriodMonths: 12 });
    const result = generateSignals(snapshot({ tenders: [tender, published] }));
    expect(typesOf(result)).toEqual(["tender_renewal_expected"]);
    expect(result[0].reason).toMatch(/2026-10-01/);
  });

  it("flags prices older than 180 days (latest observation per SKU only)", () => {
    const stale = makePriceObservation({ skuId: "sku-1", observationDate: "2025-06-01" });
    const fresherSameSku = makePriceObservation({ skuId: "sku-1", observationDate: "2026-06-15" });
    const result = generateSignals(snapshot({ priceObservations: [stale, fresherSameSku] }));
    expect(typesOf(result)).toEqual([]);
    const staleOnly = generateSignals(snapshot({ priceObservations: [stale] }));
    expect(typesOf(staleOnly)).toEqual(["price_stale"]);
    expect(staleOnly[0].reason).toMatch(/days old/);
  });

  it("flags expired supplier agreements", () => {
    const expired = makeDistributionAgreement({ validTo: "2026-06-01" });
    const active = makeDistributionAgreement({ validTo: "2026-12-01" });
    const result = generateSignals(snapshot({ distributionAgreements: [expired, active] }));
    expect(typesOf(result)).toEqual(["supplier_agreement_expired"]);
    expect(result[0].commercialRelevance).toBe("high");
  });

  it("flags discontinued products as whitespace opportunities", () => {
    const result = generateSignals(
      snapshot({ products: [makeProduct({ status: "discontinued" }), makeProduct({ status: "active" })] }),
    );
    expect(typesOf(result)).toEqual(["competitor_product_discontinued"]);
  });

  it("flags installed assets without consumable compatibilities", () => {
    const covered = makeInstalledAsset({ assetModelId: "model-covered" });
    const uncovered = makeInstalledAsset({ assetModelId: "model-bare" });
    const compat = makeConsumableCompatibility({ assetModelId: "model-covered" });
    const result = generateSignals(
      snapshot({ installedAssets: [covered, uncovered], consumableCompatibilities: [compat] }),
    );
    expect(typesOf(result)).toContain("asset_without_consumables");
    expect(typesOf(result)).toContain("consumable_pullthrough");
    const bare = result.find((signal) => signal.type === "asset_without_consumables");
    expect(bare?.triggeringRecordIds).toEqual([uncovered.id]);
  });

  it("flags vendor approval gaps for rejected or expired approvals", () => {
    const expired = makeVendorApproval({ status: "expired" });
    const rejected = makeVendorApproval({ status: "rejected" });
    const approved = makeVendorApproval({ status: "approved" });
    const result = generateSignals(snapshot({ vendorApprovals: [expired, rejected, approved] }));
    expect(typesOf(result)).toEqual(["vendor_approval_gap", "vendor_approval_gap"]);
  });

  it("flags pending product validations", () => {
    const pending = makeProductValidation({ status: "in_progress" });
    const passed = makeProductValidation({ status: "passed" });
    const result = generateSignals(snapshot({ productValidations: [pending, passed] }));
    expect(typesOf(result)).toEqual(["validation_pending"]);
    expect(result[0].reason).toMatch(/in_progress/);
  });

  it("flags unusual price increases above 20% (same currency only)", () => {
    const sku = "sku-x";
    const before = makePriceObservation({ skuId: sku, originalAmount: 1_000_000, observationDate: "2026-01-01" });
    const after = makePriceObservation({ skuId: sku, originalAmount: 1_300_000, observationDate: "2026-06-01" });
    const result = generateSignals(snapshot({ priceObservations: [before, after] }));
    expect(typesOf(result)).toEqual(["unusual_price_increase"]);
    expect(result[0].reason).toMatch(/30%/);
    expect(result[0].triggeringRecordIds).toEqual([before.id, after.id]);
  });

  it("ignores increases across currencies and below 20%", () => {
    const sku = "sku-y";
    const vnd = makePriceObservation({ skuId: sku, originalAmount: 1_000_000, originalCurrency: "VND", observationDate: "2026-01-01" });
    const usd = makePriceObservation({ skuId: sku, originalAmount: 100, originalCurrency: "USD", observationDate: "2026-06-01" });
    const smallBefore = makePriceObservation({ skuId: "sku-z", originalAmount: 1_000_000, observationDate: "2026-01-01" });
    const smallAfter = makePriceObservation({ skuId: "sku-z", originalAmount: 1_100_000, observationDate: "2026-06-01" });
    const result = generateSignals(snapshot({ priceObservations: [vnd, usd, smallBefore, smallAfter] }));
    expect(typesOf(result)).toEqual([]);
  });

  it("flags repeated stock issues within 90 days", () => {
    const sku = "sku-s";
    const sup = "sup-1";
    const issue1 = makeAvailabilityObservation({ skuId: sku, supplierOrgId: sup, status: "out_of_stock", observedAt: "2026-06-01" });
    const issue2 = makeAvailabilityObservation({ skuId: sku, supplierOrgId: sup, status: "limited", observedAt: "2026-06-20" });
    const old = makeAvailabilityObservation({ skuId: sku, supplierOrgId: sup, status: "out_of_stock", observedAt: "2025-01-01" });
    const result = generateSignals(snapshot({ availabilityObservations: [issue1, issue2, old] }));
    expect(typesOf(result)).toEqual(["repeated_stock_issue"]);
    expect(result[0].triggeringRecordIds).toEqual([issue1.id, issue2.id]);
  });

  it("flags listed SKUs with no price or availability evidence", () => {
    const bare = makeSupplierListing({ skuId: "sku-bare" });
    const covered = makeSupplierListing({ skuId: "sku-covered" });
    const price = makePriceObservation({ skuId: "sku-covered" });
    const result = generateSignals(snapshot({ supplierListings: [bare, covered], priceObservations: [price] }));
    expect(typesOf(result)).toEqual(["incomplete_product_coverage"]);
    expect(result[0].relatedEntities).toEqual([{ entityType: "sku", entityId: "sku-bare" }]);
  });
});

describe("generateSignals — engine properties", () => {
  it("is deterministic for the same snapshot", () => {
    const input = snapshot({
      installedAssets: [makeInstalledAsset({ expectedReplacementDate: "2026-09-01" })],
      products: [makeProduct({ status: "discontinued" })],
    });
    expect(generateSignals(input)).toEqual(generateSignals(input));
  });

  it("every signal is explainable: reason, triggers, action, status", () => {
    const result = generateSignals(
      snapshot({
        installedAssets: [makeInstalledAsset({ expectedReplacementDate: "2026-09-01" })],
        distributionAgreements: [makeDistributionAgreement({ validTo: "2026-01-01" })],
      }),
    );
    // The installed asset also (correctly) triggers asset_without_consumables.
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(typesOf(result)).toContain("equipment_replacement_due");
    expect(typesOf(result)).toContain("supplier_agreement_expired");
    for (const signal of result) {
      expect(signal.reason.length).toBeGreaterThan(10);
      expect(signal.triggeringRecordIds.length).toBeGreaterThan(0);
      expect(signal.recommendedAction.length).toBeGreaterThan(10);
      expect(signal.status).toBe("new");
      expect(signal.generatedAt).toBe(NOW);
      expect(signal.confidence).toBeGreaterThan(0);
    }
  });

  it("returns an empty list for an empty snapshot", () => {
    expect(generateSignals(snapshot())).toEqual([]);
  });
});
