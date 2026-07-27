import type { ResearchFinding } from "./types";

/**
 * Export helpers: RFC-4180-style CSV, JSON, and research-report sections.
 * Pure string builders — file download/persistence is the caller's job.
 */

export interface CsvColumn<T> {
  /** Stable machine key (used by callers for column selection). */
  key: string;
  /** Header cell text. */
  header: string;
  /** Cell extractor; null/undefined render as empty cells. */
  value: (row: T) => string | number | boolean | null | undefined;
}

/** Escape one CSV cell: quote when it contains '"', ',', CR or LF; double inner quotes. */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Serialize rows to CSV with a header row. Records are CRLF-separated (RFC
 * 4180); the output has no trailing newline.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}

/** Serialize any JSON-safe payload; pretty-printed by default for human inspection. */
export function toJsonExport(payload: unknown, options: { pretty?: boolean } = {}): string {
  const pretty = options.pretty ?? true;
  return JSON.stringify(payload, null, pretty ? 2 : 0);
}

// ---------------------------------------------------------------------------
// Research report sections
// ---------------------------------------------------------------------------

/**
 * Report sections keyed by finding kind. The five buckets keep verified facts
 * visually separated from interpretations, assumptions and known unknowns —
 * the evidence-first contract extends into exports.
 */
export interface ReportSections {
  verified_facts: ResearchFinding[];
  analyst_interpretations: ResearchFinding[];
  assumptions: ResearchFinding[];
  unknowns: ResearchFinding[];
  recommendations: ResearchFinding[];
}

/** Group findings by kind, preserving input order within each section. */
export function buildReportSections(findings: readonly ResearchFinding[]): ReportSections {
  const sections: ReportSections = {
    verified_facts: [],
    analyst_interpretations: [],
    assumptions: [],
    unknowns: [],
    recommendations: [],
  };
  for (const finding of findings) {
    switch (finding.kind) {
      case "verified_fact":
        sections.verified_facts.push(finding);
        break;
      case "analyst_interpretation":
        sections.analyst_interpretations.push(finding);
        break;
      case "assumption":
        sections.assumptions.push(finding);
        break;
      case "unknown":
        sections.unknowns.push(finding);
        break;
      case "recommendation":
        sections.recommendations.push(finding);
        break;
    }
  }
  return sections;
}
