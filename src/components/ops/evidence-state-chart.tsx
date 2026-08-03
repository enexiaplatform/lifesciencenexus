"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface EvidenceChartDatum {
  state: string;
  count: number;
}

/** Records-by-evidence-state bar chart (recharts, client-only). */
export function EvidenceStateChart({ data }: { data: EvidenceChartDatum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Bar chart of records by evidence state">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-200)" />
          <XAxis
            dataKey="state"
            tick={{ fontSize: 12, fontFamily: "var(--font-inter), sans-serif" }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={56}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fontFamily: "var(--font-inter), sans-serif" }} />
          <Tooltip contentStyle={{ fontSize: 12, fontFamily: "var(--font-inter), sans-serif" }} />
          <Bar dataKey="count" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
