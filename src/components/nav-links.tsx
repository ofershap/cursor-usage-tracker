"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview", ranged: true },
  { href: "/insights", label: "Insights", ranged: true },
  { href: "/anomalies", label: "Anomalies" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks() {
  const pathname = usePathname();
  const range = useSearchParams().get("range");

  return (
    <>
      {LINKS.map(({ href, label, ranged }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={ranged && range ? `${href}?range=${encodeURIComponent(range)}` : href}
            className={`px-3 py-2 text-sm transition-colors rounded-md ${
              active
                ? "text-white bg-zinc-800/60"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
