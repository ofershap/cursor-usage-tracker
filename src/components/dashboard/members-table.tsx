"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import type { RankedUser, UsageBadge, SpendBadge, ContextBadge, AdoptionBadge } from "@/lib/db";
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
    color: "bg-blue-600/20 text-blue-400",
    tooltip: "Standard usage pattern — regular agent requests without extreme model or volume",
  },
  "light-user": {
    label: "Low Usage",
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

const ADOPTION_BADGE_CONFIG: Record<
  AdoptionBadge,
  { label: string; color: string; tooltip: string }
> = {
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

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <span className="text-zinc-700 ml-0.5">↕</span>;
  return <span className="text-blue-400 ml-0.5">{asc ? "↑" : "↓"}</span>;
}

type BadgeSection = "usage" | "spend" | "context" | "adoption";

const BADGE_SECTIONS: {
  key: BadgeSection;
  label: string;
  entries: [string, { label: string; color: string; tooltip: string }][];
}[] = [
  { key: "usage", label: "Usage", entries: Object.entries(USAGE_BADGE_CONFIG) },
  { key: "spend", label: "Spend", entries: Object.entries(SPEND_BADGE_CONFIG) },
  { key: "context", label: "Context", entries: Object.entries(CONTEXT_BADGE_CONFIG) },
  { key: "adoption", label: "AI Adoption", entries: Object.entries(ADOPTION_BADGE_CONFIG) },
];

function sectionForBadge(badge: string): BadgeSection | null {
  if (badge in USAGE_BADGE_CONFIG) return "usage";
  if (badge in SPEND_BADGE_CONFIG) return "spend";
  if (badge in CONTEXT_BADGE_CONFIG) return "context";
  if (badge in ADOPTION_BADGE_CONFIG) return "adoption";
  return null;
}

function BadgeLegend({
  badgeFilter,
  onBadgeFilter,
  badgeCounts,
}: {
  badgeFilter: string | null;
  onBadgeFilter: (badge: string | null) => void;
  badgeCounts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  const activeSection = badgeFilter ? sectionForBadge(badgeFilter) : null;
  const [expanded, setExpanded] = useState<Set<BadgeSection>>(
    activeSection ? new Set([activeSection]) : new Set(),
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > spaceBelow;
    setPos({
      top: openUp ? rect.top : rect.bottom + 4,
      left: Math.max(8, rect.right - 320),
      openUp,
    });
  }, [open]);

  useEffect(() => {
    if (open) {
      setExpanded(activeSection ? new Set([activeSection]) : new Set());
    }
  }, [open, activeSection]);

  function toggleSection(section: BadgeSection) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function handleBadgeClick(key: string) {
    onBadgeFilter(badgeFilter === key ? null : key);
    setOpen(false);
  }

  function renderBadgeItem(key: string, cfg: { label: string; color: string; tooltip: string }) {
    const isActive = badgeFilter === key;
    const count = badgeCounts[key] ?? 0;
    return (
      <button
        key={key}
        onClick={() => handleBadgeClick(key)}
        className={`w-full text-left rounded px-2 py-1 transition-colors cursor-pointer ${isActive ? "bg-blue-500/20 ring-1 ring-blue-500/40" : "bg-zinc-800/50 hover:bg-zinc-700/50"}`}
      >
        <div className="flex items-center justify-between">
          <span className={`${cfg.color} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
            {cfg.label}
          </span>
          {count > 0 && <span className="text-[9px] text-zinc-500 font-mono">{count}</span>}
        </div>
        <div className="text-[9px] text-zinc-500 mt-0.5 leading-snug">{cfg.tooltip}</div>
      </button>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
          open || badgeFilter
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-300 hover:border-zinc-600"
        }`}
        aria-label="Filter by badge"
      >
        Badges
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && pos && (
        <div
          className="fixed z-[100] w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 text-left max-h-[calc(100vh-16px)] overflow-y-auto"
          style={{
            left: pos.left,
            ...(pos.openUp ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top }),
          }}
        >
          {BADGE_SECTIONS.map((section, i) => {
            const isExpanded = expanded.has(section.key);
            const hasActiveBadge = badgeFilter
              ? section.entries.some(([k]) => k === badgeFilter)
              : false;
            return (
              <div key={section.key} className={i > 0 ? "mt-1" : ""}>
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between py-1 px-1 rounded hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      {section.label}
                    </span>
                    <span className="text-[9px] text-zinc-600">{section.entries.length}</span>
                    {hasActiveBadge && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                  </div>
                  <span
                    className={`text-zinc-500 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>
                {isExpanded && (
                  <div className="space-y-0.5 mt-0.5">
                    {section.entries.map(([key, cfg]) => renderBadgeItem(key, cfg))}
                  </div>
                )}
              </div>
            );
          })}
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
      CONTEXT_BADGE_CONFIG[badgeFilter as ContextBadge] ??
      ADOPTION_BADGE_CONFIG[badgeFilter as AdoptionBadge])
    : null;

  const badgeCounts: Record<string, number> = {};
  for (const row of data) {
    if (row.usage_badge) badgeCounts[row.usage_badge] = (badgeCounts[row.usage_badge] ?? 0) + 1;
    if (row.spend_badge) badgeCounts[row.spend_badge] = (badgeCounts[row.spend_badge] ?? 0) + 1;
    if (row.context_badge)
      badgeCounts[row.context_badge] = (badgeCounts[row.context_badge] ?? 0) + 1;
    if (row.adoption_badge)
      badgeCounts[row.adoption_badge] = (badgeCounts[row.adoption_badge] ?? 0) + 1;
  }

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
        <BadgeLegend
          badgeFilter={badgeFilter}
          onBadgeFilter={onBadgeFilter}
          badgeCounts={badgeCounts}
        />
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
                      {(() => {
                        const allBadges: {
                          key: string;
                          cfg: { label: string; color: string; tooltip: string };
                          priority: number;
                        }[] = [];
                        if (row.spend_badge)
                          allBadges.push({
                            key: row.spend_badge,
                            cfg: SPEND_BADGE_CONFIG[row.spend_badge],
                            priority: 0,
                          });
                        if (row.context_badge)
                          allBadges.push({
                            key: row.context_badge,
                            cfg: CONTEXT_BADGE_CONFIG[row.context_badge],
                            priority: 1,
                          });
                        if (row.adoption_badge)
                          allBadges.push({
                            key: row.adoption_badge,
                            cfg: ADOPTION_BADGE_CONFIG[row.adoption_badge],
                            priority: 2,
                          });
                        if (row.usage_badge)
                          allBadges.push({
                            key: row.usage_badge,
                            cfg: USAGE_BADGE_CONFIG[row.usage_badge],
                            priority: 3,
                          });
                        allBadges.sort((a, b) => a.priority - b.priority);
                        const shown = allBadges.slice(0, 2);
                        const extra = allBadges.length - shown.length;
                        return (
                          <>
                            {shown.map((b) => (
                              <span
                                key={b.key}
                                className={`${b.cfg.color} px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap`}
                                title={b.cfg.tooltip}
                              >
                                {b.cfg.label}
                              </span>
                            ))}
                            {extra > 0 && (
                              <span
                                className="text-[9px] text-zinc-600"
                                title={allBadges
                                  .slice(2)
                                  .map((b) => b.cfg.label)
                                  .join(", ")}
                              >
                                +{extra}
                              </span>
                            )}
                          </>
                        );
                      })()}
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
