"use client";

import Link from "next/link";
import { TokensLineChart } from "@/components/charts/tokens-line-chart";
import { ModelPieChart } from "@/components/charts/model-pie-chart";
import { SpendTrendChart } from "@/components/charts/spend-trend-chart";
import { ActivityRadarChart } from "@/components/charts/activity-radar-chart";
import { formatDateShort } from "@/lib/date-utils";
import { shortModel } from "@/lib/format-utils";
import type { Anomaly } from "@/lib/types";

interface UserStats {
  member:
    | { name: string; email: string; role: string; first_seen: string; last_seen: string }
    | undefined;
  spending: Array<{
    cycle_start: string;
    spend_cents: number;
    included_spend_cents: number;
    fast_premium_requests: number;
  }>;
  dailyActivity: Array<{
    date: string;
    agent_requests: number;
    lines_added: number;
    lines_deleted: number;
    total_accepts: number;
    total_rejects: number;
    tabs_accepted: number;
    usage_based_reqs: number;
    most_used_model: string;
    client_version: string;
  }>;
  modelBreakdown: Array<{ model: string; days_used: number; total_requests: number }>;
  anomalies: Anomaly[];
  dailySpend: Array<{ date: string; spend_cents: number }>;
  activityProfile: { user: Record<string, number>; teamAvg: Record<string, number> };
}

