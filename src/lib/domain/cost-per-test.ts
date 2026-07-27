import type { CostPerTestInput, ExchangeRateSnapshot } from "./types";
import { toBaseUnits } from "./units";

/**
 * Cost-per-test engine — computes the fully attributable cost of a single
 * test from a purchasable pack plus optional per-pack and per-test cost
 * components.
 *
 * Core rules (all enforced, none silent):
 *  - usableTests = packQuantity (in base units) × yieldPerUnit
 *    × (1 − wasteRate) / (1 + failureRepeatRate)
 *  - Every monetary component is stated in `input.currency`; the ONLY
 *    permitted conversion is through a single explicit exchange-rate snapshot
 *    (rate + date + source) applied uniformly to every component.
 *  - The breakdown lists every component with the input field it came from.
 *  - Assumptions are auto-generated from the optional fields actually used
 *    and are part of the result — they must never be hidden by the UI.
 */

export type { CostPerTestInput } from "./types";

export interface CostBreakdownItem {
  /** Machine key, e.g. 'purchase', 'freight', 'labor'. */
  key: string;
  label: string;
  /** Total attributable amount of this component for the whole pack, in result currency. */
  amount: number;
  /** True for components priced per test (amount = per-test × usableTests). */
  perTest: boolean;
  /** The CostPerTestInput field(s) this component was computed from. */
  sourceField: string;
}

export interface CostPerTestResult {
  /** Total cost attributable to the pack's usable output (result currency). */
  totalAttributableCost: number;
  /** Tests the pack realistically yields after waste and repeats. */
  usableTests: number;
  /** totalAttributableCost / usableTests. */
  effectiveCostPerTest: number;
  /** ISO 4217 of all output amounts (exchangeRate.toCurrency when converting). */
  currency: string;
  breakdown: CostBreakdownItem[];
  /** Auto-generated from the optional fields actually used — never hidden. */
  assumptions: string[];
}

