"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TokensLineChartProps {
  data: Array<{ date: string; tokens: number; requests: number }>;
}

export function TokensLineChart({ data }: TokensLineChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    tokensM: d.tokens / 1_000_000,
  }));

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Daily Token Usage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={12}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v: number) => `${v.toFixed(1)}M`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#fafafa",
            }}
            formatter={(value) => [`${Number(value).toFixed(2)}M tokens`, "Tokens"]}
          />
          <Area
            type="monotone"
            dataKey="tokensM"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
