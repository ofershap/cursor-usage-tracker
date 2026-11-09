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
  getCycleWindowDays,
} from "@/lib/data";
import { parseRange } from "@/lib/time-range";
import { InsightsClient } from "./insights-client";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams).range);
  try {
    const days = range === "cycle" ? getCycleWindowDays() : range;
    const data = {
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
      modelEfficiency: getModelEfficiency(undefined, days),
      planExhaustion: getPlanExhaustionStats(),
      repoAttribution: getRepoAIAttribution(days),
    };

    const groups = getGroupsWithMembers();

    return <InsightsClient initialData={data} initialRange={range} groups={groups} />;
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