export function calculateCostPerTest(input: CostPerTestInput): CostPerTestResult {
  validateInput(input);

  const base = toBaseUnits(input.packQuantity, input.packUnit);
  if (!base) {
    throw new Error(`Unknown pack unit '${input.packUnit}' — cannot compute usable tests`);
  }

  const wasteRate = input.wasteRate ?? 0;
  const failureRepeatRate = input.failureRepeatRate ?? 0;
  const testsBeforeLosses = base.quantity * input.yieldPerUnit;
  const usableTests = (testsBeforeLosses * (1 - wasteRate)) / (1 + failureRepeatRate);
  if (usableTests <= 0) {
    throw new Error("usableTests is zero or negative — check packQuantity, yieldPerUnit and wasteRate");
  }

  const assumptions: string[] = [
    `Pack content: ${input.packQuantity} ${input.packUnit} = ${round4(base.quantity)} ${base.baseUnit}; yield ${input.yieldPerUnit} tests/${base.baseUnit} gives ${round4(testsBeforeLosses)} tests before losses.`,
  ];
  if (wasteRate > 0 || failureRepeatRate > 0) {
    assumptions.push(
      `Losses applied: waste rate ${percent(wasteRate)}, failure repeat rate ${percent(failureRepeatRate)} → ${round4(usableTests)} usable tests.`,
    );
  }

  // --- VAT handling -------------------------------------------------------
  // Default: VAT is treated as recoverable input tax and excluded from
  // attributable cost. When the quote includes VAT but the rate is unknown,
  // the full amount is attributed and the guesswork is flagged.
  let purchaseBase = input.purchasePrice;
  if (input.taxIncluded && input.vatRate !== undefined) {
    purchaseBase = input.purchasePrice / (1 + input.vatRate);
    assumptions.push(
      `VAT ${percent(input.vatRate)} included in the quoted price is treated as recoverable and excluded (ex-tax base ${round2(purchaseBase)} ${input.currency}).`,
    );
  } else if (input.taxIncluded) {
    assumptions.push(
      "Price is stated as tax-inclusive but vatRate is unknown — the FULL amount is attributed (VAT portion could not be separated).",
    );
  } else if (input.vatRate !== undefined) {
    assumptions.push(
      `VAT ${percent(input.vatRate)} is not included in the quoted price and is treated as recoverable — excluded from attributable cost.`,
    );
  }

  // --- Per-pack components --------------------------------------------------
  const packComponents: Array<{ key: string; label: string; amount: number; sourceField: string }> = [
    {
      key: "purchase",
      label: "Purchase price (ex-tax base)",
      amount: purchaseBase,
      sourceField: "purchasePrice",
    },
  ];
  if (input.freight !== undefined) {
    packComponents.push({ key: "freight", label: "Freight", amount: input.freight, sourceField: "freight" });
    assumptions.push(`Freight of ${round2(input.freight)} ${input.currency} per pack included.`);
  }
  if (input.importDutyRate !== undefined) {
    const dutyBase = purchaseBase + (input.freight ?? 0);
    const duty = input.importDutyRate * dutyBase;
    packComponents.push({
      key: "import_duty",
      label: "Import duty",
      amount: duty,
      sourceField: "importDutyRate",
    });
    assumptions.push(
      `Import duty ${percent(input.importDutyRate)} applied to ex-tax price + freight (${round2(dutyBase)} ${input.currency}) = ${round2(duty)} ${input.currency}.`,
    );
  }
  if (input.coldChain !== undefined) {
    packComponents.push({ key: "cold_chain", label: "Cold chain", amount: input.coldChain, sourceField: "coldChain" });
    assumptions.push(`Cold-chain cost of ${round2(input.coldChain)} ${input.currency} per pack included.`);
  }
  if (input.storage !== undefined) {
    packComponents.push({ key: "storage", label: "Storage", amount: input.storage, sourceField: "storage" });
    assumptions.push(`Storage cost of ${round2(input.storage)} ${input.currency} per pack included.`);
  }

  // --- Per-test components --------------------------------------------------
  const perTestComponents: Array<{ key: string; label: string; amount: number; sourceField: string }> = [];
  const pushPerTest = (key: string, label: string, amount: number, sourceField: string) => {
    perTestComponents.push({ key, label, amount, sourceField });
    assumptions.push(`${label}: ${round2(amount)} ${input.currency} per test included.`);
  };
  if (input.preparationMaterials !== undefined) {
    pushPerTest("preparation_materials", "Preparation materials", input.preparationMaterials, "preparationMaterials");
  }
  if (input.water !== undefined) {
    pushPerTest("water", "Water", input.water, "water");
  }
  if (input.laborMinutesPerTest !== undefined && input.laborRatePerHour !== undefined) {
    const labor = (input.laborMinutesPerTest / 60) * input.laborRatePerHour;
    perTestComponents.push({
      key: "labor",
      label: "Labor",
      amount: labor,
      sourceField: "laborMinutesPerTest+laborRatePerHour",
    });
    assumptions.push(
      `Labor: ${input.laborMinutesPerTest} min/test at ${round2(input.laborRatePerHour)} ${input.currency}/hour = ${round2(labor)} ${input.currency}/test.`,
    );
  }
  if (input.equipmentAllocationPerTest !== undefined) {
    pushPerTest("equipment_allocation", "Equipment allocation", input.equipmentAllocationPerTest, "equipmentAllocationPerTest");
  }
  if (input.qcGptPerTest !== undefined) {
    pushPerTest("qc_gpt", "QC growth-promotion test", input.qcGptPerTest, "qcGptPerTest");
  }
  if (input.sterilizationPerTest !== undefined) {
    pushPerTest("sterilization", "Sterilization", input.sterilizationPerTest, "sterilizationPerTest");
  }
  if (input.disposalPerTest !== undefined) {
    pushPerTest("disposal", "Disposal", input.disposalPerTest, "disposalPerTest");
  }
  if (input.validationCostAmortized !== undefined) {
    pushPerTest("validation_amortized", "Validation (amortized)", input.validationCostAmortized, "validationCostAmortized");
  }
  if (input.serviceCostPerTest !== undefined) {
    pushPerTest("service", "Service", input.serviceCostPerTest, "serviceCostPerTest");
  }

  // --- Currency conversion ----------------------------------------------------
  const fx = validateExchangeRate(input.exchangeRate, input.currency);
  const rate = fx ? fx.rate : 1;
  const currency = fx ? fx.toCurrency : input.currency;
  if (fx) {
    assumptions.push(
      `All amounts converted ${fx.fromCurrency} → ${fx.toCurrency} at ${fx.rate} (rate date ${fx.rateDate}, source: ${fx.source}). The same snapshot was applied to every component.`,
    );
  }

  // --- Totals -------------------------------------------------------------------
  const packTotal = packComponents.reduce((sum, c) => sum + c.amount, 0);
  const perTestTotal = perTestComponents.reduce((sum, c) => sum + c.amount, 0);
  const totalAttributableCost = packTotal + perTestTotal * usableTests;
  const effectiveCostPerTest = totalAttributableCost / usableTests;

  const breakdown: CostBreakdownItem[] = [
    ...packComponents.map((c) => ({
      key: c.key,
      label: c.label,
      amount: round6(c.amount * rate),
      perTest: false,
      sourceField: c.sourceField,
    })),
    ...perTestComponents.map((c) => ({
      key: c.key,
      label: c.label,
      amount: round6(c.amount * usableTests * rate),
      perTest: true,
      sourceField: c.sourceField,
    })),
  ];

  return {
    totalAttributableCost: round6(totalAttributableCost * rate),
    usableTests: round4(usableTests),
    effectiveCostPerTest: round6(effectiveCostPerTest * rate),
    currency,
    breakdown,
    assumptions,
  };
}

