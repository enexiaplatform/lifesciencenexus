import { describe, expect, it } from "vitest";

import { matchProducts } from "./matching";
import type { MatchCandidate } from "./matching";
import { makeProduct, makeProductEdge, makeSku } from "./test-helpers";

function candidateWith(edges: ReturnType<typeof makeProductEdge>[], skus = [] as ReturnType<typeof makeSku>[]): MatchCandidate {
  const product = makeProduct({ name: "Candidate" });
  return { product, edges: edges.map((edge) => ({ ...edge, productId: product.id })), skus };
}

describe("matchProducts", () => {
  it("scores a fully evidenced candidate at 100", () => {
    const candidate = candidateWith([
      makeProductEdge({ targetType: "standard", targetId: "ISO 11133" }),
      makeProductEdge({ targetType: "application", targetId: "app-1" }),
    ]);
    const [result] = matchProducts({ standardIds: ["ISO 11133"], applicationIds: ["app-1"] }, [candidate]);
    expect(result.score).toBe(100);
    expect(result.matchedDimensions).toEqual(["application app-1", "standard ISO 11133"]);
    expect(result.missingDimensions).toEqual([]);
    expect(result.recommendedNextAction).toBeUndefined();
  });

  it("reports missing evidence with a concrete next action", () => {
    const candidate = candidateWith([]);
    const [result] = matchProducts({ standardIds: ["ISO 11133"] }, [candidate]);
    expect(result.score).toBe(0);
    expect(result.missingDimensions).toEqual(["standard ISO 11133"]);
    expect(result.recommendedNextAction).toBe("evidence missing for standard ISO 11133 — add source");
  });

  it("does not count disputed, superseded or expired evidence as support", () => {
    const candidate = candidateWith([
      makeProductEdge({ targetType: "standard", targetId: "ISO 11133", evidence: { confidence: 0.9, state: "disputed" } }),
    ]);
    const [result] = matchProducts({ standardIds: ["ISO 11133"] }, [candidate]);
    expect(result.score).toBe(0);
    expect(result.missingDimensions).toEqual(["standard ISO 11133"]);
  });

  it("flags discontinued products as a conflict", () => {
    const product = makeProduct({ status: "discontinued" });
    const [result] = matchProducts({}, [{ product, edges: [] }]);
    expect(result.conflicts).toContain("product discontinued");
  });

  it("distinguishes format conflict from format unknown", () => {
    const wrongFormat = candidateWith([], [makeSku({ formatId: "fmt-broth" })]);
    const noFormatData = candidateWith([], [makeSku({})]);
    const [conflict, unknown] = matchProducts({ requiredFormat: "fmt-plate" }, [wrongFormat, noFormatData]);
    expect(conflict.conflicts).toContain("format fmt-plate");
    expect(unknown.missingDimensions).toContain("format fmt-plate");
  });

  it("matches country via SKU availability and flags conflicts", () => {
    const vn = candidateWith([], [makeSku({ countryAvailability: ["VN"] })]);
    const sg = candidateWith([], [makeSku({ countryAvailability: ["SG"] })]);
    const results = matchProducts({ country: "vn" }, [vn, sg]);
    expect(results[0].matchedDimensions).toContain("country VN");
    expect(results[1].conflicts).toContain("country VN");
  });

  it("checks shelf life and storage against SKU data", () => {
    const candidate = candidateWith([], [makeSku({ shelfLifeMonths: 24, storageCondition: "2-8 C" })]);
    const [result] = matchProducts({ minShelfLifeMonths: 12, storage: "2-8 c" }, [candidate]);
    expect(result.score).toBe(100);
    const [short] = matchProducts({ minShelfLifeMonths: 36 }, [candidate]);
    expect(short.conflicts.join(" ")).toMatch(/shelf life/);
  });

  it("excludes the existing product from alternatives", () => {
    const keep = makeProduct({ name: "Keep" });
    const excluded = makeProduct({ name: "Excluded" });
    const results = matchProducts({ existingProductId: excluded.id }, [
      { product: keep, edges: [] },
      { product: excluded, edges: [] },
    ]);
    expect(results.map((r) => r.productId)).toEqual([keep.id]);
  });

  it("ranks by score with deterministic name tiebreak", () => {
    const full = candidateWith([makeProductEdge({ targetType: "standard", targetId: "ISO 11133" })]);
    full.product = { ...full.product, name: "Bravo" };
    const partial = candidateWith([]);
    partial.product = { ...partial.product, name: "Alpha" };
    const results = matchProducts({ standardIds: ["ISO 11133"], methodIds: ["m-1"] }, [partial, full]);
    expect(results[0].productName).toBe("Bravo");
    expect(results[0].score).toBe(50);
    expect(results[1].score).toBe(0);
  });

  it("empty requirements match everything (vacuous)", () => {
    const [result] = matchProducts({}, [candidateWith([])]);
    expect(result.score).toBe(100);
  });
});
