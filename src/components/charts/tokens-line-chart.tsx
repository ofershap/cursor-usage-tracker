"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatDateTick } from "@/lib/date-utils";

interface TokensLineChartProps {
  data: Array<{ date: string; tokens: number; requests: number }>;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
} as const;

const TOOLTIP_LABEL_STYLE = { color: "#a1a1aa" } as const;
const TOOLTIP_ITEM_STYLE = { color: "#fafafa" } as const;

export function TokensLineChart({ data }: TokensLineChartProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Daily Agent Requests</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickFormatter={formatDateTick} />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="tokens"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.1}
            strokeWidth={2}
            name="Agent Requests"
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.1}
            strokeWidth={2}
            name="Usage-Based Requests"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
