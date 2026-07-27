import { describe, expect, it } from "vitest";

import { convertQuantity, normalizePack, parsePack, pricePerUnit, toBaseUnits } from "./units";

describe("parsePack", () => {
  it("parses simple mass packs, with and without a space", () => {
    expect(parsePack("500 g")).toMatchObject({ itemCount: 1, perItemQuantity: 500, unit: "g", family: "mass" });
    expect(parsePack("500g")).toMatchObject({ perItemQuantity: 500, unit: "g" });
  });

  it("parses multiplier packs '6 x 500 g'", () => {
    expect(parsePack("6 x 500 g")).toMatchObject({ itemCount: 6, perItemQuantity: 500, unit: "g", family: "mass" });
    expect(parsePack("6x500g")).toMatchObject({ itemCount: 6, perItemQuantity: 500 });
  });

  it("parses count packs '20 plates/pack'", () => {
    expect(parsePack("20 plates/pack")).toMatchObject({
      itemCount: 20,
      perItemQuantity: 1,
      unit: "plate",
      family: "count",
    });
  });

  it("parses dimension packs '10x90 mm'", () => {
    const parsed = parsePack("10x90 mm");
    expect(parsed).toMatchObject({ itemCount: 10, family: "length" });
    expect(parsed?.dimension).toEqual({ quantity: 90, unit: "mm" });
  });

  it("returns null for unrecognized strings", () => {
    expect(parsePack("as needed")).toBeNull();
    expect(parsePack("500 parsecs")).toBeNull();
  });
});

describe("toBaseUnits / convertQuantity", () => {
  it("converts within the mass family", () => {
    expect(toBaseUnits(1, "kg")).toMatchObject({ quantity: 1000, baseUnit: "g", family: "mass" });
    expect(toBaseUnits(500, "mg")).toMatchObject({ quantity: 0.5, baseUnit: "g" });
    expect(convertQuantity(2, "kg", "g")).toBe(2000);
  });

  it("converts within the volume family", () => {
    expect(convertQuantity(1, "L", "mL")).toBe(1000);
    expect(convertQuantity(250, "mL", "L")).toBe(0.25);
  });

  it("refuses cross-family and cross-count conversions", () => {
    expect(convertQuantity(1, "kg", "L")).toBeNull();
    expect(convertQuantity(1, "plate", "bottle")).toBeNull();
    expect(convertQuantity(1, "kg", "parsecs")).toBeNull();
  });
});

describe("normalizePack", () => {
  it("normalizes '500 g' to 500 g in base units", () => {
    const pack = normalizePack("500 g");
    expect(pack).toMatchObject({ family: "mass", baseUnit: "g", totalBaseQuantity: 500, itemCount: 1 });
    expect(pack?.warnings).toEqual([]);
  });

  it("normalizes '6 x 500 g' to 3000 g total", () => {
    expect(normalizePack("6 x 500 g")).toMatchObject({ totalBaseQuantity: 3000, itemCount: 6, perItemBaseQuantity: 500 });
  });

  it("normalizes '20 plates/pack' to 20 plate", () => {
    expect(normalizePack("20 plates/pack")).toMatchObject({
      family: "count",
      baseUnit: "plate",
      totalBaseQuantity: 20,
      itemCount: 20,
    });
  });

  it("normalizes '1 kg' to 1000 g", () => {
    expect(normalizePack("1 kg")).toMatchObject({ baseUnit: "g", totalBaseQuantity: 1000 });
  });

  it("handles structured input with unitsPerPack", () => {
    expect(normalizePack({ quantity: 500, unit: "g", unitsPerPack: 6 })).toMatchObject({
      totalBaseQuantity: 3000,
      itemCount: 6,
    });
    expect(normalizePack({ quantity: 20, unit: "plates" })).toMatchObject({ totalBaseQuantity: 20, baseUnit: "plate" });
  });

  it("flags dimension packs with a warning instead of inventing content", () => {
    const pack = normalizePack("10x90 mm");
    expect(pack).toMatchObject({ family: "count", baseUnit: "unit", totalBaseQuantity: 10 });
    expect(pack?.warnings[0]).toMatch(/dimension/i);
  });

  it("returns null for unknown units and non-positive quantities", () => {
    expect(normalizePack("2 furlongs")).toBeNull();
    expect(normalizePack({ quantity: 0, unit: "g" })).toBeNull();
  });
});

describe("pricePerUnit", () => {
  it("divides the amount by the total base quantity", () => {
    const pack = normalizePack("500 g");
    expect(pack && pricePerUnit(250_000, pack)).toBe(500);
  });

  it("returns null for empty packs or non-finite amounts", () => {
    const pack = normalizePack("500 g");
    expect(pack && pricePerUnit(Number.NaN, pack)).toBeNull();
  });
});
