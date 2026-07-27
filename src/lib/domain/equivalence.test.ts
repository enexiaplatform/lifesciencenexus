import { describe, expect, it } from "vitest";

import {
  classifyEquivalence,
  DEFAULT_EQUIVALENCE_WEIGHTS,
  EQUIVALENCE_DISCLAIMER,
  scoreEquivalence,
  validateEquivalenceWeights,
} from "./equivalence";
import type { EquivalenceDimension } from "./types";
import { EQUIVALENCE_DIMENSIONS } from "./types";

const ALL_95: Record<EquivalenceDimension, number> = {
  formula_composition: 95,
  intended_use_application: 95,
  method_standard_compatibility: 95,
  organism_performance: 95,
  preparation_conditions: 95,
  regulatory_documents: 95,
  format_pack: 95,
  local_availability: 95,
};

describe("validateEquivalenceWeights", () => {
  it("accepts the default weights (sum = 100)", () => {
    expect(() => validateEquivalenceWeights({ ...DEFAULT_EQUIVALENCE_WEIGHTS })).not.toThrow();
    const sum = Object.values(DEFAULT_EQUIVALENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("rejects weights that do not sum to 100", () => {
    expect(() =>
      validateEquivalenceWeights({ ...DEFAULT_EQUIVALENCE_WEIGHTS, local_availability: 10 }),
    ).toThrow(/sum to 100/);
  });
});

describe("scoreEquivalence", () => {
  it("computes the weighted mean over all known dimensions", () => {
    const result = scoreEquivalence(ALL_95);
    expect(result.overallScore).toBeCloseTo(95, 6);
    expect(result.unknownDimensions).toEqual([]);
    expect(result.unknownPenalty).toBe(0);
  });

  it("renormalizes over known dimensions and reports unknown weight separately", () => {
    // Only formula (weight 25) scored 100, intended_use (weight 20) scored 0.
    const result = scoreEquivalence({ formula_composition: 100, intended_use_application: 0 });
    expect(result.overallScore).toBeCloseTo((100 * 25) / 45, 2);
    expect(result.unknownDimensions).toHaveLength(6);
    expect(result.unknownPenalty).toBe(55);
  });

  it("never treats unknown as zero: all-unknown yields a null score", () => {
    const result = scoreEquivalence({});
    expect(result.overallScore).toBeNull();
    expect(result.unknownDimensions).toEqual([...EQUIVALENCE_DIMENSIONS]);
    expect(result.unknownPenalty).toBe(100);
  });

  it("supports custom weights and rejects out-of-range scores", () => {
    const weights = { ...DEFAULT_EQUIVALENCE_WEIGHTS, formula_composition: 30, intended_use_application: 15 };
    const result = scoreEquivalence({ formula_composition: 80 }, weights);
    expect(result.overallScore).toBe(80);
    expect(() => scoreEquivalence({ formula_composition: 101 })).toThrow(/0, 100/);
  });
});

describe("classifyEquivalence", () => {
  it("classifies exact only at >=90 with all dimensions >=70 and none unknown", () => {
    const result = classifyEquivalence(95, ALL_95);
    expect(result.classification).toBe("exact_equivalent");
  });

  it("never classifies exact when any dimension is unknown", () => {
    const scores = { ...ALL_95, local_availability: null };
    const result = classifyEquivalence(95, scores);
    expect(result.classification).toBe("functional_equivalent");
    expect(result.reasons.join(" ")).toMatch(/unknown/);
  });

  it("never classifies exact when a known dimension is below 70", () => {
    const scores = { ...ALL_95, format_pack: 60 };
    const result = classifyEquivalence(92, scores);
    expect(result.classification).toBe("functional_equivalent");
    expect(result.reasons.join(" ")).toMatch(/format_pack/);
  });

  it("classifies functional >=75, closest >=55, else not recommended", () => {
    expect(classifyEquivalence(80, ALL_95).classification).toBe("functional_equivalent");
    expect(classifyEquivalence(60, ALL_95).classification).toBe("closest_alternative");
    expect(classifyEquivalence(40, ALL_95).classification).toBe("not_recommended_substitute");
  });

  it("a null overall score is never recommended", () => {
    expect(classifyEquivalence(null, {}).classification).toBe("not_recommended_substitute");
  });

  it("ships the mandatory disclaimer", () => {
    expect(EQUIVALENCE_DISCLAIMER).toMatch(/not a regulatory approval/);
    expect(EQUIVALENCE_DISCLAIMER).toMatch(/qualified technical review and customer validation/);
  });
});
