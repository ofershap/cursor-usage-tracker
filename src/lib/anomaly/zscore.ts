import type { Anomaly, DetectionConfig } from "../types";
import { getDb } from "../db";

interface UserDailyStats {
  user_email: string;
  tokens: number;
  requests: number;
}

function computeZScore(value: number, mean: number, stddev: number): number {
  if (stddev === 0) return value > mean ? Infinity : 0;
  return (value - mean) / stddev;
}

export function detectZScoreAnomalies(config: DetectionConfig): Anomaly[] {
  const db = getDb();
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();
  const { multiplier, windowDays } = config.zscore;

  const todayStats = db
    .prepare(
      `SELECT user_email, SUM(total_tokens) as tokens, COUNT(*) as requests
       FROM usage_events
       WHERE timestamp >= datetime('now', '-1 day')
       GROUP BY user_email`,
    )
    .all() as UserDailyStats[];

  if (todayStats.length === 0) return anomalies;

  const historicalStats = db
    .prepare(
      `SELECT user_email,
              AVG(daily_tokens) as avg_tokens,
              AVG(daily_requests) as avg_requests,
              COUNT(*) as days_count
       FROM (
         SELECT user_email, date(timestamp) as d, SUM(total_tokens) as daily_tokens, COUNT(*) as daily_requests
         FROM usage_events
         WHERE timestamp >= datetime('now', ?) AND timestamp < datetime('now', '-1 day')
         GROUP BY user_email, date(timestamp)
       )
       GROUP BY user_email`,
    )
    .all(`-${windowDays} days`) as Array<{
    user_email: string;
    avg_tokens: number;
    avg_requests: number;
    days_count: number;
  }>;

  const histMap = new Map(historicalStats.map((h) => [h.user_email, h]));

  const allTokens = todayStats.map((s) => s.tokens);
  const teamMean = allTokens.reduce((a, b) => a + b, 0) / allTokens.length;
  const teamStddev = Math.sqrt(
    allTokens.reduce((sum, v) => sum + (v - teamMean) ** 2, 0) / allTokens.length,
  );

  const allRequests = todayStats.map((s) => s.requests);
  const teamReqMean = allRequests.reduce((a, b) => a + b, 0) / allRequests.length;
  const teamReqStddev = Math.sqrt(
    allRequests.reduce((sum, v) => sum + (v - teamReqMean) ** 2, 0) / allRequests.length,
  );

  for (const user of todayStats) {
    const tokenZ = computeZScore(user.tokens, teamMean, teamStddev);
    if (tokenZ > multiplier) {
      const hist = histMap.get(user.user_email);
      const topModel = db
        .prepare(
          `SELECT model, SUM(total_tokens) as tokens FROM usage_events
           WHERE user_email = ? AND timestamp >= datetime('now', '-1 day')
           GROUP BY model ORDER BY tokens DESC LIMIT 1`,
        )
        .get(user.user_email) as { model: string; tokens: number } | undefined;

      anomalies.push({
        userEmail: user.user_email,
        type: "zscore",
        severity: tokenZ > multiplier * 1.5 ? "critical" : "warning",
        metric: "tokens",
        value: user.tokens,
        threshold: teamMean + multiplier * teamStddev,
        message: `Token usage ${(user.tokens / 1_000_000).toFixed(1)}M is ${tokenZ.toFixed(1)} std devs above team mean (${(teamMean / 1_000_000).toFixed(1)}M)`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: topModel?.model ?? null,
        diagnosisKind: null,
        diagnosisDelta: hist ? user.tokens - hist.avg_tokens : null,
      });
    }

    const reqZ = computeZScore(user.requests, teamReqMean, teamReqStddev);
    if (reqZ > multiplier) {
      anomalies.push({
        userEmail: user.user_email,
        type: "zscore",
        severity: reqZ > multiplier * 1.5 ? "critical" : "warning",
        metric: "requests",
        value: user.requests,
        threshold: teamReqMean + multiplier * teamReqStddev,
        message: `${user.requests} requests today is ${reqZ.toFixed(1)} std devs above team mean (${teamReqMean.toFixed(0)})`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: null,
        diagnosisKind: null,
        diagnosisDelta: null,
      });
    }
  }

  return anomalies;
}
