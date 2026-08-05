import { describe, expect, it } from "vitest";

import { PRODUCT_CATEGORIES } from "@/lib/domain/types";

import { CATEGORY_INFO, categoryHref, matchCategories } from "./categories";

describe("CATEGORY_INFO", () => {
  it("covers every product category with a label and description", () => {
    for (const category of PRODUCT_CATEGORIES) {
      expect(CATEGORY_INFO[category].label.length).toBeGreaterThan(0);
      expect(CATEGORY_INFO[category].description.length).toBeGreaterThan(0);
    }
  });
});

describe("matchCategories", () => {
  it("matches the buyer phrase 'closed sterility testing system' to sterility_testing_equipment", () => {
    const matches = matchCategories("closed sterility testing system");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].category).toBe("sterility_testing_equipment");
    expect(matches[0].score).toBe(1);
    expect(matches[0].matchedOn).toBe("closed sterility testing system");
  });

  it("matches Vietnamese synonyms", () => {
    const matches = matchCategories("máy kiểm tra vô trùng");
    expect(matches[0]?.category).toBe("sterility_testing_equipment");
  });

  it("matches partial phrases like 'sterility test system'", () => {
    const matches = matchCategories("sterility test system");
    expect(matches.some((match) => match.category === "sterility_testing_equipment")).toBe(true);
  });

  it("matches 'ready plates' to ready_prepared_media", () => {
    const matches = matchCategories("ready plates");
    expect(matches[0].category).toBe("ready_prepared_media");
  });

  it("returns nothing for unrelated or too-short queries", () => {
    expect(matchCategories("qsdkjfg xwvq")).toEqual([]);
    expect(matchCategories("ab")).toEqual([]);
    expect(matchCategories("")).toEqual([]);
  });

  it("is deterministic for tied scores", () => {
    const first = matchCategories("sterility");
    const second = matchCategories("sterility");
    expect(first).toEqual(second);
  });
});

describe("categoryHref", () => {
  it("builds the category route", () => {
    expect(categoryHref("sterility_testing_equipment")).toBe("/categories/sterility_testing_equipment");
  });
});
