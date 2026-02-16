import type { Anomaly, DetectionConfig } from "../types";
import { getDb } from "../db";

export function detectThresholdAnomalies(config: DetectionConfig): Anomaly[] {
  const db = getDb();
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();

  const spenders = db
    .prepare(
      "SELECT email, spend_cents, fast_premium_requests FROM spending WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending)",
    )
    .all() as Array<{
    email: string;
    spend_cents: number;
    fast_premium_requests: number;
  }>;

  for (const s of spenders) {
    if (s.spend_cents > config.thresholds.maxSpendCentsPerCycle) {
      anomalies.push({
        userEmail: s.email,
        type: "threshold",
        severity:
          s.spend_cents > config.thresholds.maxSpendCentsPerCycle * 2 ? "critical" : "warning",
        metric: "spend",
        value: s.spend_cents,
        threshold: config.thresholds.maxSpendCentsPerCycle,
        message: `Spend $${(s.spend_cents / 100).toFixed(2)} exceeds limit $${(config.thresholds.maxSpendCentsPerCycle / 100).toFixed(2)}`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: null,
        diagnosisKind: null,
        diagnosisDelta: null,
      });
    }
  }

  const dailyRequests = db
    .prepare(
      `SELECT user_email, COUNT(*) as cnt
       FROM usage_events
       WHERE timestamp >= datetime('now', '-1 day')
       GROUP BY user_email`,
    )
    .all() as Array<{ user_email: string; cnt: number }>;

  for (const r of dailyRequests) {
    if (r.cnt > config.thresholds.maxRequestsPerDay) {
      anomalies.push({
        userEmail: r.user_email,
        type: "threshold",
        severity: r.cnt > config.thresholds.maxRequestsPerDay * 2 ? "critical" : "warning",
        metric: "requests",
        value: r.cnt,
        threshold: config.thresholds.maxRequestsPerDay,
        message: `${r.cnt} requests today exceeds limit of ${config.thresholds.maxRequestsPerDay}`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: null,
        diagnosisKind: null,
        diagnosisDelta: null,
      });
    }
  }

  const dailyTokens = db
    .prepare(
      `SELECT user_email, SUM(total_tokens) as tokens
       FROM usage_events
       WHERE timestamp >= datetime('now', '-1 day')
       GROUP BY user_email`,
    )
    .all() as Array<{ user_email: string; tokens: number }>;

  for (const t of dailyTokens) {
    if (t.tokens > config.thresholds.maxTokensPerDay) {
      const topModel = db
        .prepare(
          `SELECT model, SUM(total_tokens) as tokens FROM usage_events
           WHERE user_email = ? AND timestamp >= datetime('now', '-1 day')
           GROUP BY model ORDER BY tokens DESC LIMIT 1`,
        )
        .get(t.user_email) as { model: string; tokens: number } | undefined;

      anomalies.push({
        userEmail: t.user_email,
        type: "threshold",
        severity: t.tokens > config.thresholds.maxTokensPerDay * 2 ? "critical" : "warning",
        metric: "tokens",
        value: t.tokens,
        threshold: config.thresholds.maxTokensPerDay,
        message: `${(t.tokens / 1_000_000).toFixed(1)}M tokens today exceeds limit of ${(config.thresholds.maxTokensPerDay / 1_000_000).toFixed(1)}M`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: topModel?.model ?? null,
        diagnosisKind: null,
        diagnosisDelta: t.tokens - config.thresholds.maxTokensPerDay,
      });
    }
  }

  return anomalies;
}
