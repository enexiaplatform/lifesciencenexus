import type { ClaimObjectValue } from "@/lib/domain/types";

/**
 * Presentation formatters shared across the evidence / research / search UI.
 * Client-safe pure functions.
 */

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** ISO date/datetime → "27 Jul 2026"; empty input → em dash. */
export function formatDate(value: string | undefined | null): string {
  if (!value) return "—";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return dateFormatter.format(new Date(time));
}

/** ISO datetime → "27 Jul 2026, 09:30". */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) return "—";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return dateTimeFormatter.format(new Date(time));
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Compact money rendering: "2,850,000 VND". */
export function formatMoney(amount: number, currency: string): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

/** Compact one-line rendering of a claim's object value. */
export function claimValueText(value: ClaimObjectValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString("en-US");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => claimValueText(item as ClaimObjectValue)).join(", ");
  const record = value as Record<string, unknown>;
  if (typeof record.amount === "number" && typeof record.currency === "string") {
    const base = formatMoney(record.amount, record.currency);
    return typeof record.supplierOrgId === "string" ? `${base} · supplier ${record.supplierOrgId}` : base;
  }
  return JSON.stringify(value);
}

/** Relative day phrasing for deadlines: "in 5 days" / "3 days overdue" / "today". */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days > 0) return days === 1 ? "in 1 day" : `in ${days} days`;
  const abs = Math.abs(days);
  return abs === 1 ? "1 day overdue" : `${abs} days overdue`;
}
