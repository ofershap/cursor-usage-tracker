"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_RANGE, type TimeRange } from "@/lib/time-range";

export type { TimeRange };

const TIME_RANGES: Array<{ label: string; days: TimeRange }> = [
  { label: "24h", days: 1 },
  { label: "3d", days: 3 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "Cycle", days: "cycle" },
];

export function formatTimeLabel(range: TimeRange): string {
  if (range === "cycle") return "cycle";
  return range === 1 ? "24h" : `${range}d`;
}

export function TimeRangeSelector({ value }: { value: TimeRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(range: TimeRange) {
    const params = new URLSearchParams(searchParams);
    if (range === DEFAULT_RANGE) params.delete("range");
    else params.set("range", String(range));
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <div className={`flex bg-zinc-800 rounded-md p-0.5 ${pending ? "opacity-60" : ""}`}>
      {TIME_RANGES.map((r) => (
        <button
          key={r.days}
          onClick={() => select(r.days)}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
            value === r.days ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
