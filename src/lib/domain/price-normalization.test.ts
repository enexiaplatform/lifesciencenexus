import { describe, expect, it } from "vitest";

import { detectOutliers, normalizePrice, priceFreshness } from "./price-normalization";
import type { PackConfiguration } from "./types";
import { makePriceObservation } from "./test-helpers";
import { normalizePack } from "./units";

const PACK: PackConfiguration = {
  id: "pack-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdBy: "tester",
  updatedBy: "tester",
  visibility: "canonical",
  isDemo: true,
  skuId: "sku-1",
  quantity: 500,
  unit: "g",
};

describe("normalizePrice", () => {
  it("normalizes per base unit in the original currency", () => {
    const observation = makePriceObservation({ originalAmount: 500_000, originalCurrency: "VND" });
    const result = normalizePrice(observation, PACK);
    expect(result.observation.normalizedPerUnitAmount).toBe(1000);
    expect(result.observation.normalizedPerUnitCurrency).toBe("VND");
    expect(result.observation.normalizedPerUnit).toBe("g");
    expect(result.warnings).toEqual([]);
  });

  it("normalizes per test when a yield is provided", () => {
    const observation = makePriceObservation({ originalAmount: 500_000 });
    const result = normalizePrice(observation, normalizePack("500 g"), { yieldPerUnit: 0.5 });
    expect(result.observation.normalizedPerTestAmount).toBe(2000);
  });

  it("divides the amount by the observation quantity", () => {
    const observation = makePriceObservation({ originalAmount: 1_000_000, quantity: 4 });
    const result = normalizePrice(observation, PACK);
    expect(result.observation.normalizedPerUnitAmount).toBe(500);
  });

  it("leaves normalized fields null with a warning when converting without a snapshot", () => {
    const observation = makePriceObservation({ originalCurrency: "VND" });
    const result = normalizePrice(observation, PACK, { targetCurrency: "USD" });
    expect(result.observation.normalizedPerUnitAmount).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/exchange-rate snapshot/);
  });

  it("converts through a valid snapshot and notes the rate", () => {
    const observation = makePriceObservation({ originalAmount: 500_000, originalCurrency: "VND" });
    const result = normalizePrice(observation, PACK, {
      targetCurrency: "USD",
      exchangeRate: { fromCurrency: "VND", toCurrency: "USD", rate: 0.00004, rateDate: "2026-01-15", source: "SBV" },
    });
    expect(result.observation.normalizedPerUnitAmount).toBeCloseTo(0.04, 6);
    expect(result.observation.normalizedPerUnitCurrency).toBe("USD");
    expect(result.notes.join(" ")).toMatch(/SBV/);
  });

  it("rejects a snapshot with mismatched currencies", () => {
    const observation = makePriceObservation({ originalCurrency: "VND" });
    const result = normalizePrice(observation, PACK, {
      targetCurrency: "USD",
      exchangeRate: { fromCurrency: "EUR", toCurrency: "USD", rate: 1.1, rateDate: "2026-01-15", source: "ECB" },
    });
    expect(result.observation.normalizedPerUnitAmount).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/exchange-rate snapshot/);
  });

  it("computes the ex-tax amount for tax-inclusive prices", () => {
    const observation = makePriceObservation({ originalAmount: 1_100_000, taxIncluded: true, vatRate: 0.1 });
    const result = normalizePrice(observation, PACK);
    expect(result.exTaxAmount).toBeCloseTo(1_000_000, 4);
  });

  it("warns when tax-inclusive but the VAT rate is unknown", () => {
    const observation = makePriceObservation({ taxIncluded: true });
    const result = normalizePrice(observation, PACK);
    expect(result.exTaxAmount).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/vatRate/);
  });

  it("warns when no pack configuration is available", () => {
    const result = normalizePrice(makePriceObservation(), null);
    expect(result.observation.normalizedPerUnitAmount).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/pack/i);
  });

  it("never mutates the input observation", () => {
    const observation = makePriceObservation({ originalAmount: 500_000 });
    const before = JSON.parse(JSON.stringify(observation)) as unknown;
    normalizePrice(observation, PACK, { yieldPerUnit: 1 });
    expect(observation).toEqual(before);
  });
});

describe("detectOutliers", () => {
  it("flags values beyond the 1.5×IQR fences", () => {
    const report = detectOutliers([10, 11, 12, 13, 100]);
    expect(report.outliers).toEqual([100]);
    expect(report.iqr).toBe(2);
    expect(report.upperFence).toBe(16);
  });

  it("returns null fences for fewer than 4 points", () => {
    const report = detectOutliers([10, 20, 30]);
    expect(report.outliers).toEqual([]);
    expect(report.iqr).toBeNull();
  });
});

describe("priceFreshness", () => {
  it("buckets fresh / aging / stale around the 180-day default", () => {
    const now = new Date("2026-07-01T00:00:00.000Z");
    expect(priceFreshness("2026-06-15", 180, now).bucket).toBe("fresh");
    expect(priceFreshness("2026-03-15", 180, now).bucket).toBe("aging");
    expect(priceFreshness("2025-12-15", 180, now)).toMatchObject({ bucket: "stale", daysSince: 198 });
  });
});
