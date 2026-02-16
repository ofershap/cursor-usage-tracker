"use client";

import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { TokensLineChart } from "@/components/charts/tokens-line-chart";
import { ModelPieChart } from "@/components/charts/model-pie-chart";
import type { Anomaly } from "@/lib/types";

interface UserStats {
  member:
    | { name: string; email: string; role: string; first_seen: string; last_seen: string }
    | undefined;
  spending: Array<{ cycle_start: string; spend_cents: number; fast_premium_requests: number }>;
  dailyTokens: Array<{ date: string; tokens: number; requests: number }>;
  modelBreakdown: Array<{ model: string; count: number; tokens: number }>;
  kindBreakdown: Array<{ kind: string; count: number; tokens: number }>;
  anomalies: Anomaly[];
}

interface UserDetailClientProps {
  email: string;
  stats: UserStats;
}

export function UserDetailClient({ email, stats }: UserDetailClientProps) {
  const currentSpend = stats.spending[0];
  const totalTokens = stats.dailyTokens.reduce((sum, d) => sum + d.tokens, 0);
  const totalRequests = stats.dailyTokens.reduce((sum, d) => sum + d.requests, 0);
  const openAnomalies = stats.anomalies.filter((a) => !a.resolvedAt);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 mb-2 inline-block">
          ← Back to overview
        </Link>
        <h1 className="text-2xl font-bold">{stats.member?.name ?? email}</h1>
        <p className="text-zinc-400 text-sm">
          {email} · {stats.member?.role ?? "member"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Spend"
          value={currentSpend ? `$${(currentSpend.spend_cents / 100).toFixed(2)}` : "$0.00"}
          subtitle={currentSpend ? `Cycle: ${currentSpend.cycle_start}` : undefined}
        />
        <StatCard
          title="Premium Requests"
          value={(currentSpend?.fast_premium_requests ?? 0).toString()}
          subtitle="Current cycle"
        />
        <StatCard title="Total Tokens (30d)" value={`${(totalTokens / 1_000_000).toFixed(1)}M`} />
        <StatCard
          title="Open Anomalies"
          value={openAnomalies.length.toString()}
          alert={openAnomalies.length > 0}
          trend={openAnomalies.length > 0 ? "up" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TokensLineChart data={stats.dailyTokens} />
        <ModelPieChart data={stats.modelBreakdown} />
      </div>

      {stats.kindBreakdown.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">Usage by Feature</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left px-6 py-3 font-medium">Feature</th>
                  <th className="text-right px-6 py-3 font-medium">Requests</th>
                  <th className="text-right px-6 py-3 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {stats.kindBreakdown.map((row) => (
                  <tr key={row.kind} className="border-b border-zinc-800/50">
                    <td className="px-6 py-3">{row.kind}</td>
                    <td className="text-right px-6 py-3 font-mono">{row.count}</td>
                    <td className="text-right px-6 py-3 font-mono">
                      {(row.tokens / 1_000_000).toFixed(2)}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.anomalies.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">Anomaly History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left px-6 py-3 font-medium">Detected</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-left px-6 py-3 font-medium">Severity</th>
                  <th className="text-left px-6 py-3 font-medium">Message</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.anomalies.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-800/50">
                    <td className="px-6 py-3 text-zinc-400 whitespace-nowrap">
                      {new Date(a.detectedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">{a.type}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          a.severity === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="px-6 py-3 max-w-md truncate">{a.message}</td>
                    <td className="px-6 py-3">
                      {a.resolvedAt ? (
                        <span className="text-green-400 text-xs">Resolved</span>
                      ) : (
                        <span className="text-red-400 text-xs">Open</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalRequests === 0 && stats.anomalies.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No usage data found for this user in the last 30 days.
        </div>
      )}
    </div>
  );
}
