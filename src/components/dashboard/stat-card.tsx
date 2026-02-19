"use client";

import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  alert?: boolean;
  href?: string;
}

export function StatCard({ title, value, subtitle, trend, alert, href }: StatCardProps) {
  const borderColor = alert ? "border-red-500/50" : "border-zinc-800";

  const trendColor =
    trend === "up" ? "text-red-400" : trend === "down" ? "text-green-400" : "text-zinc-400";

  const content = (
    <>
      <p className="text-xs text-zinc-400 mb-0.5">{title}</p>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className={`text-xs mt-0.5 ${trendColor}`}>{subtitle}</p>}
    </>
  );

  const className = `bg-zinc-900 rounded-lg border ${borderColor} px-4 py-3 ${href ? "hover:bg-zinc-800/70 transition-colors cursor-pointer" : ""}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
