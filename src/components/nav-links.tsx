"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useViewer } from "@/components/access";
import { isRestricted } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/insights", label: "Insights", feature: "insights" },
  { href: "/anomalies", label: "Anomalies", feature: "anomalies" },
  { href: "/settings", label: "Settings", feature: "settings" },
];

export function NavLinks() {
  const pathname = usePathname();
  const viewer = useViewer();

  return (
    <>
      {LINKS.filter((l) => !l.feature || !isRestricted(viewer, l.feature)).map(
        ({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 text-sm transition-colors rounded-md ${
                active
                  ? "text-white bg-zinc-800/60"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {label}
            </Link>
          );
        },
      )}
    </>
  );
}
