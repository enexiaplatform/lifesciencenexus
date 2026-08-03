"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CostBarDatum {
  name: string;
  cost: number;
}

const BAR_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

const TICK_STYLE = { fontSize: 12, fill: "currentColor", fontFamily: "var(--font-sans)" } as const;
const TOOLTIP_STYLE = {
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  border: "1px solid var(--color-slate-200)",
  borderRadius: 6,
} as const;

/** Effective-cost-per-test comparison bar chart (single result currency). */
export function CostBarChart({ data, currency }: { data: CostBarDatum[]; currency: string }) {
  return (
    <div
      className="h-56 w-full text-slate-600"
      role="img"
      aria-label={`Cost per test comparison in ${currency}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
          <XAxis dataKey="name" tick={TICK_STYLE} interval={0} angle={-12} textAnchor="end" height={48} />
          <YAxis tick={TICK_STYLE} width={90} />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${currency}`, "Cost per test"]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="cost" radius={[3, 3, 0, 0]}>
            {data.map((datum, index) => (
              <Cell key={datum.name} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
