import { describe, expect, it } from "vitest";

import { formatConfidence, formatDate, formatMoney, humanize } from "./labels";

describe("formatDate", () => {
  it("renders the date part of ISO dates and datetimes", () => {
    expect(formatDate("2026-01-31")).toBe("2026-01-31");
    expect(formatDate("2026-01-31T09:30:00Z")).toBe("2026-01-31");
  });
  it("renders an em dash for missing values", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatMoney", () => {
  it("formats with thousand separators and a currency code suffix", () => {
    expect(formatMoney(1_850_000_000, "VND")).toBe("1,850,000,000 VND");
    expect(formatMoney(98, "USD")).toBe("98 USD");
  });
  it("renders an em dash when the amount is missing", () => {
    expect(formatMoney(undefined, "VND")).toBe("—");
  });
});

describe("formatConfidence", () => {
  it("renders a rounded percentage", () => {
    expect(formatConfidence(0.85)).toBe("85%");
    expect(formatConfidence(1)).toBe("100%");
  });
  it("renders an em dash for missing values", () => {
    expect(formatConfidence(undefined)).toBe("—");
  });
});

describe("humanize", () => {
  it("turns snake_case keys into words", () => {
    expect(humanize("authorized_distributor")).toBe("authorized distributor");
  });
});
