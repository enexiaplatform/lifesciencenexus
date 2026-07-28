import { normalizeForMatch } from "@/lib/domain/entity-resolution";

import type { ImportTemplate } from "./templates";

/** template field key -> file header (null = not mapped). */
export type ColumnMapping = Record<string, string | null>;

/**
 * Column mapping between an uploaded file's headers and an import template.
 *
 * Matching is case- and diacritic-insensitive (`normalizeForMatch` strips
 * Vietnamese diacritics, punctuation and case) and consults, per template
 * column: the machine key, the label, and the curated synonym list (which
 * includes common Vietnamese headers like "giá" -> amount, "mã hàng" ->
 * catalogueNumber).
 */

/** Normalize a header for matching: lowercase, diacritics stripped, punctuation collapsed. */
export function normalizeHeader(header: string): string {
  // Vietnamese đ/Đ do not decompose under NFD — map them explicitly first.
  return normalizeForMatch(header.replace(/đ/g, "d").replace(/Đ/g, "D"));
}

interface MatchCandidate {
  normalized: string;
  fieldKey: string;
}

/**
 * Suggest a mapping fileHeader -> template field. Exact normalized matches
 * only (no fuzzy guessing — wrong guesses are worse than no guess). A file
 * header can map to at most one template field; first template field wins.
 */
export function autoMapColumns(fileHeaders: readonly string[], template: ImportTemplate): ColumnMapping {
  const candidates: MatchCandidate[] = [];
  for (const column of template.columns) {
    candidates.push({ normalized: normalizeHeader(column.key), fieldKey: column.key });
    candidates.push({ normalized: normalizeHeader(column.label), fieldKey: column.key });
    for (const synonym of column.synonyms ?? []) {
      candidates.push({ normalized: normalizeHeader(synonym), fieldKey: column.key });
    }
  }

  const mapping: ColumnMapping = {};
  for (const column of template.columns) mapping[column.key] = null;

  const usedHeaders = new Set<string>();
  for (const column of template.columns) {
    for (const header of fileHeaders) {
      if (usedHeaders.has(header)) continue;
      const normalized = normalizeHeader(header);
      if (normalized === "") continue;
      const hit = candidates.find(
        (candidate) => candidate.fieldKey === column.key && candidate.normalized === normalized,
      );
      if (hit) {
        mapping[column.key] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }
  return mapping;
}

/**
 * Project file rows onto template keys using a mapping. Unmapped template
 * fields are absent; unmapped file columns are dropped.
 */
export function applyMapping(
  rows: readonly Record<string, string>[],
  mapping: ColumnMapping,
): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [fieldKey, fileHeader] of Object.entries(mapping)) {
      if (fileHeader === null) continue;
      out[fieldKey] = row[fileHeader] ?? "";
    }
    return out;
  });
}
