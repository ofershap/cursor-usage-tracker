"use client";

import { useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { timeAgo } from "@/lib/date-utils";
import type { Anomaly, Incident } from "@/lib/types";

interface AnomalyTimeline {
  anomalies: Anomaly[];
  incidents: Incident[];
  avgMttdMinutes: number | null;
  avgMttiMinutes: number | null;
  avgMttrMinutes: number | null;
}

interface AnomaliesClientProps {
  timeline: AnomalyTimeline;
}

type Filter = "all" | "open" | "resolved";

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "N/A";
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

function severityBadge(severity: string) {
  const cls =
    severity === "critical"
      ? "bg-red-500/20 text-red-400"
      : severity === "warning"
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-blue-500/20 text-blue-400";
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{severity}</span>;
}

interface MergedRow {
  anomaly: Anomaly;
  incident: Incident | undefined;
  isOpen: boolean;
}

export function AnomaliesClient({ timeline }: AnomaliesClientProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const openAnomalies = timeline.anomalies.filter((a) => !a.resolvedAt);
  const resolvedAnomalies = timeline.anomalies.filter((a) => a.resolvedAt);
  const openIncidents = timeline.incidents.filter((i) => i.status !== "resolved");

  const incidentByAnomalyId = new Map(timeline.incidents.map((i) => [i.anomalyId, i]));

  const merged: MergedRow[] = timeline.anomalies.map((a) => ({
    anomaly: a,
    incident: incidentByAnomalyId.get(a.id ?? -1),
    isOpen: !a.resolvedAt,
  }));

  const openRows = merged.filter((r) => r.isOpen);
  const resolvedRows = merged.filter((r) => !r.isOpen);
  const sorted = [...openRows, ...resolvedRows];

  const filtered = filter === "open" ? openRows : filter === "resolved" ? resolvedRows : sorted;

  async function handleIncidentAction(incidentId: number, action: "acknowledge" | "resolve") {
    await fetch(`/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Anomalies & Incidents</h1>
        <p className="text-zinc-400 text-sm">MTTD / MTTI / MTTR monitoring — Last 30 days</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Open"
          value={openAnomalies.length.toString()}
          alert={openAnomalies.length > 0}
        />
        <StatCard title="Resolved" value={resolvedAnomalies.length.toString()} />
        <StatCard
          title="Incidents"
          value={openIncidents.length.toString()}
          alert={openIncidents.length > 0}
        />
        <StatCard
          title="Avg MTTD"
          value={formatMinutes(timeline.avgMttdMinutes)}
          subtitle="Mean Time to Detect"
        />
        <StatCard
          title="Avg MTTI"
          value={formatMinutes(timeline.avgMttiMinutes)}
          subtitle="Mean Time to Identify"
        />
        <StatCard
          title="Avg MTTR"
          value={formatMinutes(timeline.avgMttrMinutes)}
          subtitle="Mean Time to Resolve"
        />
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-400">
            Anomalies
            <span className="text-zinc-600 ml-1.5">({filtered.length})</span>
          </h3>
          <div className="flex gap-1">
            {(["all", "open", "resolved"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  filter === f
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "open"
                    ? `Open (${openRows.length})`
                    : `Resolved (${resolvedRows.length})`}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-4 py-3 font-medium w-20">Severity</th>
                <th className="text-left px-4 py-3 font-medium">Issue</th>
                <th className="text-left px-4 py-3 font-medium w-28">User</th>
                <th className="text-left px-4 py-3 font-medium w-16">When</th>
                <th className="text-left px-4 py-3 font-medium w-24">Status</th>
                <th className="text-right px-4 py-3 font-medium w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    No anomalies to show
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const a = row.anomaly;
                  const inc = row.incident;
                  const status =
                    inc?.status ?? (a.resolvedAt ? "resolved" : a.alertedAt ? "alerted" : "open");
                  const isResolved = !!a.resolvedAt;

                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${isResolved ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">{severityBadge(a.severity)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-xs leading-relaxed">
                        {a.message}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/users/${encodeURIComponent(a.userEmail ?? "")}`}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          {a.userEmail === "team"
                            ? "team"
                            : (a.userEmail ?? "unknown").split("@")[0]}
                        </Link>
                      </td>
                      <td
                        className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap"
                        title={new Date(a.detectedAt).toLocaleString()}
                      >
                        {timeAgo(a.detectedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            status === "resolved"
                              ? "bg-green-500/15 text-green-400"
                              : status === "open"
                                ? "bg-red-500/20 text-red-400"
                                : status === "acknowledged"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 whitespace-nowrap space-x-1.5">
                        {inc && status !== "resolved" && (
                          <>
                            {status !== "acknowledged" && (
                              <button
                                onClick={() => handleIncidentAction(inc.id ?? 0, "acknowledge")}
                                className="px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 rounded transition-colors"
                              >
                                Ack
                              </button>
                            )}
                            <button
                              onClick={() => handleIncidentAction(inc.id ?? 0, "resolve")}
                              className="px-2.5 py-1 text-xs bg-green-600/15 border border-green-500/30 text-green-400 hover:bg-green-600/25 hover:border-green-500/50 rounded transition-colors"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
