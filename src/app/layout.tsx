import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cursor Usage Tracker",
  description: "Monitor Cursor IDE usage, detect anomalies, and alert on spending spikes",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-zinc-800"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-11">
              <div className="flex items-center gap-1">
                <Link href="/" className="text-sm font-semibold text-white mr-4">
                  Cursor Tracker
                </Link>
                <NavLink href="/">Overview</NavLink>
                <NavLink href="/insights">Insights</NavLink>
                <NavLink href="/anomalies">Anomalies</NavLink>
                <NavLink href="/settings">Settings</NavLink>
              </div>
              <div className="text-xs text-zinc-500">cursor-usage-tracker</div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">{children}</main>
      </body>
    </html>
  );
}
