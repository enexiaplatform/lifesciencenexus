import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * File/paste parsing for the import wizard. Everything returns the same
 * `ParsedTable` shape: string-keyed rows plus non-fatal parser messages.
 * Pure and browser-safe — no I/O beyond the bytes handed in.
 */

export interface ParsedTable {
  /** Column headers from the first row, trimmed, order preserved. */
  headers: string[];
  /** Data rows keyed by header. Missing cells are empty strings. */
  rows: Record<string, string>[];
  /** Non-fatal parser diagnostics (row mismatches, empty sheets, ...). */
  errors: string[];
}

/** Parse CSV text with a header row (papaparse). */
export function parseCsvText(text: string): ParsedTable {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });
  const headers = (result.meta.fields ?? []).filter((field) => field.length > 0);
  const errors = result.errors.map(
    (error) => `Row ${typeof error.row === "number" ? error.row + 2 : "?"}: ${error.message}`,
  );
  const rows = result.data.map((row) => normalizeRow(row, headers));
  return { headers, rows, errors };
}

/** Parse the first worksheet of an XLSX workbook (as ArrayBuffer). */
export function parseXlsxArrayBuffer(buffer: ArrayBuffer): ParsedTable {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], errors: ["The workbook contains no sheets."] };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (matrix.length === 0) {
    return { headers: [], rows: [], errors: [`Sheet "${sheetName}" is empty.`] };
  }
  const headers = matrix[0].map((cell) => String(cell ?? "").trim());
  const rows: Record<string, string>[] = [];
  for (const cells of matrix.slice(1)) {
    const row: Record<string, string> = {};
    let nonEmpty = false;
    headers.forEach((header, index) => {
      const value = String(cells[index] ?? "").trim();
      if (value !== "") nonEmpty = true;
      row[header] = value;
    });
    if (nonEmpty) rows.push(row);
  }
  return { headers, rows, errors: [] };
}

/**
 * Parse a pasted table (Excel/Google Sheets paste is tab-separated). The first
 * line is treated as the header row.
 */
export function rowsFromTsvPaste(text: string): ParsedTable {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ["Nothing to parse — paste a table with a header row."] };
  }
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((cell) => cell.trim());
  const errors: string[] = [];
  const rows: Record<string, string>[] = [];
  lines.slice(1).forEach((line, index) => {
    const cells = line.split(delimiter);
    if (cells.length !== headers.length) {
      errors.push(
        `Row ${index + 2}: expected ${headers.length} cells, found ${cells.length} (extra cells ignored).`,
      );
    }
    const row: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      row[header] = (cells[cellIndex] ?? "").trim();
    });
    rows.push(row);
  });
  return { headers, rows, errors };
}

function normalizeRow(row: Record<string, string>, headers: string[]): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const header of headers) {
    const value = row[header];
    normalized[header] = typeof value === "string" ? value : value == null ? "" : String(value);
  }
  return normalized;
}