interface UserDetailClientProps {
  email: string;
  stats: UserStats;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function UserDetailClient({ email, stats }: UserDetailClientProps) {
  const currentSpend = stats.spending[0];
  const activityDays = stats.dailyActivity.length;
  const totalAgentRequests = stats.dailyActivity.reduce((sum, d) => sum + d.agent_requests, 0);
  const totalLinesAdded = stats.dailyActivity.reduce((sum, d) => sum + d.lines_added, 0);
  const openAnomalies = stats.anomalies.filter((a) => !a.resolvedAt);

  const chartData = stats.dailyActivity.map((d) => ({
    date: d.date,
    tokens: d.agent_requests,
    requests: d.usage_based_reqs,
  }));

  const modelData = stats.modelBreakdown.map((m) => ({
    model: m.model,
    count: m.days_used,
    tokens: m.total_requests,
  }));

  const totalSpendDollars = currentSpend ? currentSpend.spend_cents / 100 : 0;
  const dailyAvgSpend =
    stats.dailySpend.length > 0
      ? stats.dailySpend.reduce((s, d) => s + d.spend_cents, 0) / stats.dailySpend.length / 100
      : 0;

  const mergedDailyData = buildMergedDailyData(stats.dailySpend, stats.dailyActivity);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>
        <div>
          <h1 className="text-lg font-bold">{stats.member?.name ?? email}</h1>
          <p className="text-zinc-500 text-xs">
            {email} · {stats.member?.role ?? "member"}
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="flex items-stretch gap-2 overflow-x-auto">
        <KpiCard
          label="Cycle Spend"
          value={`$${Math.round(totalSpendDollars).toLocaleString()}`}
          sub={`~$${dailyAvgSpend.toFixed(0)}/day`}
        />
        <KpiCard
          label="Premium Reqs"
          value={(currentSpend?.fast_premium_requests ?? 0).toLocaleString()}
          sub="Current cycle"
        />
        <KpiCard label={`Agent Reqs (${activityDays}d)`} value={fmt(totalAgentRequests)} />
        <KpiCard label={`Lines Added (${activityDays}d)`} value={fmt(totalLinesAdded)} />
        <KpiCard
          label="Anomalies"
          value={openAnomalies.length.toString()}
          alert={openAnomalies.length > 0}
          sub={openAnomalies.length > 0 ? "Open" : "None"}
        />
      </div>

      {/* Row 1: Spend Trend + Activity Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SpendTrendChart data={stats.dailySpend} />
        <ActivityRadarChart
          user={stats.activityProfile.user}
          teamAvg={stats.activityProfile.teamAvg}
        />
      </div>

      {/* Row 2: Daily Requests + Model Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TokensLineChart data={chartData} />
        <ModelPieChart data={modelData} />
      </div>

      {/* Daily Activity Table - merged with spend data */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800">
          <h3 className="text-xs font-medium text-zinc-500">Daily Activity & Spend</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-right px-4 py-2 font-medium">Spend</th>
                <th className="text-right px-4 py-2 font-medium">Agent</th>
                <th className="text-right px-4 py-2 font-medium">Lines +/-</th>
                <th className="text-right px-4 py-2 font-medium">Accepts</th>
                <th className="text-right px-4 py-2 font-medium">Tabs</th>
                <th className="text-right px-4 py-2 font-medium">Model</th>
                <th className="text-right px-4 py-2 font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {mergedDailyData.map((d) => (
                <tr
                  key={d.date}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${d.isSpike ? "bg-red-500/5" : ""}`}
                >
                  <td className="px-4 py-1.5 text-zinc-400 whitespace-nowrap">
                    {formatDateShort(d.date)}
                  </td>
                  <td className="text-right px-4 py-1.5 font-mono">
                    {d.spend > 0 ? (
                      <span className={d.isSpike ? "text-red-400 font-bold" : "text-zinc-300"}>
                        ${d.spend.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-1.5 font-mono">
                    {d.agent_requests > 0 ? (
                      d.agent_requests
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-1.5 font-mono">
                    {d.lines_added > 0 || d.lines_deleted > 0 ? (
                      <>
                        <span className="text-green-400">+{d.lines_added}</span>
                        {" / "}
                        <span className="text-red-400">-{d.lines_deleted}</span>
                      </>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-1.5 font-mono">
                    {d.total_accepts > 0 ? (
                      d.total_accepts
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-1.5 font-mono">
                    {d.tabs_accepted > 0 ? (
                      d.tabs_accepted
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td
                    className="text-right px-4 py-1.5 text-zinc-500 cursor-default"
                    title={d.most_used_model}
                  >
                    {shortModel(d.most_used_model)}
                  </td>
                  <td className="text-right px-4 py-1.5 text-zinc-600">{d.client_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomaly History */}
      {stats.anomalies.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-500">Anomaly History</h3>
          </div>
          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left px-4 py-2 font-medium">Detected</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Severity</th>
                  <th className="text-left px-4 py-2 font-medium">Message</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.anomalies.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-800/50">
                    <td className="px-4 py-1.5 text-zinc-400 whitespace-nowrap">
                      {new Date(a.detectedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-1.5">
                      <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${a.severity === "critical" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 max-w-md truncate">{a.message}</td>
                    <td className="px-4 py-1.5">
                      {a.resolvedAt ? (
                        <span className="text-green-400 text-[10px]">Resolved</span>
                      ) : (
                        <span className="text-red-400 text-[10px]">Open</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface MergedDay {
  date: string;
  spend: number;
  isSpike: boolean;
  hasActivity: boolean;
  agent_requests: number;
  lines_added: number;
  lines_deleted: number;
  total_accepts: number;
  tabs_accepted: number;
  most_used_model: string;
  client_version: string;
}

function buildMergedDailyData(
  dailySpend: Array<{ date: string; spend_cents: number }>,
  dailyActivity: UserStats["dailyActivity"],
): MergedDay[] {
  const activityMap = new Map(dailyActivity.map((d) => [d.date, d]));
  const allDates = new Set([...dailySpend.map((d) => d.date), ...dailyActivity.map((d) => d.date)]);

  const avgSpend =
    dailySpend.length > 0
      ? dailySpend.reduce((s, d) => s + d.spend_cents, 0) / dailySpend.length / 100
      : 0;

  return [...allDates].sort().map((date) => {
    const spend = (dailySpend.find((d) => d.date === date)?.spend_cents ?? 0) / 100;
    const activity = activityMap.get(date);
    return {
      date,
      spend,
      isSpike: spend > avgSpend * 2.5 && spend > 20,
      hasActivity: !!activity,
      agent_requests: activity?.agent_requests ?? 0,
      lines_added: activity?.lines_added ?? 0,
      lines_deleted: activity?.lines_deleted ?? 0,
      total_accepts: activity?.total_accepts ?? 0,
      tabs_accepted: activity?.tabs_accepted ?? 0,
      most_used_model: activity?.most_used_model ?? "",
      client_version: activity?.client_version ?? "",
    };
  });
}

function KpiCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-zinc-900 border rounded-md px-3 py-2 min-w-0 flex-1 ${alert ? "border-red-500/50" : "border-zinc-800"}`}
    >
      <div className="text-[10px] text-zinc-500 truncate">{label}</div>
      <div className="text-lg font-bold tracking-tight leading-tight">{value}</div>
      {sub && (
        <div className={`text-[10px] truncate ${alert ? "text-red-400" : "text-zinc-500"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
