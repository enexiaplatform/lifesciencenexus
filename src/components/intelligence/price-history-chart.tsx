"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PriceHistoryPoint {
  date: string;
  amount: number;
}

const TICK_STYLE = { fontSize: 12, fill: "currentColor", fontFamily: "var(--font-sans)" } as const;
const TOOLTIP_STYLE = {
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  border: "1px solid var(--color-slate-200)",
  borderRadius: 6,
} as const;

/** Per-SKU price history line chart (single currency). */
export function PriceHistoryChart({
  data,
  currency,
}: {
  data: PriceHistoryPoint[];
  currency: string;
}) {
  return (
    <div
      className="h-52 w-full text-slate-600"
      role="img"
      aria-label={`Price history in ${currency}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
          <XAxis dataKey="date" tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} width={100} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${currency}`,
              "Observed amount",
            ]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-chart-1)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
