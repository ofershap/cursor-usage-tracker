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

  const cycleStartRow = db.prepare("SELECT MAX(cycle_start) as cs FROM spending").get() as {
    cs: string | null;
  };
  const cycleStart = cycleStartRow?.cs;

  if (cycleStart) {
    const planExhausted = db
      .prepare(
        `SELECT du.email, m.name, MIN(du.date) as exhausted_on,
           SUM(du.usage_based_reqs) as total_usage_reqs,
           SUM(du.agent_requests) as total_agent_reqs
         FROM daily_usage du
         LEFT JOIN members m ON du.email = m.email
         WHERE du.date >= ? AND du.usage_based_reqs > 0
         GROUP BY du.email`,
      )
      .all(cycleStart) as Array<{
      email: string;
      name: string | null;
      exhausted_on: string;
      total_usage_reqs: number;
      total_agent_reqs: number;
    }>;

    for (const u of planExhausted) {
      const name = u.name ?? u.email;
      const dayNum =
        Math.floor(
          (new Date(u.exhausted_on).getTime() - new Date(cycleStart).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1;
      anomalies.push({
        userEmail: u.email,
        type: "threshold",
        severity: "info",
        metric: "plan_exhausted",
        value: u.total_usage_reqs,
        threshold: 0,
        message: `${name}: exceeded included plan usage on day ${dayNum} of cycle (${u.exhausted_on}). ${u.total_usage_reqs} extra requests billed since.`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: null,
        diagnosisKind: null,
        diagnosisDelta: null,
      });
    }
  }

  const limitedRow = db
    .prepare("SELECT value FROM metadata WHERE key = 'limited_users_count'")
    .get() as { value: string } | undefined;
  const limitedCount = limitedRow ? parseInt(limitedRow.value, 10) : 0;

  if (limitedCount > 0) {
    anomalies.push({
      userEmail: "team",
      type: "threshold",
      severity: "warning",
      metric: "users_limited",
      value: limitedCount,
      threshold: 0,
      message: `${limitedCount} team members are limited and unable to make requests. Review team spend limits on the Cursor dashboard.`,
      detectedAt: now,
      resolvedAt: null,
      alertedAt: null,
      diagnosisModel: null,
      diagnosisKind: null,
      diagnosisDelta: null,
    });
  }

  const budgetRow = db
    .prepare("SELECT value FROM metadata WHERE key = 'team_budget_threshold'")
    .get() as { value: string } | undefined;
  const budgetThreshold = budgetRow ? parseFloat(budgetRow.value) : 0;

  if (budgetThreshold > 0) {
    const teamSpendRow = db
      .prepare(
        `SELECT COALESCE(SUM(spend_cents), 0) as total FROM spending
         WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending)`,
      )
      .get() as { total: number };
    const teamSpendDollars = teamSpendRow.total / 100;

    if (teamSpendDollars >= budgetThreshold) {
      anomalies.push({
        userEmail: "team",
        type: "threshold",
        severity: teamSpendDollars >= budgetThreshold * 1.1 ? "critical" : "warning",
        metric: "team_budget",
        value: Math.round(teamSpendDollars * 100),
        threshold: Math.round(budgetThreshold * 100),
        message: `Team spend $${Math.round(teamSpendDollars).toLocaleString()} has reached the $${Math.round(budgetThreshold).toLocaleString()} budget threshold (${Math.round((teamSpendDollars / budgetThreshold) * 100)}%).`,
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
