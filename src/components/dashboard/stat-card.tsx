"use client";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  alert?: boolean;
}

export function StatCard({ title, value, subtitle, trend, alert }: StatCardProps) {
  const borderColor = alert ? "border-red-500/50" : "border-zinc-800";

  const trendColor =
    trend === "up" ? "text-red-400" : trend === "down" ? "text-green-400" : "text-zinc-500";

  return (
    <div className={`bg-zinc-900 rounded-xl border ${borderColor} p-6`}>
      <p className="text-sm text-zinc-400 mb-1">{title}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className={`text-sm mt-1 ${trendColor}`}>{subtitle}</p>}
    </div>
  );
}
