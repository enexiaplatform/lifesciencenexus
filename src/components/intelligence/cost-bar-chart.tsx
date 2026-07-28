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

const BAR_COLORS = ["#435e76", "#0d9488", "#d97706", "#7c3aed"];

/** Effective-cost-per-test comparison bar chart (single result currency). */
export function CostBarChart({ data, currency }: { data: CostBarDatum[]; currency: string }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`Cost per test comparison in ${currency}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
          <YAxis tick={{ fontSize: 11 }} width={90} />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${currency}`, "Cost per test"]}
            contentStyle={{ fontSize: 12 }}
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
