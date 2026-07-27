/**
 * Freshness helpers — pure date math for evidence staleness and review-due
 * checks. Every function takes `now` explicitly (defaulting to the real clock)
 * so tests and signal generation are deterministic.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toTime(date: string | Date): number {
  const time = date instanceof Date ? date.getTime() : Date.parse(date);
  if (Number.isNaN(time)) {
    throw new Error(`Invalid date: ${String(date)}`);
  }
  return time;
}

/** Whole days elapsed since `date` (negative when `date` is in the future). */
export function daysSince(date: string | Date, now: string | Date = new Date()): number {
  return Math.floor((toTime(now) - toTime(date)) / MS_PER_DAY);
}

/** Whole days until `date` (negative when `date` is in the past). */
export function daysUntil(date: string | Date, now: string | Date = new Date()): number {
  return -daysSince(date, now);
}

export const FRESHNESS_BUCKETS = ["fresh", "aging", "stale"] as const;
export type FreshnessBucket = (typeof FRESHNESS_BUCKETS)[number];

export interface FreshnessThresholds {
  /** Bucket becomes 'aging' once daysSince exceeds this. Default 90. */
  agingAfterDays?: number;
  /** Bucket becomes 'stale' once daysSince exceeds this. Default 180. */
  staleAfterDays?: number;
}

export const DEFAULT_AGING_AFTER_DAYS = 90;
export const DEFAULT_STALE_AFTER_DAYS = 180;

/** Classify how old a piece of evidence is. */
export function freshnessBucket(
  date: string | Date,
  thresholds: FreshnessThresholds = {},
  now: string | Date = new Date(),
): FreshnessBucket {
  const agingAfter = thresholds.agingAfterDays ?? DEFAULT_AGING_AFTER_DAYS;
  const staleAfter = thresholds.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  if (staleAfter < agingAfter) {
    throw new Error("staleAfterDays must be >= agingAfterDays");
  }
  const age = daysSince(date, now);
  if (age > staleAfter) return "stale";
  if (age > agingAfter) return "aging";
  return "fresh";
}

export interface FreshnessInfo {
  daysSince: number;
  bucket: FreshnessBucket;
}

/** Convenience: age + bucket in one call. */
export function freshnessInfo(
  date: string | Date,
  thresholds: FreshnessThresholds = {},
  now: string | Date = new Date(),
): FreshnessInfo {
  return {
    daysSince: daysSince(date, now),
    bucket: freshnessBucket(date, thresholds, now),
  };
}

/**
 * True when a review-by date exists and has been reached. Records without a
 * review-by date are never "due" — the absence of a date is a data-quality
 * gap, not a review trigger.
 */
export function isReviewDue(
  reviewByDate: string | Date | undefined,
  now: string | Date = new Date(),
): boolean {
  if (reviewByDate === undefined) return false;
  return toTime(reviewByDate) <= toTime(now);
}

/** Days until review is due, or null when no review-by date is set. */
export function daysUntilReviewDue(
  reviewByDate: string | Date | undefined,
  now: string | Date = new Date(),
): number | null {
  if (reviewByDate === undefined) return null;
  return daysUntil(reviewByDate, now);
}
