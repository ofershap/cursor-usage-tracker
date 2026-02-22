"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
interface CommandsEntry {
  command_name: string;
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

type VersionUsers = Record<string, Array<{ email: string; name: string }>>;

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

interface PlanExhaustionData {
  summary: {
    users_exhausted: number;
    total_active: number;
    avg_days: number;
    median_days: number;
    pct_exhausted: number;
  };
  users: Array<{
    email: string;
    name: string;
    days_to_exhaust: number;
    usage_based_reqs: number;
  }>;
}

interface InsightsData {
  dau: DAUEntry[];
  modelSummary: ModelSummary[];
  modelTrend: ModelTrend[];
  agentEdits: AgentEdits[];
  tabs: TabsEntry[];
  mcp: MCPEntry[];
  commands: CommandsEntry[];
  fileExtensions: FileExtEntry[];
  clientVersions: VersionEntry[];
  versionUsers: VersionUsers;
  modelEfficiency: ModelEfficiencyEntry[];
  planExhaustion: PlanExhaustionData;
}

import { formatDateTick, formatDateLabel } from "@/lib/date-utils";

interface GroupInfo {
  id: string;
  name: string;
  member_count: number;
  emails: string[];
}

const TIME_RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

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

export function InsightsClient({
  initialData,
  groups,
}: {
  initialData: InsightsData;
  groups: GroupInfo[];
}) {
  const [data, setData] = useState<InsightsData>(initialData);
  const [days, setDays] = useState(30);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [loading, setLoading] = useState(false);

  const parentGroups = useMemo(() => {
    const map = new Map<string, { count: number; children: GroupInfo[] }>();
    for (const g of groups) {
      if (g.name === "Unassigned") continue;
      const parts = g.name.split(" > ");
      const parent = parts[0] ?? g.name;
      const existing = map.get(parent) ?? { count: 0, children: [] };
      existing.count += g.member_count;
      existing.children.push(g);
      map.set(parent, existing);
    }
    return map;
  }, [groups]);

  const isFiltered = selectedGroup !== "all";

  const fetchData = useCallback(async (newDays: number, group: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(newDays) });
      if (group !== "all") params.set("group", group);
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const isDefault = days === 30 && selectedGroup === "all";

  useEffect(() => {
    if (isDefault) {
      setData(initialData);
      return;
    }
    fetchData(days, selectedGroup);
  }, [days, selectedGroup, fetchData, isDefault, initialData]);
  const dauSummary = useMemo(() => {
    if (!data.dau.length) return { avgDau: 0, peakDau: 0 };
    const avg = Math.round(data.dau.reduce((s, d) => s + d.dau, 0) / data.dau.length);
    const peak = Math.max(...data.dau.map((d) => d.dau));
    return { avgDau: avg, peakDau: peak };
  }, [data.dau]);

  const modelShareData = useMemo(() => {
    const top5 = data.modelSummary.slice(0, 5).map((m) => m.model);
    const byDate = new Map<string, Record<string, number>>();
    for (const entry of data.modelTrend) {
      const model = top5.includes(entry.model) ? entry.model : "other";
      if (!byDate.has(entry.date)) byDate.set(entry.date, { _total: 0 });
      const row = byDate.get(entry.date) as Record<string, number>;
      row[model] = (row[model] ?? 0) + entry.messages;
      row._total = (row._total ?? 0) + entry.messages;
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

  const mergedCommands = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data.commands) {
      const name = c.command_name.replace(/\.md$/, "");
      map.set(name, (map.get(name) ?? 0) + c.total_usage);
    }
    return [...map.entries()]
      .map(([command_name, total_usage]) => ({ command_name, total_usage }))
      .sort((a, b) => b.total_usage - a.total_usage);
  }, [data.commands]);

  const totalCommands = mergedCommands.reduce((s, d) => s + d.total_usage, 0);

  const selectedGroupName = useMemo(() => {
    if (selectedGroup === "all") return "All Teams";
    if (selectedGroup.startsWith("parent:")) return selectedGroup.replace("parent:", "");
    const g = groups.find((g) => g.id === selectedGroup);
    return g?.name ?? selectedGroup;
  }, [selectedGroup, groups]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-sm font-semibold text-zinc-200">Team Insights</h1>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          )}
          {groups.length > 1 && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 max-w-[200px] truncate"
            >
              <option value="all">All Teams</option>
              {[...parentGroups.entries()].map(([parent, info]) => {
                const hasChildren = info.children.length > 1;
                return hasChildren ? (
                  <optgroup key={parent} label={`${parent} (${info.count})`}>
                    <option value={`parent:${parent}`}>
                      All {parent} ({info.count})
                    </option>
                    {info.children.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name.split(" > ")[1] ?? g.name} ({g.member_count})
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={info.children[0]?.id} value={info.children[0]?.id}>
                    {info.children[0]?.name} ({info.children[0]?.member_count})
                  </option>
                );
              })}
              {(() => {
                const unassigned = groups.find((g) => g.name === "Unassigned");
                return unassigned ? (
                  <option value={unassigned.id}>Unassigned ({unassigned.member_count})</option>
                ) : null;
              })()}
            </select>
          )}
          <div className="flex bg-zinc-800 rounded-md p-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  days === r.days
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="flex items-stretch gap-2 overflow-x-auto">
        <MiniKpi
          label="Avg DAU"
          value={dauSummary.avgDau.toString()}
          sub={`Peak: ${dauSummary.peakDau}`}
        />
        <MiniKpi label="Commands" value={fmt(totalCommands)} sub={`${days}d total`} />
        <MiniKpi label="Agent Lines" value={fmt(totalAgentLines)} sub="accepted" />
        <MiniKpi label="Tab Lines" value={fmt(totalTabLines)} sub="accepted" />
        <MiniKpi label="MCP Tools" value={data.mcp.length.toString()} sub="unique tools" />
      </div>

      {/* Plan Exhaustion (compact) */}
      {data.planExhaustion.summary.users_exhausted > 0 && (
        <PlanExhaustionSection data={data.planExhaustion} />
      )}

      {/* Model Cost vs Value */}
      {data.modelEfficiency.length > 0 && (
        <ModelEfficiencySection
          data={data.modelEfficiency}
          days={days}
          groupName={isFiltered ? selectedGroupName : undefined}
        />
      )}

      {/* Adoption Row: Commands + MCP Tools (filtered) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title={
            isFiltered ? `Commands Adoption · ${selectedGroupName}` : "Commands Adoption (Top 20)"
          }
        >
          <div className="overflow-y-auto max-h-[200px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-1 font-medium">Command</th>
                  <th className="text-right py-1 font-medium">Total Usage</th>
                </tr>
              </thead>
              <tbody>
                {mergedCommands.slice(0, 20).map((row, i) => (
                  <tr
                    key={`${row.command_name}-${i}`}
                    className="border-b border-zinc-800/30 hover:bg-zinc-800/30"
                  >
                    <td className="py-1 text-zinc-300 font-mono">{row.command_name}</td>
                    <td className="text-right py-1">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                (row.total_usage / (mergedCommands[0]?.total_usage || 1)) * 100,
                                100,
                              )}%`,
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

        <ChartCard
          title={
            isFiltered ? `MCP Tool Adoption · ${selectedGroupName}` : "MCP Tool Adoption (Top 20)"
          }
        >
          <div className="overflow-y-auto max-h-[200px]">
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

      {/* Divider: team-wide section */}
      {isFiltered && (
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[10px] text-zinc-500 shrink-0">
            Team-wide analytics (not filtered by group)
          </span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
      )}

      {/* Charts Row: DAU + Model Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Daily Active Users - by Usage Type">
          <ResponsiveContainer width="100%" height={180}>
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
          <ResponsiveContainer width="100%" height={180}>
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

      {/* Tables Row: Model Breakdown + File Extensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title={`Model Usage Breakdown (${days}d)`}>
          <div className="overflow-y-auto max-h-[200px]">
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
      </div>

      {/* Client Versions - compact */}
      <ClientVersionsSection
        clientVersions={data.clientVersions}
        versionUsers={data.versionUsers}
      />
    </div>
  );
}

