import { describe, expect, it } from "vitest";

import { parseCsvText } from "./parse";
import { IMPORT_KINDS, IMPORT_TEMPLATES, getImportTemplate, templateCsv } from "./templates";

describe("import templates", () => {
  it("defines all ten import kinds", () => {
    expect(IMPORT_KINDS).toHaveLength(10);
    for (const kind of IMPORT_KINDS) {
      const template = IMPORT_TEMPLATES[kind];
      expect(template.kind).toBe(kind);
      expect(template.columns.length).toBeGreaterThan(0);
      expect(template.columns.some((column) => column.required)).toBe(true);
      // Column keys are unique within a template.
      const keys = template.columns.map((column) => column.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("getImportTemplate returns the template for a kind", () => {
    expect(getImportTemplate("organizations").entityType).toBe("organization");
    expect(getImportTemplate("prices").entityType).toBe("price_observation");
  });

  it("templateCsv emits a header row plus the example row, parseable as CSV", () => {
    for (const kind of IMPORT_KINDS) {
      const csv = templateCsv(kind);
      const parsed = parseCsvText(csv);
      expect(parsed.errors).toEqual([]);
      expect(parsed.headers).toEqual(IMPORT_TEMPLATES[kind].columns.map((column) => column.label));
      expect(parsed.rows).toHaveLength(1);
      // Example values survive the round trip.
      const nameColumn = IMPORT_TEMPLATES[kind].columns.find((column) => column.required);
      expect(nameColumn).toBeDefined();
      expect(parsed.rows[0][nameColumn!.label]).toBe(nameColumn!.example);
    }
  });

  it("escapes commas inside example values", () => {
    const csv = templateCsv("organizations");
    // "Mekong Lab Supply Co., Ltd" contains a comma and must be quoted.
    expect(csv).toContain('"Mekong Lab Supply Co., Ltd"');
  });
});
