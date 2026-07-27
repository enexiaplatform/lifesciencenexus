import { describe, expect, it } from "vitest";

import {
  daysSince,
  daysUntil,
  daysUntilReviewDue,
  freshnessBucket,
  freshnessInfo,
  isReviewDue,
} from "./freshness";

const NOW = new Date("2026-07-01T12:00:00.000Z");

describe("daysSince / daysUntil", () => {
  it("computes whole days elapsed (floored 24h boundaries)", () => {
    expect(daysSince("2026-06-01T00:00:00.000Z", NOW)).toBe(30);
    // 9.5 days away → floor semantics count 10 boundaries for future dates.
    expect(daysUntil("2026-07-11T00:00:00.000Z", NOW)).toBe(10);
  });

  it("is negative for future dates / past until dates", () => {
    expect(daysSince("2026-07-10T00:00:00.000Z", NOW)).toBe(-9);
    expect(daysUntil("2026-06-01T00:00:00.000Z", NOW)).toBe(-30);
  });

  it("accepts ISO date-only strings", () => {
    expect(daysSince("2026-06-30", "2026-07-01")).toBe(1);
  });

  it("throws on invalid dates", () => {
    expect(() => daysSince("not-a-date", NOW)).toThrow(/Invalid date/);
  });
});

describe("freshnessBucket", () => {
  it("classifies fresh / aging / stale at the default thresholds (90/180)", () => {
    expect(freshnessBucket("2026-06-15", {}, NOW)).toBe("fresh");
    expect(freshnessBucket("2026-03-15", {}, NOW)).toBe("aging");
    expect(freshnessBucket("2025-12-01", {}, NOW)).toBe("stale");
  });

  it("honours custom thresholds", () => {
    expect(freshnessBucket("2026-06-20", { agingAfterDays: 5, staleAfterDays: 10 }, NOW)).toBe("stale");
  });

  it("rejects inverted thresholds", () => {
    expect(() => freshnessBucket("2026-06-20", { agingAfterDays: 10, staleAfterDays: 5 }, NOW)).toThrow();
  });

  it("freshnessInfo returns daysSince and bucket together", () => {
    expect(freshnessInfo("2026-06-21", {}, NOW)).toEqual({ daysSince: 10, bucket: "fresh" });
  });
});

describe("review-due checks", () => {
  it("isReviewDue is true at and past the review-by date", () => {
    expect(isReviewDue("2026-07-01", "2026-07-01")).toBe(true);
    expect(isReviewDue("2026-06-01", "2026-07-01")).toBe(true);
    expect(isReviewDue("2026-08-01", "2026-07-01")).toBe(false);
  });

  it("never due without a review-by date", () => {
    expect(isReviewDue(undefined, NOW)).toBe(false);
    expect(daysUntilReviewDue(undefined, NOW)).toBeNull();
  });

  it("daysUntilReviewDue returns the remaining days", () => {
    expect(daysUntilReviewDue("2026-07-11", "2026-07-01")).toBe(10);
  });
});
