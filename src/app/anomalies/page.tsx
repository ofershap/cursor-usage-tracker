import { getAnomalyTimeline } from "@/lib/data";
import { AnomaliesClient } from "./anomalies-client";

export const dynamic = "force-dynamic";

const EMPTY_TIMELINE = {
  anomalies: [],
  incidents: [],
  avgMttdMinutes: null,
  avgMttiMinutes: null,
  avgMttrMinutes: null,
};

export default function AnomaliesPage() {
  let timeline;
  try {
    timeline = getAnomalyTimeline(30);
  } catch (err) {
    console.error("[anomalies] getAnomalyTimeline failed:", err);
    timeline = EMPTY_TIMELINE;
  }

  return <AnomaliesClient timeline={timeline} />;
}
