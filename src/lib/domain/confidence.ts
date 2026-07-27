import type { ConfidenceDimensions, EvidenceState } from "./types";

/**
 * Confidence aggregation and evidence-state ordering.
 *
 * The seven confidence dimensions answer different questions, so collapsing
 * them into one number is a presentation concern — the dimensions stay on the
 * record. The weights below encode the product judgement that provenance
 * (source authority) and correctness of attachment (entity match) matter most:
 */

export const CONFIDENCE_WEIGHTS: Readonly<Record<keyof ConfidenceDimensions, number>> = {
  sourceAuthority: 0.2,
  sourceRecency: 0.1,
  entityMatch: 0.15,
  extraction: 0.1,
  technicalEquivalence: 0.15,
  geographicRelevance: 0.15,
  commercialRelevance: 0.15,
} as const;

const EPSILON = 1e-9;

/** Weighted mean of the seven dimensions, rounded to 4 decimals. Throws on out-of-range input. */
export function aggregateConfidence(dimensions: ConfidenceDimensions): number {
  let weightSum = 0;
  let total = 0;
  for (const key of Object.keys(CONFIDENCE_WEIGHTS) as (keyof ConfidenceDimensions)[]) {
    const value = dimensions[key];
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
      throw new Error(`Confidence dimension '${key}' must be a number in [0, 1], got ${String(value)}`);
    }
    const weight = CONFIDENCE_WEIGHTS[key];
    total += value * weight;
    weightSum += weight;
  }
  if (Math.abs(weightSum - 1) > EPSILON) {
    throw new Error(`CONFIDENCE_WEIGHTS must sum to 1, got ${weightSum}`);
  }
  return Math.round(total * 10000) / 10000;
}

/**
 * Review-progress rank for evidence states. The happy path is strictly
 * ordered: unverified(0) < source_captured(1) < structurally_validated(2) <
 * analyst_reviewed(3) < domain_expert_reviewed(4).
 *
 * Terminal/problem states (superseded, disputed, expired) rank -1: they are
 * not "less reviewed", they must fail every review bar regardless of level.
 */
export const EVIDENCE_STATE_RANK: Readonly<Record<EvidenceState, number>> = {
  unverified: 0,
  source_captured: 1,
  structurally_validated: 2,
  analyst_reviewed: 3,
  domain_expert_reviewed: 4,
  superseded: -1,
  disputed: -1,
  expired: -1,
} as const;

export function evidenceStateRank(state: EvidenceState): number {
  return EVIDENCE_STATE_RANK[state];
}

/**
 * True when `state` satisfies the minimum review bar. Terminal states
 * (superseded/disputed/expired) never pass a positive bar.
 */
export function meetsReviewBar(state: EvidenceState, minState: EvidenceState): boolean {
  return evidenceStateRank(state) >= evidenceStateRank(minState);
}
