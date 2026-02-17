"use client";

import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
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

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "N/A";
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

export function AnomaliesClient({ timeline }: AnomaliesClientProps) {
  const openAnomalies = timeline.anomalies.filter((a) => !a.resolvedAt);
  const resolvedAnomalies = timeline.anomalies.filter((a) => a.resolvedAt);
  const openIncidents = timeline.incidents.filter((i) => i.status !== "resolved");

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
          title="Open Anomalies"
          value={openAnomalies.length.toString()}
          alert={openAnomalies.length > 0}
        />
        <StatCard title="Resolved" value={resolvedAnomalies.length.toString()} />
        <StatCard
          title="Open Incidents"
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

      {openIncidents.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-red-500/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-red-400">Open Incidents</h3>
            <span className="text-xs text-zinc-500">{openIncidents.length} active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left px-6 py-3 font-medium">ID</th>
                  <th className="text-left px-6 py-3 font-medium">User</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Detected</th>
                  <th className="text-left px-6 py-3 font-medium">MTTD</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {openIncidents.map((incident) => (
                  <tr key={incident.id} className="border-b border-zinc-800/50">
                    <td className="px-6 py-3 font-mono text-zinc-400">#{incident.id}</td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/users/${encodeURIComponent(incident.userEmail ?? "")}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {incident.userEmail ?? "unknown"}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          incident.status === "open"
                            ? "bg-red-500/20 text-red-400"
                            : incident.status === "alerted"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-400 whitespace-nowrap">
                      {new Date(incident.detectedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-mono">{formatMinutes(incident.mttdMinutes)}</td>
                    <td className="text-right px-6 py-3 space-x-2">
                      {incident.status !== "acknowledged" && (
                        <button
                          onClick={() => handleIncidentAction(incident.id ?? 0, "acknowledge")}
                          className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleIncidentAction(incident.id ?? 0, "resolve")}
                        className="px-3 py-1 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded transition-colors"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400">All Anomalies (Last 30 Days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-6 py-3 font-medium">Detected</th>
                <th className="text-left px-6 py-3 font-medium">User</th>
                <th className="text-left px-6 py-3 font-medium">Type</th>
                <th className="text-left px-6 py-3 font-medium">Severity</th>
                <th className="text-left px-6 py-3 font-medium">Metric</th>
                <th className="text-left px-6 py-3 font-medium">Message</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {timeline.anomalies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No anomalies detected in the last 30 days
                  </td>
                </tr>
              ) : (
                timeline.anomalies.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-6 py-3 text-zinc-400 whitespace-nowrap">
                      {new Date(a.detectedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/users/${encodeURIComponent(a.userEmail ?? "")}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {(a.userEmail ?? "unknown").split("@")[0]}
                      </Link>
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
                    <td className="px-6 py-3 text-zinc-400">{a.metric}</td>
                    <td className="px-6 py-3 max-w-xs truncate">{a.message}</td>
                    <td className="px-6 py-3">
                      {a.resolvedAt ? (
                        <span className="text-green-400 text-xs">Resolved</span>
                      ) : a.alertedAt ? (
                        <span className="text-yellow-400 text-xs">Alerted</span>
                      ) : (
                        <span className="text-red-400 text-xs">Open</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
