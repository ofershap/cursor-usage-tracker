import { NextResponse } from "next/server";
import {
  getAnalyticsDAU,
  getAnalyticsModelUsageSummary,
  getAnalyticsModelUsageTrend,
  getAnalyticsAgentEditsTrend,
  getAnalyticsTabsTrend,
  getAnalyticsMCPSummary,
  getAnalyticsFileExtensionsSummary,
  getAnalyticsClientVersionsSummary,
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
      fileExtensions: getAnalyticsFileExtensionsSummary(days),
      clientVersions: getAnalyticsClientVersionsSummary(),
    });
  } catch {
    return NextResponse.json({ error: "No analytics data yet" }, { status: 404 });
  }
}
