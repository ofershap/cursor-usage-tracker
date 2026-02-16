import type { Anomaly, DetectionConfig } from "../types";
import { getDb } from "../db";

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
  const todayByUser = db
    .prepare(
      `SELECT user_email, SUM(total_tokens) as tokens, COUNT(*) as requests
       FROM usage_events
       WHERE timestamp >= datetime('now', '-1 day')
       GROUP BY user_email`,
    )
    .all() as Array<{ user_email: string; tokens: number; requests: number }>;

  for (const user of todayByUser) {
    const history = db
      .prepare(
        `SELECT AVG(daily_tokens) as avg_tokens, AVG(daily_requests) as avg_requests
         FROM (
           SELECT SUM(total_tokens) as daily_tokens, COUNT(*) as daily_requests
           FROM usage_events
           WHERE user_email = ? AND timestamp >= datetime('now', ?) AND timestamp < datetime('now', '-1 day')
           GROUP BY date(timestamp)
         )`,
      )
      .get(user.user_email, `-${lookbackDays} days`) as {
      avg_tokens: number | null;
      avg_requests: number | null;
    };

    if (!history.avg_tokens || history.avg_tokens === 0) continue;

    const tokenRatio = user.tokens / history.avg_tokens;
    if (tokenRatio > spikeMultiplier) {
      const topModel = db
        .prepare(
          `SELECT model, SUM(total_tokens) as tokens FROM usage_events
           WHERE user_email = ? AND timestamp >= datetime('now', '-1 day')
           GROUP BY model ORDER BY tokens DESC LIMIT 1`,
        )
        .get(user.user_email) as { model: string; tokens: number } | undefined;

      anomalies.push({
        userEmail: user.user_email,
        type: "trend",
        severity: tokenRatio > spikeMultiplier * 2 ? "critical" : "warning",
        metric: "tokens",
        value: user.tokens,
        threshold: history.avg_tokens * spikeMultiplier,
        message: `Token spike: ${tokenRatio.toFixed(1)}x their ${lookbackDays}-day average (${(history.avg_tokens / 1_000_000).toFixed(1)}M -> ${(user.tokens / 1_000_000).toFixed(1)}M)`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: topModel?.model ?? null,
        diagnosisKind: null,
        diagnosisDelta: user.tokens - history.avg_tokens,
      });
    }

    if (history.avg_requests && history.avg_requests > 0) {
      const reqRatio = user.requests / history.avg_requests;
      if (reqRatio > spikeMultiplier) {
        anomalies.push({
          userEmail: user.user_email,
          type: "trend",
          severity: reqRatio > spikeMultiplier * 2 ? "critical" : "warning",
          metric: "requests",
          value: user.requests,
          threshold: history.avg_requests * spikeMultiplier,
          message: `Request spike: ${reqRatio.toFixed(1)}x their ${lookbackDays}-day average (${history.avg_requests.toFixed(0)} -> ${user.requests})`,
          detectedAt: now,
          resolvedAt: null,
          alertedAt: null,
          diagnosisModel: null,
          diagnosisKind: null,
          diagnosisDelta: user.requests - history.avg_requests,
        });
      }
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
      `SELECT user_email, date(timestamp) as d, SUM(total_tokens) as tokens
       FROM usage_events
       WHERE timestamp >= datetime('now', ?)
       GROUP BY user_email, date(timestamp)`,
    )
    .all(`-${driftDays + 1} days`) as Array<{
    user_email: string;
    d: string;
    tokens: number;
  }>;

  const allDailyTokens = recentDays.map((r) => r.tokens);
  if (allDailyTokens.length === 0) return;

  const sorted = [...allDailyTokens].sort((a, b) => a - b);
  const p75Index = Math.floor(sorted.length * 0.75);
  const p75 = sorted[p75Index] ?? 0;

  const byUser = new Map<string, number[]>();
  for (const row of recentDays) {
    const arr = byUser.get(row.user_email) ?? [];
    arr.push(row.tokens);
    byUser.set(row.user_email, arr);
  }

  for (const [email, dailyTokens] of byUser) {
    const daysAbove = dailyTokens.filter((t) => t > p75).length;
    if (daysAbove >= driftDays) {
      const avgTokens = dailyTokens.reduce((a, b) => a + b, 0) / dailyTokens.length;
      anomalies.push({
        userEmail: email,
        type: "trend",
        severity: "warning",
        metric: "tokens",
        value: avgTokens,
        threshold: p75,
        message: `Sustained drift: above team P75 for ${daysAbove} of last ${dailyTokens.length} days`,
        detectedAt: now,
        resolvedAt: null,
        alertedAt: null,
        diagnosisModel: null,
        diagnosisKind: null,
        diagnosisDelta: avgTokens - p75,
      });
    }
  }
}

function detectModelShift(db: ReturnType<typeof getDb>, anomalies: Anomaly[], now: string): void {
  const recentModels = db
    .prepare(
      `SELECT user_email, model, COUNT(*) as cnt
       FROM usage_events
       WHERE timestamp >= datetime('now', '-1 day')
       GROUP BY user_email, model`,
    )
    .all() as Array<{ user_email: string; model: string; cnt: number }>;

  const expensiveModels = new Set([
    "claude-opus-4.6",
    "claude-opus-4.5",
    "gpt-5.3-codex",
    "gpt-5.2",
    "o1",
  ]);

  const historicalModels = db
    .prepare(
      `SELECT user_email, model, COUNT(*) as cnt
       FROM usage_events
       WHERE timestamp >= datetime('now', '-8 days') AND timestamp < datetime('now', '-1 day')
       GROUP BY user_email, model`,
    )
    .all() as Array<{ user_email: string; model: string; cnt: number }>;

  const histByUser = new Map<string, Map<string, number>>();
  for (const row of historicalModels) {
    const models = histByUser.get(row.user_email) ?? new Map();
    models.set(row.model, row.cnt);
    histByUser.set(row.user_email, models);
  }

  const todayByUser = new Map<string, Map<string, number>>();
  for (const row of recentModels) {
    const models = todayByUser.get(row.user_email) ?? new Map();
    models.set(row.model, row.cnt);
    todayByUser.set(row.user_email, models);
  }

  for (const [email, todayModels] of todayByUser) {
    const histModels = histByUser.get(email);
    if (!histModels) continue;

    const todayTotal = Array.from(todayModels.values()).reduce((a, b) => a + b, 0);
    const histTotal = Array.from(histModels.values()).reduce((a, b) => a + b, 0);
    if (todayTotal === 0 || histTotal === 0) continue;

    for (const expModel of expensiveModels) {
      const todayPct = (todayModels.get(expModel) ?? 0) / todayTotal;
      const histPct = (histModels.get(expModel) ?? 0) / histTotal;

      if (todayPct > 0.3 && todayPct - histPct > 0.2) {
        anomalies.push({
          userEmail: email,
          type: "trend",
          severity: "warning",
          metric: "model_shift",
          value: todayPct * 100,
          threshold: histPct * 100,
          message: `Model shift: ${expModel} usage jumped from ${(histPct * 100).toFixed(0)}% to ${(todayPct * 100).toFixed(0)}% of requests`,
          detectedAt: now,
          resolvedAt: null,
          alertedAt: null,
          diagnosisModel: expModel,
          diagnosisKind: null,
          diagnosisDelta: (todayPct - histPct) * 100,
        });
      }
    }
  }
}
