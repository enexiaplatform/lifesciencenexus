import * as React from "react";

import { cn } from "@/lib/utils";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small uppercase metric label. */
  label: React.ReactNode;
  /** Metric value — rendered in the display font with tabular figures. */
  value: React.ReactNode;
  /** Trend or comparison, e.g. "+12 vs last month". */
  delta?: React.ReactNode;
  /** Tone of the delta (color only; keep the sign in the text). */
  deltaTone?: "positive" | "negative" | "neutral";
  /** Secondary context line under the value. */
  hint?: React.ReactNode;
}

/**
 * Metric card for dashboards. Value uses the display font with tabular
 * figures so columns of numbers align.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-xs",
        className,
      )}
      {...props}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 font-display text-display-md font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-1 text-xs font-medium tabular-nums",
            deltaTone === "positive" && "text-success-fg",
            deltaTone === "negative" && "text-danger-fg",
            deltaTone === "neutral" && "text-slate-500",
          )}
        >
          {delta}
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
