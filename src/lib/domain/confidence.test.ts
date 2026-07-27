import { describe, expect, it } from "vitest";

import {
  aggregateConfidence,
  CONFIDENCE_WEIGHTS,
  evidenceStateRank,
  meetsReviewBar,
} from "./confidence";
import { fullConfidence } from "./test-helpers";

describe("aggregateConfidence", () => {
  it("returns the uniform value for uniform dimensions", () => {
    expect(aggregateConfidence(fullConfidence(0.8))).toBeCloseTo(0.8, 6);
  });

  it("applies the documented weights", () => {
    const aggregated = aggregateConfidence({
      sourceAuthority: 1,
      sourceRecency: 0,
      entityMatch: 0,
      extraction: 0,
      technicalEquivalence: 0,
      geographicRelevance: 0,
      commercialRelevance: 0,
    });
    expect(aggregated).toBeCloseTo(CONFIDENCE_WEIGHTS.sourceAuthority, 6);
  });

  it("weights sum to 1", () => {
    const sum = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
  });

  it("throws on out-of-range dimensions", () => {
    expect(() => aggregateConfidence({ ...fullConfidence(0.5), sourceAuthority: 1.2 })).toThrow(
      /sourceAuthority/,
    );
    expect(() => aggregateConfidence({ ...fullConfidence(0.5), extraction: Number.NaN })).toThrow();
  });
});

describe("evidenceStateRank / meetsReviewBar", () => {
  it("orders the review chain", () => {
    expect(evidenceStateRank("unverified")).toBeLessThan(evidenceStateRank("source_captured"));
    expect(evidenceStateRank("structurally_validated")).toBeLessThan(evidenceStateRank("analyst_reviewed"));
    expect(evidenceStateRank("analyst_reviewed")).toBeLessThan(evidenceStateRank("domain_expert_reviewed"));
  });

  it("ranks terminal states below everything", () => {
    expect(evidenceStateRank("disputed")).toBe(-1);
    expect(evidenceStateRank("superseded")).toBe(-1);
    expect(evidenceStateRank("expired")).toBe(-1);
  });

  it("meetsReviewBar compares ranks and rejects terminal states", () => {
    expect(meetsReviewBar("analyst_reviewed", "structurally_validated")).toBe(true);
    expect(meetsReviewBar("source_captured", "analyst_reviewed")).toBe(false);
    expect(meetsReviewBar("disputed", "unverified")).toBe(false);
    expect(meetsReviewBar("domain_expert_reviewed", "domain_expert_reviewed")).toBe(true);
  });
});