function ClientVersionsSection({
  versionUsers,
}: {
  clientVersions: VersionEntry[];
  versionUsers: VersionUsers;
}) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const versions = useMemo(() => {
    const totalUsers = Object.values(versionUsers).reduce((sum, u) => sum + u.length, 0);
    return Object.entries(versionUsers)
      .map(([version, users]) => ({
        version,
        user_count: users.length,
        percentage: totalUsers > 0 ? (users.length / totalUsers) * 100 : 0,
        users,
      }))
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  }, [versionUsers]);

  const latestVersion = versions[0]?.version;

  return (
    <ChartCard title="Client Versions">
      <div className="flex gap-4">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={versions.slice(0, 6)}
              dataKey="user_count"
              nameKey="version"
              cx="50%"
              cy="50%"
              outerRadius={55}
              innerRadius={25}
              paddingAngle={2}
            >
              {versions.slice(0, 6).map((_, i) => (
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
                ((v: number, _: string, entry: { payload: (typeof versions)[number] }) => [
                  `${v ?? 0} users (${entry.payload.percentage.toFixed(0)}%)`,
                  entry.payload.version,
                ]) as never
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          <table className="w-full text-xs">
            <tbody>
              {versions.map((v, i) => {
                const isExpanded = expandedVersion === v.version;
                const isLatest = v.version === latestVersion;
                return (
                  <React.Fragment key={v.version}>
                    <tr
                      className={`border-b border-zinc-800/30 cursor-pointer hover:bg-zinc-800/40 transition-colors ${isExpanded ? "bg-zinc-800/30" : ""}`}
                      onClick={() => setExpandedVersion(isExpanded ? null : v.version)}
                    >
                      <td className="py-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="font-mono text-zinc-300">{v.version}</span>
                        {isLatest && (
                          <span className="ml-1.5 text-[10px] text-emerald-400 font-medium">
                            latest
                          </span>
                        )}
                      </td>
                      <td className="text-right py-1 text-zinc-400">{v.user_count}</td>
                      <td className="text-right py-1 text-zinc-500">{v.percentage.toFixed(0)}%</td>
                      <td className="text-right py-1 pl-1 text-zinc-600 w-4">
                        {v.users.length > 0 && (isExpanded ? "▾" : "▸")}
                      </td>
                    </tr>
                    {isExpanded && v.users.length > 0 && (
                      <tr>
                        <td colSpan={4} className="pb-1">
                          <div className="pl-5 py-1 space-y-0.5">
                            {v.users.map((u) => (
                              <a
                                key={u.email}
                                href={`/users/${encodeURIComponent(u.email)}`}
                                className="block text-[11px] text-zinc-400 hover:text-blue-400 transition-colors"
                              >
                                {u.name}
                                {!isLatest && (
                                  <span className="ml-1 text-amber-500/60 text-[10px]">
                                    needs update
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ChartCard>
  );
}

function PlanExhaustionSection({ data }: { data: PlanExhaustionData }) {
  const [showUsers, setShowUsers] = useState(false);
  const { summary, users } = data;
  const cycleDay = new Date().getDate();

  const buckets = useMemo(() => {
    const b = [
      { label: "Day 1-3", min: 1, max: 3, count: 0, color: "#ef4444" },
      { label: "Day 4-7", min: 4, max: 7, count: 0, color: "#f59e0b" },
      { label: "Day 8-14", min: 8, max: 14, count: 0, color: "#3b82f6" },
      { label: "Day 15+", min: 15, max: 999, count: 0, color: "#10b981" },
    ];
    for (const u of users) {
      const bucket = b.find((bb) => u.days_to_exhaust >= bb.min && u.days_to_exhaust <= bb.max);
      if (bucket) bucket.count++;
    }
    return b.filter((bb) => bb.count > 0);
  }, [users]);

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-zinc-200">Plan Exhaustion</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Day {cycleDay} of billing cycle - how fast are users exceeding their included plan?
          </p>
        </div>
        <button
          onClick={() => setShowUsers((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showUsers ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {showUsers ? "Hide" : "Show"} users
        </button>
      </div>

      <div className="flex items-stretch gap-2 overflow-x-auto">
        <MiniKpi
          label="Exceeded"
          value={`${summary.users_exhausted}/${summary.total_active}`}
          sub={`${summary.pct_exhausted}% of active`}
          href="/?exhaustion=1-999"
        />
        <MiniKpi label="Avg Days" value={summary.avg_days.toFixed(1)} sub="to exceed" />
        <MiniKpi label="Median" value={summary.median_days.toString()} sub="days" />
        <div className="w-px bg-zinc-800 shrink-0 my-1" />
        {buckets.map((b) => (
          <a
            key={b.label}
            href={`/?exhaustion=${b.min}-${b.max}`}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 min-w-0 flex-1 hover:border-zinc-600 transition-colors cursor-pointer"
            title={`View users who exhausted plan on ${b.label}`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: b.color }}
              />
              <span className="text-[10px] text-zinc-400 truncate">{b.label}</span>
            </div>
            <div className="text-lg font-bold tracking-tight leading-tight text-zinc-100">
              {b.count}
            </div>
            <div className="text-[10px] text-zinc-400">users</div>
          </a>
        ))}
      </div>

      {showUsers && (
        <div className="overflow-y-auto max-h-[250px] border-t border-zinc-800 pt-2">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-1 font-medium">User</th>
                <th className="text-right py-1 font-medium">Day Exceeded</th>
                <th className="text-right py-1 font-medium">Extra Requests</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const dayColor =
                  u.days_to_exhaust <= 3
                    ? "text-red-400"
                    : u.days_to_exhaust <= 7
                      ? "text-orange-300"
                      : "text-zinc-300";
                return (
                  <tr key={u.email} className="border-b border-zinc-800/30 hover:bg-zinc-800/30">
                    <td className="py-1">
                      <a
                        href={`/users/${encodeURIComponent(u.email)}`}
                        className="text-zinc-300 hover:text-blue-400"
                      >
                        {u.name || u.email}
                      </a>
                    </td>
                    <td className={`text-right py-1 font-mono font-bold ${dayColor}`}>
                      Day {u.days_to_exhaust}
                    </td>
                    <td className="text-right py-1 font-mono text-zinc-400">
                      {u.usage_based_reqs.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModelEfficiencySection({
  data,
  days,
  groupName,
}: {
  data: ModelEfficiencyEntry[];
  days: number;
  groupName?: string;
}) {
  const [showDetail, setShowDetail] = useState(false);

  const minSpend = groupName ? 0 : 30;
  const qualified = data
    .filter((d) => d.total_spend_usd >= minSpend)
    .map((d) => ({
      model: shortModel(d.model),
      fullModel: d.model,
      cost_per_req: d.cost_per_req,
      users: d.users,
      total_spend_usd: d.total_spend_usd,
      total_reqs: d.total_reqs,
    }));

  const chartLabel = (model: string) =>
    model.replace(" thinking", " (T)").replace(" think-fast", " (TF)");

  const bySpend = [...qualified].sort((a, b) => b.total_spend_usd - a.total_spend_usd).slice(0, 5);
  const byCheapest = [...qualified]
    .filter((d) => d.cost_per_req > 0)
    .sort((a, b) => a.cost_per_req - b.cost_per_req)
    .slice(0, 5);
  const byExpensive = [...qualified]
    .filter((d) => d.cost_per_req > 0)
    .sort((a, b) => b.cost_per_req - a.cost_per_req)
    .slice(0, 5);
  const chartData = [...qualified].sort((a, b) => a.cost_per_req - b.cost_per_req);

  const maxSpend = bySpend[0]?.total_spend_usd ?? 1;

  const subtitle = groupName
    ? `${groupName} · Last ${days} days`
    : `Models with $30+ spend · Last ${days} days`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Model Rankings</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">{subtitle}</p>
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
          title="Most Cost Efficient"
          subtitle="Lowest cost per request"
          icon="🎯"
          items={byCheapest.map((d) => {
            const maxCpr = byCheapest[byCheapest.length - 1]?.cost_per_req ?? 1;
            return {
              label: d.model,
              fullName: d.fullModel,
              value: `$${d.cost_per_req}/req`,
              sub: `${d.users} users · $${d.total_spend_usd.toLocaleString()} total`,
              pct: 1 - d.cost_per_req / (maxCpr || 1),
              color:
                d.cost_per_req < 0.1 ? "#10b981" : d.cost_per_req < 0.3 ? "#3b82f6" : "#f59e0b",
            };
          })}
        />
        <RankingCard
          title="Most Expensive"
          subtitle="Highest cost per request"
          icon="💰"
          items={byExpensive.map((d) => {
            const maxCpr = byExpensive[0]?.cost_per_req ?? 1;
            return {
              label: d.model,
              fullName: d.fullModel,
              value: `$${d.cost_per_req}/req`,
              sub: `${d.users} users · $${d.total_spend_usd.toLocaleString()} total`,
              pct: d.cost_per_req / (maxCpr || 1),
              color:
                d.cost_per_req >= 1 ? "#ef4444" : d.cost_per_req >= 0.5 ? "#f59e0b" : "#71717a",
            };
          })}
        />
      </div>

      {showDetail && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-zinc-400 mb-2 font-medium">
                Cost per Request by Model
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
                          <div className="text-zinc-400">
                            <span className="font-mono font-bold text-zinc-200">
                              ${d.cost_per_req}
                            </span>{" "}
                            per request
                          </div>
                          <div className="text-zinc-500 mt-1">
                            {d.users} users · {d.total_reqs.toLocaleString()} reqs · $
                            {d.total_spend_usd.toLocaleString()} total
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="cost_per_req" name="$/req" radius={[0, 4, 4, 0]}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.cost_per_req >= 1
                            ? "#ef4444"
                            : d.cost_per_req >= 0.3
                              ? "#f59e0b"
                              : "#10b981"
                        }
                        fillOpacity={0.7}
                      />
                    ))}
                    <LabelList
                      dataKey="cost_per_req"
                      position="right"
                      formatter={(v) => `$${v ?? ""}`}
                      style={{ fontSize: 10, fill: "#a1a1aa", fontFamily: "monospace" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div className="text-[10px] text-zinc-400 mb-2 font-medium">Full Model Scorecard</div>
              <div className="overflow-y-auto max-h-[280px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      <th className="text-left py-1 font-medium">Model</th>
                      <th className="text-right py-1 font-medium">$/req</th>
                      <th className="text-right py-1 font-medium">Users</th>
                      <th className="text-right py-1 font-medium">Reqs</th>
                      <th className="text-right py-1 font-medium">Total $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => {
                      const costColor =
                        row.cost_per_req >= 1
                          ? "text-red-400"
                          : row.cost_per_req >= 0.3
                            ? "text-orange-300"
                            : "text-emerald-400";
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
                          <td className={`text-right py-0.5 font-mono font-bold ${costColor}`}>
                            ${row.cost_per_req}
                          </td>
                          <td className="text-right py-0.5 font-mono text-zinc-400">{row.users}</td>
                          <td className="text-right py-0.5 font-mono text-zinc-400">
                            {row.total_reqs.toLocaleString()}
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
          <div className="text-[10px] text-zinc-400">{subtitle}</div>
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
                <span className="text-[10px] text-zinc-400 shrink-0">{item.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: "team-wide";
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-medium text-zinc-400">{title}</h3>
        {badge === "team-wide" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
            team-wide
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function MiniKpi({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="text-[10px] text-zinc-400 truncate">{label}</div>
      <div className="text-lg font-bold tracking-tight leading-tight text-zinc-100">{value}</div>
      {sub && <div className="text-[10px] text-zinc-400 truncate">{sub}</div>}
    </>
  );
  const className = `bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 min-w-0 flex-1${href ? " hover:border-zinc-600 transition-colors cursor-pointer" : ""}`;
  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
}
