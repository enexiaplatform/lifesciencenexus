/** Helpers for reading Next.js searchParams (string | string[] | undefined). */

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** First value of a possibly multi-valued param. */
export function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

/** Positive integer page param, defaulting to 1. */
export function pageParam(value: string | string[] | undefined): number {
  const n = Number(one(value));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
