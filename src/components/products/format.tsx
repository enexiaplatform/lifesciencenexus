import { cn } from "@/lib/utils";

/**
 * Presentation helpers for dense scientific UI: money, numbers, dates,
 * confidence values and score bars. All locale-independent and deterministic
 * so server and client render identically.
 */

/** 'dehydrated_culture_media' -> 'Dehydrated culture media'. */
export function humanize(token: string): string {
  const spaced = token.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Plain number with grouping; up to `maxDecimals` decimals (default 2). */
export function formatNumber(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Money with ISO 4217 currency. Uses the currency's own minor units (VND → 0
 * decimals, USD → 2). Falls back to "amount CUR" for unknown codes.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${formatNumber(amount, 6)} ${currency}`;
  }
}

/** Normalized per-unit / per-test amounts keep up to 4 significant decimals. */
export function formatUnitAmount(amount: number, currency: string, unit?: string | null): string {
  const base = (() => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      }).format(amount);
    } catch {
      return `${formatNumber(amount, 4)} ${currency}`;
    }
  })();
  return unit ? `${base} / ${unit}` : base;
}

export function Money({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  return (
    <span className={cn("font-medium tabular-nums text-slate-800", className)}>
      {formatMoney(amount, currency)}
    </span>
  );
}

/** ISO date rendered as YYYY-MM-DD (full ISO in the tooltip). */
export function DateText({ date, className }: { date: string; className?: string }) {
  return (
    <time dateTime={date} title={date} className={cn("tabular-nums text-slate-700", className)}>
      {date.slice(0, 10)}
    </time>
  );
}

/** Numeric confidence (0–1, two decimals) with a small fill bar. */
export function ConfidenceValue({ value, className }: { value: number; className?: string }) {
  const percent = Math.round(value * 100);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`Confidence ${value.toFixed(4)}`}>
      <span className="font-medium tabular-nums text-slate-800">{value.toFixed(2)}</span>
      <span className="h-1 w-8 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <span
          className={cn(
            "block h-full rounded-full",
            percent >= 75 ? "bg-teal-500" : percent >= 50 ? "bg-warning" : "bg-danger",
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
    </span>
  );
}

/** 0–100 score bar with the numeric value alongside. */
export function ScoreBar({
  score,
  className,
  barClassName,
}: {
  score: number | null;
  className?: string;
  barClassName?: string;
}) {
  if (score === null) {
    return <span className="text-xs italic text-slate-400">not assessable</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="font-semibold tabular-nums text-slate-900">{formatNumber(score)}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <span
          className={cn(
            "block h-full rounded-full",
            score >= 75 ? "bg-teal-500" : score >= 55 ? "bg-warning" : "bg-danger",
            barClassName,
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </span>
    </span>
  );
}
