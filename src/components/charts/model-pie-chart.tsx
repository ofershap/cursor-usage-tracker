"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ModelPieChartProps {
  data: Array<{ model: string; count: number; tokens: number }>;
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];

export function ModelPieChart({ data }: ModelPieChartProps) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.model,
    value: d.tokens,
    days: d.count,
  }));

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Model Usage (by requests)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#fafafa",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color: "#fafafa" }}
            formatter={(value, _name, props) => {
              const days = props?.payload?.days;
              return [`${Number(value)} requests (${days} days)`, "Usage"];
            }}
          />
          <Legend
            formatter={(value: string) => value}
            wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
