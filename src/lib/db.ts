import Database from "better-sqlite3";
import path from "node:path";
import type {
  TeamMember,
  DailyUsage,
  MemberSpend,
  UsageEvent,
  Anomaly,
  Incident,
  DetectionConfig,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "tracker.db");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT NOT NULL,
      lines_added INTEGER NOT NULL DEFAULT 0,
      lines_deleted INTEGER NOT NULL DEFAULT 0,
      acceptance_rate REAL NOT NULL DEFAULT 0,
      tabs_used INTEGER NOT NULL DEFAULT 0,
      composer_requests INTEGER NOT NULL DEFAULT 0,
      chat_requests INTEGER NOT NULL DEFAULT 0,
      most_used_model TEXT,
      most_used_extension TEXT,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date)
    );

    CREATE TABLE IF NOT EXISTS spending (
      email TEXT NOT NULL,
      cycle_start TEXT NOT NULL,
      spend_cents INTEGER NOT NULL DEFAULT 0,
      fast_premium_requests INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (email, cycle_start)
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      kind TEXT NOT NULL,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_user_ts ON usage_events(user_email, timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_ts ON usage_events(timestamp);

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      threshold REAL NOT NULL,
      message TEXT NOT NULL,
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      alerted_at TEXT,
      diagnosis_model TEXT,
      diagnosis_kind TEXT,
      diagnosis_delta REAL
    );

    CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies(user_email);
    CREATE INDEX IF NOT EXISTS idx_anomalies_open ON anomalies(resolved_at) WHERE resolved_at IS NULL;

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anomaly_id INTEGER NOT NULL REFERENCES anomalies(id),
      user_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      alerted_at TEXT,
      acknowledged_at TEXT,
      resolved_at TEXT,
      mttd_minutes REAL,
      mtti_minutes REAL,
      mttr_minutes REAL
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      records_count INTEGER DEFAULT 0,
      error TEXT
    );
  `);
}

export function upsertMembers(members: TeamMember[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO members (email, name, role, last_seen)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      last_seen = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const m of members) {
      stmt.run(m.email, m.name, m.role);
    }
  });
  tx();
}

export function upsertDailyUsage(entries: DailyUsage[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO daily_usage (date, lines_added, lines_deleted, acceptance_rate, tabs_used, composer_requests, chat_requests, most_used_model, most_used_extension)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      lines_added = excluded.lines_added,
      lines_deleted = excluded.lines_deleted,
      acceptance_rate = excluded.acceptance_rate,
      tabs_used = excluded.tabs_used,
      composer_requests = excluded.composer_requests,
      chat_requests = excluded.chat_requests,
      most_used_model = excluded.most_used_model,
      most_used_extension = excluded.most_used_extension,
      collected_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const e of entries) {
      stmt.run(
        e.date,
        e.linesAdded,
        e.linesDeleted,
        e.acceptanceRate,
        e.tabsUsed,
        e.composerRequests,
        e.chatRequests,
        e.mostUsedModel,
        e.mostUsedExtension,
      );
    }
  });
  tx();
}

export function upsertSpending(members: MemberSpend[], cycleStart: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO spending (email, cycle_start, spend_cents, fast_premium_requests)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email, cycle_start) DO UPDATE SET
      spend_cents = excluded.spend_cents,
      fast_premium_requests = excluded.fast_premium_requests,
      collected_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const m of members) {
      stmt.run(m.email, cycleStart, m.spendCents, m.fastPremiumRequests);
    }
  });
  tx();
}

export function insertUsageEvents(events: UsageEvent[]): number {
  const db = getDb();

  const lastTs = db.prepare("SELECT MAX(timestamp) as ts FROM usage_events").get() as
    | { ts: string | null }
    | undefined;
  const cutoff = lastTs?.ts ?? "1970-01-01T00:00:00.000Z";

  const stmt = db.prepare(`
    INSERT INTO usage_events (user_email, timestamp, model, kind, total_tokens, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const tx = db.transaction(() => {
    for (const e of events) {
      const ts = e.timestamp.toISOString();
      if (ts <= cutoff) continue;
      stmt.run(
        e.userEmail,
        ts,
        e.model,
        e.kind,
        e.totalTokens,
        e.inputTokens,
        e.outputTokens,
        e.cacheReadTokens,
        e.cacheWriteTokens,
      );
      inserted++;
    }
  });
  tx();
  return inserted;
}

export function insertAnomaly(anomaly: Anomaly): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO anomalies (user_email, type, severity, metric, value, threshold, message, detected_at, diagnosis_model, diagnosis_kind, diagnosis_delta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      anomaly.userEmail,
      anomaly.type,
      anomaly.severity,
      anomaly.metric,
      anomaly.value,
      anomaly.threshold,
      anomaly.message,
      anomaly.detectedAt,
      anomaly.diagnosisModel,
      anomaly.diagnosisKind,
      anomaly.diagnosisDelta,
    );
  return Number(result.lastInsertRowid);
}

