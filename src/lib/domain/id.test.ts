import { describe, expect, it } from "vitest";

import { newId, slugify } from "./id";

describe("newId", () => {
  it("returns a v4 UUID", () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generates unique values", () => {
    expect(newId()).not.toBe(newId());
  });
});

describe("slugify", () => {
  it("lowercases and dashes punctuation runs", () => {
    expect(slugify("Tryptic Soy Agar (TSA)")).toBe("tryptic-soy-agar-tsa");
  });

  it("strips Vietnamese diacritics", () => {
    expect(slugify("Bộ Y tế")).toBe("bo-y-te");
  });

  it("trims leading/trailing dashes and collapses repeats", () => {
    expect(slugify("  --Merck / Millipore-- ")).toBe("merck-millipore");
  });
});
