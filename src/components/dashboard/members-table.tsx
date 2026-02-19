"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import type { RankedUser, UsageBadge, SpendBadge, ContextBadge } from "@/lib/db";
import type { SortColumn } from "@/app/dashboard-client";
import { shortModel } from "@/lib/format-utils";

interface MembersTableProps {
  data: RankedUser[];
  sortCol: SortColumn;
  sortAsc: boolean;
  onSort: (col: SortColumn) => void;
  highlightEmail?: string;
  timeLabel: string;
  badgeFilter: string | null;
  onBadgeFilter: (badge: string | null) => void;
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const USAGE_BADGE_CONFIG: Record<UsageBadge, { label: string; color: string; tooltip: string }> = {
  "power-user": {
    label: "Power User",
    color: "bg-purple-600/20 text-purple-400",
    tooltip: "High request volume per active day",
  },
  "deep-thinker": {
    label: "Deep Thinker",
    color: "bg-amber-600/20 text-amber-400",
    tooltip: "Uses max-context models (1M tokens) for deep, complex work",
  },
  balanced: {
    label: "Balanced",
    color: "bg-zinc-600/20 text-zinc-400",
    tooltip: "Moderate usage with standard models",
  },
  "tab-completer": {
    label: "Tab Completer",
    color: "bg-cyan-600/20 text-cyan-400",
    tooltip: "Heavy use of tab completions alongside agent requests",
  },
  "light-user": {
    label: "Light",
    color: "bg-zinc-700/20 text-zinc-500",
    tooltip: "Fewer than 10 agent requests in this period",
  },
};

const SPEND_BADGE_CONFIG: Record<SpendBadge, { label: string; color: string; tooltip: string }> = {
  "cost-efficient": {
    label: "Cost Efficient",
    color: "bg-emerald-600/20 text-emerald-400",
    tooltip: "Top 20% in requests with below-median cost per request",
  },
  "premium-model": {
    label: "Premium Model",
    color: "bg-amber-600/20 text-amber-400",
    tooltip: "Uses expensive model tier (thinking/max) - primary cost driver",
  },
  "over-budget": {
    label: "Over Budget",
    color: "bg-red-600/20 text-red-400",
    tooltip: "Spend is 5x+ above team median",
  },
};

const CONTEXT_BADGE_CONFIG: Record<
  ContextBadge,
  { label: string; color: string; tooltip: string }
> = {
  "long-sessions": {
    label: "Long Sessions",
    color: "bg-orange-600/20 text-orange-400",
    tooltip: "Avg context >700K tokens/req — long conversations inflate cost per request",
  },
  "short-sessions": {
    label: "Short Sessions",
    color: "bg-teal-600/20 text-teal-400",
    tooltip: "Avg context <300K tokens/req — efficient conversation patterns, low context overhead",
  },
};

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <span className="text-zinc-700 ml-0.5">↕</span>;
  return <span className="text-blue-400 ml-0.5">{asc ? "↑" : "↓"}</span>;
}

