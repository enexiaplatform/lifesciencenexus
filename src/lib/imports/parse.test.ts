import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseCsvText, parseXlsxArrayBuffer, rowsFromTsvPaste } from "./parse";

describe("parseCsvText", () => {
  it("parses a header row and trimmed data rows", () => {
    const parsed = parseCsvText("Name, Country \n Acme , vn\nDelta,US\n");
    expect(parsed.headers).toEqual(["Name", "Country"]);
    expect(parsed.rows).toEqual([
      { Name: "Acme", Country: "vn" },
      { Name: "Delta", Country: "US" },
    ]);
    expect(parsed.errors).toEqual([]);
  });

  it("keeps quoted commas and diacritics intact", () => {
    const parsed = parseCsvText('Name,Note\n"Công ty TNHH Mekong, Ltd","giá: 1.500.000đ"\n');
    expect(parsed.rows[0].Name).toBe("Công ty TNHH Mekong, Ltd");
    expect(parsed.rows[0].Note).toBe("giá: 1.500.000đ");
  });

  it("reports structural errors without dropping valid rows", () => {
    const parsed = parseCsvText("a,b\n1,2\n3,4,5\n");
    expect(parsed.rows.length).toBeGreaterThanOrEqual(1);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});

describe("parseXlsxArrayBuffer", () => {
  it("parses the first sheet into header-keyed rows", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Amount"],
      ["TSA 500 g", 1850000],
      ["NB 500 g", 990000],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Prices");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const parsed = parseXlsxArrayBuffer(buffer);
    expect(parsed.headers).toEqual(["Name", "Amount"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual({ Name: "TSA 500 g", Amount: "1850000" });
    expect(parsed.errors).toEqual([]);
  });

  it("returns an error for an empty sheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Empty");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const parsed = parseXlsxArrayBuffer(buffer);
    expect(parsed.rows).toEqual([]);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});

describe("rowsFromTsvPaste", () => {
  it("parses a tab-separated paste (Excel clipboard)", () => {
    const parsed = rowsFromTsvPaste("Name\tCountry\nAcme\tVN\nDelta\tUS\n");
    expect(parsed.headers).toEqual(["Name", "Country"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1]).toEqual({ Name: "Delta", Country: "US" });
  });

  it("falls back to comma separation and flags ragged rows", () => {
    const parsed = rowsFromTsvPaste("a,b\n1,2,3\n4,5\n");
    expect(parsed.headers).toEqual(["a", "b"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.rows[1]).toEqual({ a: "4", b: "5" });
  });

  it("returns a helpful error on empty input", () => {
    const parsed = rowsFromTsvPaste("   \n  \n");
    expect(parsed.rows).toEqual([]);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});
