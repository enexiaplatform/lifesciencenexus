import { describe, expect, it } from "vitest";

import { rankSearchResults, trigramDice } from "./search-rank";

const RECORDS = [
  { entityType: "product", id: "p1", name: "Tryptic Soy Agar", aliases: ["TSA"], catalogueNumber: "1.05458.0500" },
  { entityType: "organization", id: "o1", name: "Merck KGaA", aliases: ["Millipore Sigma"] },
  { entityType: "sku", id: "s1", name: "Plate Count Agar 90mm", aliases: ["PCA plates"], catalogueNumber: "PCA-90-20" },
  { entityType: "standard", id: "std1", name: "ISO 11133", aliases: ["11133"] },
];

describe("rankSearchResults", () => {
  it("ranks an exact name match at 1.0 with a reason", () => {
    const [hit] = rankSearchResults("Tryptic Soy Agar", RECORDS);
    expect(hit.record.id).toBe("p1");
    expect(hit.score).toBe(1);
    expect(hit.matchReasons).toContain("name exact match");
  });

  it("boosts an exact catalogue number match", () => {
    const [hit] = rankSearchResults("1054580500", RECORDS);
    expect(hit.record.id).toBe("p1");
    expect(hit.matchReasons).toContain("catalogue number match");
    expect(hit.score).toBeGreaterThanOrEqual(0.98);
  });

  it("finds records by alias with an explanation", () => {
    const [hit] = rankSearchResults("Millipore Sigma", RECORDS);
    expect(hit.record.id).toBe("o1");
    expect(hit.matchReasons).toContain("alias exact match");
  });

  it("tolerates typos via trigram similarity", () => {
    const results = rankSearchResults("triptic soy agar", RECORDS);
    expect(results[0].record.id).toBe("p1");
    expect(results[0].matchReasons.join(" ")).toMatch(/similarity|overlap/);
    expect(results[0].score).toBeGreaterThan(0.4);
  });

  it("applies a prefix boost for partial names", () => {
    const [hit] = rankSearchResults("plate count", RECORDS);
    expect(hit.record.id).toBe("s1");
    expect(hit.matchReasons).toContain("name prefix match");
  });

  it("finds standards by code alias", () => {
    const [hit] = rankSearchResults("11133", RECORDS);
    expect(hit.record.id).toBe("std1");
  });

  it("filters out noise below the minimum score", () => {
    expect(rankSearchResults("zzzzzz", RECORDS)).toEqual([]);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      entityType: "product",
      id: `p${i}`,
      name: `Agar Product ${i}`,
    }));
    expect(rankSearchResults("agar product", many)).toHaveLength(20);
  });

  it("returns an empty list for a blank query", () => {
    expect(rankSearchResults("   ", RECORDS)).toEqual([]);
  });
});

describe("trigramDice", () => {
  it("is 1 for identical strings and 0 for unrelated ones", () => {
    expect(trigramDice("tryptic", "tryptic")).toBe(1);
    expect(trigramDice("abc", "xyz")).toBe(0);
  });

  it("is high for single-character typos", () => {
    expect(trigramDice("tryptic", "triptic")).toBeGreaterThan(0.5);
  });
});
