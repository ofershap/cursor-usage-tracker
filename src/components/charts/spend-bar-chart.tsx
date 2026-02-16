"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface SpendBarChartProps {
  data: Array<{ email: string; spend_cents: number }>;
}

export function SpendBarChart({ data }: SpendBarChartProps) {
  const chartData = data.slice(0, 15).map((d) => ({
    name: d.email.split("@")[0],
    spend: d.spend_cents / 100,
    email: d.email,
  }));

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Spend by User (Current Cycle)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `$${v}`}
            stroke="#71717a"
            fontSize={12}
          />
          <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={12} width={80} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#fafafa",
            }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spend"]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
