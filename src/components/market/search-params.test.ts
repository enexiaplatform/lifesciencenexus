import { describe, expect, it } from "vitest";

import { firstParam, flattenParams, pageParam } from "./search-params";

describe("firstParam", () => {
  it("returns the string value as-is", () => {
    expect(firstParam("abc")).toBe("abc");
  });
  it("returns empty string for arrays and undefined", () => {
    expect(firstParam(["a", "b"])).toBe("");
    expect(firstParam(undefined)).toBe("");
  });
});

describe("pageParam", () => {
  it("parses positive integers", () => {
    expect(pageParam("3")).toBe(3);
  });
  it("falls back to 1 for missing, invalid or non-positive values", () => {
    expect(pageParam(undefined)).toBe(1);
    expect(pageParam("abc")).toBe(1);
    expect(pageParam("0")).toBe(1);
    expect(pageParam("-4")).toBe(1);
  });
});

describe("flattenParams", () => {
  it("keeps non-empty strings, drops arrays and empties", () => {
    expect(flattenParams({ query: "mekong", page: "2", status: "", tags: ["a"] })).toEqual({
      query: "mekong",
      page: "2",
    });
  });
});
