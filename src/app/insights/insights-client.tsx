"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import { shortModel } from "@/lib/format-utils";

interface DAUEntry {
  date: string;
  dau: number;
  cli_dau: number;
  cloud_agent_dau: number;
  bugbot_dau: number;
}
interface ModelSummary {
  model: string;
  total_messages: number;
  total_users: number;
  avg_daily_messages: number;
}
interface ModelTrend {
  date: string;
  model: string;
  messages: number;
  users: number;
}
interface AgentEdits {
  date: string;
  accepted_diffs: number;
  rejected_diffs: number;
  lines_accepted: number;
  lines_suggested: number;
}
interface TabsEntry {
  date: string;
  suggestions: number;
  accepts: number;
  lines_accepted: number;
}
interface MCPEntry {
  server_name: string;
  tool_name: string;
  total_usage: number;
}
interface FileExtEntry {
  extension: string;
  total_files: number;
  total_lines_accepted: number;
}
interface VersionEntry {
  version: string;
  user_count: number;
  percentage: number;
}

interface ModelEfficiencyEntry {
  model: string;
  users: number;
  total_spend_usd: number;
  total_reqs: number;
  total_generated: number;
  total_accepted: number;
  total_wasted: number;
  precision_pct: number;
  useful_lines_per_req: number;
  wasted_lines_per_req: number;
  rejection_rate: number;
  cost_per_req: number;
  cost_per_useful_line: number;
}

interface InsightsData {
  dau: DAUEntry[];
  modelSummary: ModelSummary[];
  modelTrend: ModelTrend[];
  agentEdits: AgentEdits[];
  tabs: TabsEntry[];
  mcp: MCPEntry[];
  fileExtensions: FileExtEntry[];
  clientVersions: VersionEntry[];
  modelEfficiency: ModelEfficiencyEntry[];
}

import { formatDateTick, formatDateLabel } from "@/lib/date-utils";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

