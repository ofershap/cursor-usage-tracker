import type { Anomaly, DetectionConfig } from "../types";
import { getDb } from "../db";

export function detectThresholdAnomalies(config: DetectionConfig): Anomaly[] {
  const db = getDb();
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();

  const spenders = db
    .prepare(
      `SELECT email, name, spend_cents, included_spend_cents, fast_premium_requests
       FROM spending WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending)`,
    )
    .all() as Array<{
    email: string;
    name: string;
    spend_cents: number;
    included_spend_cents: number;
    fast_premium_requests: number;
  }>;

  for (const s of spenders) {
    if (
      config.thresholds.maxSpendCentsPerCycle > 0 &&
      s.spend_cents > config.thresholds.maxSpendCentsPerCycle
    ) {
      anomalies.push({
        userEmail: s.email,
        type: "threshold",
        severity:
          s.spend_cents > config.thresholds.maxSpendCentsPerCycle * 2 ? "critical" : "warning",
        metric: "spend",
        value: s.spend_cents,
        threshold: config.thresholds.maxSpendCentsPerCycle,
        message: `${s.name}: spend $${(s.spend_cents / 100).toFixed(2)} exceeds limit $${(config.thresholds.maxSpendCentsPerCycle / 100).toFixed(2)} (${s.fast_premium_requests} premium reqs)`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: null,
        diagnosisKind: null,
        diagnosisDelta: null,
      });
    }
  }

  const today = new Date().toISOString().split("T")[0] ?? "";
  const dailyRequests = db
    .prepare(
      `SELECT email, agent_requests, usage_based_reqs, most_used_model
       FROM daily_usage
       WHERE date = ? AND is_active = 1`,
    )
    .all(today) as Array<{
    email: string;
    agent_requests: number;
    usage_based_reqs: number;
    most_used_model: string;
  }>;

  for (const r of dailyRequests) {
    if (
      config.thresholds.maxRequestsPerDay > 0 &&
      r.agent_requests > config.thresholds.maxRequestsPerDay
    ) {
      anomalies.push({
        userEmail: r.email,
        type: "threshold",
        severity:
          r.agent_requests > config.thresholds.maxRequestsPerDay * 2 ? "critical" : "warning",
        metric: "requests",
        value: r.agent_requests,
        threshold: config.thresholds.maxRequestsPerDay,
        message: `${r.agent_requests} agent requests today exceeds limit of ${config.thresholds.maxRequestsPerDay} (model: ${r.most_used_model})`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: r.most_used_model || null,
        diagnosisKind: null,
        diagnosisDelta: null,
      });
    }
  }

  return anomalies;
}
