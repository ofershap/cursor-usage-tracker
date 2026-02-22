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
} from "@/lib/db";
import { InsightsClient } from "./insights-client";

export const dynamic = "force-dynamic";

export default function InsightsPage() {
  try {
    const data = {
      dau: getAnalyticsDAU(30),
      modelSummary: getAnalyticsModelUsageSummary(30),
      modelTrend: getAnalyticsModelUsageTrend(30),
      agentEdits: getAnalyticsAgentEditsTrend(30),
      tabs: getAnalyticsTabsTrend(30),
      mcp: getAnalyticsMCPSummary(30),
      commands: getAnalyticsCommandsSummary(30),
      fileExtensions: getAnalyticsFileExtensionsSummary(30),
      clientVersions: getAnalyticsClientVersionsSummary(),
      versionUsers: getUsersByClientVersion(),
      modelEfficiency: getModelEfficiency(),
      planExhaustion: getPlanExhaustionStats(),
    };

    const groups = getGroupsWithMembers();

    return <InsightsClient initialData={data} groups={groups} />;
  } catch {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Team Insights</h1>
        <p className="text-zinc-400 mb-8">
          No analytics data collected yet. Run the collector first:
        </p>
        <code className="bg-zinc-800 px-4 py-2 rounded-lg text-sm">npm run collect</code>
      </div>
    );
  }
}
