"use client";

import Link from "next/link";
import type { RankedUser } from "@/lib/db";
import type { SortColumn } from "@/app/dashboard-client";
import { shortModel } from "@/lib/format-utils";

interface MembersTableProps {
  data: RankedUser[];
  sortCol: SortColumn;
  sortAsc: boolean;
  onSort: (col: SortColumn) => void;
  highlightEmail?: string;
  timeLabel: string;
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function SortIcon({ active, asc }: { col?: string; active: boolean; asc: boolean }) {
  if (!active) return <span className="text-zinc-700 ml-0.5">↕</span>;
  return <span className="text-blue-400 ml-0.5">{asc ? "↑" : "↓"}</span>;
}

export function MembersTable({
  data,
  sortCol,
  sortAsc,
  onSort,
  highlightEmail,
  timeLabel,
}: MembersTableProps) {
  const sortLabel =
    sortCol === "spend"
      ? "Spend"
      : sortCol === "activity"
        ? "Activity"
        : sortCol === "reqs"
          ? "Requests"
          : sortCol === "lines"
            ? "Lines"
            : sortCol === "cpr"
              ? "$/req"
              : "Name";

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400">
          All Members — sorted by {sortLabel} {sortAsc ? "↑" : "↓"}
        </h3>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900 z-10">
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="text-left px-4 py-3 font-medium w-16">Rank</th>
              <th
                className="text-left px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("name")}
              >
                Name <SortIcon col="name" active={sortCol === "name"} asc={sortAsc} />
              </th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("spend")}
              >
                <span title="Full billing cycle spend">Spend (cycle)</span>
                <SortIcon col="spend" active={sortCol === "spend"} asc={sortAsc} />
              </th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("reqs")}
              >
                <span title={`Agent requests in the last ${timeLabel}`}>Reqs ({timeLabel})</span>
                <SortIcon col="reqs" active={sortCol === "reqs"} asc={sortAsc} />
              </th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("lines")}
              >
                <span title={`Lines added in the last ${timeLabel}`}>Lines ({timeLabel})</span>
                <SortIcon col="lines" active={sortCol === "lines"} asc={sortAsc} />
              </th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("cpr")}
              >
                <span title="Cost per agent request (cycle spend / total requests)">$/req</span>
                <SortIcon col="cpr" active={sortCol === "cpr"} asc={sortAsc} />
              </th>
              <th className="text-right px-4 py-3 font-medium">Model</th>
              <th className="text-center px-4 py-3 font-medium">Ranks</th>
              <th className="text-right px-4 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isHighlighted = highlightEmail === row.email;
              return (
                <tr
                  key={row.email}
                  className={`border-b border-zinc-800/50 transition-colors ${
                    isHighlighted
                      ? "bg-blue-500/10 ring-1 ring-blue-500/30"
                      : "hover:bg-zinc-800/30"
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-zinc-500 text-xs">
                    {sortCol === "activity"
                      ? rankBadge(row.activity_rank)
                      : rankBadge(row.spend_rank)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    <Link
                      href={`/users/${encodeURIComponent(row.email)}`}
                      className="hover:text-blue-300 transition-colors"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400 text-xs">{row.email}</td>
                  <td className="text-right px-4 py-2.5 font-mono text-zinc-400">
                    ${(row.spend_cents / 100).toFixed(0)}
                  </td>
                  <td className="text-right px-4 py-2.5 font-mono">
                    {row.agent_requests.toLocaleString()}
                  </td>
                  <td className="text-right px-4 py-2.5 font-mono text-zinc-400">
                    {row.lines_added > 0 ? `+${row.lines_added.toLocaleString()}` : "—"}
                  </td>
                  <td className="text-right px-4 py-2.5 font-mono text-xs">
                    {(() => {
                      if (row.agent_requests === 0) return <span className="text-zinc-600">—</span>;
                      const cpr = row.spend_cents / row.agent_requests / 100;
                      const color =
                        cpr > 5 ? "text-red-400" : cpr > 2 ? "text-amber-400" : "text-zinc-400";
                      return (
                        <span className={color} title={`$${cpr.toFixed(2)} per request`}>
                          ${cpr.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td
                    className="text-right px-4 py-2.5 text-xs text-zinc-500 cursor-default"
                    title={row.most_used_model}
                  >
                    {shortModel(row.most_used_model)}
                  </td>
                  <td className="text-center px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-mono"
                        title="Spend rank"
                      >
                        ${row.spend_rank}
                      </span>
                      <span
                        className="bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-mono"
                        title="Activity rank"
                      >
                        A{row.activity_rank}
                      </span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-2.5">
                    <Link
                      href={`/users/${encodeURIComponent(row.email)}`}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      →
                    </Link>
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
