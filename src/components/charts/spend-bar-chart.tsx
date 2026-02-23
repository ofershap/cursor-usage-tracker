"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
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
  expanded?: boolean;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
} as const;

const TOOLTIP_LABEL_STYLE = { color: "#fafafa" } as const;
const TOOLTIP_ITEM_STYLE = { color: "#fafafa" } as const;

const BAR_COLOR = "#3b82f6";
const BAR_HOVER_COLOR = "#60a5fa";
const HIGHLIGHT_COLOR = "#f59e0b";
const HIGHLIGHT_HOVER_COLOR = "#fbbf24";

export function SpendBarChart({ data, highlightEmail, expanded }: SpendBarChartProps) {
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const limit = expanded ? 15 : 8;
  const chartData = data.slice(0, limit).map((d) => ({
    label: `#${d.spend_rank} ${d.name.split(" ")[0] ?? d.email.split("@")[0]}`,
    spend: d.spend_cents / 100,
    email: d.email,
    rank: d.spend_rank,
    name: d.name,
  }));

  const handleBarClick = useCallback(
    (entry: (typeof chartData)[number]) => {
      router.push(`/users/${encodeURIComponent(entry.email)}`);
    },
    [router],
  );

  const getFill = (entry: (typeof chartData)[number], index: number) => {
    const isHighlight = entry.email === highlightEmail;
    const isHovered = hoveredIndex === index;
    if (isHighlight) return isHovered ? HIGHLIGHT_HOVER_COLOR : HIGHLIGHT_COLOR;
    return isHovered ? BAR_HOVER_COLOR : BAR_COLOR;
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg border border-zinc-800 p-4 ${expanded ? "h-full flex flex-col" : ""}`}
    >
      <h3 className="text-xs font-medium text-zinc-400 mb-2 shrink-0">
        Top Spenders (Current Cycle)
      </h3>
      <div className={expanded ? "flex-1 min-h-0" : ""}>
        <ResponsiveContainer width="100%" height={expanded ? "100%" : chartData.length * 28 + 36}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 10, right: 50 }}
            style={{ cursor: "pointer" }}
          >
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
              cursor={{ fill: "rgba(255,255,255,0.08)" }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spend"]}
              labelFormatter={(_label, payload) => {
                const item = payload?.[0]?.payload;
                return item ? `#${item.rank} ${item.name} (${item.email})` : String(_label);
              }}
            />
            <Bar
              dataKey="spend"
              radius={[0, 4, 4, 0]}
              onClick={(_data, index) => {
                const entry = chartData[index];
                if (entry) handleBarClick(entry);
              }}
              onMouseEnter={(_data, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.email}
                  fill={getFill(entry, index)}
                  style={{ transition: "fill 0.15s ease, filter 0.15s ease" }}
                  filter={hoveredIndex === index ? "brightness(1.15)" : undefined}
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
    </div>
  );
}
