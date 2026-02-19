import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collector";
import { runDetection } from "@/lib/anomaly/detector";
import { processNewAnomalies } from "@/lib/incidents";
import { sendAlerts } from "@/lib/alerts";
import { sendDailySummary } from "@/lib/alerts/slack";
import { getMetadata, setMetadata, getDb, getOpenAnomalies } from "@/lib/db";
import { getPlanExhaustionStats } from "@/lib/db";

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
    const lastSummary = getMetadata("last_daily_summary");

    if (lastSummary !== today) {
      const db = getDb();
      const hasUE =
        (db.prepare("SELECT COUNT(*) as c FROM usage_events").get() as { c: number }).c > 0;

      const spendRow = hasUE
        ? (db
            .prepare(`SELECT COALESCE(ROUND(SUM(total_cents)), 0) as total FROM usage_events`)
            .get() as { total: number })
        : (db
            .prepare(
              `SELECT COALESCE(SUM(spend_cents), 0) as total
               FROM (SELECT email, MAX(spend_cents) as spend_cents FROM spending
                     WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending)
                     GROUP BY email)`,
            )
            .get() as { total: number });

      const topSpenders = hasUE
        ? (db
            .prepare(
              `SELECT COALESCE(m.name, ue.user_email) as name, ROUND(SUM(ue.total_cents)) as spend
               FROM usage_events ue LEFT JOIN members m ON ue.user_email = m.email
               GROUP BY ue.user_email HAVING spend > 0
               ORDER BY spend DESC LIMIT 5`,
            )
            .all() as Array<{ name: string; spend: number }>)
        : (db
            .prepare(
              `SELECT COALESCE(m.name, s.email) as name, s.spend_cents as spend
               FROM spending s LEFT JOIN members m ON s.email = m.email
               WHERE s.cycle_start = (SELECT MAX(cycle_start) FROM spending) AND s.spend_cents > 0
               ORDER BY s.spend_cents DESC LIMIT 5`,
            )
            .all() as Array<{ name: string; spend: number }>);

      const limitedRow = db
        .prepare("SELECT value FROM metadata WHERE key = 'limited_users_count'")
        .get() as { value: string } | undefined;

      const planStats = getPlanExhaustionStats();
      const openAnomalies = getOpenAnomalies().length;

      const budgetRow = db
        .prepare("SELECT value FROM metadata WHERE key = 'team_budget_threshold'")
        .get() as { value: string } | undefined;

      const sent = await sendDailySummary(
        {
          totalSpendDollars: Math.round(spendRow.total / 100),
          limitedUsersCount: limitedRow ? parseInt(limitedRow.value, 10) : 0,
          newPlanExhausted: 0,
          totalPlanExhausted: planStats.summary.users_exhausted,
          totalActive: planStats.summary.total_active,
          topSpenders: topSpenders.map((t) => ({
            name: t.name,
            spend: Math.round(t.spend / 100),
          })),
          openAnomalies,
          budgetThreshold: budgetRow ? parseFloat(budgetRow.value) : undefined,
        },
        {
          dashboardUrl: process.env.DASHBOARD_URL,
          cursorDashboardUrl: "https://cursor.com/dashboard",
        },
      );

      if (sent) {
        setMetadata("last_daily_summary", today);
        results.dailySummary = "sent";
      } else {
        results.dailySummary = "failed";
      }
    } else {
      results.dailySummary = "already_sent_today";
    }
  } catch (error) {
    results.dailySummary = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  results.durationMs = Date.now() - startTime;

  return NextResponse.json(results);
}
