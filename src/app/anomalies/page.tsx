import { getAnomalyTimeline } from "@/lib/db";
import { AnomaliesClient } from "./anomalies-client";

export const dynamic = "force-dynamic";

export default function AnomaliesPage() {
  let timeline;
  try {
    timeline = getAnomalyTimeline(30);
  } catch {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Anomalies</h1>
        <p className="text-zinc-400">No data available yet. Run the collector first.</p>
      </div>
    );
  }

  return <AnomaliesClient timeline={timeline} />;
}
