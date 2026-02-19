import { Suspense } from "react";
import { getFullDashboard } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function HomePage() {
  try {
    const data = getFullDashboard(30);
    return (
      <Suspense>
        <DashboardClient initialData={data} />
      </Suspense>
    );
  } catch {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Welcome to Cursor Usage Tracker</h1>
        <p className="text-zinc-400 mb-8">
          No data collected yet. Run the collector to get started:
        </p>
        <code className="bg-zinc-800 px-4 py-2 rounded-lg text-sm">npm run collect</code>
        <p className="text-zinc-500 text-sm mt-4">Or trigger the cron endpoint: POST /api/cron</p>
      </div>
    );
  }
}
