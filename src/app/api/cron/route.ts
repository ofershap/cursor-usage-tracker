import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collector";
import { runDetection } from "@/lib/anomaly/detector";
import { processNewAnomalies } from "@/lib/incidents";
import { sendAlerts } from "@/lib/alerts";
import { sendPlanExhaustionAlert, sendCycleSummary } from "@/lib/alerts/slack";
import { getMetadata, setMetadata, getPlanExhaustionStats, getCycleSummaryData } from "@/lib/db";

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

    const alertable = detectionResult.newAnomalies.filter((a) => a.severity !== "info");
    if (alertable.length > 0) {
      const pairs = processNewAnomalies(alertable);
      const alertResult = await sendAlerts(pairs, {
        dashboardUrl: process.env.DASHBOARD_URL,
      });
      results.alerts = alertResult;
    }

    const infoOnly = detectionResult.newAnomalies.filter((a) => a.severity === "info");
    if (infoOnly.length > 0) {
      processNewAnomalies(infoOnly);
      results.infoAnomalies = infoOnly.length;
    }
  } catch (error) {
    results.detection = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const today = new Date().toISOString().split("T")[0] ?? "";
    const lastExhaustionAlert = getMetadata("last_plan_exhaustion_alert");

    if (lastExhaustionAlert !== today) {
      const planStats = getPlanExhaustionStats();
      if (planStats.summary.users_exhausted > 0) {
        const sent = await sendPlanExhaustionAlert(
          {
            totalPlanExhausted: planStats.summary.users_exhausted,
            totalActive: planStats.summary.total_active,
          },
          { dashboardUrl: process.env.DASHBOARD_URL },
        );
        if (sent) {
          setMetadata("last_plan_exhaustion_alert", today);
          results.planExhaustionAlert = "sent";
        } else {
          results.planExhaustionAlert = "failed";
        }
      } else {
        results.planExhaustionAlert = "none_exhausted";
      }
    } else {
      results.planExhaustionAlert = "already_sent_today";
    }
  } catch (error) {
    results.planExhaustionAlert = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const cycleEnd = getMetadata("cycle_end");
    const cycleStart = getMetadata("cycle_start");
    const lastCycleSummary = getMetadata("last_cycle_summary");

    if (cycleEnd && cycleStart && lastCycleSummary !== cycleStart) {
      const daysRemaining = Math.ceil((new Date(cycleEnd).getTime() - Date.now()) / 86_400_000);

      if (daysRemaining <= 3 && daysRemaining >= 0) {
        const summaryData = getCycleSummaryData();
        if (summaryData) {
          const sent = await sendCycleSummary(summaryData, {
            dashboardUrl: process.env.DASHBOARD_URL,
          });
          if (sent) {
            setMetadata("last_cycle_summary", cycleStart);
            results.cycleSummary = "sent";
          } else {
            results.cycleSummary = "failed";
          }
        } else {
          results.cycleSummary = "no_data";
        }
      } else {
        results.cycleSummary = `not_due (${daysRemaining} days remaining)`;
      }
    } else if (lastCycleSummary === cycleStart) {
      results.cycleSummary = "already_sent_this_cycle";
    } else {
      results.cycleSummary = "no_cycle_data";
    }
  } catch (error) {
    results.cycleSummary = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  results.durationMs = Date.now() - startTime;

  return NextResponse.json(results);
}
