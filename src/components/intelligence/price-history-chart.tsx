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

/** Per-SKU price history line chart (single currency). */
export function PriceHistoryChart({
  data,
  currency,
}: {
  data: PriceHistoryPoint[];
  currency: string;
}) {
  return (
    <div className="h-52 w-full" role="img" aria-label={`Price history in ${currency}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={100} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${currency}`,
              "Observed amount",
            ]}
            contentStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#435e76"
            strokeWidth={2}
            dot={{ r: 3, fill: "#435e76" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
