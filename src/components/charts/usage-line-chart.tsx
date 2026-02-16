"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface UsageLineChartProps {
  data: Array<{
    date: string;
    composerRequests: number;
    chatRequests: number;
    tabsUsed: number;
  }>;
}

export function UsageLineChart({ data }: UsageLineChartProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Daily Usage Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={12}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#fafafa",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="composerRequests"
            stroke="#3b82f6"
            name="Composer"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="chatRequests"
            stroke="#8b5cf6"
            name="Chat"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="tabsUsed"
            stroke="#22c55e"
            name="Tabs"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
