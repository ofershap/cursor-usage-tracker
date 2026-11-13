"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  DefaultZIndexes,
} from "recharts";
import { formatDateTick, formatDateLabel } from "@/lib/date-utils";
import { AXIS_STROKE, CYCLE_STROKE, CYCLE_STROKE_WIDTH, CycleLabels } from "./cycle-marker";

interface SpendDataPoint {
  date: string;
  spend_cents: number;
  agent_requests?: number;
  lines_added?: number;
  lines_deleted?: number;
}

interface SpendTrendChartProps {
  data: Array<SpendDataPoint>;
  selectedDays?: number;
  avgPerDay?: number;
  cycleStarts?: string[];
}

function fmtDollars(v: number): string {
  if (v === 0) return "$0";
  if (v < 1) return `$${v.toFixed(2)}`;
  return `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : Math.round(v)}`;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
} as const;

export function SpendTrendChart({
  data,
  selectedDays,
  avgPerDay,
  cycleStarts = [],
}: SpendTrendChartProps) {
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
    const costPerReq =
      d.agent_requests && d.agent_requests > 0 ? spend / d.agent_requests : undefined;
    return {
      idx: i,
      date: d.date,
      spend,
      change,
      changePct,
      costPerReq,
      requests: d.agent_requests,
      linesAdded: d.lines_added,
      linesDeleted: d.lines_deleted,
    };
  });

  const hasCostPerReq = chartData.some((d) => d.costPerReq != null);

  const provisionalDays = 2;
  const provisionalStart =
    chartData.length > provisionalDays
      ? chartData[chartData.length - provisionalDays]?.date
      : undefined;

  // a new cycle starts between two days: the line sits halfway between them
  const cycleLines = cycleStarts
    .map((start) => chartData.findIndex((d) => d.date >= start))
    .filter((i) => i > 0)
    .map((i) => i - 0.5);

  const step = chartData.length <= 14 ? 1 : Math.floor(chartData.length / 10) + 1;
  const tickIdx = chartData.map((d) => d.idx).filter((i) => i % step === 0);

  const cutoffDate =
    selectedDays && selectedDays < data.length ? data[data.length - selectedDays]?.date : undefined;

  const avg = avgPerDay ?? chartData.reduce((s, d) => s + d.spend, 0) / (chartData.length || 1);

  const dimEndIdx =
    cutoffDate && data.length > 0 ? Math.max(0, data.length - (selectedDays ?? 0) - 1) : undefined;

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-xs font-medium text-zinc-400">Daily Spend</h3>
        <span className="text-[10px] text-zinc-600">{data.length} days of data</span>
        <span className="text-[10px] text-blue-400/70 flex items-center gap-1">
          <span className="inline-block w-3 border-t border-blue-400" />
          spend
        </span>
        {hasCostPerReq && (
          <span className="text-[10px] text-purple-400/70 flex items-center gap-1">
            <span className="inline-block w-3 border-t border-dashed border-purple-400" />
            $/req
          </span>
        )}
        {provisionalStart && (
          <span className="text-[10px] text-amber-500/70 ml-auto">
            Last {provisionalDays}d may be partial · daily shape from events, totals match billing
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart
          data={chartData}
          margin={{ top: cycleLines.length ? 20 : 5, left: 0, right: hasCostPerReq ? 5 : 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="idx"
            type="number"
            domain={[0, Math.max(1, chartData.length - 1)]}
            ticks={tickIdx}
            stroke={AXIS_STROKE}
            fontSize={11}
            tickFormatter={(i: number) => formatDateTick(chartData[i]?.date ?? "")}
          />
          <YAxis yAxisId="spend" stroke={AXIS_STROKE} fontSize={11} tickFormatter={fmtDollars} />
          {hasCostPerReq && (
            <YAxis
              yAxisId="cpr"
              orientation="right"
              stroke="#a78bfa"
              fontSize={10}
              tickFormatter={(v: number) => `$${v < 1 ? v.toFixed(1) : Math.round(v)}`}
              width={40}
            />
          )}
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color: "#fafafa" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0]?.payload as (typeof chartData)[0] | undefined;
              if (!pt) return null;
              const isInRange = !cutoffDate || pt.date >= cutoffDate;
              const isProvisional = provisionalStart != null && pt.date >= provisionalStart;
              const changeColor = pt.change > 0 ? "#ef4444" : pt.change < 0 ? "#22c55e" : "#a1a1aa";
              const changeSign = pt.change > 0 ? "+" : "";
              return (
                <div style={TOOLTIP_STYLE} className="px-3 py-2 text-xs">
                  <div className="text-zinc-400 mb-1">
                    {formatDateLabel(pt.date)}
                    {!isInRange && <span className="text-zinc-600 ml-1">(context)</span>}
                    {isProvisional && <span className="text-amber-500 ml-1">(partial)</span>}
                  </div>
                  <div className="font-mono font-bold text-sm text-blue-400">
                    {fmtDollars(pt.spend)}
                  </div>
                  {pt.change !== 0 && (
                    <div style={{ color: changeColor }} className="font-mono text-[11px]">
                      {changeSign}
                      {pt.changePct.toFixed(0)}% vs prev day
                    </div>
                  )}
                  <div className="font-mono text-[11px] text-amber-500/80">
                    avg ${Math.round(avg).toLocaleString()}{" "}
                    <span style={{ color: pt.spend > avg ? "#ef4444" : "#22c55e" }}>
                      ({pt.spend > avg ? "+" : ""}
                      {(((pt.spend - avg) / avg) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  {(pt.requests != null || pt.linesAdded != null || pt.costPerReq != null) && (
                    <div className="mt-1.5 pt-1.5 border-t border-zinc-700/50 flex flex-col gap-0.5 text-[11px] text-zinc-400">
                      {pt.costPerReq != null && (
                        <div>
                          <span className="text-zinc-500">$/Req:</span>{" "}
                          <span className="font-mono text-purple-400">
                            ${pt.costPerReq.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {pt.requests != null && (
                        <div>
                          <span className="text-zinc-500">Requests:</span>{" "}
                          <span className="font-mono text-zinc-300">
                            {pt.requests.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {pt.linesAdded != null && (
                        <div>
                          <span className="text-zinc-500">Lines:</span>{" "}
                          <span className="font-mono text-emerald-400">
                            +{pt.linesAdded.toLocaleString()}
                          </span>
                          {pt.linesDeleted != null && pt.linesDeleted > 0 && (
                            <span className="font-mono text-red-400">
                              {" "}
                              -{pt.linesDeleted.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {Math.abs(pt.changePct) > 100 && (
                    <div className="text-amber-400 text-[10px] mt-1">⚠ Spike detected</div>
                  )}
                </div>
              );
            }}
          />
          {dimEndIdx != null && (
            <ReferenceArea
              yAxisId="spend"
              x1={0}
              x2={dimEndIdx}
              fill="#18181b"
              fillOpacity={0.6}
              strokeOpacity={0}
            />
          )}
          {cycleLines.map((x, k) => (
            <ReferenceLine
              key={k}
              yAxisId="spend"
              x={x}
              stroke={CYCLE_STROKE}
              strokeWidth={CYCLE_STROKE_WIDTH}
              zIndex={DefaultZIndexes.grid - 1}
              label={<CycleLabels />}
            />
          ))}
          <ReferenceLine
            yAxisId="spend"
            y={avg}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `avg $${Math.round(avg).toLocaleString()}`,
              position: "insideTopRight",
              fill: "#f59e0b",
              fontSize: 10,
              offset: 4,
            }}
          />
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            yAxisId="spend"
            type="monotone"
            dataKey="spend"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#spendGrad)"
            activeDot={{ r: 5, fill: "#3b82f6", stroke: "#1e3a5f" }}
          />
          {hasCostPerReq && (
            <Line
              yAxisId="cpr"
              type="monotone"
              dataKey="costPerReq"
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 4, fill: "#a78bfa", stroke: "#4c1d95" }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
