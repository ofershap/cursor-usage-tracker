"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DailySpendDataPoint } from "@/app/dashboard-client";
import { formatDateTick, formatDateLabel } from "@/lib/date-utils";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];
const OTHERS_COLOR = "#52525b";

interface DailySpendChartProps {
  data: { points: DailySpendDataPoint[]; topNames: string[] };
}

export function DailySpendChart({ data }: DailySpendChartProps) {
  const { points, topNames } = data;

  if (!points.length) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 text-center text-zinc-500 text-sm">
        No daily spend breakdown available
      </div>
    );
  }

  const allKeys = [...topNames, "Others"];
  const colorMap = new Map<string, string>();
  allKeys.forEach((key, i) => {
    colorMap.set(key, key === "Others" ? OTHERS_COLOR : (COLORS[i % COLORS.length] ?? "#71717a"));
  });

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-xs font-medium text-zinc-500 mb-2">Daily Spend by Top Users</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={points} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickFormatter={formatDateTick} />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const pt = points.find((p) => p.date === label);
              const items = allKeys
                .map((key) => ({
                  name: key,
                  value: (pt?.[key] as number) ?? 0,
                  color: colorMap.get(key) ?? "#71717a",
                }))
                .filter((item) => item.value > 0)
                .sort((a, b) => b.value - a.value);
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                  <div className="text-zinc-400 font-medium mb-1.5">
                    {formatDateLabel(String(label))} — Total: ${pt?.total.toFixed(0)}
                  </div>
                  {items.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 py-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-zinc-300">{item.name}</span>
                      <span className="ml-auto font-mono text-zinc-100">
                        ${item.value.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {allKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="spend"
              fill={key === "Others" ? OTHERS_COLOR : COLORS[i % COLORS.length]}
              radius={i === allKeys.length - 1 ? [2, 2, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
