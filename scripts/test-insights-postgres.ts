import * as data from "../src/lib/data/index";

const noArg = new Set([
  "getAnalyticsClientVersionsSummary",
  "getUsersByClientVersion",
  "getModelEfficiency",
  "getPlanExhaustionStats",
  "getGroupsWithMembers",
]);

const tests = [
  "getAnalyticsDAU",
  "getAnalyticsModelUsageSummary",
  "getAnalyticsModelUsageTrend",
  "getAnalyticsAgentEditsTrend",
  "getAnalyticsTabsTrend",
  "getAnalyticsMCPSummary",
  "getAnalyticsCommandsSummary",
  "getAnalyticsFileExtensionsSummary",
  "getAnalyticsClientVersionsSummary",
  "getUsersByClientVersion",
  "getModelEfficiency",
  "getPlanExhaustionStats",
  "getRepoAIAttribution",
  "getGroupsWithMembers",
  "getAnomalyTimeline",
] as const;

let failed = false;

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log("OK", label, detail ?? "");
  } else {
    failed = true;
    console.error("FAIL", label, detail ?? "assertion failed");
  }
}

for (const name of tests) {
  try {
    const fn = data[name] as (...args: unknown[]) => unknown;
    const result = noArg.has(name) ? fn() : fn(30);
    const count = Array.isArray(result)
      ? result.length
      : typeof result === "object" && result !== null
        ? "anomalies" in result
          ? (result as { anomalies: unknown[] }).anomalies.length
          : Object.keys(result).length
        : 1;
    console.log("OK", name, count);
  } catch (err) {
    failed = true;
    console.error("FAIL", name, err instanceof Error ? err.message : err);
  }
}

// BIGINT: dashboard line totals must be numbers, not concatenated strings
try {
  const dash = data.getFullDashboard(30);
  const activity = dash.stats.dailyTeamActivity;
  const linesOk =
    Array.isArray(activity) &&
    activity.every(
      (d) => typeof d.total_lines_added === "number" && Number.isFinite(d.total_lines_added),
    );
  check(
    "getFullDashboard.stats.dailyTeamActivity.total_lines_added",
    linesOk,
    `${activity?.length ?? 0} days`,
  );
  const totalLines = activity.reduce((s, d) => s + d.total_lines_added, 0);
  check(
    "getFullDashboard.totalLinesSum",
    typeof totalLines === "number" && Number.isFinite(totalLines) && totalLines < 1e15,
    String(totalLines),
  );
} catch (err) {
  failed = true;
  console.error("FAIL getFullDashboard", err instanceof Error ? err.message : err);
}

// camelCase: anomaly rows expose userEmail
try {
  const timeline = data.getAnomalyTimeline(30) as {
    anomalies: Array<{ userEmail?: string; detectedAt?: string }>;
  };
  const first = timeline.anomalies[0];
  if (first) {
    check(
      "getAnomalyTimeline.anomaly.userEmail",
      typeof first.userEmail === "string" && first.userEmail.length > 0,
      first.userEmail ?? "(missing)",
    );
    check(
      "getAnomalyTimeline.anomaly.detectedAt",
      typeof first.detectedAt === "string" && first.detectedAt.length > 0,
      first.detectedAt?.slice(0, 24) ?? "(missing)",
    );
  } else {
    console.log("SKIP getAnomalyTimeline camelCase (no anomalies)");
  }
} catch (err) {
  failed = true;
  console.error("FAIL getAnomalyTimeline invariants", err instanceof Error ? err.message : err);
}

process.exit(failed ? 1 : 0);