const shortDate = formatDateTick;
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function InsightsClient({ data }: { data: InsightsData }) {
  const dauSummary = useMemo(() => {
    if (!data.dau.length) return { avgDau: 0, peakDau: 0, weekdayAvg: 0, weekendAvg: 0 };
    const avg = Math.round(data.dau.reduce((s, d) => s + d.dau, 0) / data.dau.length);
    const peak = Math.max(...data.dau.map((d) => d.dau));
    const weekdays = data.dau.filter((d) => {
      const day = new Date(d.date).getDay();
      return day > 0 && day < 6;
    });
    const weekends = data.dau.filter((d) => {
      const day = new Date(d.date).getDay();
      return day === 0 || day === 6;
    });
    return {
      avgDau: avg,
      peakDau: peak,
      weekdayAvg: weekdays.length
        ? Math.round(weekdays.reduce((s, d) => s + d.dau, 0) / weekdays.length)
        : 0,
      weekendAvg: weekends.length
        ? Math.round(weekends.reduce((s, d) => s + d.dau, 0) / weekends.length)
        : 0,
    };
  }, [data.dau]);

  const modelShareData = useMemo(() => {
    const top5 = data.modelSummary.slice(0, 5).map((m) => m.model);
    const byDate = new Map<string, Record<string, number>>();
    for (const entry of data.modelTrend) {
      const model = top5.includes(entry.model) ? entry.model : "other";
      if (!byDate.has(entry.date)) byDate.set(entry.date, { _total: 0 });
      const row = byDate.get(entry.date) as Record<string, number>;
      row[model] = (row[model] ?? 0) + entry.messages;
      row._total += entry.messages;
    }
    const result: Array<Record<string, string | number>> = [];
    for (const [date, row] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const total = row._total || 1;
      const point: Record<string, string | number> = { date };
      for (const model of top5) {
        point[model] = Math.round(((row[model] ?? 0) / total) * 100);
      }
      result.push(point);
    }
    return result;
  }, [data.modelSummary, data.modelTrend]);

  const top5Models = data.modelSummary.slice(0, 5).map((m) => m.model);

  const totalAgentLines = data.agentEdits.reduce((s, d) => s + d.lines_accepted, 0);
  const totalTabLines = data.tabs.reduce((s, d) => s + d.lines_accepted, 0);
  const totalMessages = data.modelSummary.reduce((s, d) => s + d.total_messages, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-zinc-200">Team Insights</h1>
        <span className="text-[10px] text-zinc-500">Last 30 days · Analytics API</span>
      </div>

      {/* KPI Strip */}
      <div className="flex items-stretch gap-2 overflow-x-auto">
        <MiniKpi
          label="Avg DAU"
          value={dauSummary.avgDau.toString()}
          sub={`Peak: ${dauSummary.peakDau}`}
        />
        <MiniKpi label="AI Messages" value={fmt(totalMessages)} sub="30d total" />
        <MiniKpi label="Agent Lines" value={fmt(totalAgentLines)} sub="accepted" />
        <MiniKpi label="Tab Lines" value={fmt(totalTabLines)} sub="accepted" />
        <MiniKpi label="MCP Tools" value={data.mcp.length.toString()} sub="unique tools" />
      </div>

      {/* Model Cost vs Value */}
      {data.modelEfficiency.length > 0 && <ModelEfficiencySection data={data.modelEfficiency} />}

      {/* Row 1: DAU + Model Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Daily Active Users — by Usage Type">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.dau}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 10, fill: "#71717a" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={30} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "6px",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="dau"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
                name="DAU"
              />
              <Area
                type="monotone"
                dataKey="cloud_agent_dau"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.1}
                name="Cloud Agent"
              />
              <Area
                type="monotone"
                dataKey="cli_dau"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.1}
                name="CLI"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Model Adoption Share (%)">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={modelShareData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 10, fill: "#71717a" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#71717a" }}
                width={30}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const items = payload
                    .filter((p) => (p.value as number) > 0)
                    .sort((a, b) => (b.value as number) - (a.value as number));
                  return (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                      <div className="text-zinc-400 font-medium mb-1">
                        {formatDateLabel(String(label))}
                      </div>
                      {items.map((item) => (
                        <div
                          key={item.dataKey as string}
                          className="flex items-center gap-2 py-0.5"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-zinc-300">{item.dataKey as string}</span>
                          <span className="ml-auto font-mono text-zinc-100">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {top5Models.map((model, i) => (
                <Area
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stackId="1"
                  stroke={COLORS[i % COLORS.length] ?? "#71717a"}
                  fill={COLORS[i % COLORS.length] ?? "#71717a"}
                  fillOpacity={0.4}
                  name={shortModel(model)}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Agent Edits + Tab Completions removed — low signal, not actionable */}

      {/* Row 3: Model Breakdown Table + MCP Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Model Usage Breakdown (30d)">
          <div className="overflow-y-auto max-h-[220px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-1 font-medium">Model</th>
                  <th className="text-right py-1 font-medium">Messages</th>
                  <th className="text-right py-1 font-medium">Users</th>
                  <th className="text-right py-1 font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {data.modelSummary.map((row) => {
                  const pct = totalMessages > 0 ? (row.total_messages / totalMessages) * 100 : 0;
                  return (
                    <tr
                      key={row.model}
                      className="border-b border-zinc-800/30 hover:bg-zinc-800/30"
                    >
                      <td className="py-1 text-zinc-300 font-mono cursor-default" title={row.model}>
                        {shortModel(row.model)}
                      </td>
                      <td className="text-right py-1 font-mono">{fmt(row.total_messages)}</td>
                      <td className="text-right py-1 text-zinc-400">{row.total_users}</td>
                      <td className="text-right py-1">
                        <div className="flex items-center justify-end gap-1">
                          <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-zinc-500 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="MCP Tool Adoption (Top 20)">
          <div className="overflow-y-auto max-h-[220px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-1 font-medium">Server</th>
                  <th className="text-left py-1 font-medium">Tool</th>
                  <th className="text-right py-1 font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {data.mcp.map((row, i) => (
                  <tr
                    key={`${row.server_name}-${row.tool_name}`}
                    className="border-b border-zinc-800/30 hover:bg-zinc-800/30"
                  >
                    <td className="py-1 text-zinc-400 font-mono">{row.server_name}</td>
                    <td className="py-1 text-zinc-300 font-mono">{row.tool_name}</td>
                    <td className="text-right py-1">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((row.total_usage / (data.mcp[0]?.total_usage || 1)) * 100, 100)}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                        <span className="font-mono">{fmt(row.total_usage)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Row 4: File Extensions + Client Versions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Top File Extensions (by AI Lines Accepted)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.fileExtensions.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={fmt} />
              <YAxis
                type="category"
                dataKey="extension"
                tick={{ fontSize: 10, fill: "#71717a" }}
                width={35}
                tickFormatter={(v: string) => `.${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "6px",
                  fontSize: "11px",
                }}
                formatter={((v: number) => [fmt(v ?? 0), "Lines"]) as never}
              />
              <Bar dataKey="total_lines_accepted" name="Lines Accepted" radius={[0, 4, 4, 0]}>
                {data.fileExtensions.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Client Versions (Latest Day)">
          <div className="flex gap-3">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={data.clientVersions.slice(0, 6)}
                  dataKey="user_count"
                  nameKey="version"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={30}
                  paddingAngle={2}
                >
                  {data.clientVersions.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                  formatter={
                    ((v: number, _: string, entry: { payload: VersionEntry }) => [
                      `${v ?? 0} users (${entry.payload.percentage.toFixed(0)}%)`,
                      entry.payload.version,
                    ]) as never
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 overflow-y-auto max-h-[200px]">
              <table className="w-full text-xs">
                <tbody>
                  {data.clientVersions.map((v, i) => (
                    <tr key={v.version} className="border-b border-zinc-800/30">
                      <td className="py-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="font-mono text-zinc-300">{v.version}</span>
                      </td>
                      <td className="text-right py-1 text-zinc-400">{v.user_count}</td>
                      <td className="text-right py-1 text-zinc-500">{v.percentage.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ModelEfficiencySection({ data }: { data: ModelEfficiencyEntry[] }) {
  const [showDetail, setShowDetail] = useState(false);

  const qualified = data
    .filter((d) => d.total_spend_usd >= 30)
    .map((d) => ({
      model: shortModel(d.model),
      fullModel: d.model,
      useful: d.useful_lines_per_req,
      wasted: d.wasted_lines_per_req,
      precision_pct: d.precision_pct,
      rejection_rate: d.rejection_rate,
      cost_per_req: d.cost_per_req,
      cost_per_useful_line: d.cost_per_useful_line,
      users: d.users,
      total_spend_usd: d.total_spend_usd,
      total_reqs: d.total_reqs,
    }));

  const chartLabel = (model: string) =>
    model.replace(" thinking", " (T)").replace(" think-fast", " (TF)");

  const bySpend = [...qualified].sort((a, b) => b.total_spend_usd - a.total_spend_usd).slice(0, 5);
  const byValue = [...qualified].sort((a, b) => b.precision_pct - a.precision_pct).slice(0, 5);
  const byWaste = [...qualified].sort((a, b) => a.precision_pct - b.precision_pct).slice(0, 5);
  const chartData = [...qualified].sort((a, b) => b.precision_pct - a.precision_pct);

  const maxSpend = bySpend[0]?.total_spend_usd ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Model Rankings</h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">Models with $30+ spend · Last 30 days</p>
        </div>
        <button
          onClick={() => setShowDetail((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showDetail ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {showDetail ? "Hide" : "Show"} full scorecard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RankingCard
          title="Biggest Spenders"
          subtitle="Total spend"
          icon="💸"
          items={bySpend.map((d) => ({
            label: d.model,
            fullName: d.fullModel,
            value: `$${d.total_spend_usd.toLocaleString()}`,
            sub: `$${d.cost_per_req}/req · ${d.users} users`,
            pct: d.total_spend_usd / maxSpend,
            color:
              d.total_spend_usd > 1000
                ? "#ef4444"
                : d.total_spend_usd > 200
                  ? "#f59e0b"
                  : "#3b82f6",
          }))}
        />
        <RankingCard
          title="Best Precision"
          subtitle="% of AI output kept by devs"
          icon="🎯"
          items={byValue.map((d) => ({
            label: d.model,
            fullName: d.fullModel,
            value: `${d.precision_pct}%`,
            sub: `$${d.cost_per_req}/req · ${d.useful} lines kept/req`,
            pct: d.precision_pct / 100,
            color:
              d.precision_pct >= 40 ? "#10b981" : d.precision_pct >= 25 ? "#3b82f6" : "#f59e0b",
          }))}
        />
        <RankingCard
          title="Most Wasteful"
          subtitle="Lowest precision (most output thrown away)"
          icon="🗑️"
          items={byWaste.map((d) => ({
            label: d.model,
            fullName: d.fullModel,
            value: `${d.precision_pct}%`,
            sub: `${d.wasted} wasted lines/req · $${d.cost_per_req}/req`,
            pct: 1 - d.precision_pct / 100,
            color: d.precision_pct < 20 ? "#ef4444" : d.precision_pct < 30 ? "#f59e0b" : "#71717a",
          }))}
        />
      </div>

      {showDetail && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-zinc-500 mb-2 font-medium">
                Lines per Request — <span className="text-emerald-500">Kept</span> vs{" "}
                <span className="text-red-400">Thrown Away</span> · % = Precision
              </div>
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 30, 120)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis
                    type="category"
                    dataKey="model"
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    width={100}
                    tickFormatter={chartLabel}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as (typeof chartData)[0] | undefined;
                      if (!d) return null;
                      return (
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                          <div className="text-zinc-300 font-medium mb-1">{d.fullModel}</div>
                          <div className="text-zinc-400 pl-2">
                            <span className="text-emerald-400 font-mono">{d.useful}</span> lines
                            kept/req
                          </div>
                          <div className="text-zinc-400 pl-2">
                            <span className="text-red-400 font-mono">{d.wasted}</span> lines
                            wasted/req
                          </div>
                          <div className="border-t border-zinc-800 mt-1 pt-1 text-zinc-400">
                            Precision:{" "}
                            <span
                              className={`font-mono font-bold ${d.precision_pct >= 40 ? "text-emerald-400" : d.precision_pct >= 25 ? "text-blue-400" : "text-yellow-400"}`}
                            >
                              {d.precision_pct}%
                            </span>
                            {d.rejection_rate > 3 && (
                              <>
                                {" "}
                                · Reject:{" "}
                                <span className="text-red-400 font-mono">{d.rejection_rate}%</span>
                              </>
                            )}
                          </div>
                          <div className="text-zinc-500 mt-1">
                            ${d.cost_per_req}/req · {d.users} users · $
                            {d.total_spend_usd.toLocaleString()} total
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="useful"
                    stackId="a"
                    name="Kept"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="wasted"
                    stackId="a"
                    name="Thrown away"
                    fill="#ef4444"
                    fillOpacity={0.4}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="precision_pct"
                      position="right"
                      formatter={(v: number) => `${v}%`}
                      style={{ fontSize: 10, fill: "#a1a1aa", fontFamily: "monospace" }}
                    />
                  </Bar>
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div className="text-[10px] text-zinc-500 mb-2 font-medium">Full Model Scorecard</div>
              <div className="overflow-y-auto max-h-[280px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      <th className="text-left py-1 font-medium">Model</th>
                      <th className="text-right py-1 font-medium">$/req</th>
                      <th className="text-right py-1 font-medium">Kept/req</th>
                      <th className="text-right py-1 font-medium">Waste/req</th>
                      <th className="text-right py-1 font-medium">Precision</th>
                      <th className="text-right py-1 font-medium">Total $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => {
                      const precisionColor =
                        row.precision_pct >= 40
                          ? "text-emerald-400"
                          : row.precision_pct >= 25
                            ? "text-blue-400"
                            : "text-yellow-400";
                      const costColor =
                        row.cost_per_req >= 0.5
                          ? "text-red-400"
                          : row.cost_per_req >= 0.2
                            ? "text-orange-300"
                            : "text-zinc-300";
                      return (
                        <tr
                          key={row.model}
                          className="border-b border-zinc-800/20 hover:bg-zinc-800/30"
                        >
                          <td
                            className="py-0.5 font-mono text-zinc-300 cursor-default"
                            title={row.model}
                          >
                            {shortModel(row.model)}
                          </td>
                          <td className={`text-right py-0.5 font-mono ${costColor}`}>
                            ${row.cost_per_req}
                          </td>
                          <td className="text-right py-0.5 font-mono text-emerald-400">
                            {row.useful_lines_per_req}
                          </td>
                          <td className="text-right py-0.5 font-mono text-red-400/60">
                            {row.wasted_lines_per_req}
                          </td>
                          <td className={`text-right py-0.5 font-mono font-bold ${precisionColor}`}>
                            {row.precision_pct}%
                          </td>
                          <td className="text-right py-0.5 font-mono text-zinc-400">
                            ${row.total_spend_usd.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  icon,
  items,
}: {
  title: string;
  subtitle: string;
  icon: string;
  items: Array<{
    label: string;
    fullName?: string;
    value: string;
    sub: string;
    pct: number;
    color: string;
  }>;
}) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">{icon}</span>
        <div>
          <div className="text-xs font-semibold text-zinc-200">{title}</div>
          <div className="text-[10px] text-zinc-500">{subtitle}</div>
        </div>
      </div>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-500 w-4 text-right font-mono">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs text-zinc-300 font-mono truncate cursor-default"
                  title={item.fullName ?? item.label}
                >
                  {item.label}
                </span>
                <span
                  className="text-xs font-mono font-bold shrink-0"
                  style={{ color: item.color }}
                >
                  {item.value}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(item.pct * 100, 2)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 shrink-0">{item.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-xs font-medium text-zinc-500 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function MiniKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 min-w-0 flex-1">
      <div className="text-[10px] text-zinc-500 truncate">{label}</div>
      <div className="text-lg font-bold tracking-tight leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 truncate">{sub}</div>}
    </div>
  );
}
