import { describe, expect, it } from "vitest";

import type { CostPerTestInput } from "./cost-per-test";
import { calculateCostPerTest, runSensitivity } from "./cost-per-test";

const BASE: CostPerTestInput = {
  purchasePrice: 1_000_000,
  currency: "VND",
  packQuantity: 500,
  packUnit: "g",
  yieldPerUnit: 1,
  taxIncluded: false,
};

describe("calculateCostPerTest", () => {
  it("computes a minimal pack: price / (content × yield)", () => {
    const result = calculateCostPerTest(BASE);
    expect(result.usableTests).toBe(500);
    expect(result.effectiveCostPerTest).toBe(2000);
    expect(result.totalAttributableCost).toBe(1_000_000);
    expect(result.currency).toBe("VND");
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toMatchObject({ key: "purchase", perTest: false, sourceField: "purchasePrice" });
  });

  it("converts pack quantity to base units first (1 kg → 1000 g)", () => {
    const result = calculateCostPerTest({ ...BASE, packQuantity: 1, packUnit: "kg", yieldPerUnit: 0.5 });
    expect(result.usableTests).toBe(500);
  });

  it("applies waste and failure-repeat rates to usable tests", () => {
    const result = calculateCostPerTest({ ...BASE, wasteRate: 0.1, failureRepeatRate: 0.05 });
    // 500 × 0.9 / 1.05 = 428.5714
    expect(result.usableTests).toBeCloseTo(428.5714, 3);
    expect(result.effectiveCostPerTest).toBeCloseTo(1_000_000 / 428.5714, 0);
    expect(result.assumptions.join(" ")).toMatch(/waste rate 10%/i);
  });

  it("excludes recoverable VAT from a tax-inclusive price", () => {
    const result = calculateCostPerTest({ ...BASE, purchasePrice: 1_100_000, taxIncluded: true, vatRate: 0.1 });
    expect(result.totalAttributableCost).toBeCloseTo(1_000_000, 4);
    expect(result.assumptions.join(" ")).toMatch(/recoverable/);
  });

  it("attributes the full amount when tax-inclusive but vatRate unknown", () => {
    const result = calculateCostPerTest({ ...BASE, purchasePrice: 1_100_000, taxIncluded: true });
    expect(result.totalAttributableCost).toBe(1_100_000);
    expect(result.assumptions.join(" ")).toMatch(/FULL amount/);
  });

  it("computes import duty on ex-tax price + freight", () => {
    const result = calculateCostPerTest({ ...BASE, freight: 100_000, importDutyRate: 0.05 });
    const duty = result.breakdown.find((item) => item.key === "import_duty");
    expect(duty?.amount).toBeCloseTo(0.05 * 1_100_000, 4);
    expect(result.totalAttributableCost).toBeCloseTo(1_000_000 + 100_000 + 55_000, 4);
  });

  it("computes labor from minutes × hourly rate and lists it per test", () => {
    const result = calculateCostPerTest({ ...BASE, laborMinutesPerTest: 3, laborRatePerHour: 60_000 });
    const labor = result.breakdown.find((item) => item.key === "labor");
    expect(labor?.perTest).toBe(true);
    // 3000 VND/test × 500 tests
    expect(labor?.amount).toBeCloseTo(3000 * 500, 4);
    expect(result.effectiveCostPerTest).toBeCloseTo(2000 + 3000, 4);
  });

  it("requires labor minutes and rate together", () => {
    expect(() => calculateCostPerTest({ ...BASE, laborMinutesPerTest: 3 })).toThrow(/labor/);
  });

  it("converts every component through the same FX snapshot", () => {
    const result = calculateCostPerTest({
      ...BASE,
      freight: 100_000,
      exchangeRate: { fromCurrency: "VND", toCurrency: "USD", rate: 0.00004, rateDate: "2026-01-15", source: "SBV" },
    });
    expect(result.currency).toBe("USD");
    expect(result.totalAttributableCost).toBeCloseTo(1_100_000 * 0.00004, 6);
    for (const item of result.breakdown) {
      expect(item.amount).toBeCloseTo(item.amount, 6); // all amounts in USD
    }
    expect(result.assumptions.join(" ")).toMatch(/SBV/);
  });

  it("refuses to convert without a valid snapshot", () => {
    expect(() =>
      calculateCostPerTest({
        ...BASE,
        exchangeRate: { fromCurrency: "USD", toCurrency: "EUR", rate: 1, rateDate: "2026-01-15", source: "ECB" },
      }),
    ).toThrow(/from USD/);
    expect(() =>
      calculateCostPerTest({
        ...BASE,
        exchangeRate: { fromCurrency: "VND", toCurrency: "USD", rate: 0.00004, rateDate: "", source: "" },
      }),
    ).toThrow(/rateDate and source/);
  });

  it("breakdown amounts sum to the total attributable cost", () => {
    const result = calculateCostPerTest({
      ...BASE,
      freight: 50_000,
      preparationMaterials: 100,
      disposalPerTest: 20,
    });
    const sum = result.breakdown.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(result.totalAttributableCost, 4);
  });

  it("rejects invalid input", () => {
    expect(() => calculateCostPerTest({ ...BASE, purchasePrice: -1 })).toThrow(/purchasePrice/);
    expect(() => calculateCostPerTest({ ...BASE, wasteRate: 1.5 })).toThrow(/wasteRate/);
    expect(() => calculateCostPerTest({ ...BASE, packUnit: "furlongs" })).toThrow(/pack unit/i);
  });
});

describe("runSensitivity", () => {
  it("recomputes cost per test for each delta", () => {
    const result = runSensitivity(BASE, "purchasePrice", [-500_000, 0, 500_000]);
    expect(result.baseEffectiveCostPerTest).toBe(2000);
    expect(result.rows.map((row) => row.effectiveCostPerTest)).toEqual([1000, 2000, 3000]);
  });

  it("treats missing optional fields as 0", () => {
    const result = runSensitivity(BASE, "freight", [100_000]);
    expect(result.rows[0].effectiveCostPerTest).toBeCloseTo(2200, 4);
  });
});
