import type { Anomaly, DetectionConfig } from "../types";
import { getDb } from "../db";

const MIN_DAILY_SPEND_CENTS = 5000;
const MIN_CYCLE_MEDIAN_CENTS = 1000;

export function detectTrendAnomalies(config: DetectionConfig): Anomaly[] {
  const db = getDb();
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();
  const { spendSpikeMultiplier, spendSpikeLookbackDays, cycleOutlierMultiplier } = config.trends;

  detectSpendSpikes(db, anomalies, now, spendSpikeMultiplier, spendSpikeLookbackDays);
  detectCycleOutliers(db, anomalies, now, cycleOutlierMultiplier);

  return anomalies;
}

function detectSpendSpikes(
  db: ReturnType<typeof getDb>,
  anomalies: Anomaly[],
  now: string,
  spikeMultiplier: number,
  lookbackDays: number,
): void {
  const latestDate = db.prepare("SELECT MAX(date) as d FROM daily_spend").get() as {
    d: string | null;
  };

  if (!latestDate.d) return;
  const targetDate = latestDate.d;

  const todaySpend = db
    .prepare(
      `SELECT ds.email, ds.spend_cents, COALESCE(m.name, ds.email) as name,
              COALESCE(du.most_used_model, '') as most_used_model
       FROM (SELECT email, MAX(spend_cents) as spend_cents FROM daily_spend WHERE date = ? GROUP BY email) ds
       LEFT JOIN members m ON ds.email = m.email
       LEFT JOIN daily_usage du ON ds.email = du.email AND du.date = ?`,
    )
    .all(targetDate, targetDate) as Array<{
    email: string;
    spend_cents: number;
    name: string;
    most_used_model: string;
  }>;

  for (const user of todaySpend) {
    if (user.spend_cents < MIN_DAILY_SPEND_CENTS) continue;

    const history = db
      .prepare(
        `SELECT AVG(spend) as avg_spend FROM (
           SELECT email, date, MAX(spend_cents) as spend
           FROM daily_spend
           WHERE email = ? AND date < ? AND date >= date(?, ?)
           GROUP BY email, date
         )`,
      )
      .get(user.email, targetDate, targetDate, `-${lookbackDays} days`) as {
      avg_spend: number | null;
    };

    if (!history.avg_spend || history.avg_spend < 100) continue;

    const ratio = user.spend_cents / history.avg_spend;
    if (ratio > spikeMultiplier) {
      const todayDollars = (user.spend_cents / 100).toFixed(2);
      const avgDollars = (history.avg_spend / 100).toFixed(2);
      anomalies.push({
        userEmail: user.email,
        type: "trend",
        severity: ratio > spikeMultiplier * 3 ? "critical" : "warning",
        metric: "spend",
        value: user.spend_cents,
        threshold: history.avg_spend * spikeMultiplier,
        message: `${user.name}: daily spend spiked to $${todayDollars} (${ratio.toFixed(1)}x their ${lookbackDays}-day avg of $${avgDollars}) — model: ${user.most_used_model || "unknown"}`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: user.most_used_model || null,
        diagnosisKind: null,
        diagnosisDelta: user.spend_cents - history.avg_spend,
      });
    }
  }
}

function detectCycleOutliers(
  db: ReturnType<typeof getDb>,
  anomalies: Anomaly[],
  now: string,
  outlierMultiplier: number,
): void {
  const cycleSpend = db
    .prepare(
      `SELECT s.email, s.name, s.spend_cents, s.fast_premium_requests,
              COALESCE(du.most_used_model, '') as most_used_model
       FROM spending s
       LEFT JOIN (
         SELECT email, most_used_model FROM daily_usage
         WHERE date = (SELECT MAX(date) FROM daily_usage WHERE is_active = 1) AND is_active = 1
       ) du ON s.email = du.email
       WHERE s.cycle_start = (SELECT MAX(cycle_start) FROM spending)
         AND s.spend_cents > 0`,
    )
    .all() as Array<{
    email: string;
    name: string;
    spend_cents: number;
    fast_premium_requests: number;
    most_used_model: string;
  }>;

  if (cycleSpend.length < 5) return;

  const spends = cycleSpend.map((s) => s.spend_cents).sort((a, b) => a - b);
  const medianIndex = Math.floor(spends.length / 2);
  const median = spends[medianIndex] ?? 0;

  if (median < MIN_CYCLE_MEDIAN_CENTS) return;

  for (const user of cycleSpend) {
    const ratio = user.spend_cents / median;
    if (ratio > outlierMultiplier) {
      const userDollars = (user.spend_cents / 100).toFixed(2);
      const medianDollars = (median / 100).toFixed(2);
      anomalies.push({
        userEmail: user.email,
        type: "trend",
        severity: ratio > outlierMultiplier * 3 ? "critical" : "warning",
        metric: "spend",
        value: user.spend_cents,
        threshold: median * outlierMultiplier,
        message: `${user.name}: cycle spend $${userDollars} is ${ratio.toFixed(1)}x the team median ($${medianDollars}) — model: ${user.most_used_model || "unknown"}, ${user.fast_premium_requests} premium reqs`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: user.most_used_model || null,
        diagnosisKind: null,
        diagnosisDelta: user.spend_cents - median,
      });
    }
  }
}
