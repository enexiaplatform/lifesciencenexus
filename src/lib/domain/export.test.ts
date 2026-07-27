import { describe, expect, it } from "vitest";

import { buildReportSections, escapeCsvCell, toCsv, toJsonExport } from "./export";
import type { ResearchFinding } from "./types";

describe("toCsv", () => {
  const columns = [
    { key: "name", header: "Name", value: (row: { name: string; note?: string }) => row.name },
    { key: "note", header: "Note", value: (row: { name: string; note?: string }) => row.note },
  ];

  it("writes a header row and CRLF-separated records", () => {
    const csv = toCsv([{ name: "a" }, { name: "b" }], columns);
    expect(csv).toBe("Name,Note\r\na,\r\nb,");
  });

  it("escapes commas, quotes and newlines per RFC 4180", () => {
    const csv = toCsv([{ name: "x,y", note: 'he said "hi"\nok' }], columns);
    expect(csv).toBe('Name,Note\r\n"x,y","he said ""hi""\nok"');
  });

  it("renders numbers and booleans bare, null as empty", () => {
    const csv = toCsv(
      [{ n: 42, b: true, z: null }],
      [
        { key: "n", header: "N", value: (r: { n: number }) => r.n },
        { key: "b", header: "B", value: (r: { b: boolean }) => r.b },
        { key: "z", header: "Z", value: () => null },
      ],
    );
    expect(csv).toBe("N,B,Z\r\n42,true,");
  });

  it("escapeCsvCell doubles inner quotes", () => {
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("toJsonExport", () => {
  it("pretty-prints by default and compacts on demand", () => {
    expect(toJsonExport({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(toJsonExport({ a: 1 }, { pretty: false })).toBe('{"a":1}');
  });
});

describe("buildReportSections", () => {
  function finding(kind: ResearchFinding["kind"], text: string): ResearchFinding {
    return {
      id: text,
      tenantId: "t",
      projectId: "p",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "u",
      updatedBy: "u",
      visibility: "tenant_private",
      isDemo: true,
      kind,
      text,
      evidenceClaimIds: [],
    };
  }

  it("groups findings into the five epistemic sections, preserving order", () => {
    const sections = buildReportSections([
      finding("verified_fact", "f1"),
      finding("assumption", "a1"),
      finding("verified_fact", "f2"),
      finding("unknown", "u1"),
      finding("recommendation", "r1"),
      finding("analyst_interpretation", "i1"),
    ]);
    expect(sections.verified_facts.map((f) => f.text)).toEqual(["f1", "f2"]);
    expect(sections.assumptions.map((f) => f.text)).toEqual(["a1"]);
    expect(sections.unknowns.map((f) => f.text)).toEqual(["u1"]);
    expect(sections.recommendations.map((f) => f.text)).toEqual(["r1"]);
    expect(sections.analyst_interpretations.map((f) => f.text)).toEqual(["i1"]);
  });

  it("returns empty sections for empty input", () => {
    const sections = buildReportSections([]);
    expect(sections.verified_facts).toEqual([]);
    expect(Object.keys(sections)).toHaveLength(5);
  });
});
