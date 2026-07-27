import { describe, expect, it } from "vitest";

import { buildMergePlan, findDuplicateCandidates, scoreDuplicatePair } from "./entity-resolution";

describe("scoreDuplicatePair", () => {
  it("scores identical names high via token overlap", () => {
    const result = scoreDuplicatePair(
      { id: "a", name: "Merck KGaA" },
      { id: "b", name: "Merck KGaA" },
    );
    expect(result.score).toBeGreaterThan(0.9);
    expect(result.matchedOn.join(" ")).toMatch(/name token overlap 1.00/);
  });

  it("ignores legal-form tokens and diacritics", () => {
    const result = scoreDuplicatePair(
      { id: "a", name: "Công ty TNHH Sinh Hóa" },
      { id: "b", name: "Cong ty Sinh Hoa Ltd" },
    );
    // After stopword removal: {sinh, hoa} vs {sinh, hoa}
    expect(result.components.name).toBe(1);
  });

  it("treats a shared tax code as an exact identifier match", () => {
    const result = scoreDuplicatePair(
      { id: "a", name: "Alpha Lab Supply", identifiers: [{ scheme: "tax_code", value: "0301234567" }] },
      { id: "b", name: "Completely Different Name", identifiers: [{ scheme: "tax_code", value: "0301234567" }] },
    );
    expect(result.matchedOn).toContain("identifier exact match (tax_code)");
    expect(result.score).toBeGreaterThan(0);
  });

  it("matches catalogue numbers case- and punctuation-insensitively", () => {
    const result = scoreDuplicatePair(
      { id: "a", name: "TSA 500g", catalogueNumber: "1.05458.0500" },
      { id: "b", name: "Other", catalogueNumber: "1054580500" },
    );
    expect(result.matchedOn).toContain("catalogue number match");
  });

  it("matches a name against the other side's alias", () => {
    const result = scoreDuplicatePair(
      { id: "a", name: "Millipore Sigma" },
      { id: "b", name: "Merck", aliases: ["Millipore Sigma", "Sigma Aldrich"] },
    );
    expect(result.matchedOn).toContain("alias exact match");
  });

  it("scores zero for unrelated entities", () => {
    const result = scoreDuplicatePair(
      { id: "a", name: "Alpha Diagnostics" },
      { id: "b", name: "Zulu Instruments" },
    );
    expect(result.score).toBe(0);
    expect(result.matchedOn).toEqual([]);
  });
});

describe("findDuplicateCandidates", () => {
  it("returns pairs at or above the threshold, best first", () => {
    const pairs = findDuplicateCandidates([
      { id: "a", name: "Merck KGaA" },
      { id: "b", name: "Merck KGaA" },
      { id: "c", name: "Zulu Instruments" },
      { id: "d", name: "Merck" },
    ]);
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    expect(pairs[0]).toMatchObject({ leftId: "a", rightId: "b" });
    expect(pairs.every((pair) => pair.score >= 0.65)).toBe(true);
    const sorted = [...pairs].sort((x, y) => y.score - x.score);
    expect(pairs).toEqual(sorted);
  });

  it("respects a custom threshold", () => {
    const pairs = findDuplicateCandidates(
      [
        { id: "a", name: "Merck KGaA" },
        { id: "b", name: "Merck KGaA" },
      ],
      1.01,
    );
    expect(pairs).toEqual([]);
  });
});

describe("buildMergePlan", () => {
  const left = { id: "left", name: "Merck KGaA", country: "DE", aliases: ["Merck"] };
  const right = { id: "right", name: "Merck Vietnam", country: "VN", aliases: ["Merck VN"] };

  it("preserves the loser's names as aliases and creates a redirect", () => {
    const plan = buildMergePlan({ entityType: "organization", left, right, survivor: "left" });
    expect(plan.survivorId).toBe("left");
    expect(plan.mergedId).toBe("right");
    expect(plan.aliasesToAdd).toEqual(["Merck Vietnam", "Merck VN"]);
    expect(plan.aliasPreservation).toBe(true);
    expect(plan.redirect).toEqual({ fromId: "right", toId: "left" });
  });

  it("defaults field choices to the survivor and honours overrides", () => {
    const plan = buildMergePlan({
      entityType: "organization",
      left,
      right,
      survivor: "left",
      fieldChoices: { country: "right" },
    });
    expect(plan.fieldResolutions.country).toEqual({ chosen: "right", value: "VN" });
    expect(plan.fieldResolutions.name).toEqual({ chosen: "left", value: "Merck KGaA" });
  });

  it("surviving the right side mirrors aliases and redirect", () => {
    const plan = buildMergePlan({ entityType: "organization", left, right, survivor: "right" });
    expect(plan.aliasesToAdd).toEqual(["Merck KGaA", "Merck"]);
    expect(plan.redirect).toEqual({ fromId: "left", toId: "right" });
  });
});