function BadgeLegend({
  badgeFilter,
  onBadgeFilter,
}: {
  badgeFilter: string | null;
  onBadgeFilter: (badge: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleBadgeClick(key: string) {
    onBadgeFilter(badgeFilter === key ? null : key);
    setOpen(false);
  }

  function renderBadgeItem(key: string, cfg: { label: string; color: string; tooltip: string }) {
    const isActive = badgeFilter === key;
    return (
      <button
        key={key}
        onClick={() => handleBadgeClick(key)}
        className={`w-full text-left rounded px-2 py-1 transition-colors cursor-pointer ${isActive ? "bg-blue-500/20 ring-1 ring-blue-500/40" : "bg-zinc-800/50 hover:bg-zinc-700/50"}`}
      >
        <span className={`${cfg.color} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
          {cfg.label}
        </span>
        <div className="text-[9px] text-zinc-500 mt-0.5 leading-snug">{cfg.tooltip}</div>
      </button>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border border-zinc-600 text-zinc-500 hover:text-zinc-300 hover:border-zinc-400 transition-colors text-[9px] leading-none font-medium cursor-pointer"
        aria-label="Badge legend"
      >
        i
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 text-left">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Usage
          </div>
          <div className="space-y-0.5">
            {(
              Object.entries(USAGE_BADGE_CONFIG) as [
                UsageBadge,
                (typeof USAGE_BADGE_CONFIG)[UsageBadge],
              ][]
            ).map(([key, cfg]) => renderBadgeItem(key, cfg))}
          </div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-2 mb-1">
            Spend
          </div>
          <div className="space-y-0.5">
            {(
              Object.entries(SPEND_BADGE_CONFIG) as [
                SpendBadge,
                (typeof SPEND_BADGE_CONFIG)[SpendBadge],
              ][]
            ).map(([key, cfg]) => renderBadgeItem(key, cfg))}
          </div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-2 mb-1">
            Context
          </div>
          <div className="space-y-0.5">
            {(
              Object.entries(CONTEXT_BADGE_CONFIG) as [
                ContextBadge,
                (typeof CONTEXT_BADGE_CONFIG)[ContextBadge],
              ][]
            ).map(([key, cfg]) => renderBadgeItem(key, cfg))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MembersTable({
  data,
  sortCol,
  sortAsc,
  onSort,
  highlightEmail,
  timeLabel,
  badgeFilter,
  onBadgeFilter,
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
              : sortCol === "context"
                ? "Context"
                : "Name";

  const activeBadgeCfg = badgeFilter
    ? (USAGE_BADGE_CONFIG[badgeFilter as UsageBadge] ??
      SPEND_BADGE_CONFIG[badgeFilter as SpendBadge] ??
      CONTEXT_BADGE_CONFIG[badgeFilter as ContextBadge])
    : null;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-400">
            All Members — sorted by {sortLabel} {sortAsc ? "↑" : "↓"}
          </h3>
          {badgeFilter && activeBadgeCfg && (
            <span className="flex items-center gap-1">
              <span
                className={`${activeBadgeCfg.color} px-1.5 py-0.5 rounded text-[10px] font-medium`}
              >
                {activeBadgeCfg.label}
              </span>
              <button
                onClick={() => onBadgeFilter(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                title="Clear badge filter"
              >
                ✕
              </button>
            </span>
          )}
        </div>
        <BadgeLegend badgeFilter={badgeFilter} onBadgeFilter={onBadgeFilter} />
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
                Name <SortIcon active={sortCol === "name"} asc={sortAsc} />
              </th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("spend")}
              >
                <span title="Full billing cycle spend">Spend (cycle)</span>
                <SortIcon active={sortCol === "spend"} asc={sortAsc} />
              </th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("reqs")}
              >
                <span title={`Agent requests in the last ${timeLabel}`}>Reqs ({timeLabel})</span>
                <SortIcon active={sortCol === "reqs"} asc={sortAsc} />
              </th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("lines")}
              >
                <span
                  title={`Total lines added in editor — includes AI, manual typing, paste, refactoring (last ${timeLabel})`}
                >
                  Lines ({timeLabel})
                </span>
                <SortIcon active={sortCol === "lines"} asc={sortAsc} />
              </th>
              <th
                className="text-right px-4 py-3 font-medium cursor-pointer hover:text-zinc-300 select-none"
                onClick={() => onSort("cpr")}
              >
                <span title="Cost per agent request (cycle spend / total requests)">$/req</span>
                <SortIcon active={sortCol === "cpr"} asc={sortAsc} />
              </th>
              <th className="text-right px-4 py-3 font-medium">Model</th>
              <th className="text-center px-4 py-3 font-medium">
                <span
                  title="Usage style and spend profile based on request patterns, model choice, and cost"
                  className="cursor-help border-b border-dashed border-zinc-600"
                >
                  Profile
                </span>
              </th>
              <th className="text-center px-4 py-3 font-medium">
                <span
                  title="$N = Spend rank (by billing cycle spend) · AN = Activity rank (by agent requests)"
                  className="cursor-help border-b border-dashed border-zinc-600"
                >
                  Ranks
                </span>
              </th>
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
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {row.usage_badge && (
                        <span
                          className={`${USAGE_BADGE_CONFIG[row.usage_badge].color} px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap`}
                          title={USAGE_BADGE_CONFIG[row.usage_badge].tooltip}
                        >
                          {USAGE_BADGE_CONFIG[row.usage_badge].label}
                        </span>
                      )}
                      {row.spend_badge && (
                        <span
                          className={`${SPEND_BADGE_CONFIG[row.spend_badge].color} px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap`}
                          title={SPEND_BADGE_CONFIG[row.spend_badge].tooltip}
                        >
                          {SPEND_BADGE_CONFIG[row.spend_badge].label}
                        </span>
                      )}
                      {row.context_badge && (
                        <span
                          className={`${CONTEXT_BADGE_CONFIG[row.context_badge].color} px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap`}
                          title={CONTEXT_BADGE_CONFIG[row.context_badge].tooltip}
                        >
                          {CONTEXT_BADGE_CONFIG[row.context_badge].label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-mono"
                        title={`${ordinal(row.spend_rank)} highest spender this billing cycle`}
                      >
                        ${row.spend_rank}
                      </span>
                      <span
                        className="bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-mono"
                        title={`${ordinal(row.activity_rank)} most active by agent requests`}
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
