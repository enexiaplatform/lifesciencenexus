/**
 * Helpers to read Next.js 15 search params (`string | string[] | undefined`)
 * in server-rendered market list pages.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

/** First string value of a param, or "". */
export function firstParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/** Positive page number from a param; defaults to 1. */
export function pageParam(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstParam(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Flatten all params to strings (dropping empties) for pagination links. */
export function flattenParams(params: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value !== "") out[key] = value;
  }
  return out;
}
