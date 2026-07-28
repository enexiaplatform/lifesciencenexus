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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="state" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={56} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#0f766e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
