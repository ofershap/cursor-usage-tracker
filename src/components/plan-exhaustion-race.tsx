"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { UserLink } from "@/components/access";

interface Runner {
  email: string;
  name: string;
  days_to_exhaust: number;
  usage_based_reqs: number;
}

interface Props {
  exhausted: number;
  total: number;
  pctExhausted: number;
  users: Runner[];
}

const FINISH_LINE_PCT = 55;
const RUNNER_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#6366f1",
  "#f97316",
  "#14b8a6",
  "#ef4444",
];

function seededRand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function StickFigure({ color, running }: { color: string; running?: boolean }) {
  if (running) {
    return (
      <svg viewBox="0 0 28 32" width="15" height="21" className="block">
        <circle cx="15" cy="4.5" r="3" fill={color} />
        <line
          x1="14"
          y1="7.5"
          x2="13"
          y2="16"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <line
          x1="13.5"
          y1="10"
          x2="8"
          y2="13"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="13.5"
          y1="10"
          x2="19"
          y2="8"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="13"
          y1="16"
          x2="8"
          y2="24"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          x1="13"
          y1="16"
          x2="19"
          y2="22"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 32" width="13" height="19" className="block">
      <circle cx="12" cy="5" r="3" fill={color} />
      <line x1="12" y1="8" x2="12" y2="17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line
        x1="12"
        y1="11"
        x2="7.5"
        y2="14.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="11"
        x2="16.5"
        y2="14"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17"
        x2="8.5"
        y2="25"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17"
        x2="15.5"
        y2="25"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ComputedRunner {
  id: string;
  name: string;
  email: string;
  crossed: boolean;
  color: string;
  stopPct: number;
  row: number;
  delay: number;
  duration: number;
}

export function PlanExhaustionRaceBanner({ exhausted, total, pctExhausted, users }: Props) {
  const safe = total - exhausted;
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!trackRef.current) return;
    const measure = () => setTrackWidth(trackRef.current?.offsetWidth ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (trackWidth <= 0) return;
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, [trackWidth]);

  const allRunners = useMemo((): ComputedRunner[] => {
    const maxDisplay = 30;
    const exhaustedRatio = exhausted / total;
    const exhaustedCount = Math.min(exhausted, Math.max(2, Math.ceil(exhaustedRatio * maxDisplay)));
    const safeCount = Math.min(safe, maxDisplay - exhaustedCount);
    const totalRunners = exhaustedCount + safeCount;
    const rows = Math.min(6, Math.ceil(totalRunners / 3));

    const all: ComputedRunner[] = [];

    for (let i = 0; i < exhaustedCount; i++) {
      const stopPct = FINISH_LINE_PCT + 6 + seededRand(i + 100) * (92 - FINISH_LINE_PCT - 8);
      all.push({
        id: `e-${i}`,
        name: users[i]?.name || users[i]?.email?.split("@")[0] || "",
        email: users[i]?.email || "",
        crossed: true,
        color: RUNNER_COLORS[i % RUNNER_COLORS.length] ?? "#3b82f6",
        stopPct,
        row: i % rows,
        delay: seededRand(i + 200) * 0.4,
        duration: 1.4 + seededRand(i + 250) * 0.8,
      });
    }

    for (let i = 0; i < safeCount; i++) {
      const stopPct = 15 + seededRand(i + 300) * (FINISH_LINE_PCT - 20);
      all.push({
        id: `s-${i}`,
        name: "",
        email: "",
        crossed: false,
        color: RUNNER_COLORS[(i + 3) % RUNNER_COLORS.length] ?? "#52525b",
        stopPct,
        row: (i + exhaustedCount) % rows,
        delay: seededRand(i + 400) * 0.3,
        duration: 1.8 + seededRand(i + 450) * 1.0,
      });
    }

    return all;
  }, [exhausted, safe, total, users]);

  const rowCount = useMemo(() => Math.max(...allRunners.map((r) => r.row)) + 1, [allRunners]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes dashMove {
          0% { stroke-dashoffset: 10; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .finish-dash {
          stroke-dasharray: 6 4;
          animation: dashMove 0.6s linear infinite;
        }
        .stat-fade {
          animation: fadeUp 0.4s ease-out both;
        }
      `}</style>

      <div
        ref={trackRef}
        className="relative w-full"
        style={{ height: Math.max(90, rowCount * 22 + 28) }}
      >
        {/* Track lanes */}
        {Array.from({ length: rowCount + 1 }, (_, i) => {
          const y = 10 + i * 22;
          return (
            <div
              key={i}
              className="absolute inset-x-0 h-px bg-zinc-800/15"
              style={{ top: y - 2 }}
            />
          );
        })}

        {/* Finish line */}
        <div className="absolute top-0 bottom-0 w-[2px]" style={{ left: `${FINISH_LINE_PCT}%` }}>
          <svg width="2" height="100%" className="absolute inset-0">
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="100%"
              stroke="#ef4444"
              strokeWidth="2"
              className="finish-dash"
              opacity="0.5"
            />
          </svg>
          <div className="absolute -translate-x-1/2 left-1/2" style={{ top: -1 }}>
            <div className="text-[7px] text-red-400/50 font-semibold tracking-[0.15em] whitespace-nowrap px-1.5 py-px bg-zinc-900 rounded-sm">
              PLAN LIMIT
            </div>
          </div>
        </div>

        {/* Red glow past finish */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: `${FINISH_LINE_PCT}%`,
            right: 0,
            background: "linear-gradient(to right, rgba(239,68,68,0.04), transparent 50%)",
          }}
        />

        {/* Total label */}
        <div
          className="absolute left-2.5 bottom-0.5 stat-fade z-10"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-zinc-400 tabular-nums">{total}</span>
            <span className="text-[7px] text-zinc-600 leading-tight">
              active
              <br />
              users
            </span>
          </div>
        </div>

        {/* Exceeded label */}
        <div
          className="absolute right-2.5 bottom-0.5 stat-fade z-10"
          style={{ animationDelay: "0.6s" }}
        >
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-red-400 tabular-nums">{exhausted}</span>
            <span className="text-[7px] text-zinc-600 leading-tight">
              exceeded
              <br />
              <span className="text-red-400/50">{pctExhausted}%</span>
            </span>
          </div>
        </div>

        {/* Runners */}
        {allRunners.map((r) => {
          const stopPx = trackWidth > 0 ? (r.stopPct / 100) * trackWidth : 0;
          const topPx = 10 + r.row * 22;
          const isReady = trackWidth > 0;

          return (
            <div
              key={r.id}
              className="absolute"
              style={{
                left: 0,
                top: topPx,
                transform: isReady && animated ? `translateX(${stopPx}px)` : "translateX(8px)",
                transition:
                  isReady && animated
                    ? `transform ${r.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${r.delay}s`
                    : "none",
                zIndex: r.crossed ? 10 : 5,
              }}
            >
              {r.crossed ? (
                <UserLink email={r.email} className="group relative block" title={r.name}>
                  <StickFigure color={r.color} running />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[7px] text-zinc-200 shadow-lg pointer-events-none z-20">
                    {r.name}
                  </div>
                </UserLink>
              ) : (
                <div className="opacity-30">
                  <StickFigure color={r.color} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-zinc-800/40 bg-zinc-950/30">
        <span className="text-[9px] text-zinc-500">
          Billing cycle day {new Date().getDate()} &middot; Users past their included plan allowance
        </span>
        <Link
          href="/?exhaustion=1-999"
          className="text-[9px] text-blue-400/80 hover:text-blue-300 transition-colors"
        >
          View all &rarr;
        </Link>
      </div>
    </div>
  );
}
