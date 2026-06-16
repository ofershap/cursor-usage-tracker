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
  getModelEfficiency,
  getPlanExhaustionStats,
  getGroupsWithMembers,
  getRepoAIAttribution,
} from "@/lib/data";
import { InsightsClient } from "./insights-client";

export const dynamic = "force-dynamic";

function safe<T>(label: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    console.error(`[insights] ${label} failed:`, err);
    return fallback;
  }
}

export default function InsightsPage() {
  const data = {
    dau: safe("getAnalyticsDAU", () => getAnalyticsDAU(30), []),
    modelSummary: safe(
      "getAnalyticsModelUsageSummary",
      () => getAnalyticsModelUsageSummary(30),
      [],
    ),
    modelTrend: safe("getAnalyticsModelUsageTrend", () => getAnalyticsModelUsageTrend(30), []),
    agentEdits: safe("getAnalyticsAgentEditsTrend", () => getAnalyticsAgentEditsTrend(30), []),
    tabs: safe("getAnalyticsTabsTrend", () => getAnalyticsTabsTrend(30), []),
    mcp: safe("getAnalyticsMCPSummary", () => getAnalyticsMCPSummary(30), []),
    commands: safe("getAnalyticsCommandsSummary", () => getAnalyticsCommandsSummary(30), []),
    fileExtensions: safe(
      "getAnalyticsFileExtensionsSummary",
      () => getAnalyticsFileExtensionsSummary(30),
      [],
    ),
    clientVersions: safe(
      "getAnalyticsClientVersionsSummary",
      () => getAnalyticsClientVersionsSummary(),
      [],
    ),
    versionUsers: safe("getUsersByClientVersion", () => getUsersByClientVersion(), {}),
    modelEfficiency: safe("getModelEfficiency", () => getModelEfficiency(), []),
    planExhaustion: safe("getPlanExhaustionStats", () => getPlanExhaustionStats(), {
      summary: {
        users_exhausted: 0,
        total_active: 0,
        avg_days: 0,
        median_days: 0,
        pct_exhausted: 0,
      },
      users: [],
    }),
    repoAttribution: safe("getRepoAIAttribution", () => getRepoAIAttribution(30), []),
  };

  const groups = safe("getGroupsWithMembers", () => getGroupsWithMembers(), []);

  return <InsightsClient initialData={data} groups={groups} />;
}
