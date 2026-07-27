import type {
  EquivalenceClassification,
  EquivalenceDimension,
} from "./types";
import { EQUIVALENCE_DIMENSIONS } from "./types";

/**
 * SKU-equivalence scoring engine.
 *
 * The core honesty rule: `null` means UNKNOWN, and unknown is never treated
 * as zero. The overall score is computed over known dimensions only, with
 * weights renormalized; the share of unknown weight is reported separately as
 * `unknownPenalty` so the UI can show "score 82, but 30% of the assessment is
 * unverified". An equivalence can never be classified `exact_equivalent`
 * while any dimension is unknown.
 */

export const DEFAULT_EQUIVALENCE_WEIGHTS: Readonly<Record<EquivalenceDimension, number>> = {
  formula_composition: 25,
  intended_use_application: 20,
  method_standard_compatibility: 15,
  organism_performance: 15,
  preparation_conditions: 10,
  regulatory_documents: 5,
  format_pack: 5,
  local_availability: 5,
} as const;

/** Mandatory product disclaimer — must be shown wherever equivalence output appears. */
export const EQUIVALENCE_DISCLAIMER =
  "Equivalence assessments are decision support only — not a regulatory approval; qualified technical review and customer validation may still be required.";

const EPSILON = 1e-9;

/** Validate custom weights: all eight dimensions present, non-negative, summing to 100. */
export function validateEquivalenceWeights(
  weights: Record<EquivalenceDimension, number>,
): void {
  let sum = 0;
  for (const dimension of EQUIVALENCE_DIMENSIONS) {
    const weight = weights[dimension];
    if (typeof weight !== "number" || Number.isNaN(weight) || weight < 0) {
      throw new Error(`Weight for '${dimension}' must be a non-negative number, got ${String(weight)}`);
    }
    sum += weight;
  }
  if (Math.abs(sum - 100) > EPSILON) {
    throw new Error(`Equivalence weights must sum to 100, got ${sum}`);
  }
}

/** Dimension scores as engine input: 0–100, or null when unknown. */
export type DimensionScoreInput = Partial<Record<EquivalenceDimension, number | null>>;

export interface EquivalenceScoreResult {
  /**
   * Weighted score over KNOWN dimensions only (weights renormalized), 0–100,
   * rounded to 2 decimals. Null when every dimension is unknown — a product
   * with no evidence has no score, not a zero.
   */
  overallScore: number | null;
  knownDimensions: EquivalenceDimension[];
  unknownDimensions: EquivalenceDimension[];
  /** Total weight of unknown dimensions (0–100), reported separately — the honesty discount. */
  unknownPenalty: number;
  /** Sum of weights across known dimensions (the renormalization base). */
  knownWeightTotal: number;
  weights: Record<EquivalenceDimension, number>;
}

export function scoreEquivalence(
  dimensionScores: DimensionScoreInput,
  weights: Record<EquivalenceDimension, number> = { ...DEFAULT_EQUIVALENCE_WEIGHTS },
): EquivalenceScoreResult {
  validateEquivalenceWeights(weights);

  const knownDimensions: EquivalenceDimension[] = [];
  const unknownDimensions: EquivalenceDimension[] = [];
  let weightedSum = 0;
  let knownWeightTotal = 0;

  for (const dimension of EQUIVALENCE_DIMENSIONS) {
    const score = dimensionScores[dimension];
    if (score === null || score === undefined) {
      unknownDimensions.push(dimension);
      continue;
    }
    if (Number.isNaN(score) || score < 0 || score > 100) {
      throw new Error(`Score for '${dimension}' must be in [0, 100] or null, got ${String(score)}`);
    }
    knownDimensions.push(dimension);
    weightedSum += score * weights[dimension];
    knownWeightTotal += weights[dimension];
  }

  const overallScore =
    knownWeightTotal > 0 ? Math.round((weightedSum / knownWeightTotal) * 100) / 100 : null;

  return {
    overallScore,
    knownDimensions,
    unknownDimensions,
    unknownPenalty: Math.round((100 - knownWeightTotal) * 100) / 100,
    knownWeightTotal,
    weights,
  };
}

export interface EquivalenceThresholds {
  /** Overall score needed for exact_equivalent. Default 90. */
  exact: number;
  /** Overall score needed for functional_equivalent. Default 75. */
  functional: number;
  /** Overall score needed for closest_alternative. Default 55. */
  closest: number;
  /** Every KNOWN dimension must score at least this for exact_equivalent. Default 70. */
  exactMinDimension: number;
}

export const DEFAULT_EQUIVALENCE_THRESHOLDS: Readonly<EquivalenceThresholds> = {
  exact: 90,
  functional: 75,
  closest: 55,
  exactMinDimension: 70,
} as const;

export interface EquivalenceClassificationResult {
  classification: EquivalenceClassification;
  /** Why this classification was chosen (and why a higher one was not). */
  reasons: string[];
  thresholds: EquivalenceThresholds;
}

export function classifyEquivalence(
  overallScore: number | null,
  dimensionScores: DimensionScoreInput,
  thresholds: EquivalenceThresholds = { ...DEFAULT_EQUIVALENCE_THRESHOLDS },
): EquivalenceClassificationResult {
  const reasons: string[] = [];

  if (overallScore === null) {
    reasons.push("No scored dimensions — equivalence cannot be assessed on evidence.");
    return { classification: "not_recommended_substitute", reasons, thresholds };
  }

  const unknownDimensions = EQUIVALENCE_DIMENSIONS.filter(
    (dimension) => dimensionScores[dimension] === null || dimensionScores[dimension] === undefined,
  );
  const weakDimensions = EQUIVALENCE_DIMENSIONS.filter((dimension) => {
    const score = dimensionScores[dimension];
    return score !== null && score !== undefined && score < thresholds.exactMinDimension;
  });

  if (overallScore >= thresholds.exact) {
    if (unknownDimensions.length === 0 && weakDimensions.length === 0) {
      reasons.push(
        `Overall ${overallScore} ≥ ${thresholds.exact} with every dimension ≥ ${thresholds.exactMinDimension} and no unknown dimensions.`,
      );
      return { classification: "exact_equivalent", reasons, thresholds };
    }
    if (unknownDimensions.length > 0) {
      reasons.push(
        `Not exact: ${unknownDimensions.length} dimension(s) unknown (${unknownDimensions.join(", ")}) — exact equivalence requires full evidence.`,
      );
    }
    if (weakDimensions.length > 0) {
      reasons.push(
        `Not exact: dimension(s) below ${thresholds.exactMinDimension}: ${weakDimensions.join(", ")}.`,
      );
    }
  }

  if (overallScore >= thresholds.functional) {
    reasons.push(`Overall ${overallScore} ≥ ${thresholds.functional}.`);
    return { classification: "functional_equivalent", reasons, thresholds };
  }

  if (overallScore >= thresholds.closest) {
    reasons.push(`Overall ${overallScore} ≥ ${thresholds.closest} but below ${thresholds.functional}.`);
    return { classification: "closest_alternative", reasons, thresholds };
  }

  reasons.push(`Overall ${overallScore} below ${thresholds.closest}.`);
  return { classification: "not_recommended_substitute", reasons, thresholds };
}
