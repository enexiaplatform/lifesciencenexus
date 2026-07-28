import { describe, expect, it } from "vitest";

import { applyMapping, autoMapColumns, normalizeHeader } from "./mapping";
import { IMPORT_TEMPLATES } from "./templates";

describe("normalizeHeader", () => {
  it("is case- and diacritic-insensitive", () => {
    expect(normalizeHeader("Giá")).toBe(normalizeHeader("gia"));
    expect(normalizeHeader("Mã Hàng")).toBe("ma hang");
    expect(normalizeHeader("  Catalogue  Number ")).toBe("catalogue number");
  });
});

describe("autoMapColumns", () => {
  it("maps English labels and keys", () => {
    const mapping = autoMapColumns(["Name", "Types", "Country", "Notes"], IMPORT_TEMPLATES.organizations);
    expect(mapping.name).toBe("Name");
    expect(mapping.types).toBe("Types");
    expect(mapping.country).toBe("Country");
    expect(mapping.website).toBeNull();
  });

  it("maps synonym headers (catalogue, cat no)", () => {
    const mapping = autoMapColumns(["Product", "Cat No", "Name"], IMPORT_TEMPLATES.skus);
    expect(mapping.product).toBe("Product");
    expect(mapping.catalogueNumber).toBe("Cat No");
    expect(mapping.name).toBe("Name");
  });

  it("maps Vietnamese headers (giá -> amount, mã hàng -> catalogueNumber, ...)", () => {
    const mapping = autoMapColumns(
      ["Mã hàng", "Giá", "Tiền tệ", "Ngày báo giá", "Địa bàn"],
      IMPORT_TEMPLATES.prices,
    );
    expect(mapping.sku).toBe("Mã hàng");
    expect(mapping.amount).toBe("Giá");
    expect(mapping.currency).toBe("Tiền tệ");
    expect(mapping.observationDate).toBe("Ngày báo giá");
    expect(mapping.geography).toBe("Địa bàn");
  });

  it("maps Vietnamese organization headers (tên công ty, quốc gia, mã số thuế)", () => {
    const mapping = autoMapColumns(
      ["Tên công ty", "Loại hình", "Quốc gia", "Mã số thuế", "Trang web"],
      IMPORT_TEMPLATES.organizations,
    );
    expect(mapping.name).toBe("Tên công ty");
    expect(mapping.types).toBe("Loại hình");
    expect(mapping.country).toBe("Quốc gia");
    expect(mapping.identifiers).toBe("Mã số thuế");
    expect(mapping.website).toBe("Trang web");
  });

  it("is case-insensitive on real file headers", () => {
    const mapping = autoMapColumns(["CATALOGUE NUMBER", "gtin"], IMPORT_TEMPLATES.skus);
    expect(mapping.catalogueNumber).toBe("CATALOGUE NUMBER");
    expect(mapping.gtin).toBe("gtin");
  });

  it("never maps one file header to two fields", () => {
    const mapping = autoMapColumns(["Name", "Status"], IMPORT_TEMPLATES.skus);
    const used = Object.values(mapping).filter((header) => header !== null);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe("applyMapping", () => {
  it("projects file rows onto template keys, dropping unmapped columns", () => {
    const rows = [{ Name: "Acme", Country: "VN", Notes: "ignore me" }];
    const mapped = applyMapping(rows, { name: "Name", country: "Country", website: null });
    expect(mapped).toEqual([{ name: "Acme", country: "VN" }]);
  });
});
