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
  getModelEfficiency,
  getCycleWindowDays,
  getGroupsWithMembers,
  getRepoAIAttribution,
} from "@/lib/data";

export const dynamic = "force-dynamic";

function resolveGroupEmails(group: string): string[] | undefined {
  if (!group || group === "all") return undefined;
  const groups = getGroupsWithMembers();

  if (group.startsWith("parent:")) {
    const prefix = group.replace("parent:", "");
    const emails = new Set<string>();
    for (const g of groups) {
      if (g.name === prefix || g.name.startsWith(prefix + " > ")) {
        for (const e of g.emails) emails.add(e);
      }
    }
    return emails.size > 0 ? [...emails] : undefined;
  }

  const found = groups.find((g) => g.id === group);
  return found?.emails.length ? found.emails : undefined;
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const param = searchParams.get("days") ?? "30";
  const days = param === "cycle" ? getCycleWindowDays() : parseInt(param, 10) || 30;
  const group = searchParams.get("group") ?? "all";
  const emails = resolveGroupEmails(group);

  try {
    return NextResponse.json({
      dau: getAnalyticsDAU(days),
      modelSummary: getAnalyticsModelUsageSummary(days),
      modelTrend: getAnalyticsModelUsageTrend(days),
      agentEdits: getAnalyticsAgentEditsTrend(days),
      tabs: getAnalyticsTabsTrend(days),
      mcp: getAnalyticsMCPSummary(days, emails),
      commands: getAnalyticsCommandsSummary(days, emails),
      fileExtensions: getAnalyticsFileExtensionsSummary(days),
      clientVersions: getAnalyticsClientVersionsSummary(),
      versionUsers: getUsersByClientVersion(),
      planExhaustion: getPlanExhaustionStats(emails),
      modelEfficiency: getModelEfficiency(emails, days),
      repoAttribution: getRepoAIAttribution(days, emails),
    });
  } catch {
    return NextResponse.json({ error: "No analytics data yet" }, { status: 404 });
  }
}
