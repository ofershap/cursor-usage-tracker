import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test.db");

function createTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const db = new Database(TEST_DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE members (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE spending (
      email TEXT NOT NULL,
      cycle_start TEXT NOT NULL,
      spend_cents INTEGER NOT NULL DEFAULT 0,
      fast_premium_requests INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (email, cycle_start)
    );

    CREATE TABLE usage_events (
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

    CREATE INDEX idx_events_user_ts ON usage_events(user_email, timestamp);
    CREATE INDEX idx_events_ts ON usage_events(timestamp);

    CREATE TABLE anomalies (
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

    CREATE INDEX idx_anomalies_user ON anomalies(user_email);
    CREATE INDEX idx_anomalies_open ON anomalies(resolved_at) WHERE resolved_at IS NULL;

    CREATE TABLE incidents (
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

    CREATE TABLE config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE collection_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      records_count INTEGER DEFAULT 0,
      error TEXT
    );

    CREATE TABLE daily_usage (
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
  `);

  return db;
}

function seedTestData(db: Database.Database) {
  const now = new Date();
  const cycleStart =
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] ?? "";

  db.prepare("INSERT INTO members (email, name, role) VALUES (?, ?, ?)").run(
    "alice@example.com",
    "Alice",
    "member",
  );
  db.prepare("INSERT INTO members (email, name, role) VALUES (?, ?, ?)").run(
    "bob@example.com",
    "Bob",
    "member",
  );
  db.prepare("INSERT INTO members (email, name, role) VALUES (?, ?, ?)").run(
    "charlie@example.com",
    "Charlie",
    "member",
  );

  db.prepare(
    "INSERT INTO spending (email, cycle_start, spend_cents, fast_premium_requests) VALUES (?, ?, ?, ?)",
  ).run("alice@example.com", cycleStart, 1000, 50);
  db.prepare(
    "INSERT INTO spending (email, cycle_start, spend_cents, fast_premium_requests) VALUES (?, ?, ?, ?)",
  ).run("bob@example.com", cycleStart, 8000, 200);
  db.prepare(
    "INSERT INTO spending (email, cycle_start, spend_cents, fast_premium_requests) VALUES (?, ?, ?, ?)",
  ).run("charlie@example.com", cycleStart, 1500, 60);

  const stmt = db.prepare(
    `INSERT INTO usage_events (user_email, timestamp, model, kind, total_tokens, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const recentTs = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

  for (let i = 0; i < 10; i++) {
    stmt.run("alice@example.com", recentTs, "claude-sonnet-4.5", "chat", 50000, 30000, 20000, 0, 0);
  }

  for (let i = 0; i < 100; i++) {
    stmt.run(
      "bob@example.com",
      recentTs,
      "claude-opus-4.6",
      "composer",
      500000,
      300000,
      200000,
      0,
      0,
    );
  }

  for (let i = 0; i < 15; i++) {
    stmt.run("charlie@example.com", recentTs, "gemini-3-flash", "tab", 10000, 5000, 5000, 0, 0);
  }

  for (let day = 2; day <= 14; day++) {
    const pastTs = new Date(now.getTime() - day * 24 * 60 * 60 * 1000).toISOString();
    for (let i = 0; i < 5; i++) {
      stmt.run("alice@example.com", pastTs, "claude-sonnet-4.5", "chat", 50000, 30000, 20000, 0, 0);
      stmt.run("bob@example.com", pastTs, "claude-sonnet-4.5", "chat", 50000, 30000, 20000, 0, 0);
      stmt.run("charlie@example.com", pastTs, "gemini-3-flash", "tab", 10000, 5000, 5000, 0, 0);
    }
  }
}

describe("Anomaly Detection", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  describe("Threshold Detection", () => {
    it("should detect spending over threshold", () => {
      const spenders = db
        .prepare(
          "SELECT email, spend_cents FROM spending WHERE cycle_start = (SELECT MAX(cycle_start) FROM spending)",
        )
        .all() as Array<{ email: string; spend_cents: number }>;

      const threshold = 5000;
      const overSpenders = spenders.filter((s) => s.spend_cents > threshold);

      expect(overSpenders).toHaveLength(1);
      expect(overSpenders.at(0)?.email).toBe("bob@example.com");
    });

    it("should detect high token usage", () => {
      const dailyTokens = db
        .prepare(
          `SELECT user_email, SUM(total_tokens) as tokens
           FROM usage_events
           WHERE timestamp >= datetime('now', '-1 day')
           GROUP BY user_email`,
        )
        .all() as Array<{ user_email: string; tokens: number }>;

      const maxTokensPerDay = 5_000_000;
      const overUsers = dailyTokens.filter((t) => t.tokens > maxTokensPerDay);

      expect(overUsers).toHaveLength(1);
      expect(overUsers.at(0)?.user_email).toBe("bob@example.com");
    });
  });

  describe("Z-Score Detection", () => {
    it("should identify statistical outliers", () => {
      const recentTs = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const stmt = db.prepare(
        `INSERT INTO usage_events (user_email, timestamp, model, kind, total_tokens, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (let i = 0; i < 5; i++) {
        const email = `normal${i}@example.com`;
        for (let j = 0; j < 10; j++) {
          stmt.run(email, recentTs, "claude-sonnet-4.5", "tab", 10000, 5000, 5000, 0, 0);
        }
      }

      const todayStats = db
        .prepare(
          `SELECT user_email, SUM(total_tokens) as tokens
           FROM usage_events
           WHERE timestamp >= datetime('now', '-1 day')
           GROUP BY user_email`,
        )
        .all() as Array<{ user_email: string; tokens: number }>;

      const values = todayStats.map((s) => s.tokens);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stddev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);

      const outliers = todayStats.filter((s) => {
        if (stddev === 0) return false;
        return (s.tokens - mean) / stddev > 2;
      });

      expect(outliers.length).toBeGreaterThanOrEqual(1);
      expect(outliers.some((o) => o.user_email === "bob@example.com")).toBe(true);
    });
  });

  describe("Trend Detection", () => {
    it("should detect usage spikes vs personal baseline", () => {
      const todayTokens = db
        .prepare(
          `SELECT user_email, SUM(total_tokens) as tokens
           FROM usage_events
           WHERE timestamp >= datetime('now', '-1 day')
           GROUP BY user_email`,
        )
        .all() as Array<{ user_email: string; tokens: number }>;

      const bobToday = todayTokens.find((t) => t.user_email === "bob@example.com");
      expect(bobToday).toBeDefined();

      const bobHistory = db
        .prepare(
          `SELECT AVG(daily_tokens) as avg_tokens
           FROM (
             SELECT SUM(total_tokens) as daily_tokens
             FROM usage_events
             WHERE user_email = 'bob@example.com' AND timestamp >= datetime('now', '-7 days') AND timestamp < datetime('now', '-1 day')
             GROUP BY date(timestamp)
           )`,
        )
        .get() as { avg_tokens: number | null };

      if (bobHistory.avg_tokens && bobToday) {
        const ratio = bobToday.tokens / bobHistory.avg_tokens;
        expect(ratio).toBeGreaterThan(3);
      }
    });
  });

  describe("Incident Lifecycle", () => {
    it("should create and manage incidents", () => {
      const anomalyId = Number(
        db
          .prepare(
            `INSERT INTO anomalies (user_email, type, severity, metric, value, threshold, message, detected_at)
             VALUES ('bob@example.com', 'threshold', 'critical', 'spend', 8000, 5000, 'Test anomaly', datetime('now'))`,
          )
          .run().lastInsertRowid,
      );

      const incidentId = Number(
        db
          .prepare(
            `INSERT INTO incidents (anomaly_id, user_email, status, detected_at, mttd_minutes)
             VALUES (?, 'bob@example.com', 'open', datetime('now'), 5)`,
          )
          .run(anomalyId).lastInsertRowid,
      );

      db.prepare(
        "UPDATE incidents SET status = 'alerted', alerted_at = datetime('now') WHERE id = ?",
      ).run(incidentId);

      db.prepare(
        "UPDATE incidents SET status = 'acknowledged', acknowledged_at = datetime('now'), mtti_minutes = 15 WHERE id = ?",
      ).run(incidentId);

      db.prepare(
        "UPDATE incidents SET status = 'resolved', resolved_at = datetime('now'), mttr_minutes = 60 WHERE id = ?",
      ).run(incidentId);

      const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get(incidentId) as Record<
        string,
        unknown
      >;

      expect(incident.status).toBe("resolved");
      expect(incident.mttd_minutes).toBe(5);
      expect(incident.mtti_minutes).toBe(15);
      expect(incident.mttr_minutes).toBe(60);
    });
  });
});
