"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { formatDateTick, formatDateLabel } from "@/lib/date-utils";

interface SpendTrendChartProps {
  data: Array<{ date: string; spend_cents: number }>;
  selectedDays?: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
} as const;

export function SpendTrendChart({ data, selectedDays }: SpendTrendChartProps) {
  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 text-center text-zinc-500 text-sm">
        No daily spend data available
      </div>
    );
  }

  const chartData = data.map((d, i) => {
    const spend = d.spend_cents / 100;
    const prevSpend = i > 0 ? (data[i - 1]?.spend_cents ?? 0) / 100 : spend;
    const change = spend - prevSpend;
    const changePct = prevSpend > 0 ? (change / prevSpend) * 100 : 0;
    return { date: d.date, spend, change, changePct };
  });

  const avg = chartData.reduce((s, d) => s + d.spend, 0) / chartData.length;

  const cutoffDate =
    selectedDays && selectedDays < data.length ? data[data.length - selectedDays]?.date : undefined;

  const dimEndDate =
    cutoffDate && data.length > 0
      ? data[Math.max(0, data.length - (selectedDays ?? 0) - 1)]?.date
      : undefined;

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-xs font-medium text-zinc-500">Daily Spend</h3>
        <span className="text-[10px] text-zinc-600">{data.length} days of data</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickFormatter={formatDateTick} />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color: "#fafafa" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0]?.payload as (typeof chartData)[0] | undefined;
              if (!pt) return null;
              const isInRange = !cutoffDate || pt.date >= cutoffDate;
              const changeColor = pt.change > 0 ? "#ef4444" : pt.change < 0 ? "#22c55e" : "#a1a1aa";
              const changeSign = pt.change > 0 ? "+" : "";
              return (
                <div style={TOOLTIP_STYLE} className="px-3 py-2 text-xs">
                  <div className="text-zinc-400 mb-1">
                    {formatDateLabel(String(label))}
                    {!isInRange && <span className="text-zinc-600 ml-1">(context)</span>}
                  </div>
                  <div className="font-mono font-bold text-sm">${pt.spend.toFixed(0)}</div>
                  {pt.change !== 0 && (
                    <div style={{ color: changeColor }} className="font-mono text-[11px]">
                      {changeSign}${pt.change.toFixed(0)} ({changeSign}
                      {pt.changePct.toFixed(0)}% vs prev day)
                    </div>
                  )}
                  {Math.abs(pt.changePct) > 100 && (
                    <div className="text-amber-400 text-[10px] mt-1">
                      ⚠ Spike detected — check Daily Spend by User chart below
                    </div>
                  )}
                </div>
              );
            }}
          />
          {dimEndDate && cutoffDate && (
            <ReferenceArea
              x1={chartData[0]?.date}
              x2={dimEndDate}
              fill="#18181b"
              fillOpacity={0.6}
              strokeOpacity={0}
            />
          )}
          <ReferenceLine
            y={avg}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `avg $${avg.toFixed(0)}`,
              position: "right",
              fill: "#f59e0b",
              fontSize: 10,
            }}
          />
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="spend"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#spendGrad)"
            activeDot={{ r: 5, fill: "#3b82f6", stroke: "#1e3a5f" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