function validateInput(input: CostPerTestInput): void {
  if (!Number.isFinite(input.purchasePrice) || input.purchasePrice < 0) {
    throw new Error(`purchasePrice must be a non-negative number, got ${String(input.purchasePrice)}`);
  }
  if (!Number.isFinite(input.packQuantity) || input.packQuantity <= 0) {
    throw new Error(`packQuantity must be positive, got ${String(input.packQuantity)}`);
  }
  if (!Number.isFinite(input.yieldPerUnit) || input.yieldPerUnit <= 0) {
    throw new Error(`yieldPerUnit must be positive, got ${String(input.yieldPerUnit)}`);
  }
  for (const field of ["importDutyRate", "vatRate", "wasteRate", "failureRepeatRate"] as const) {
    const value = input[field];
    if (value !== undefined && (Number.isNaN(value) || value < 0 || value > 1)) {
      throw new Error(`${field} must be in [0, 1], got ${String(value)}`);
    }
  }
  if (
    (input.laborMinutesPerTest === undefined) !== (input.laborRatePerHour === undefined)
  ) {
    throw new Error(
      "laborMinutesPerTest and laborRatePerHour must be provided together (incomplete labor input would silently understate cost)",
    );
  }
}

function validateExchangeRate(
  fx: ExchangeRateSnapshot | undefined,
  currency: string,
): ExchangeRateSnapshot | null {
  if (!fx) return null;
  if (fx.fromCurrency !== currency) {
    throw new Error(
      `Exchange-rate snapshot converts from ${fx.fromCurrency} but the input currency is ${currency} — refusing to mix currency bases`,
    );
  }
  if (!Number.isFinite(fx.rate) || fx.rate <= 0) {
    throw new Error(`Exchange rate must be positive, got ${String(fx.rate)}`);
  }
  if (!fx.rateDate || !fx.source) {
    throw new Error("Exchange-rate snapshot requires rateDate and source — no silent conversions");
  }
  return fx;
}

// ---------------------------------------------------------------------------
// Sensitivity analysis
// ---------------------------------------------------------------------------

/** Numeric input fields that sensitivity analysis can perturb. */
export const SENSITIVITY_PARAMETERS = [
  "purchasePrice",
  "packQuantity",
  "yieldPerUnit",
  "freight",
  "importDutyRate",
  "vatRate",
  "coldChain",
  "storage",
  "preparationMaterials",
  "water",
  "laborMinutesPerTest",
  "laborRatePerHour",
  "equipmentAllocationPerTest",
  "qcGptPerTest",
  "sterilizationPerTest",
  "wasteRate",
  "failureRepeatRate",
  "disposalPerTest",
  "validationCostAmortized",
  "serviceCostPerTest",
] as const;
export type SensitivityParameter = (typeof SENSITIVITY_PARAMETERS)[number];

export interface SensitivityRow {
  /** The absolute delta added to the parameter's base value. */
  delta: number;
  effectiveCostPerTest: number;
}

export interface SensitivityResult {
  parameter: SensitivityParameter;
  baseEffectiveCostPerTest: number;
  currency: string;
  rows: SensitivityRow[];
}

/**
 * One-at-a-time sensitivity: recompute cost-per-test with `parameter` shifted
 * by each delta (additive; a missing optional field starts from 0).
 */
export function runSensitivity(
  input: CostPerTestInput,
  parameter: SensitivityParameter,
  deltas: readonly number[],
): SensitivityResult {
  const base = calculateCostPerTest(input);
  const rows = deltas.map((delta) => {
    const perturbed: CostPerTestInput = {
      ...input,
      [parameter]: (input[parameter] ?? 0) + delta,
    };
    return { delta, effectiveCostPerTest: calculateCostPerTest(perturbed).effectiveCostPerTest };
  });
  return {
    parameter,
    baseEffectiveCostPerTest: base.effectiveCostPerTest,
    currency: base.currency,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers (deterministic, locale-independent)
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function percent(fraction: number): string {
  return `${round2(fraction * 100)}%`;
}
