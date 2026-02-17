import type { Anomaly, DetectionConfig } from "../types";
import { getDb } from "../db";

function computeZScore(value: number, mean: number, stddev: number): number {
  if (stddev === 0) return value > mean ? Infinity : 0;
  return (value - mean) / stddev;
}

export function detectZScoreAnomalies(config: DetectionConfig): Anomaly[] {
  const db = getDb();
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();
  const { multiplier, windowDays } = config.zscore;

  const latestDate = db
    .prepare("SELECT MAX(date) as d FROM daily_usage WHERE is_active = 1")
    .get() as { d: string | null };

  if (!latestDate.d) return anomalies;
  const targetDate = latestDate.d;

  const todayStats = db
    .prepare(
      `SELECT email, agent_requests, usage_based_reqs, most_used_model
       FROM daily_usage
       WHERE date = ? AND is_active = 1`,
    )
    .all(targetDate) as Array<{
    email: string;
    agent_requests: number;
    usage_based_reqs: number;
    most_used_model: string;
  }>;

  if (todayStats.length < 5) return anomalies;

  const historyStats = db
    .prepare(
      `SELECT email,
              AVG(agent_requests) as avg_requests,
              COUNT(*) as days_count
       FROM daily_usage
       WHERE date < ? AND date >= date(?, ?) AND is_active = 1
       GROUP BY email`,
    )
    .all(targetDate, targetDate, `-${windowDays} days`) as Array<{
    email: string;
    avg_requests: number;
    days_count: number;
  }>;

  const histMap = new Map(historyStats.map((h) => [h.email, h]));

  const allRequests = todayStats.map((s) => s.agent_requests);
  const teamMean = allRequests.reduce((a, b) => a + b, 0) / allRequests.length;
  const teamStddev = Math.sqrt(
    allRequests.reduce((sum, v) => sum + (v - teamMean) ** 2, 0) / allRequests.length,
  );

  const allUsageBased = todayStats.map((s) => s.usage_based_reqs);
  const teamUsageMean = allUsageBased.reduce((a, b) => a + b, 0) / allUsageBased.length;
  const teamUsageStddev = Math.sqrt(
    allUsageBased.reduce((sum, v) => sum + (v - teamUsageMean) ** 2, 0) / allUsageBased.length,
  );

  for (const user of todayStats) {
    const reqZ = computeZScore(user.agent_requests, teamMean, teamStddev);
    if (reqZ > multiplier) {
      const hist = histMap.get(user.email);
      anomalies.push({
        userEmail: user.email,
        type: "zscore",
        severity: reqZ > multiplier * 1.5 ? "critical" : "warning",
        metric: "requests",
        value: user.agent_requests,
        threshold: teamMean + multiplier * teamStddev,
        message: `${user.agent_requests} agent requests on ${targetDate} is ${reqZ.toFixed(1)} std devs above team mean (${teamMean.toFixed(0)}) — model: ${user.most_used_model}`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: user.most_used_model || null,
        diagnosisKind: null,
        diagnosisDelta: hist ? user.agent_requests - hist.avg_requests : null,
      });
    }

    const usageZ = computeZScore(user.usage_based_reqs, teamUsageMean, teamUsageStddev);
    if (usageZ > multiplier && reqZ <= multiplier) {
      anomalies.push({
        userEmail: user.email,
        type: "zscore",
        severity: usageZ > multiplier * 1.5 ? "critical" : "warning",
        metric: "usage_based",
        value: user.usage_based_reqs,
        threshold: teamUsageMean + multiplier * teamUsageStddev,
        message: `${user.usage_based_reqs} usage-based requests on ${targetDate} is ${usageZ.toFixed(1)} std devs above team mean (${teamUsageMean.toFixed(0)})`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: user.most_used_model || null,
        diagnosisKind: null,
        diagnosisDelta: null,
      });
    }
  }

  return anomalies;
}
