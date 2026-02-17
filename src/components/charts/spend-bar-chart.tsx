"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

interface SpendBarChartProps {
  data: Array<{ email: string; name: string; spend_cents: number; spend_rank: number }>;
  highlightEmail?: string;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
} as const;

const TOOLTIP_LABEL_STYLE = { color: "#fafafa" } as const;
const TOOLTIP_ITEM_STYLE = { color: "#fafafa" } as const;

export function SpendBarChart({ data, highlightEmail }: SpendBarChartProps) {
  const chartData = data.slice(0, 8).map((d) => ({
    label: `#${d.spend_rank} ${d.name.split(" ")[0] ?? d.email.split("@")[0]}`,
    spend: d.spend_cents / 100,
    email: d.email,
    rank: d.spend_rank,
    name: d.name,
  }));

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-xs font-medium text-zinc-500 mb-2">Top Spenders (Current Cycle)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`}
            stroke="#71717a"
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#71717a"
            fontSize={11}
            width={90}
            tick={{ fill: "#a1a1aa" }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spend"]}
            labelFormatter={(_label, payload) => {
              const item = payload?.[0]?.payload;
              return item ? `#${item.rank} ${item.name} (${item.email})` : String(_label);
            }}
          />
          <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.email}
                fill={entry.email === highlightEmail ? "#f59e0b" : "#3b82f6"}
              />
            ))}
            <LabelList
              dataKey="spend"
              position="right"
              formatter={
                ((v: number) =>
                  `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : Math.round(v)}`) as never
              }
              style={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
