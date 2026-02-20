"use client";

import Link from "next/link";
import { SpendTrendChart } from "@/components/charts/spend-trend-chart";
import { formatDateShort } from "@/lib/date-utils";
import { shortModel } from "@/lib/format-utils";
import type { Anomaly } from "@/lib/types";
import type { UsageBadge, SpendBadge, ContextBadge, AdoptionBadge } from "@/lib/db";

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
  usageEventsSummary: Array<{
    model: string;
    requests: number;
    total_cost_cents: number;
    avg_cost_cents: number;
    plan_reqs: number;
    plan_cost_cents: number;
    overage_reqs: number;
    overage_cost_cents: number;
    error_reqs: number;
  }>;
  mcpSummary: Array<{ tool_name: string; server_name: string; total_usage: number }>;
  commandsSummary: Array<{ command_name: string; total_usage: number }>;
  ranks: { spendRank: number; activityRank: number; totalRanked: number } | null;
  group: { id: string; name: string } | null;
  contextMetrics: {
    avgCacheRead: number;
    avgCacheWrite: number;
    totalRequests: number;
    teamAvgCacheRead: number;
    teamMedianCacheRead: number;
    contextRank: number;
    totalRanked: number;
    contextBadge: ContextBadge | null;
  } | null;
  badges: {
    usage: UsageBadge | null;
    spend: SpendBadge | null;
    context: ContextBadge | null;
    adoption: AdoptionBadge | null;
  };
  aiAdoption: {
    score: number;
    adoptionTier: string;
    acceptRate: number;
    intensity: number;
    intensityNorm: number;
    consistency: number;
    agentRequests: number;
    totalAccepts: number;
    totalApplies: number;
    activeDays: number;
    periodDays: number;
    commitData: {
      totalCommits: number;
      totalLinesAdded: number;
      aiLinesAdded: number;
      composerLinesAdded: number;
      tabLinesAdded: number;
      nonAiLinesAdded: number;
      aiPercent: number;
    } | null;
  } | null;
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

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

const BADGE_STYLES: Record<string, { label: string; color: string; tooltip: string }> = {
  "power-user": {
    label: "Power User",
    color: "bg-purple-600/20 text-purple-400",
    tooltip: "High request volume per active day",
  },
  "deep-thinker": {
    label: "Deep Thinker",
    color: "bg-amber-600/20 text-amber-400",
    tooltip: "Uses max-context models",
  },
  "light-user": {
    label: "Low Usage",
    color: "bg-zinc-700/20 text-zinc-500",
    tooltip: "Fewer than 10 agent requests",
  },
  "cost-efficient": {
    label: "Cost Efficient",
    color: "bg-emerald-600/20 text-emerald-400",
    tooltip: "Top 20% requests, below-median $/req",
  },
  "premium-model": {
    label: "Premium Model",
    color: "bg-amber-600/20 text-amber-400",
    tooltip: "Expensive model tier (thinking/max)",
  },
  "over-budget": {
    label: "Over Budget",
    color: "bg-red-600/20 text-red-400",
    tooltip: "Spend 5x+ above team median",
  },
  "long-sessions": {
    label: "Long Sessions",
    color: "bg-orange-600/20 text-orange-400",
    tooltip: "Avg context >700K tokens/req — long conversations inflate cost",
  },
  "short-sessions": {
    label: "Short Sessions",
    color: "bg-teal-600/20 text-teal-400",
    tooltip: "Avg context <300K tokens/req — efficient conversation patterns",
  },
  "manual-coder": {
    label: "Manual Coder",
    color: "bg-red-600/20 text-red-400",
    tooltip: "Less than 10% AI-generated code in commits",
  },
  "low-adoption": {
    label: "Low Adoption",
    color: "bg-orange-600/20 text-orange-400",
    tooltip: "10-29% AI-generated code in commits",
  },
  "moderate-adoption": {
    label: "Moderate AI",
    color: "bg-amber-600/20 text-amber-400",
    tooltip: "30-54% AI-generated code in commits",
  },
  "high-adoption": {
    label: "High AI",
    color: "bg-blue-600/20 text-blue-400",
    tooltip: "55-79% AI-generated code in commits",
  },
  "ai-native": {
    label: "AI-Native",
    color: "bg-emerald-600/20 text-emerald-400",
    tooltip: "80%+ AI-generated code in commits",
  },
};

