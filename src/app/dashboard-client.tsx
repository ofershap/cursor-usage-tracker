"use client";

import { useState, useMemo, useCallback } from "react";
import type { FullDashboard } from "@/lib/db";
import { SpendBarChart } from "@/components/charts/spend-bar-chart";
import { DailySpendChart } from "@/components/charts/daily-spend-chart";
import { SpendTrendChart } from "@/components/charts/spend-trend-chart";
import { MembersTable } from "@/components/dashboard/members-table";
import Link from "next/link";
import { shortModel } from "@/lib/format-utils";

interface ModelCost {
  model: string;
  users: number;
  avg_spend: number;
  total_spend: number;
  total_reqs: number;
}

const TIME_RANGES = [
  { label: "24h", days: 1 },
  { label: "3d", days: 3 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

function formatTimeLabel(days: number): string {
  if (days === 1) return "24h";
  return `${days}d`;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export type SortColumn = "spend" | "activity" | "reqs" | "lines" | "cpr" | "name";

interface SpendBreakdownRow {
  date: string;
  email: string;
  name: string;
  spend_cents: number;
}

interface DashboardClientProps {
  initialData: FullDashboard;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumn>("spend");
  const [sortAsc, setSortAsc] = useState(false);

  const stats = data.stats;

  const handleSort = useCallback((col: SortColumn) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortAsc((a) => !a);
        return col;
      }
      setSortAsc(false);
      return col;
    });
  }, []);

  const filteredUsers = useMemo(() => {
    let users = stats.rankedUsers;
    if (search.trim()) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
      );
    }
    const sorted = [...users].sort((a, b) => {
      const flip = sortAsc ? -1 : 1;
      switch (sortCol) {
        case "spend":
          return (b.spend_cents - a.spend_cents) * flip;
        case "activity":
          return (a.activity_rank - b.activity_rank) * flip;
        case "reqs":
          return (b.agent_requests - a.agent_requests) * flip;
        case "lines":
          return (b.lines_added - a.lines_added) * flip;
        case "name":
          return a.name.localeCompare(b.name) * (sortAsc ? -1 : 1);
        case "cpr": {
          const cprA = a.agent_requests > 0 ? a.spend_cents / a.agent_requests : 0;
          const cprB = b.agent_requests > 0 ? b.spend_cents / b.agent_requests : 0;
          return (cprB - cprA) * flip;
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [stats.rankedUsers, search, sortCol, sortAsc]);

  const searchedUser = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return (
      stats.rankedUsers.find(
        (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
      ) ?? null
    );
  }, [stats.rankedUsers, search]);

  async function changeTimeRange(newDays: number) {
    setDays(newDays);
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?days=${newDays}`);
      const newData: FullDashboard = await res.json();
      setData(newData);
    } finally {
      setLoading(false);
    }
  }

  const timeLabel = formatTimeLabel(days);
  const totalLines = stats.dailyTeamActivity.reduce((s, d) => s + d.total_lines_added, 0);
  const effectiveDays = Math.min(days, stats.cycleDays);
  const cycleStartDate = new Date(stats.cycleStart);
  const cycleEndDate = stats.cycleEnd
    ? new Date(stats.cycleEnd)
    : new Date(
        cycleStartDate.getFullYear(),
        cycleStartDate.getMonth() + 1,
        cycleStartDate.getDate(),
      );
  const cycleLengthDays = Math.ceil(
    (cycleEndDate.getTime() - cycleStartDate.getTime()) / 86_400_000,
  );
  const daysLeft = Math.max(0, Math.ceil((cycleEndDate.getTime() - Date.now()) / 86_400_000));

  const dailySpendData = useMemo(() => {
    return buildDailySpendData(data.dailySpendBreakdown);
  }, [data.dailySpendBreakdown]);

  return (
    <div className="space-y-3">
      {/* ── Toolbar: Search + Time Range ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-56"
        />
        <div className="flex bg-zinc-800 rounded-md p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => changeTimeRange(r.days)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                days === r.days ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {loading && <span className="text-[11px] text-zinc-500 animate-pulse">Updating...</span>}
        <div className="ml-auto text-[11px] text-zinc-600">{stats.totalMembers} members</div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="flex items-stretch gap-2 overflow-x-auto">
        <Kpi
          label={`Team Spend (${timeLabel})`}
          value={`$${Math.round(stats.totalSpendCents / 100).toLocaleString()}`}
          sub={`~$${Math.round(stats.totalSpendCents / 100 / (effectiveDays || 1))}/day`}
        />
        <Kpi
          label="Billing Cycle"
          value={`Day ${stats.cycleDays} / ${cycleLengthDays}`}
          sub={
            daysLeft > 0
              ? `${daysLeft}d left · resets ${cycleEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : "Resets soon"
          }
        />
        <KpiLink
          label="Anomalies"
          value={stats.activeAnomalies.toString()}
          sub={stats.activeAnomalies > 0 ? "Needs attention" : "All clear"}
          alert={stats.activeAnomalies > 0}
          href="/anomalies"
        />
        <KpiSep />
        <Kpi
          label={`Active (${timeLabel})`}
          value={stats.activeMembers.toString()}
          sub={`${Math.round((stats.activeMembers / stats.totalMembers) * 100)}% of team`}
        />
        <Kpi
          label={`Requests (${timeLabel})`}
          value={fmt(stats.totalAgentRequests)}
          sub={`~${fmt(Math.round(stats.totalAgentRequests / (effectiveDays || 1)))}/day`}
        />
        <Kpi
          label={`Lines (${timeLabel})`}
          value={fmt(totalLines)}
          sub={`~${fmt(Math.round(totalLines / (effectiveDays || 1)))}/day`}
        />
      </div>

      {/* Search result banner */}
      {searchedUser && (
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-md px-3 py-1.5 flex items-center gap-2 flex-wrap text-xs">
          <span className="font-medium">{searchedUser.name}</span>
          <span className="text-zinc-500">{searchedUser.email}</span>
          <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">
            Spend #{searchedUser.spend_rank}
          </span>
          <span className="bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded font-mono">
            Activity #{searchedUser.activity_rank}
          </span>
          <span className="text-zinc-500">
            ${(searchedUser.spend_cents / 100).toFixed(0)} · {searchedUser.agent_requests} reqs (
            {timeLabel})
          </span>
        </div>
      )}

      {/* ── Row: Team Spend Trend + Model Cost Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SpendTrendChart data={data.teamDailySpend} selectedDays={days} />
        <ModelCostTable data={data.modelCosts} />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SpendBarChart data={filteredUsers.slice(0, 20)} highlightEmail={searchedUser?.email} />
        <DailySpendChart data={dailySpendData} />
      </div>

      {/* ── Table ── */}
      <MembersTable
        data={filteredUsers}
        sortCol={sortCol}
        sortAsc={sortAsc}
        onSort={handleSort}
        highlightEmail={searchedUser?.email}
        timeLabel={timeLabel}
      />
    </div>
  );
}

export interface DailySpendDataPoint {
  date: string;
  total: number;
  [key: string]: string | number;
}

function buildDailySpendData(breakdown: SpendBreakdownRow[]): {
  points: DailySpendDataPoint[];
  topNames: string[];
} {
  const spendByUser = new Map<string, number>();
  for (const row of breakdown) {
    spendByUser.set(row.name, (spendByUser.get(row.name) ?? 0) + row.spend_cents);
  }
  const topNames = [...spendByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name.split(" ")[0] ?? name);

  const byDate = new Map<string, DailySpendDataPoint>();
  for (const row of breakdown) {
    if (!byDate.has(row.date)) {
      const point: DailySpendDataPoint = { date: row.date, total: 0, Others: 0 };
      for (const n of topNames) point[n] = 0;
      byDate.set(row.date, point);
    }
    const point = byDate.get(row.date) as Record<string, number>;
    const firstName = row.name.split(" ")[0] ?? row.name;
    const dollars = row.spend_cents / 100;
    point.total += dollars;
    if (topNames.includes(firstName)) {
      point[firstName] = (point[firstName] as number) + dollars;
    } else {
      point.Others = (point.Others as number) + dollars;
    }
  }

  return {
    points: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    topNames,
  };
}

function ModelCostTable({ data }: { data: ModelCost[] }) {
  const total = data.reduce((s, d) => s + d.total_spend, 0);

  const shortName = shortModel;

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-xs font-medium text-zinc-500 mb-2">
        Spend by Model (Primary Model per User)
      </h3>
      <div className="overflow-y-auto max-h-[200px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left py-1 font-medium">Model</th>
              <th className="text-right py-1 font-medium">Users</th>
              <th className="text-right py-1 font-medium">Avg $/user</th>
              <th className="text-right py-1 font-medium">Total $</th>
              <th className="text-right py-1 font-medium">% of spend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const pct = total > 0 ? (row.total_spend / total) * 100 : 0;
              return (
                <tr key={row.model} className="border-b border-zinc-800/30 hover:bg-zinc-800/30">
                  <td className="py-1 text-zinc-300 font-mono cursor-default" title={row.model}>
                    {shortName(row.model)}
                  </td>
                  <td className="text-right py-1 text-zinc-400">{row.users}</td>
                  <td className="text-right py-1 font-mono text-zinc-400">${row.avg_spend}</td>
                  <td className="text-right py-1 font-mono">${row.total_spend.toLocaleString()}</td>
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
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 min-w-0 flex-1">
      <div className="text-[10px] text-zinc-500 truncate">{label}</div>
      <div className="text-lg font-bold tracking-tight leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 truncate">{sub}</div>}
    </div>
  );
}

function KpiLink({
  label,
  value,
  sub,
  alert,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`bg-zinc-900 border rounded-md px-3 py-2 min-w-0 flex-1 hover:bg-zinc-800/70 transition-colors cursor-pointer ${alert ? "border-red-500/50" : "border-zinc-800"}`}
    >
      <div className="text-[10px] text-zinc-500 truncate">{label}</div>
      <div className="text-lg font-bold tracking-tight leading-tight">{value}</div>
      {sub && (
        <div className={`text-[10px] truncate ${alert ? "text-red-400" : "text-zinc-500"}`}>
          {sub}
        </div>
      )}
    </Link>
  );
}

function KpiSep() {
  return <div className="w-px bg-zinc-800 self-stretch my-1" />;
}
