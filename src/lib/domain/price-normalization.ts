import type { ExchangeRateSnapshot, PackConfiguration, PriceObservation } from "./types";
import type { FreshnessInfo } from "./freshness";
import { freshnessInfo } from "./freshness";
import type { NormalizedPack } from "./units";
import { normalizePack } from "./units";

/**
 * Price normalization engine.
 *
 * Turns a raw price observation into per-unit and per-test amounts. The rules:
 *  - The input observation is NEVER mutated; a new object is returned.
 *  - Currency conversion requires an explicit exchange-rate snapshot
 *    (from = observation currency, to = target, rate > 0, rateDate + source
 *    present). Without one, normalized fields stay null and a warning says
 *    why — Nexus never silently converts money.
 *  - When the quote is tax-inclusive and vatRate is known, the ex-tax amount
 *    is computed alongside (VAT treated as recoverable).
 */

export interface NormalizePriceOptions {
  /** Currency for the normalized fields. Defaults to the observation currency. */
  targetCurrency?: string;
  /** Required when targetCurrency differs from the observation currency. */
  exchangeRate?: ExchangeRateSnapshot;
  /** Tests per base unit of pack content; enables per-test normalization. */
  yieldPerUnit?: number;
}

export interface NormalizePriceResult {
  /** NEW observation object with normalized fields set. */
  observation: PriceObservation;
  /** Whole-observation amount excluding VAT, or null when not separable. */
  exTaxAmount: number | null;
  /** Problems that prevented (full) normalization. */
  warnings: string[];
  /** Transparency notes about what was done (e.g. the FX rate applied). */
  notes: string[];
}

export function normalizePrice(
  observation: PriceObservation,
  pack: PackConfiguration | NormalizedPack | null,
  options: NormalizePriceOptions = {},
): NormalizePriceResult {
  const warnings: string[] = [];
  const notes: string[] = [];

  const exTaxAmount =
    observation.taxIncluded && observation.vatRate !== undefined
      ? round6(observation.originalAmount / (1 + observation.vatRate))
      : null;
  if (observation.taxIncluded && observation.vatRate === undefined) {
    warnings.push("Price is tax-inclusive but vatRate is unknown — ex-tax amount could not be computed.");
  } else if (exTaxAmount !== null) {
    notes.push(
      `Ex-tax amount ${exTaxAmount} ${observation.originalCurrency} (VAT ${observation.vatRate} treated as recoverable).`,
    );
  }

  // --- Resolve the pack -----------------------------------------------------
  let normalizedPack: NormalizedPack | null = null;
  if (pack === null) {
    warnings.push("No pack configuration provided — per-unit normalization not possible.");
  } else if ("totalBaseQuantity" in pack) {
    normalizedPack = pack;
  } else {
    normalizedPack = normalizePack({
      quantity: pack.quantity,
      unit: pack.unit,
      unitsPerPack: pack.unitsPerPack,
    });
    if (!normalizedPack) {
      warnings.push(
        `Pack configuration '${pack.quantity} ${pack.unit}' could not be parsed — per-unit normalization not possible.`,
      );
    }
  }

  // --- Resolve FX -----------------------------------------------------------
  const targetCurrency = options.targetCurrency ?? observation.originalCurrency;
  let rate = 1;
  if (targetCurrency !== observation.originalCurrency) {
    const fx = options.exchangeRate;
    const fxValid =
      fx !== undefined &&
      fx.fromCurrency === observation.originalCurrency &&
      fx.toCurrency === targetCurrency &&
      Number.isFinite(fx.rate) &&
      fx.rate > 0 &&
      fx.rateDate.length > 0 &&
      fx.source.length > 0;
    if (!fxValid) {
      warnings.push(
        `Currency conversion ${observation.originalCurrency} → ${targetCurrency} requires an exchange-rate snapshot with matching currencies, positive rate, rateDate and source; normalized fields left null.`,
      );
      return finish(observation, null, null, null, exTaxAmount, warnings, notes);
    }
    rate = fx.rate;
    notes.push(
      `Converted at ${fx.rate} ${fx.fromCurrency}→${fx.toCurrency} (rate date ${fx.rateDate}, source: ${fx.source}).`,
    );
  }

  if (!normalizedPack) {
    return finish(observation, null, null, null, exTaxAmount, warnings, notes);
  }

  const quantity = observation.quantity > 0 ? observation.quantity : 1;
  if (observation.quantity <= 0) {
    warnings.push(`Observation quantity ${observation.quantity} is not positive — treated as 1.`);
  }
  const packPrice = observation.originalAmount / quantity;

  const perUnit = round6((packPrice / normalizedPack.totalBaseQuantity) * rate);
  let perTest: number | null = null;
  if (options.yieldPerUnit !== undefined) {
    if (options.yieldPerUnit <= 0) {
      warnings.push(`yieldPerUnit ${options.yieldPerUnit} is not positive — per-test normalization skipped.`);
    } else {
      perTest = round6((packPrice / (normalizedPack.totalBaseQuantity * options.yieldPerUnit)) * rate);
    }
  } else {
    notes.push("No yieldPerUnit provided — per-test amount not computed.");
  }

  return finish(observation, perUnit, perTest, normalizedPack.baseUnit, exTaxAmount, warnings, notes, targetCurrency);
}

function finish(
  observation: PriceObservation,
  perUnit: number | null,
  perTest: number | null,
  perUnitBase: string | null,
  exTaxAmount: number | null,
  warnings: string[],
  notes: string[],
  targetCurrency?: string,
): NormalizePriceResult {
  const normalized: PriceObservation = {
    ...observation,
    normalizedPerUnitAmount: perUnit,
    normalizedPerUnitCurrency: perUnit !== null ? (targetCurrency ?? observation.originalCurrency) : null,
    normalizedPerUnit: perUnitBase,
    normalizedPerTestAmount: perTest,
  };
  return { observation: normalized, exTaxAmount, warnings, notes };
}

// ---------------------------------------------------------------------------
// Outlier detection (IQR fences)
// ---------------------------------------------------------------------------

export interface OutlierReport {
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  lowerFence: number | null;
  upperFence: number | null;
  /** Values outside [q1 − 1.5·IQR, q3 + 1.5·IQR]. */
  outliers: number[];
}

/**
 * Tukey IQR outlier detection. Quartiles use linear interpolation (R-7).
 * Fewer than 4 points cannot support fences — returns nulls and no outliers.
 */
export function detectOutliers(amounts: readonly number[]): OutlierReport {
  const sorted = [...amounts].sort((a, b) => a - b);
  if (sorted.length < 4) {
    return { q1: null, q3: null, iqr: null, lowerFence: null, upperFence: null, outliers: [] };
  }
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  return {
    q1,
    q3,
    iqr,
    lowerFence,
    upperFence,
    outliers: sorted.filter((v) => v < lowerFence || v > upperFence),
  };
}

function quantile(sorted: readonly number[], p: number): number {
  const pos = (sorted.length - 1) * p;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const fraction = pos - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

// ---------------------------------------------------------------------------
// Price freshness
// ---------------------------------------------------------------------------

export const DEFAULT_PRICE_STALE_AFTER_DAYS = 180;

/**
 * Freshness of a price observation. 'aging' begins at half the stale
 * threshold (default: 90 of 180 days).
 */
export function priceFreshness(
  observationDate: string,
  staleAfterDays: number = DEFAULT_PRICE_STALE_AFTER_DAYS,
  now: string | Date = new Date(),
): FreshnessInfo {
  return freshnessInfo(
    observationDate,
    { agingAfterDays: Math.floor(staleAfterDays / 2), staleAfterDays },
    now,
  );
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
