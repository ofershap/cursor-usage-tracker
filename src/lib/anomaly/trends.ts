import type { Anomaly, DetectionConfig } from "../types";
import { getDb } from "../db";

const EXPENSIVE_MODELS = new Set([
  "claude-4.6-opus-high-thinking",
  "claude-4.6-opus-high",
  "claude-4.6-opus-max-thinking",
  "claude-4.6-opus-max",
  "claude-4.5-opus-high-thinking",
  "claude-4.5-opus-high",
  "gpt-5.3-codex",
  "gpt-5.3-codex-high",
  "gpt-5.3-codex-xhigh",
  "gpt-5.2-codex",
]);

export function detectTrendAnomalies(config: DetectionConfig): Anomaly[] {
  const db = getDb();
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();
  const { spikeMultiplier, spikeLookbackDays, driftDaysAboveP75 } = config.trends;

  detectSpikes(db, anomalies, now, spikeMultiplier, spikeLookbackDays);
  detectDrift(db, anomalies, now, driftDaysAboveP75);
  detectModelShift(db, anomalies, now);

  return anomalies;
}

function detectSpikes(
  db: ReturnType<typeof getDb>,
  anomalies: Anomaly[],
  now: string,
  spikeMultiplier: number,
  lookbackDays: number,
): void {
  const latestDate = db
    .prepare("SELECT MAX(date) as d FROM daily_usage WHERE is_active = 1")
    .get() as { d: string | null };

  if (!latestDate.d) return;
  const targetDate = latestDate.d;

  const todayByUser = db
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

  for (const user of todayByUser) {
    if (user.agent_requests < 10) continue;

    const history = db
      .prepare(
        `SELECT AVG(agent_requests) as avg_requests
         FROM daily_usage
         WHERE email = ? AND date < ? AND date >= date(?, ?) AND is_active = 1`,
      )
      .get(user.email, targetDate, targetDate, `-${lookbackDays} days`) as {
      avg_requests: number | null;
    };

    if (!history.avg_requests || history.avg_requests < 5) continue;

    const ratio = user.agent_requests / history.avg_requests;
    if (ratio > spikeMultiplier) {
      anomalies.push({
        userEmail: user.email,
        type: "trend",
        severity: ratio > spikeMultiplier * 2 ? "critical" : "warning",
        metric: "requests",
        value: user.agent_requests,
        threshold: history.avg_requests * spikeMultiplier,
        message: `Request spike: ${ratio.toFixed(1)}x their ${lookbackDays}-day average (${history.avg_requests.toFixed(0)} → ${user.agent_requests}) — model: ${user.most_used_model}`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: user.most_used_model || null,
        diagnosisKind: null,
        diagnosisDelta: user.agent_requests - history.avg_requests,
      });
    }
  }
}

function detectDrift(
  db: ReturnType<typeof getDb>,
  anomalies: Anomaly[],
  now: string,
  driftDays: number,
): void {
  const recentDays = db
    .prepare(
      `SELECT email, date, agent_requests
       FROM daily_usage
       WHERE date >= date('now', ?) AND is_active = 1`,
    )
    .all(`-${driftDays + 1} days`) as Array<{
    email: string;
    date: string;
    agent_requests: number;
  }>;

  const allDailyRequests = recentDays.map((r) => r.agent_requests).filter((r) => r > 0);
  if (allDailyRequests.length === 0) return;

  const sorted = [...allDailyRequests].sort((a, b) => a - b);
  const p75Index = Math.floor(sorted.length * 0.75);
  const p75 = sorted[p75Index] ?? 0;

  const byUser = new Map<string, number[]>();
  for (const row of recentDays) {
    const arr = byUser.get(row.email) ?? [];
    arr.push(row.agent_requests);
    byUser.set(row.email, arr);
  }

  for (const [email, dailyReqs] of byUser) {
    const daysAbove = dailyReqs.filter((r) => r > p75).length;
    if (daysAbove >= driftDays) {
      const avgReqs = dailyReqs.reduce((a, b) => a + b, 0) / dailyReqs.length;
      anomalies.push({
        userEmail: email,
        type: "trend",
        severity: "warning",
        metric: "requests",
        value: avgReqs,
        threshold: p75,
        message: `Sustained high usage: above team P75 (${p75} reqs) for ${daysAbove} of last ${dailyReqs.length} days (avg: ${avgReqs.toFixed(0)})`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: null,
        diagnosisKind: null,
        diagnosisDelta: avgReqs - p75,
      });
    }
  }
}

function detectModelShift(db: ReturnType<typeof getDb>, anomalies: Anomaly[], now: string): void {
  const latestDate = db
    .prepare("SELECT MAX(date) as d FROM daily_usage WHERE is_active = 1")
    .get() as { d: string | null };

  if (!latestDate.d) return;
  const targetDate = latestDate.d;

  const todayModels = db
    .prepare(
      `SELECT email, most_used_model
       FROM daily_usage
       WHERE date = ? AND is_active = 1 AND most_used_model != ''`,
    )
    .all(targetDate) as Array<{ email: string; most_used_model: string }>;

  const historyModels = db
    .prepare(
      `SELECT email, most_used_model, COUNT(*) as days
       FROM daily_usage
       WHERE date < ? AND date >= date(?, '-7 days') AND is_active = 1 AND most_used_model != ''
       GROUP BY email, most_used_model`,
    )
    .all(targetDate, targetDate) as Array<{ email: string; most_used_model: string; days: number }>;

  const histByUser = new Map<string, Map<string, number>>();
  for (const row of historyModels) {
    const models = histByUser.get(row.email) ?? new Map();
    models.set(row.most_used_model, row.days);
    histByUser.set(row.email, models);
  }

  for (const row of todayModels) {
    if (!EXPENSIVE_MODELS.has(row.most_used_model)) continue;

    const hist = histByUser.get(row.email);
    if (!hist) continue;

    const totalHistDays = Array.from(hist.values()).reduce((a, b) => a + b, 0);
    if (totalHistDays < 3) continue;

    const expensiveDaysHist = hist.get(row.most_used_model) ?? 0;
    const histPct = expensiveDaysHist / totalHistDays;

    if (histPct < 0.3) {
      anomalies.push({
        userEmail: row.email,
        type: "trend",
        severity: "warning",
        metric: "model_shift",
        value: 100,
        threshold: histPct * 100,
        message: `Model shift: switched to ${row.most_used_model} today (previously used ${(histPct * 100).toFixed(0)}% of days)`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: row.most_used_model,
        diagnosisKind: null,
        diagnosisDelta: (1 - histPct) * 100,
      });
    }
  }
}
