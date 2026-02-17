import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collector";
import { runDetection } from "@/lib/anomaly/detector";
import { processNewAnomalies } from "@/lib/incidents";
import { sendAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  try {
    const collectionResult = await collectAll();
    results.collection = collectionResult;
  } catch (error) {
    results.collection = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const detectionResult = runDetection();
    results.detection = {
      newAnomalies: detectionResult.newAnomalies.length,
      resolved: detectionResult.resolvedCount,
      totalOpen: detectionResult.totalOpen,
    };

    if (detectionResult.newAnomalies.length > 0) {
      const pairs = processNewAnomalies(detectionResult.newAnomalies);
      const alertResult = await sendAlerts(pairs, {
        dashboardUrl: process.env.DASHBOARD_URL,
      });
      results.alerts = alertResult;
    }
  } catch (error) {
    results.detection = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  results.durationMs = Date.now() - startTime;

  return NextResponse.json(results);
}
