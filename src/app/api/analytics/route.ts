import { NextResponse } from "next/server";
import {
  getAnalyticsDAU,
  getAnalyticsModelUsageSummary,
  getAnalyticsModelUsageTrend,
  getAnalyticsAgentEditsTrend,
  getAnalyticsTabsTrend,
  getAnalyticsMCPSummary,
  getAnalyticsCommandsSummary,
  getAnalyticsFileExtensionsSummary,
  getAnalyticsClientVersionsSummary,
  getUsersByClientVersion,
  getPlanExhaustionStats,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  try {
    return NextResponse.json({
      dau: getAnalyticsDAU(days),
      modelSummary: getAnalyticsModelUsageSummary(days),
      modelTrend: getAnalyticsModelUsageTrend(days),
      agentEdits: getAnalyticsAgentEditsTrend(days),
      tabs: getAnalyticsTabsTrend(days),
      mcp: getAnalyticsMCPSummary(days),
      commands: getAnalyticsCommandsSummary(days),
      fileExtensions: getAnalyticsFileExtensionsSummary(days),
      clientVersions: getAnalyticsClientVersionsSummary(),
      versionUsers: getUsersByClientVersion(),
      planExhaustion: getPlanExhaustionStats(),
    });
  } catch {
    return NextResponse.json({ error: "No analytics data yet" }, { status: 404 });
  }
}