export function resolveAnomaly(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE anomalies SET resolved_at = datetime('now') WHERE id = ? AND resolved_at IS NULL",
  ).run(id);
}

export function markAnomalyAlerted(id: number): void {
  const db = getDb();
  db.prepare("UPDATE anomalies SET alerted_at = datetime('now') WHERE id = ?").run(id);
}

export function getOpenAnomalies(): Anomaly[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM anomalies WHERE resolved_at IS NULL ORDER BY detected_at DESC")
    .all() as Anomaly[];
}

export function getRecentAnomalies(days: number = 30): Anomaly[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM anomalies WHERE detected_at >= datetime('now', ?) ORDER BY detected_at DESC",
    )
    .all(`-${days} days`) as Anomaly[];
}

export function insertIncident(incident: Omit<Incident, "id">): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO incidents (anomaly_id, user_email, status, detected_at, alerted_at, mttd_minutes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      incident.anomalyId,
      incident.userEmail,
      incident.status,
      incident.detectedAt,
      incident.alertedAt,
      incident.mttdMinutes,
    );
  return Number(result.lastInsertRowid);
}

export function updateIncidentStatus(
  id: number,
  status: string,
  times: Partial<
    Pick<
      Incident,
      "alertedAt" | "acknowledgedAt" | "resolvedAt" | "mttdMinutes" | "mttiMinutes" | "mttrMinutes"
    >
  >,
): void {
  const db = getDb();
  const sets: string[] = ["status = ?"];
  const params: unknown[] = [status];

  if (times.alertedAt !== undefined) {
    sets.push("alerted_at = ?");
    params.push(times.alertedAt);
  }
  if (times.acknowledgedAt !== undefined) {
    sets.push("acknowledged_at = ?");
    params.push(times.acknowledgedAt);
  }
  if (times.resolvedAt !== undefined) {
    sets.push("resolved_at = ?");
    params.push(times.resolvedAt);
  }
  if (times.mttdMinutes !== undefined) {
    sets.push("mttd_minutes = ?");
    params.push(times.mttdMinutes);
  }
  if (times.mttiMinutes !== undefined) {
    sets.push("mtti_minutes = ?");
    params.push(times.mttiMinutes);
  }
  if (times.mttrMinutes !== undefined) {
    sets.push("mttr_minutes = ?");
    params.push(times.mttrMinutes);
  }

  params.push(id);
  db.prepare(`UPDATE incidents SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

export function getOpenIncidents(): Incident[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM incidents WHERE status NOT IN ('resolved') ORDER BY detected_at DESC")
    .all() as Incident[];
}

export function getConfig(): DetectionConfig {
  const db = getDb();
  const row = db.prepare("SELECT value FROM config WHERE key = 'detection'").get() as
    | { value: string }
    | undefined;

  if (!row) return DEFAULT_CONFIG;
  return JSON.parse(row.value) as DetectionConfig;
}

export function saveConfig(config: DetectionConfig): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO config (key, value) VALUES ('detection', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(JSON.stringify(config));
}

export function logCollection(type: string, count: number, error?: string): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO collection_log (type, completed_at, records_count, error) VALUES (?, datetime('now'), ?, ?)",
  ).run(type, count, error ?? null);
}

export interface DashboardStats {
  totalMembers: number;
  totalSpendCents: number;
  totalRequests: number;
  totalTokens: number;
  activeAnomalies: number;
  topSpenders: Array<{ email: string; spend_cents: number }>;
  dailyUsage: DailyUsage[];
  spendByUser: Array<{ email: string; spend_cents: number; fast_premium_requests: number }>;
}

export function getDashboardStats(days: number = 30): DashboardStats {
  const db = getDb();

  const totalMembers =
    (db.prepare("SELECT COUNT(*) as c FROM members").get() as { c: number })?.c ?? 0;

  const spendRow = db
    .prepare(
      "SELECT COALESCE(SUM(spend_cents), 0) as total FROM spending WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending)",
    )
    .get() as { total: number };

  const requestsRow = db
    .prepare("SELECT COUNT(*) as c FROM usage_events WHERE timestamp >= datetime('now', ?)")
    .get(`-${days} days`) as { c: number };

  const tokensRow = db
    .prepare(
      "SELECT COALESCE(SUM(total_tokens), 0) as t FROM usage_events WHERE timestamp >= datetime('now', ?)",
    )
    .get(`-${days} days`) as { t: number };

  const activeAnomalies =
    (
      db.prepare("SELECT COUNT(*) as c FROM anomalies WHERE resolved_at IS NULL").get() as {
        c: number;
      }
    )?.c ?? 0;

  const topSpenders = db
    .prepare(
      "SELECT email, spend_cents FROM spending WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending) ORDER BY spend_cents DESC LIMIT 10",
    )
    .all() as Array<{ email: string; spend_cents: number }>;

  const dailyUsage = db
    .prepare(
      "SELECT date, lines_added as linesAdded, lines_deleted as linesDeleted, acceptance_rate as acceptanceRate, tabs_used as tabsUsed, composer_requests as composerRequests, chat_requests as chatRequests, most_used_model as mostUsedModel, most_used_extension as mostUsedExtension FROM daily_usage WHERE date >= date('now', ?) ORDER BY date",
    )
    .all(`-${days} days`) as DailyUsage[];

  const spendByUser = db
    .prepare(
      "SELECT email, spend_cents, fast_premium_requests FROM spending WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending) ORDER BY spend_cents DESC",
    )
    .all() as Array<{
    email: string;
    spend_cents: number;
    fast_premium_requests: number;
  }>;

  return {
    totalMembers,
    totalSpendCents: spendRow.total,
    totalRequests: requestsRow.c,
    totalTokens: tokensRow.t,
    activeAnomalies,
    topSpenders,
    dailyUsage,
    spendByUser,
  };
}

export function getUserStats(email: string, days: number = 30) {
  const db = getDb();

  const member = db.prepare("SELECT * FROM members WHERE email = ?").get(email) as
    | (TeamMember & { first_seen: string; last_seen: string })
    | undefined;

  const spending = db
    .prepare("SELECT * FROM spending WHERE email = ? ORDER BY cycle_start DESC LIMIT 6")
    .all(email) as Array<{
    cycle_start: string;
    spend_cents: number;
    fast_premium_requests: number;
  }>;

  const dailyTokens = db
    .prepare(
      `SELECT date(timestamp) as date, SUM(total_tokens) as tokens, COUNT(*) as requests
       FROM usage_events
       WHERE user_email = ? AND timestamp >= datetime('now', ?)
       GROUP BY date(timestamp)
       ORDER BY date`,
    )
    .all(email, `-${days} days`) as Array<{
    date: string;
    tokens: number;
    requests: number;
  }>;

  const modelBreakdown = db
    .prepare(
      `SELECT model, COUNT(*) as count, SUM(total_tokens) as tokens
       FROM usage_events
       WHERE user_email = ? AND timestamp >= datetime('now', ?)
       GROUP BY model
       ORDER BY tokens DESC`,
    )
    .all(email, `-${days} days`) as Array<{
    model: string;
    count: number;
    tokens: number;
  }>;

  const kindBreakdown = db
    .prepare(
      `SELECT kind, COUNT(*) as count, SUM(total_tokens) as tokens
       FROM usage_events
       WHERE user_email = ? AND timestamp >= datetime('now', ?)
       GROUP BY kind
       ORDER BY tokens DESC`,
    )
    .all(email, `-${days} days`) as Array<{
    kind: string;
    count: number;
    tokens: number;
  }>;

  const anomalies = db
    .prepare("SELECT * FROM anomalies WHERE user_email = ? ORDER BY detected_at DESC LIMIT 20")
    .all(email) as Anomaly[];

  return { member, spending, dailyTokens, modelBreakdown, kindBreakdown, anomalies };
}

export function getAnomalyTimeline(days: number = 30) {
  const db = getDb();

  const anomalies = db
    .prepare(
      "SELECT * FROM anomalies WHERE detected_at >= datetime('now', ?) ORDER BY detected_at DESC",
    )
    .all(`-${days} days`) as Anomaly[];

  const incidents = db
    .prepare(
      "SELECT * FROM incidents WHERE detected_at >= datetime('now', ?) ORDER BY detected_at DESC",
    )
    .all(`-${days} days`) as Incident[];

  const avgMttd = db
    .prepare(
      "SELECT AVG(mttd_minutes) as avg FROM incidents WHERE mttd_minutes IS NOT NULL AND detected_at >= datetime('now', ?)",
    )
    .get(`-${days} days`) as { avg: number | null };

  const avgMtti = db
    .prepare(
      "SELECT AVG(mtti_minutes) as avg FROM incidents WHERE mtti_minutes IS NOT NULL AND detected_at >= datetime('now', ?)",
    )
    .get(`-${days} days`) as { avg: number | null };

  const avgMttr = db
    .prepare(
      "SELECT AVG(mttr_minutes) as avg FROM incidents WHERE mttr_minutes IS NOT NULL AND detected_at >= datetime('now', ?)",
    )
    .get(`-${days} days`) as { avg: number | null };

  return {
    anomalies,
    incidents,
    avgMttdMinutes: avgMttd.avg,
    avgMttiMinutes: avgMtti.avg,
    avgMttrMinutes: avgMttr.avg,
  };
}

export function getAllMembers(): Array<TeamMember & { first_seen: string; last_seen: string }> {
  const db = getDb();
  return db.prepare("SELECT * FROM members ORDER BY name").all() as Array<
    TeamMember & { first_seen: string; last_seen: string }
  >;
}
