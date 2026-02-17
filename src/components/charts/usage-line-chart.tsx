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
import { formatDateTick } from "@/lib/date-utils";

interface UsageLineChartProps {
  data: Array<{
    date: string;
    total_agent_requests: number;
    total_lines_added: number;
    active_users: number;
  }>;
}

function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
} as const;

const TOOLTIP_LABEL_STYLE = { color: "#a1a1aa" } as const;
const TOOLTIP_ITEM_STYLE = { color: "#fafafa" } as const;

export function UsageLineChart({ data }: UsageLineChartProps) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-xs font-medium text-zinc-500 mb-2">Daily Team Activity</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickFormatter={formatDateTick} />
          <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} tickFormatter={formatCompact} />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#8b5cf6"
            fontSize={12}
            tickFormatter={formatCompact}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={
              ((value: number, name: string) => [formatCompact(value ?? 0), name ?? ""]) as never
            }
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="total_agent_requests"
            stroke="#3b82f6"
            name="Agent Requests"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="total_lines_added"
            stroke="#8b5cf6"
            name="Lines Added"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
