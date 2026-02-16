"use client";

import type { DashboardStats } from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import { SpendBarChart } from "@/components/charts/spend-bar-chart";
import { UsageLineChart } from "@/components/charts/usage-line-chart";
import { MembersTable } from "@/components/dashboard/members-table";

interface DashboardClientProps {
  stats: DashboardStats;
}

export function DashboardClient({ stats }: DashboardClientProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Team Overview</h1>
        <p className="text-zinc-400 text-sm">Last 30 days</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Team Members" value={stats.totalMembers.toString()} />
        <StatCard
          title="Total Spend"
          value={`$${(stats.totalSpendCents / 100).toFixed(2)}`}
          subtitle="Current cycle"
        />
        <StatCard
          title="Total Requests"
          value={formatNumber(stats.totalRequests)}
          subtitle="Last 30 days"
        />
        <StatCard
          title="Total Tokens"
          value={`${(stats.totalTokens / 1_000_000).toFixed(1)}M`}
          subtitle="Last 30 days"
        />
        <StatCard
          title="Active Anomalies"
          value={stats.activeAnomalies.toString()}
          alert={stats.activeAnomalies > 0}
          subtitle={stats.activeAnomalies > 0 ? "Needs attention" : "All clear"}
          trend={stats.activeAnomalies > 0 ? "up" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendBarChart data={stats.spendByUser} />
        <UsageLineChart data={stats.dailyUsage} />
      </div>

      <MembersTable data={stats.spendByUser} />
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