export function UserDetailClient({ email, stats }: UserDetailClientProps) {
  const currentSpend = stats.spending[0];
  const activityDays = stats.dailyActivity.length;
  const totalAgentRequests = stats.dailyActivity.reduce((sum, d) => sum + d.agent_requests, 0);
  const totalSpendCents = stats.dailySpend.reduce((s, d) => s + d.spend_cents, 0);
  const totalSpendDollars = totalSpendCents / 100;
  const dollarsPerReq =
    totalAgentRequests > 0 ? (totalSpendCents / totalAgentRequests / 100).toFixed(2) : null;
  const dailyAvgSpend =
    stats.dailySpend.length > 0 ? totalSpendDollars / stats.dailySpend.length : 0;
  const cycleSpendDollars =
    totalSpendDollars || (currentSpend ? currentSpend.spend_cents / 100 : 0);

  const mergedDailyData = buildMergedDailyData(stats.dailySpend, stats.dailyActivity);
  const hasUsageEvents = stats.usageEventsSummary.length > 0;

  const userBadges: string[] = [];
  if (stats.badges.spend) userBadges.push(stats.badges.spend);
  if (stats.badges.context) userBadges.push(stats.badges.context);
  if (stats.badges.adoption) userBadges.push(stats.badges.adoption);
  if (stats.badges.usage) userBadges.push(stats.badges.usage);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{stats.member?.name ?? email}</h1>
            {userBadges.map((b) => {
              const cfg = BADGE_STYLES[b];
              if (!cfg) return null;
              return (
                <span
                  key={b}
                  className={`${cfg.color} px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap`}
                  title={cfg.tooltip}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>
          <p className="text-zinc-500 text-xs">
            {email} · {stats.member?.role ?? "member"}
            {stats.group && (
              <>
                {" · "}
                <Link
                  href={`/?group=${stats.group.id}`}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {stats.group.name}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-stretch gap-2 overflow-x-auto">
        <KpiCard
          label="Cycle Spend"
          value={`$${Math.round(cycleSpendDollars).toLocaleString()}`}
          sub={`~$${dailyAvgSpend.toFixed(0)}/day`}
        />
        <KpiCard
          label="$/Req"
          value={dollarsPerReq != null ? `$${dollarsPerReq}` : "—"}
          sub="Cost per request"
        />
        <KpiCard label={`Agent Reqs (${activityDays}d)`} value={fmt(totalAgentRequests)} />
        <KpiCard
          label="Diffs Accepted"
          value={stats.aiAdoption ? `${stats.aiAdoption.acceptRate}%` : "—"}
          sub={
            stats.aiAdoption
              ? `${stats.aiAdoption.totalAccepts} of ${stats.aiAdoption.totalApplies} agent diffs`
              : "Not enough data"
          }
        />
        <KpiCard
          label="Team Rank"
          value={stats.ranks ? `#${stats.ranks.spendRank}` : "—"}
          sub={
            stats.ranks
              ? `spend / #${stats.ranks.activityRank} activity (of ${stats.ranks.totalRanked})`
              : "No rank data"
          }
          href={stats.group ? `/?group=${stats.group.id}` : "/"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SpendTrendChart
          data={stats.dailySpend.map((d) => {
            const activity = stats.dailyActivity.find((a) => a.date === d.date);
            return {
              ...d,
              agent_requests: activity?.agent_requests,
              lines_added: activity?.lines_added,
              lines_deleted: activity?.lines_deleted,
            };
          })}
        />
        <AIAdoptionCard adoption={stats.aiAdoption} />
      </div>

      {hasUsageEvents && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-400">Cost Breakdown</h3>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left px-4 py-2 font-medium w-[140px]">Model</th>
                  <th className="text-right px-4 py-2 font-medium">Requests</th>
                  <th className="text-right px-4 py-2 font-medium">$/Req</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="text-left px-4 py-2 font-medium">Included in Plan vs Overage</th>
                  <th className="text-right px-4 py-2 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {stats.usageEventsSummary.map((r) => {
                  const totalDollars = r.total_cost_cents / 100;
                  const planPct =
                    r.total_cost_cents > 0 ? (r.plan_cost_cents / r.total_cost_cents) * 100 : 0;
                  const overagePct = 100 - planPct;
                  return (
                    <tr key={r.model} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-400 cursor-default" title={r.model}>
                        {shortModel(r.model)}
                      </td>
                      <td className="text-right px-4 py-2 font-mono">
                        {r.requests.toLocaleString()}
                      </td>
                      <td className="text-right px-4 py-2 font-mono">
                        ${(r.avg_cost_cents / 100).toFixed(2)}
                      </td>
                      <td className="text-right px-4 py-2 font-mono font-bold">
                        $
                        {totalDollars >= 1
                          ? Math.round(totalDollars).toLocaleString()
                          : totalDollars.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex"
                            title={`Included in plan: $${Math.round(r.plan_cost_cents / 100)} (${r.plan_reqs} reqs) · Overage: $${Math.round(r.overage_cost_cents / 100)} (${r.overage_reqs} reqs)`}
                          >
                            {planPct > 0 && (
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${planPct}%` }}
                              />
                            )}
                            {overagePct > 0 && (
                              <div
                                className="h-full bg-amber-500"
                                style={{ width: `${overagePct}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 w-8 text-right shrink-0">
                            {r.overage_reqs > 0 ? `${Math.round(overagePct)}%` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-2 font-mono">
                        {r.error_reqs > 0 ? (
                          <span
                            className="text-red-400/70"
                            title={`${r.error_reqs} errored requests (not charged)`}
                          >
                            {r.error_reqs}
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center gap-4 px-4 py-1.5 border-t border-zinc-800 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Included in plan
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Overage
              </span>
            </div>
          </div>
        </div>
      )}

      {(stats.mcpSummary.length > 0 || stats.commandsSummary.length > 0) && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-400">Tools & Features</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-zinc-800">
            {stats.mcpSummary.length > 0 && (
              <div className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                  MCP Tools
                </div>
                <div className="space-y-1.5">
                  {stats.mcpSummary.slice(0, 10).map((t) => (
                    <div
                      key={`${t.tool_name}-${t.server_name}`}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-zinc-300 truncate mr-2">
                        {t.tool_name}
                        <span className="text-zinc-600 ml-1">({t.server_name})</span>
                      </span>
                      <span className="font-mono text-zinc-500 shrink-0">
                        {t.total_usage.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.commandsSummary.length > 0 && (
              <div className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                  Commands
                </div>
                <div className="space-y-1.5">
                  {stats.commandsSummary.slice(0, 10).map((c) => (
                    <div key={c.command_name} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">{c.command_name}</span>
                      <span className="font-mono text-zinc-500">
                        {c.total_usage.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {stats.contextMetrics && <ContextEfficiencyCard metrics={stats.contextMetrics} />}

      {stats.modelBreakdown.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-400">Model Preferences</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left px-4 py-2 font-medium">Model</th>
                  <th className="text-right px-4 py-2 font-medium">Days Used</th>
                  <th className="text-right px-4 py-2 font-medium">Requests</th>
                </tr>
              </thead>
              <tbody>
                {stats.modelBreakdown.map((m) => (
                  <tr key={m.model} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-1.5 text-zinc-400 cursor-default" title={m.model}>
                      {shortModel(m.model)}
                    </td>
                    <td className="text-right px-4 py-1.5 font-mono">{m.days_used}</td>
                    <td className="text-right px-4 py-1.5 font-mono">
                      {m.total_requests.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800">
          <h3 className="text-xs font-medium text-zinc-400">Daily Activity & Spend</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-right px-4 py-2 font-medium">Model</th>
                <th
                  className="text-right px-4 py-2 font-medium cursor-default"
                  title="Agent mode requests (primary AI interaction)"
                >
                  Requests
                </th>
                <th className="text-right px-4 py-2 font-medium">Spend</th>
                <th
                  className="text-right px-4 py-2 font-medium cursor-default"
                  title="Total lines added/deleted in editor — includes AI, manual typing, paste, refactoring"
                >
                  Lines +/-
                </th>
                <th
                  className="text-right px-4 py-2 font-medium cursor-default"
                  title="Agent diffs accepted by user"
                >
                  Accepts
                </th>
                <th
                  className="text-right px-4 py-2 font-medium cursor-default"
                  title="Tab completions accepted"
                >
                  Tabs
                </th>
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
                  <td
                    className="text-right px-4 py-1.5 text-zinc-500 cursor-default"
                    title={d.most_used_model}
                  >
                    {shortModel(d.most_used_model)}
                  </td>
                  <td className="text-right px-4 py-1.5 font-mono">
                    {d.agent_requests > 0 ? (
                      <span className="text-zinc-300">
                        {d.usage_based_reqs > 0 && (
                          <span
                            className="mr-1 text-amber-400/80 text-[10px] cursor-default"
                            title={`${d.usage_based_reqs} of these were usage-based (beyond plan)`}
                          >
                            ${"\u2022"}
                          </span>
                        )}
                        {d.agent_requests}
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-1.5 font-mono">
                    {d.spend > 0 ? (
                      <span className={d.isSpike ? "text-red-400 font-bold" : "text-amber-400"}>
                        {d.spend < 1 ? d.spend.toFixed(2) : Math.round(d.spend)}$
                      </span>
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
                  <td className="text-right px-4 py-1.5 text-zinc-600">{d.client_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {stats.anomalies.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-400">Anomaly History</h3>
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
                        className={`px-1.5 py-0.5 rounded text-[10px] ${a.severity === "critical" ? "bg-red-500/20 text-red-400" : a.severity === "warning" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}
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
  usage_based_reqs: number;
  lines_added: number;
  lines_deleted: number;
  total_accepts: number;
  tabs_accepted: number;
  most_used_model: string;
  client_version: string;
}

function ContextEfficiencyCard({ metrics }: { metrics: NonNullable<UserStats["contextMetrics"]> }) {
  const ratio =
    metrics.teamMedianCacheRead > 0 ? metrics.avgCacheRead / metrics.teamMedianCacheRead : 0;
  const isHigh = metrics.avgCacheRead > 700_000;
  const isMedium = metrics.avgCacheRead > 400_000;

  const color = isHigh ? "text-orange-400" : isMedium ? "text-amber-400" : "text-emerald-400";
  const borderColor = isHigh ? "border-orange-500/30" : "border-zinc-800";
  const bgColor = isHigh ? "bg-orange-500/5" : "bg-zinc-900";

  let description: string;
  if (isHigh) {
    description =
      "High context usage directly increases avg $/req — each request re-reads the full conversation history.";
  } else if (isMedium) {
    description = "Moderate context usage — avg $/req is partially driven by conversation length.";
  } else {
    description = "Low context usage — minimal impact on $/req from conversation history.";
  }

  return (
    <div className={`${bgColor} rounded-lg border ${borderColor} px-4 py-3`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-zinc-400">Context Efficiency</h3>
        <span className="text-[10px] text-zinc-500">
          #{metrics.contextRank} of {metrics.totalRanked} in org
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div>
          <div className="text-[10px] text-zinc-500">Avg Cache Read / Req</div>
          <div className={`text-sm font-bold font-mono ${color}`}>
            {fmtTokens(metrics.avgCacheRead)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500">Org Median</div>
          <div className="text-sm font-mono text-zinc-400">
            {fmtTokens(metrics.teamMedianCacheRead)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500">vs Org</div>
          <div className={`text-sm font-mono ${color}`}>
            {ratio > 0 ? `${ratio.toFixed(1)}x` : "—"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isHigh ? "bg-orange-500" : isMedium ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{
              width: `${metrics.totalRanked > 0 ? Math.round(((metrics.totalRanked - metrics.contextRank + 1) / metrics.totalRanked) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
      <p className={`text-[11px] mt-2 ${isHigh ? "text-orange-400/80" : "text-zinc-500"}`}>
        {description}
      </p>
    </div>
  );
}

const TIER_STYLES: Record<
  string,
  { color: string; bg: string; bar: string; border: string; description: string }
> = {
  "AI-Native": {
    color: "text-emerald-400",
    bg: "bg-emerald-500",
    bar: "bg-emerald-500",
    border: "border-emerald-500/30",
    description: "Heavily uses AI with high trust",
  },
  "High Adoption": {
    color: "text-blue-400",
    bg: "bg-blue-500",
    bar: "bg-blue-500",
    border: "border-blue-500/30",
    description: "Strong AI usage, good acceptance",
  },
  Moderate: {
    color: "text-amber-400",
    bg: "bg-amber-500",
    bar: "bg-amber-500",
    border: "border-amber-500/30",
    description: "Uses AI regularly but room to grow",
  },
  "Low Adoption": {
    color: "text-orange-400",
    bg: "bg-orange-500",
    bar: "bg-orange-500",
    border: "border-orange-500/30",
    description: "Minimal AI usage detected",
  },
  Manual: {
    color: "text-red-400",
    bg: "bg-red-500",
    bar: "bg-red-500",
    border: "border-red-500/30",
    description: "Rarely uses AI assistance",
  },
};

function AIAdoptionCard({ adoption }: { adoption: UserStats["aiAdoption"] }) {
  if (!adoption) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 flex flex-col items-center justify-center min-h-[260px]">
        <h3 className="text-xs font-medium text-zinc-400 mb-3">AI Adoption</h3>
        <p className="text-zinc-500 text-xs text-center">
          Not enough usage data.
          <br />
          <span className="text-zinc-600">Requires at least 10 agent requests.</span>
        </p>
      </div>
    );
  }

  const fallback = {
    color: "text-amber-400",
    bg: "bg-amber-500",
    bar: "bg-amber-500",
    border: "border-amber-500/30",
    description: "",
  };
  const style = TIER_STYLES[adoption.adoptionTier] ?? fallback;
  const reqsPerDay = Math.round(adoption.intensity);

  return (
    <div className={`bg-zinc-900 rounded-lg border ${style.border} p-5 flex flex-col`}>
      <h3 className="text-xs font-medium text-zinc-400 mb-4">AI Adoption</h3>

      <div className="flex-1 flex flex-col justify-center">
        <div className={`text-2xl font-bold ${style.color} leading-tight`}>
          {adoption.adoptionTier}
        </div>
        <div className="text-xs text-zinc-500 mt-1 mb-3">{style.description}</div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${style.bar}`}
              style={{ width: `${Math.min(adoption.score, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-semibold ${style.color} tabular-nums`}>
            {adoption.score}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div
          className="bg-zinc-800/60 rounded-lg px-2 py-2.5 text-center cursor-default"
          title={`${adoption.totalAccepts} of ${adoption.totalApplies} agent diffs accepted (includes dismissed)`}
        >
          <div className="text-sm font-semibold text-zinc-100">{adoption.acceptRate}%</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">diffs accepted</div>
        </div>
        <div
          className="bg-zinc-800/60 rounded-lg px-2 py-2.5 text-center cursor-default"
          title={`${adoption.agentRequests.toLocaleString()} total agent requests over ${adoption.activeDays} active days`}
        >
          <div className="text-sm font-semibold text-zinc-100">{reqsPerDay}/day</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">agent requests</div>
        </div>
        <div
          className="bg-zinc-800/60 rounded-lg px-2 py-2.5 text-center cursor-default"
          title={`Days with at least one agent request in the last ${adoption.periodDays} days`}
        >
          <div className="text-sm font-semibold text-zinc-100">
            {adoption.activeDays}/{adoption.periodDays}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">active days</div>
        </div>
      </div>
    </div>
  );
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

  return [...allDates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const spend = (dailySpend.find((d) => d.date === date)?.spend_cents ?? 0) / 100;
      const activity = activityMap.get(date);
      return {
        date,
        spend,
        isSpike: spend > avgSpend * 2.5 && spend > 20,
        hasActivity: !!activity,
        agent_requests: activity?.agent_requests ?? 0,
        usage_based_reqs: activity?.usage_based_reqs ?? 0,
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
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <div className="text-[10px] text-zinc-400 truncate">{label}</div>
      <div className="text-lg font-bold tracking-tight leading-tight text-zinc-100">{value}</div>
      {sub && (
        <div className={`text-[10px] truncate ${alert ? "text-red-400" : "text-zinc-400"}`}>
          {sub}
        </div>
      )}
    </>
  );

  const className = `bg-zinc-900 border rounded-md px-3 py-2 min-w-0 flex-1 ${alert ? "border-red-500/50" : "border-zinc-800"} ${href ? "hover:border-zinc-600 transition-colors cursor-pointer" : ""}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
