import Database from "better-sqlite3";
import path from "node:path";
import type {
  TeamMember,
  DailyUsage,
  MemberSpend,
  Anomaly,
  Incident,
  DetectionConfig,
  GroupMemberSpend,
  FilteredUsageEvent,
  AICodeCommit,
  AnalyticsDAUEntry,
  AnalyticsModelUsageEntry,
  AnalyticsAgentEditsEntry,
  AnalyticsTabsEntry,
  AnalyticsMCPEntry,
  AnalyticsFileExtensionsEntry,
  AnalyticsClientVersionsEntry,
  AnalyticsCommandsEntry,
  AnalyticsPlansEntry,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "tracker.db");

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
      user_id TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_removed INTEGER NOT NULL DEFAULT 0,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT NOT NULL,
      email TEXT NOT NULL,
      user_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      lines_added INTEGER NOT NULL DEFAULT 0,
      lines_deleted INTEGER NOT NULL DEFAULT 0,
      accepted_lines_added INTEGER NOT NULL DEFAULT 0,
      accepted_lines_deleted INTEGER NOT NULL DEFAULT 0,
      total_applies INTEGER NOT NULL DEFAULT 0,
      total_accepts INTEGER NOT NULL DEFAULT 0,
      total_rejects INTEGER NOT NULL DEFAULT 0,
      total_tabs_shown INTEGER NOT NULL DEFAULT 0,
      tabs_accepted INTEGER NOT NULL DEFAULT 0,
      composer_requests INTEGER NOT NULL DEFAULT 0,
      chat_requests INTEGER NOT NULL DEFAULT 0,
      agent_requests INTEGER NOT NULL DEFAULT 0,
      usage_based_reqs INTEGER NOT NULL DEFAULT 0,
      most_used_model TEXT,
      tab_most_used_extension TEXT,
      client_version TEXT,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_email ON daily_usage(email);
    CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_usage(date);

    CREATE TABLE IF NOT EXISTS spending (
      email TEXT NOT NULL,
      user_id TEXT,
      name TEXT,
      cycle_start TEXT NOT NULL,
      spend_cents INTEGER NOT NULL DEFAULT 0,
      included_spend_cents INTEGER NOT NULL DEFAULT 0,
      fast_premium_requests INTEGER NOT NULL DEFAULT 0,
      monthly_limit_dollars REAL,
      hard_limit_override_dollars REAL NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (email, cycle_start)
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      kind TEXT NOT NULL,
      max_mode INTEGER NOT NULL DEFAULT 0,
      requests_cost_cents REAL NOT NULL DEFAULT 0,
      total_cents REAL NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      is_chargeable INTEGER NOT NULL DEFAULT 1,
      is_headless INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS daily_spend (
      date TEXT NOT NULL,
      email TEXT NOT NULL,
      spend_cents INTEGER NOT NULL DEFAULT 0,
      cycle_start TEXT NOT NULL,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_spend_email ON daily_spend(email);
    CREATE INDEX IF NOT EXISTS idx_daily_spend_date ON daily_spend(date);

    CREATE TABLE IF NOT EXISTS billing_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      member_count INTEGER NOT NULL DEFAULT 0,
      spend_cents INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      email TEXT NOT NULL,
      joined_at TEXT,
      PRIMARY KEY (group_id, email)
    );

    CREATE TABLE IF NOT EXISTS analytics_dau (
      date TEXT PRIMARY KEY,
      dau INTEGER NOT NULL DEFAULT 0,
      cli_dau INTEGER NOT NULL DEFAULT 0,
      cloud_agent_dau INTEGER NOT NULL DEFAULT 0,
      bugbot_dau INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_model_usage (
      date TEXT NOT NULL,
      model TEXT NOT NULL,
      messages INTEGER NOT NULL DEFAULT 0,
      users INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, model)
    );

    CREATE TABLE IF NOT EXISTS analytics_agent_edits (
      date TEXT PRIMARY KEY,
      suggested_diffs INTEGER NOT NULL DEFAULT 0,
      accepted_diffs INTEGER NOT NULL DEFAULT 0,
      rejected_diffs INTEGER NOT NULL DEFAULT 0,
      lines_suggested INTEGER NOT NULL DEFAULT 0,
      lines_accepted INTEGER NOT NULL DEFAULT 0,
      green_lines_accepted INTEGER NOT NULL DEFAULT 0,
      red_lines_accepted INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_tabs (
      date TEXT PRIMARY KEY,
      suggestions INTEGER NOT NULL DEFAULT 0,
      accepts INTEGER NOT NULL DEFAULT 0,
      rejects INTEGER NOT NULL DEFAULT 0,
      lines_suggested INTEGER NOT NULL DEFAULT 0,
      lines_accepted INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_mcp (
      date TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      server_name TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, tool_name, server_name)
    );

    CREATE TABLE IF NOT EXISTS analytics_file_extensions (
      date TEXT NOT NULL,
      extension TEXT NOT NULL,
      total_files INTEGER NOT NULL DEFAULT 0,
      lines_accepted INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, extension)
    );

    CREATE TABLE IF NOT EXISTS analytics_client_versions (
      date TEXT NOT NULL,
      version TEXT NOT NULL,
      user_count INTEGER NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, version)
    );

    CREATE TABLE IF NOT EXISTS analytics_commands (
      date TEXT NOT NULL,
      command_name TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, command_name)
    );

    CREATE TABLE IF NOT EXISTS analytics_plans (
      date TEXT NOT NULL,
      model TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, model)
    );

    CREATE TABLE IF NOT EXISTS analytics_commands (
      date TEXT NOT NULL,
      command_name TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, command_name)
    );

    CREATE TABLE IF NOT EXISTS analytics_plans (
      date TEXT NOT NULL,
      model TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, model)
    );

    CREATE TABLE IF NOT EXISTS analytics_user_mcp (
      date TEXT NOT NULL,
      email TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      server_name TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email, tool_name, server_name)
    );

    CREATE INDEX IF NOT EXISTS idx_user_mcp_email ON analytics_user_mcp(email);

    CREATE TABLE IF NOT EXISTS analytics_user_commands (
      date TEXT NOT NULL,
      email TEXT NOT NULL,
      command_name TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email, command_name)
    );

    CREATE INDEX IF NOT EXISTS idx_user_commands_email ON analytics_user_commands(email);

    CREATE TABLE IF NOT EXISTS ai_code_commits (
      email TEXT NOT NULL,
      date TEXT NOT NULL,
      commits INTEGER NOT NULL DEFAULT 0,
      total_lines_added INTEGER NOT NULL DEFAULT 0,
      total_lines_deleted INTEGER NOT NULL DEFAULT 0,
      tab_lines_added INTEGER NOT NULL DEFAULT 0,
      tab_lines_deleted INTEGER NOT NULL DEFAULT 0,
      composer_lines_added INTEGER NOT NULL DEFAULT 0,
      composer_lines_deleted INTEGER NOT NULL DEFAULT 0,
      non_ai_lines_added INTEGER NOT NULL DEFAULT 0,
      non_ai_lines_deleted INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (email, date)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_code_email ON ai_code_commits(email);
    CREATE INDEX IF NOT EXISTS idx_ai_code_date ON ai_code_commits(date);

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

export function setMetadata(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `,
  ).run(key, value);
}

export function getMetadata(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function upsertMembers(members: TeamMember[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO members (email, user_id, name, role, is_removed, last_seen)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET
      user_id = excluded.user_id,
      name = excluded.name,
      role = excluded.role,
      is_removed = excluded.is_removed,
      last_seen = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const m of members) {
      stmt.run(m.email, m.id, m.name, m.role, m.isRemoved ? 1 : 0);
    }
  });
  tx();
}

export function upsertDailyUsage(entries: DailyUsage[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO daily_usage (date, email, user_id, is_active, lines_added, lines_deleted,
      accepted_lines_added, accepted_lines_deleted, total_applies, total_accepts, total_rejects,
      total_tabs_shown, tabs_accepted, composer_requests, chat_requests, agent_requests,
      usage_based_reqs, most_used_model, tab_most_used_extension, client_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date, email) DO UPDATE SET
      user_id = excluded.user_id,
      is_active = excluded.is_active,
      lines_added = excluded.lines_added,
      lines_deleted = excluded.lines_deleted,
      accepted_lines_added = excluded.accepted_lines_added,
      accepted_lines_deleted = excluded.accepted_lines_deleted,
      total_applies = excluded.total_applies,
      total_accepts = excluded.total_accepts,
      total_rejects = excluded.total_rejects,
      total_tabs_shown = excluded.total_tabs_shown,
      tabs_accepted = excluded.tabs_accepted,
      composer_requests = excluded.composer_requests,
      chat_requests = excluded.chat_requests,
      agent_requests = excluded.agent_requests,
      usage_based_reqs = excluded.usage_based_reqs,
      most_used_model = excluded.most_used_model,
      tab_most_used_extension = excluded.tab_most_used_extension,
      client_version = excluded.client_version,
      collected_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const e of entries) {
      stmt.run(
        e.date,
        e.email,
        e.userId,
        e.isActive ? 1 : 0,
        e.linesAdded,
        e.linesDeleted,
        e.acceptedLinesAdded,
        e.acceptedLinesDeleted,
        e.totalApplies,
        e.totalAccepts,
        e.totalRejects,
        e.totalTabsShown,
        e.tabsAccepted,
        e.composerRequests,
        e.chatRequests,
        e.agentRequests,
        e.usageBasedReqs,
        e.mostUsedModel,
        e.tabMostUsedExtension,
        e.clientVersion,
      );
    }
  });
  tx();
}

export function upsertSpending(members: MemberSpend[], cycleStart: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO spending (email, user_id, name, cycle_start, spend_cents, included_spend_cents,
      fast_premium_requests, monthly_limit_dollars, hard_limit_override_dollars)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email, cycle_start) DO UPDATE SET
      user_id = excluded.user_id,
      name = excluded.name,
      spend_cents = excluded.spend_cents,
      included_spend_cents = excluded.included_spend_cents,
      fast_premium_requests = excluded.fast_premium_requests,
      monthly_limit_dollars = excluded.monthly_limit_dollars,
      hard_limit_override_dollars = excluded.hard_limit_override_dollars,
      collected_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const m of members) {
      stmt.run(
        m.email,
        m.userId,
        m.name,
        cycleStart,
        m.spendCents,
        m.includedSpendCents,
        m.fastPremiumRequests,
        m.monthlyLimitDollars,
        m.hardLimitOverrideDollars,
      );
    }
  });
  tx();
}

export function upsertDailySpend(members: GroupMemberSpend[], cycleStart: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO daily_spend (date, email, spend_cents, cycle_start)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date, email) DO UPDATE SET
      spend_cents = MAX(daily_spend.spend_cents, excluded.spend_cents),
      cycle_start = excluded.cycle_start,
      collected_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const m of members) {
      for (const ds of m.dailySpend) {
        stmt.run(ds.date, m.email, ds.spendCents, cycleStart);
      }
    }
  });
  tx();
}

export function upsertBillingGroups(
  groups: Array<{
    id: string;
    name: string;
    memberCount: number;
    spendCents: number;
    members: Array<{ email: string; joinedAt: string }>;
  }>,
): void {
  const db = getDb();
  const groupStmt = db.prepare(`
    INSERT INTO billing_groups (id, name, member_count, spend_cents)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      member_count = excluded.member_count,
      spend_cents = excluded.spend_cents,
      collected_at = datetime('now')
  `);
  const memberStmt = db.prepare(`
    INSERT INTO group_members (group_id, email, joined_at)
    VALUES (?, ?, ?)
    ON CONFLICT(group_id, email) DO UPDATE SET joined_at = excluded.joined_at
  `);

  const tx = db.transaction(() => {
    for (const g of groups) {
      groupStmt.run(g.id, g.name, g.memberCount, g.spendCents);
      for (const m of g.members) {
        memberStmt.run(g.id, m.email, m.joinedAt);
      }
    }
  });
  tx();
}

export function getUserDailySpend(email: string): Array<{ date: string; spend_cents: number }> {
  const db = getDb();

  const hasUsageEvents =
    (
      db
        .prepare("SELECT COUNT(*) as c FROM usage_events WHERE user_email = ? LIMIT 1")
        .get(email) as { c: number }
    ).c > 0;

  const spendRows = hasUsageEvents
    ? (db
        .prepare(
          `SELECT date(timestamp/1000, 'unixepoch') as date, ROUND(SUM(total_cents)) as spend_cents
           FROM usage_events WHERE user_email = ?
           GROUP BY date(timestamp/1000, 'unixepoch') ORDER BY date`,
        )
        .all(email) as Array<{ date: string; spend_cents: number }>)
    : (db
        .prepare(
          "SELECT date, MAX(spend_cents) as spend_cents FROM daily_spend WHERE email = ? GROUP BY date ORDER BY date",
        )
        .all(email) as Array<{ date: string; spend_cents: number }>);

  if (!spendRows.length) return spendRows;

  const spendMap = new Map(spendRows.map((r) => [r.date, r.spend_cents]));
  const firstDate = spendRows[0]?.date ?? "";
  const start = new Date(firstDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result: Array<{ date: string; spend_cents: number }> = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    result.push({ date: dateStr, spend_cents: spendMap.get(dateStr) ?? 0 });
  }
  return result;
}

export function getUserActivityProfile(email: string, days: number = 30) {
  const db = getDb();
  const row = db
    .prepare(
      `
    SELECT
      SUM(agent_requests) as agent_requests,
      SUM(chat_requests) as chat_requests,
      SUM(composer_requests) as composer_requests,
      SUM(lines_added) as lines_added,
      SUM(total_accepts) as total_accepts,
      SUM(total_rejects) as total_rejects,
      SUM(tabs_accepted) as tabs_accepted,
      SUM(usage_based_reqs) as usage_based_reqs,
      SUM(total_tabs_shown) as total_tabs_shown
    FROM daily_usage WHERE email = ? AND date >= date('now', ?) AND is_active = 1
  `,
    )
    .get(email, `-${days} days`) as Record<string, number> | undefined;

  const teamAvg = db
    .prepare(
      `
    SELECT
      AVG(total_agent) as agent_requests,
      AVG(total_chat) as chat_requests,
      AVG(total_composer) as composer_requests,
      AVG(total_lines) as lines_added,
      AVG(total_accepts) as total_accepts,
      AVG(total_tabs) as tabs_accepted,
      AVG(total_usage_based) as usage_based_reqs
    FROM (
      SELECT email,
        SUM(agent_requests) as total_agent,
        SUM(chat_requests) as total_chat,
        SUM(composer_requests) as total_composer,
        SUM(lines_added) as total_lines,
        SUM(total_accepts) as total_accepts,
        SUM(tabs_accepted) as total_tabs,
        SUM(usage_based_reqs) as total_usage_based
      FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1
      GROUP BY email
    )
  `,
    )
    .get(`-${days} days`) as Record<string, number> | undefined;

  return { user: row ?? {}, teamAvg: teamAvg ?? {} };
}

export function getBillingGroups(): Array<{
  id: string;
  name: string;
  member_count: number;
  spend_cents: number;
}> {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, name, member_count, spend_cents FROM billing_groups ORDER BY spend_cents DESC",
    )
    .all() as Array<{ id: string; name: string; member_count: number; spend_cents: number }>;
}

export function getGroupMembers(groupId: string): string[] {
  const db = getDb();
  return (
    db.prepare("SELECT email FROM group_members WHERE group_id = ?").all(groupId) as Array<{
      email: string;
    }>
  ).map((r) => r.email);
}

export function getGroupsWithMembers(): Array<{
  id: string;
  name: string;
  member_count: number;
  spend_cents: number;
  emails: string[];
  members: Array<{ email: string; name: string }>;
}> {
  const db = getDb();
  const groups = db
    .prepare("SELECT id, name, member_count, spend_cents FROM billing_groups ORDER BY name")
    .all() as Array<{ id: string; name: string; member_count: number; spend_cents: number }>;

  const memberRows = db
    .prepare(
      "SELECT gm.group_id, gm.email, COALESCE(m.name, '') as name FROM group_members gm LEFT JOIN members m ON gm.email = m.email",
    )
    .all() as Array<{ group_id: string; email: string; name: string }>;

  const membersByGroup = new Map<string, Array<{ email: string; name: string }>>();
  for (const row of memberRows) {
    const list = membersByGroup.get(row.group_id) ?? [];
    list.push({ email: row.email, name: row.name });
    membersByGroup.set(row.group_id, list);
  }

  return groups.map((g) => {
    const memberList = membersByGroup.get(g.id) ?? [];
    return {
      ...g,
      emails: memberList.map((m) => m.email),
      members: memberList,
    };
  });
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

const ANOMALY_SELECT = `SELECT id, user_email as userEmail, type, severity, metric, value, threshold, message,
  detected_at as detectedAt, resolved_at as resolvedAt, alerted_at as alertedAt,
  diagnosis_model as diagnosisModel, diagnosis_kind as diagnosisKind, diagnosis_delta as diagnosisDelta
  FROM anomalies`;

export function getOpenAnomalies(): Anomaly[] {
  const db = getDb();
  return db
    .prepare(`${ANOMALY_SELECT} WHERE resolved_at IS NULL ORDER BY detected_at DESC`)
    .all() as Anomaly[];
}

export function getRecentAnomalies(days: number = 30): Anomaly[] {
  const db = getDb();
  return db
    .prepare(`${ANOMALY_SELECT} WHERE detected_at >= datetime('now', ?) ORDER BY detected_at DESC`)
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

const INCIDENT_SELECT = `SELECT id, anomaly_id as anomalyId, user_email as userEmail, status,
  detected_at as detectedAt, alerted_at as alertedAt, acknowledged_at as acknowledgedAt,
  resolved_at as resolvedAt, mttd_minutes as mttdMinutes, mtti_minutes as mttiMinutes, mttr_minutes as mttrMinutes
  FROM incidents`;

export function getOpenIncidents(): Incident[] {
  const db = getDb();
  return db
    .prepare(`${INCIDENT_SELECT} WHERE status NOT IN ('resolved') ORDER BY detected_at DESC`)
    .all() as Incident[];
}

export function getConfig(): DetectionConfig {
  const db = getDb();
  const row = db.prepare("SELECT value FROM config WHERE key = 'detection'").get() as
    | { value: string }
    | undefined;

  if (!row) return DEFAULT_CONFIG;
  const stored = JSON.parse(row.value) as Partial<DetectionConfig>;
  return {
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...stored.thresholds },
    zscore: { ...DEFAULT_CONFIG.zscore, ...stored.zscore },
    trends: { ...DEFAULT_CONFIG.trends, ...stored.trends },
    cronIntervalMinutes: stored.cronIntervalMinutes ?? DEFAULT_CONFIG.cronIntervalMinutes,
  };
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

export type UsageBadge = "power-user" | "deep-thinker" | "balanced" | "light-user";

export type SpendBadge = "cost-efficient" | "premium-model" | "over-budget";

export type ContextBadge = "long-sessions" | "short-sessions";
export type AdoptionBadge =
  | "ai-native"
  | "high-adoption"
  | "moderate-adoption"
  | "low-adoption"
  | "manual-coder";

export interface RankedUser {
  rank: number;
  email: string;
  name: string;
  spend_cents: number;
  included_spend_cents: number;
  fast_premium_requests: number;
  agent_requests: number;
  lines_added: number;
  most_used_model: string;
  spend_rank: number;
  activity_rank: number;
  active_days: number;
  tabs_accepted: number;
  tabs_shown: number;
  total_applies: number;
  total_accepts: number;
  avg_cache_read: number;
  usage_badge: UsageBadge | null;
  spend_badge: SpendBadge | null;
  context_badge: ContextBadge | null;
  adoption_badge: AdoptionBadge | null;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalSpendCents: number;
  totalAgentRequests: number;
  activeAnomalies: number;
  cycleStart: string;
  cycleEnd: string;
  cycleDays: number;
  dailyTeamActivity: Array<{
    date: string;
    total_agent_requests: number;
    total_lines_added: number;
    active_users: number;
  }>;
  rankedUsers: RankedUser[];
}

export interface FullDashboard {
  days: number;
  stats: DashboardStats;
  modelCosts: Array<{
    model: string;
    users: number;
    avg_spend: number;
    total_spend: number;
    total_reqs: number;
  }>;
  teamDailySpend: Array<{ date: string; spend_cents: number }>;
  dailySpendBreakdown: Array<{ date: string; email: string; name: string; spend_cents: number }>;
}

export function getFullDashboard(days: number = 7): FullDashboard {
  const db = getDb();
  const dateFilter = `-${days} days`;

  const totalMembers =
    (db.prepare("SELECT COUNT(*) as c FROM members WHERE is_removed = 0").get() as { c: number })
      ?.c ?? 0;

  const activeMembers =
    (
      db
        .prepare(
          "SELECT COUNT(DISTINCT email) as c FROM daily_usage WHERE is_active = 1 AND date >= date('now', ?)",
        )
        .get(dateFilter) as { c: number }
    )?.c ?? 0;

  const cycleRow = db.prepare("SELECT MAX(cycle_start) as cycle_start FROM spending").get() as {
    cycle_start: string | null;
  };
  const cycleStart =
    getMetadata("cycle_start") ?? cycleRow?.cycle_start ?? new Date().toISOString().slice(0, 10);
  const cycleEnd = getMetadata("cycle_end") ?? "";
  const cycleDays = Math.max(
    1,
    Math.ceil((Date.now() - new Date(cycleStart).getTime()) / 86_400_000),
  );

  const hasUsageEvents =
    (db.prepare("SELECT COUNT(*) as c FROM usage_events").get() as { c: number }).c > 0;

  const spendRow = hasUsageEvents
    ? (db
        .prepare(
          `SELECT COALESCE(ROUND(SUM(total_cents)), 0) as total FROM usage_events
           WHERE date(timestamp/1000, 'unixepoch') >= date('now', ?)`,
        )
        .get(dateFilter) as { total: number })
    : (db
        .prepare(
          `SELECT COALESCE(SUM(spend), 0) as total FROM (
            SELECT date, email, MAX(spend_cents) as spend FROM daily_spend
            WHERE date >= date('now', ?) GROUP BY date, email
          )`,
        )
        .get(dateFilter) as { total: number });

  const agentRow = db
    .prepare(
      "SELECT COALESCE(SUM(agent_requests), 0) as total FROM daily_usage WHERE date >= date('now', ?)",
    )
    .get(dateFilter) as { total: number };

  const activeAnomalies =
    (
      db.prepare("SELECT COUNT(*) as c FROM anomalies WHERE resolved_at IS NULL").get() as {
        c: number;
      }
    )?.c ?? 0;

  const dailyTeamActivity = db
    .prepare(
      `SELECT date,
        SUM(agent_requests) as total_agent_requests,
        SUM(lines_added) as total_lines_added,
        COUNT(DISTINCT CASE WHEN is_active = 1 THEN email END) as active_users
       FROM daily_usage
       WHERE date >= date('now', ?)
       GROUP BY date ORDER BY date`,
    )
    .all(dateFilter) as Array<{
    date: string;
    total_agent_requests: number;
    total_lines_added: number;
    active_users: number;
  }>;

  const rankedUsers = db
    .prepare(
      hasUsageEvents
        ? `WITH user_spend AS (
            SELECT user_email as email, ROUND(SUM(total_cents)) as spend_cents
            FROM usage_events
            WHERE date(timestamp/1000, 'unixepoch') >= date('now', ?)
            GROUP BY user_email
          ),
          user_cache AS (
            SELECT user_email as email, ROUND(AVG(cache_read_tokens)) as avg_cache_read
            FROM usage_events
            WHERE date(timestamp/1000, 'unixepoch') >= date('now', ?) AND cache_read_tokens > 0
            GROUP BY user_email
          ),
          activity AS (
            SELECT email,
              SUM(agent_requests) as agent_requests,
              SUM(lines_added) as lines_added,
              SUM(tabs_accepted) as tabs_accepted,
              SUM(total_tabs_shown) as tabs_shown,
              SUM(total_applies) as total_applies,
              SUM(total_accepts) as total_accepts,
              COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_days,
              MAX(most_used_model) as most_used_model
            FROM daily_usage
            WHERE date >= date('now', ?) AND is_active = 1
            GROUP BY email
          )
          SELECT
            m.email, m.name,
            COALESCE(us.spend_cents, 0) as spend_cents,
            0 as included_spend_cents, 0 as fast_premium_requests,
            COALESCE(a.agent_requests, 0) as agent_requests,
            COALESCE(a.lines_added, 0) as lines_added,
            COALESCE(a.most_used_model, '') as most_used_model,
            COALESCE(a.active_days, 0) as active_days,
            COALESCE(a.tabs_accepted, 0) as tabs_accepted,
            COALESCE(a.tabs_shown, 0) as tabs_shown,
            COALESCE(a.total_applies, 0) as total_applies,
            COALESCE(a.total_accepts, 0) as total_accepts,
            COALESCE(uc.avg_cache_read, 0) as avg_cache_read,
            RANK() OVER (ORDER BY COALESCE(us.spend_cents, 0) DESC) as spend_rank,
            RANK() OVER (ORDER BY COALESCE(a.agent_requests, 0) DESC) as activity_rank
          FROM members m
          LEFT JOIN user_spend us ON m.email = us.email
          LEFT JOIN user_cache uc ON m.email = uc.email
          LEFT JOIN activity a ON m.email = a.email
          WHERE m.is_removed = 0 AND (COALESCE(us.spend_cents, 0) > 0 OR COALESCE(a.agent_requests, 0) > 0)
          ORDER BY COALESCE(us.spend_cents, 0) DESC`
        : `WITH deduped_spend AS (
            SELECT date, email, MAX(spend_cents) as spend_cents
            FROM daily_spend WHERE date >= date('now', ?)
            GROUP BY date, email
          ),
          user_spend AS (
            SELECT email, SUM(spend_cents) as spend_cents
            FROM deduped_spend
            GROUP BY email
          ),
          activity AS (
            SELECT email,
              SUM(agent_requests) as agent_requests,
              SUM(lines_added) as lines_added,
              SUM(tabs_accepted) as tabs_accepted,
              SUM(total_tabs_shown) as tabs_shown,
              SUM(total_applies) as total_applies,
              SUM(total_accepts) as total_accepts,
              COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_days,
              MAX(most_used_model) as most_used_model
            FROM daily_usage
            WHERE date >= date('now', ?) AND is_active = 1
            GROUP BY email
          )
          SELECT
            m.email, m.name,
            COALESCE(us.spend_cents, 0) as spend_cents,
            0 as included_spend_cents, 0 as fast_premium_requests,
            COALESCE(a.agent_requests, 0) as agent_requests,
            COALESCE(a.lines_added, 0) as lines_added,
            COALESCE(a.most_used_model, '') as most_used_model,
            COALESCE(a.active_days, 0) as active_days,
            COALESCE(a.tabs_accepted, 0) as tabs_accepted,
            COALESCE(a.tabs_shown, 0) as tabs_shown,
            COALESCE(a.total_applies, 0) as total_applies,
            COALESCE(a.total_accepts, 0) as total_accepts,
            0 as avg_cache_read,
            RANK() OVER (ORDER BY COALESCE(us.spend_cents, 0) DESC) as spend_rank,
            RANK() OVER (ORDER BY COALESCE(a.agent_requests, 0) DESC) as activity_rank
          FROM members m
          LEFT JOIN user_spend us ON m.email = us.email
          LEFT JOIN activity a ON m.email = a.email
          WHERE m.is_removed = 0 AND (COALESCE(us.spend_cents, 0) > 0 OR COALESCE(a.agent_requests, 0) > 0)
          ORDER BY COALESCE(us.spend_cents, 0) DESC`,
    )
    .all(
      ...(hasUsageEvents ? [dateFilter, dateFilter, dateFilter] : [dateFilter, dateFilter]),
    ) as Array<{
    email: string;
    name: string;
    spend_cents: number;
    included_spend_cents: number;
    fast_premium_requests: number;
    agent_requests: number;
    lines_added: number;
    most_used_model: string;
    active_days: number;
    tabs_accepted: number;
    tabs_shown: number;
    total_applies: number;
    total_accepts: number;
    avg_cache_read: number;
    spend_rank: number;
    activity_rank: number;
  }>;

  const chartDays = Math.max(days, 7);
  const chartDateFilter = `-${chartDays} days`;

  const teamDailySpend = hasUsageEvents
    ? (db
        .prepare(
          `
    SELECT date(timestamp/1000, 'unixepoch') as date,
      ROUND(SUM(total_cents)) as spend_cents
    FROM usage_events
    WHERE date(timestamp/1000, 'unixepoch') >= date('now', ?)
    GROUP BY date(timestamp/1000, 'unixepoch') ORDER BY date
  `,
        )
        .all(chartDateFilter) as Array<{ date: string; spend_cents: number }>)
    : (db
        .prepare(
          `
    SELECT date, SUM(spend) as spend_cents FROM (
      SELECT date, email, MAX(spend_cents) as spend FROM daily_spend
      WHERE date >= date('now', ?) GROUP BY date, email
    ) GROUP BY date ORDER BY date
  `,
        )
        .all(chartDateFilter) as Array<{ date: string; spend_cents: number }>);

  const dailySpendBreakdown = hasUsageEvents
    ? (db
        .prepare(
          `
    SELECT date(ue.timestamp/1000, 'unixepoch') as date,
      ue.user_email as email,
      COALESCE(m.name, ue.user_email) as name,
      ROUND(SUM(ue.total_cents)) as spend_cents
    FROM usage_events ue
    LEFT JOIN members m ON ue.user_email = m.email
    WHERE date(ue.timestamp/1000, 'unixepoch') >= date('now', ?)
    GROUP BY date(ue.timestamp/1000, 'unixepoch'), ue.user_email
    HAVING spend_cents > 0
    ORDER BY date, spend_cents DESC
  `,
        )
        .all(chartDateFilter) as Array<{
        date: string;
        email: string;
        name: string;
        spend_cents: number;
      }>)
    : (db
        .prepare(
          `
    SELECT ds.date, ds.email,
      COALESCE(m.name, ds.email) as name,
      ds.spend_cents
    FROM (
      SELECT date, email, MAX(spend_cents) as spend_cents
      FROM daily_spend
      WHERE date >= date('now', ?)
      GROUP BY date, email
    ) ds
    LEFT JOIN members m ON ds.email = m.email
    WHERE ds.spend_cents > 0
    ORDER BY ds.date, ds.spend_cents DESC
  `,
        )
        .all(chartDateFilter) as Array<{
        date: string;
        email: string;
        name: string;
        spend_cents: number;
      }>);

  const modelCosts = db
    .prepare(
      `
    WITH user_model AS (
      SELECT email, most_used_model, SUM(agent_requests) as reqs
      FROM daily_usage WHERE is_active = 1 AND most_used_model != '' AND date >= date('now', ?)
      GROUP BY email, most_used_model
    ),
    primary_model AS (
      SELECT email, most_used_model FROM user_model
      WHERE (email, reqs) IN (SELECT email, MAX(reqs) FROM user_model GROUP BY email)
    ),
    deduped AS (
      SELECT date, email, MAX(spend_cents) as spend_cents
      FROM daily_spend WHERE date >= date('now', ?)
      GROUP BY date, email
    ),
    user_spend AS (
      SELECT email, SUM(spend_cents) as spend_cents
      FROM deduped
      GROUP BY email
    )
    SELECT pm.most_used_model as model, COUNT(*) as users,
      ROUND(AVG(COALESCE(us.spend_cents, 0))/100, 0) as avg_spend,
      ROUND(SUM(COALESCE(us.spend_cents, 0))/100, 0) as total_spend,
      COALESCE(SUM(du.reqs), 0) as total_reqs
    FROM primary_model pm
    LEFT JOIN user_spend us ON pm.email = us.email
    LEFT JOIN (SELECT email, SUM(agent_requests) as reqs FROM daily_usage WHERE date >= date('now', ?) GROUP BY email) du ON pm.email = du.email
    GROUP BY pm.most_used_model
    ORDER BY total_spend DESC
  `,
    )
    .all(dateFilter, dateFilter, dateFilter) as Array<{
    model: string;
    users: number;
    avg_spend: number;
    total_spend: number;
    total_reqs: number;
  }>;

  const stats: DashboardStats = {
    totalMembers,
    activeMembers,
    totalSpendCents: spendRow.total,
    totalAgentRequests: agentRow.total,
    activeAnomalies,
    cycleStart,
    cycleEnd,
    cycleDays,
    dailyTeamActivity,
    rankedUsers: assignBadges(rankedUsers).map((u, i) => ({ ...u, rank: i + 1 })),
  };

  return { days, stats, modelCosts, teamDailySpend, dailySpendBreakdown };
}

function isMaxModel(model: string): boolean {
  return model.toLowerCase().includes("-max");
}

function assignBadges(
  users: Array<{
    email: string;
    name: string;
    spend_cents: number;
    included_spend_cents: number;
    fast_premium_requests: number;
    agent_requests: number;
    lines_added: number;
    most_used_model: string;
    active_days: number;
    tabs_accepted: number;
    tabs_shown: number;
    total_applies: number;
    total_accepts: number;
    avg_cache_read: number;
    spend_rank: number;
    activity_rank: number;
  }>,
): Array<
  (typeof users)[number] & {
    usage_badge: UsageBadge | null;
    spend_badge: SpendBadge | null;
    context_badge: ContextBadge | null;
    adoption_badge: AdoptionBadge | null;
  }
> {
  const maxActiveDays = Math.max(...users.map((u) => u.active_days), 1);
  const activeUsersForIntensity = users.filter((u) => u.agent_requests >= 10 && u.active_days > 0);
  const intensities = activeUsersForIntensity
    .map((u) => u.agent_requests / u.active_days)
    .sort((a, b) => a - b);
  const p90Intensity = intensities[Math.floor(intensities.length * 0.9)] ?? 50;

  const activeUsers = users.filter((u) => u.agent_requests >= 30);
  const reqValues = activeUsers.map((u) => u.agent_requests).sort((a, b) => a - b);

  const p80Reqs = reqValues[Math.floor(reqValues.length * 0.8)] ?? 0;
  const spendingUsers = activeUsers.filter((u) => u.spend_cents > 0);
  const medianSpend =
    spendingUsers.length > 0
      ? (spendingUsers.map((u) => u.spend_cents).sort((a, b) => a - b)[
          Math.floor(spendingUsers.length * 0.5)
        ] ?? 0)
      : 0;
  const spendingCprs = spendingUsers
    .filter((u) => u.agent_requests > 0)
    .map((u) => u.spend_cents / u.agent_requests)
    .sort((a, b) => a - b);
  const medianCpr =
    spendingCprs.length > 0 ? (spendingCprs[Math.floor(spendingCprs.length * 0.5)] ?? 0) : 0;

  const LONG_SESSION_THRESHOLD = 700_000;

  return users.map((u) => {
    let usage_badge: UsageBadge | null;
    let spend_badge: SpendBadge | null = null;
    let context_badge: ContextBadge | null = null;

    if (u.agent_requests < 10) {
      usage_badge = "light-user";
    } else {
      const reqsPerDay = u.active_days > 0 ? u.agent_requests / u.active_days : 0;
      const usesMax = isMaxModel(u.most_used_model);

      if (usesMax) {
        usage_badge = "deep-thinker";
      } else if (reqsPerDay >= 80) {
        usage_badge = "power-user";
      } else {
        usage_badge = "balanced";
      }
    }

    if (u.agent_requests >= 30 && u.spend_cents > 0) {
      const cpr = u.spend_cents / u.agent_requests;
      const overBudget = u.spend_cents > medianSpend * 5 && u.spend_cents > 10000;

      if (overBudget) {
        spend_badge = "over-budget";
      } else if (isMaxModel(u.most_used_model) && medianCpr > 0 && cpr > medianCpr * 3) {
        spend_badge = "premium-model";
      } else if (u.agent_requests >= p80Reqs && medianCpr > 0 && cpr <= medianCpr * 0.5) {
        spend_badge = "cost-efficient";
      }
    }

    const SHORT_SESSION_THRESHOLD = 300_000;
    if (u.agent_requests >= 30 && u.avg_cache_read > LONG_SESSION_THRESHOLD) {
      context_badge = "long-sessions";
    } else if (
      u.agent_requests >= 30 &&
      u.avg_cache_read > 0 &&
      u.avg_cache_read < SHORT_SESSION_THRESHOLD
    ) {
      context_badge = "short-sessions";
    }

    let adoption_badge: AdoptionBadge | null = null;
    if (u.agent_requests >= 10 && u.active_days > 0) {
      const acceptRate = u.total_applies > 0 ? u.total_accepts / u.total_applies : 0;
      const intensity = u.agent_requests / u.active_days;
      const intensityNorm = Math.min(intensity / p90Intensity, 1);
      const consistency = u.active_days / maxActiveDays;
      const score = acceptRate * 40 + intensityNorm * 40 + consistency * 20;
      if (score >= 80) adoption_badge = "ai-native";
      else if (score >= 55) adoption_badge = "high-adoption";
      else if (score >= 30) adoption_badge = "moderate-adoption";
      else if (score >= 10) adoption_badge = "low-adoption";
      else adoption_badge = "manual-coder";
    }

    return {
      ...u,
      usage_badge,
      spend_badge,
      context_badge,
      adoption_badge,
    };
  });
}

export function getUserBadges(
  email: string,
  days: number = 30,
): {
  usage: UsageBadge | null;
  spend: SpendBadge | null;
  context: ContextBadge | null;
  adoption: AdoptionBadge | null;
} {
  const db = getDb();
  const dateFilter = `-${days} days`;

  const userRow = db
    .prepare(
      `SELECT SUM(agent_requests) as agent_requests, SUM(lines_added) as lines_added,
        SUM(tabs_accepted) as tabs_accepted, SUM(total_tabs_shown) as tabs_shown,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_days,
        MAX(most_used_model) as most_used_model
       FROM daily_usage WHERE email = ? AND date >= date('now', ?) AND is_active = 1`,
    )
    .get(email, dateFilter) as
    | {
        agent_requests: number;
        lines_added: number;
        tabs_accepted: number;
        tabs_shown: number;
        active_days: number;
        most_used_model: string;
      }
    | undefined;

  if (!userRow || !userRow.agent_requests) {
    return { usage: null, spend: null, context: null, adoption: null };
  }

  const spendRow = db
    .prepare(
      `SELECT COALESCE(ROUND(SUM(total_cents)), 0) as spend_cents
       FROM usage_events WHERE user_email = ? AND date(timestamp/1000, 'unixepoch') >= date('now', ?)`,
    )
    .get(email, dateFilter) as { spend_cents: number };

  const teamStats = db
    .prepare(
      `SELECT email, SUM(agent_requests) as reqs, COALESCE(us.spend, 0) as spend
       FROM daily_usage du
       LEFT JOIN (
         SELECT user_email, ROUND(SUM(total_cents)) as spend
         FROM usage_events WHERE date(timestamp/1000, 'unixepoch') >= date('now', ?)
         GROUP BY user_email
       ) us ON du.email = us.user_email
       WHERE du.date >= date('now', ?) AND du.is_active = 1
       GROUP BY du.email HAVING SUM(agent_requests) >= 30`,
    )
    .all(dateFilter, dateFilter) as Array<{ email: string; reqs: number; spend: number }>;

  const spendValues = teamStats
    .filter((t) => t.spend > 0)
    .map((t) => t.spend)
    .sort((a, b) => a - b);
  const medianSpend =
    spendValues.length > 0 ? (spendValues[Math.floor(spendValues.length / 2)] ?? 0) : 0;
  const cprValues = teamStats
    .filter((t) => t.spend > 0 && t.reqs > 0)
    .map((t) => t.spend / t.reqs)
    .sort((a, b) => a - b);
  const medianCpr = cprValues.length > 0 ? (cprValues[Math.floor(cprValues.length / 2)] ?? 0) : 0;
  const reqValues = teamStats.map((t) => t.reqs).sort((a, b) => a - b);
  const p80Reqs = reqValues[Math.floor(reqValues.length * 0.8)] ?? 0;

  let usage: UsageBadge | null;
  if (userRow.agent_requests < 10) {
    usage = "light-user";
  } else {
    const reqsPerDay = userRow.active_days > 0 ? userRow.agent_requests / userRow.active_days : 0;
    const usesMax = isMaxModel(userRow.most_used_model);
    if (usesMax) usage = "deep-thinker";
    else if (reqsPerDay >= 80) usage = "power-user";
    else usage = null;
  }

  let spend: SpendBadge | null = null;
  if (userRow.agent_requests >= 30 && spendRow.spend_cents > 0) {
    const cpr = spendRow.spend_cents / userRow.agent_requests;
    if (spendRow.spend_cents > medianSpend * 5 && spendRow.spend_cents > 10000) {
      spend = "over-budget";
    } else if (isMaxModel(userRow.most_used_model) && medianCpr > 0 && cpr > medianCpr * 3) {
      spend = "premium-model";
    } else if (userRow.agent_requests >= p80Reqs && medianCpr > 0 && cpr <= medianCpr * 0.5) {
      spend = "cost-efficient";
    }
  }

  const cacheRow = db
    .prepare(
      `SELECT ROUND(AVG(cache_read_tokens)) as avg_cr FROM usage_events
       WHERE user_email = ? AND date(timestamp/1000, 'unixepoch') >= date('now', ?) AND cache_read_tokens > 0`,
    )
    .get(email, dateFilter) as { avg_cr: number | null } | undefined;

  let context: ContextBadge | null = null;
  const avgCr = cacheRow?.avg_cr ?? 0;
  if (userRow.agent_requests >= 30 && avgCr > 700_000) context = "long-sessions";
  else if (userRow.agent_requests >= 30 && avgCr > 0 && avgCr < 300_000) context = "short-sessions";

  let adoption: AdoptionBadge | null = null;
  if (userRow.agent_requests >= 10 && userRow.active_days > 0) {
    const teamIntensities = db
      .prepare(
        `SELECT SUM(agent_requests) * 1.0 / COUNT(CASE WHEN is_active = 1 THEN 1 END) as rpd
        FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1
        GROUP BY email HAVING SUM(agent_requests) >= 10
        ORDER BY rpd`,
      )
      .all(dateFilter) as Array<{ rpd: number }>;
    const p90i = teamIntensities[Math.floor(teamIntensities.length * 0.9)]?.rpd ?? 50;
    const acceptRate =
      userRow.agent_requests >= 10 && userRow.tabs_accepted + userRow.agent_requests > 0
        ? (db
            .prepare(
              `SELECT SUM(total_applies) as ap, SUM(total_accepts) as ac
           FROM daily_usage WHERE email = ? AND date >= date('now', ?) AND is_active = 1`,
            )
            .get(email, dateFilter) as { ap: number; ac: number })
        : { ap: 0, ac: 0 };
    const ar = acceptRate.ap > 0 ? acceptRate.ac / acceptRate.ap : 0;
    const intensity = userRow.agent_requests / userRow.active_days;
    const intensityNorm = Math.min(intensity / p90i, 1);
    const elapsedBadge = db
      .prepare(
        `SELECT CAST(julianday('now') - julianday(MIN(date)) AS INTEGER) + 1 as elapsed
         FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1`,
      )
      .get(dateFilter) as { elapsed: number | null } | undefined;
    const periodForBadge = Math.min(days, elapsedBadge?.elapsed ?? days);
    const consistency = periodForBadge > 0 ? userRow.active_days / periodForBadge : 0;
    const score = ar * 40 + intensityNorm * 40 + consistency * 20;
    if (score >= 80) adoption = "ai-native";
    else if (score >= 55) adoption = "high-adoption";
    else if (score >= 30) adoption = "moderate-adoption";
    else if (score >= 10) adoption = "low-adoption";
    else adoption = "manual-coder";
  }

  return { usage, spend, context, adoption };
}

export function getDashboardStats(days: number = 7): DashboardStats {
  return getFullDashboard(days).stats;
}

export function getUserStats(email: string, days: number = 7) {
  const db = getDb();

  const member = db.prepare("SELECT * FROM members WHERE email = ?").get(email) as
    | (TeamMember & { first_seen: string; last_seen: string })
    | undefined;

  const spending = db
    .prepare("SELECT * FROM spending WHERE email = ? ORDER BY cycle_start DESC LIMIT 6")
    .all(email) as Array<{
    cycle_start: string;
    spend_cents: number;
    included_spend_cents: number;
    fast_premium_requests: number;
  }>;

  const dailyActivity = db
    .prepare(
      `SELECT date, agent_requests, lines_added, lines_deleted, total_accepts, total_rejects,
        tabs_accepted, usage_based_reqs, most_used_model, client_version
       FROM daily_usage
       WHERE email = ? AND date >= date('now', ?)
       ORDER BY date`,
    )
    .all(email, `-${days} days`) as Array<{
    date: string;
    agent_requests: number;
    lines_added: number;
    lines_deleted: number;
    total_accepts: number;
    total_rejects: number;
    tabs_accepted: number;
    usage_based_reqs: number;
    most_used_model: string;
    client_version: string;
  }>;

  const modelBreakdown = db
    .prepare(
      `SELECT most_used_model as model, COUNT(*) as days_used, SUM(agent_requests) as total_requests
       FROM daily_usage
       WHERE email = ? AND date >= date('now', ?) AND most_used_model != ''
       GROUP BY most_used_model
       ORDER BY total_requests DESC`,
    )
    .all(email, `-${days} days`) as Array<{
    model: string;
    days_used: number;
    total_requests: number;
  }>;

  const anomalies = db
    .prepare(`${ANOMALY_SELECT} WHERE user_email = ? ORDER BY detected_at DESC LIMIT 20`)
    .all(email) as Anomaly[];

  const dailySpend = getUserDailySpend(email);
  const usageEventsSummary = getUserUsageEventsSummary(email, days);
  const mcpSummary = getUserMCPSummary(email, days);
  const commandsSummary = getUserCommandsSummary(email, days);
  const contextMetrics = getUserContextMetrics(email, days);
  const badges = getUserBadges(email, days);
  const aiAdoption = getUserAIAdoption(email, days);

  const ranksRow = db
    .prepare(
      `WITH all_emails AS (
        SELECT DISTINCT user_email as email FROM usage_events WHERE CAST(timestamp AS INTEGER) >= ?
        UNION
        SELECT DISTINCT email FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1 AND agent_requests > 0
      ),
      user_spend AS (
        SELECT user_email as email, ROUND(SUM(total_cents)) as spend
        FROM usage_events WHERE CAST(timestamp AS INTEGER) >= ?
        GROUP BY user_email
      ),
      user_activity AS (
        SELECT email, SUM(agent_requests) as reqs
        FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1
        GROUP BY email
      ),
      ranked AS (
        SELECT
          e.email,
          RANK() OVER (ORDER BY COALESCE(s.spend, 0) DESC) as spend_rank,
          RANK() OVER (ORDER BY COALESCE(a.reqs, 0) DESC) as activity_rank,
          COUNT(*) OVER () as total_ranked
        FROM all_emails e
        LEFT JOIN user_spend s ON e.email = s.email
        LEFT JOIN user_activity a ON e.email = a.email
      )
      SELECT spend_rank, activity_rank, total_ranked FROM ranked WHERE email = ?`,
    )
    .get(
      Date.now() - days * 24 * 60 * 60 * 1000,
      `-${days} days`,
      Date.now() - days * 24 * 60 * 60 * 1000,
      `-${days} days`,
      email,
    ) as { spend_rank: number; activity_rank: number; total_ranked: number } | undefined;

  const groupRow = db
    .prepare(
      `SELECT bg.id, bg.name FROM group_members gm
       JOIN billing_groups bg ON bg.id = gm.group_id
       WHERE gm.email = ? AND bg.name != 'Unassigned'
       LIMIT 1`,
    )
    .get(email) as { id: string; name: string } | undefined;

  return {
    member,
    spending,
    dailyActivity,
    modelBreakdown,
    anomalies,
    dailySpend,
    usageEventsSummary,
    mcpSummary,
    commandsSummary,
    ranks: ranksRow
      ? {
          spendRank: ranksRow.spend_rank,
          activityRank: ranksRow.activity_rank,
          totalRanked: ranksRow.total_ranked,
        }
      : null,
    group: groupRow ?? null,
    contextMetrics,
    badges,
    aiAdoption,
  };
}

export function getAnomalyTimeline(days: number = 30) {
  const db = getDb();

  const anomalies = db
    .prepare(`${ANOMALY_SELECT} WHERE detected_at >= datetime('now', ?) ORDER BY detected_at DESC`)
    .all(`-${days} days`) as Anomaly[];

  const incidents = db
    .prepare(`${INCIDENT_SELECT} WHERE detected_at >= datetime('now', ?) ORDER BY detected_at DESC`)
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

export function getModelCostBreakdown(): Array<{
  model: string;
  users: number;
  avg_spend: number;
  total_spend: number;
  total_reqs: number;
}> {
  const db = getDb();
  return db
    .prepare(
      `
    WITH user_model AS (
      SELECT email, most_used_model, SUM(agent_requests) as reqs
      FROM daily_usage WHERE is_active = 1 AND most_used_model != ''
      GROUP BY email, most_used_model
    ),
    primary_model AS (
      SELECT email, most_used_model FROM user_model
      WHERE (email, reqs) IN (SELECT email, MAX(reqs) FROM user_model GROUP BY email)
    )
    SELECT pm.most_used_model as model, COUNT(*) as users,
      ROUND(AVG(s.spend_cents)/100, 0) as avg_spend,
      ROUND(SUM(s.spend_cents)/100, 0) as total_spend,
      COALESCE(SUM(du.reqs), 0) as total_reqs
    FROM primary_model pm
    JOIN spending s ON pm.email = s.email
    LEFT JOIN (SELECT email, SUM(agent_requests) as reqs FROM daily_usage GROUP BY email) du ON pm.email = du.email
    GROUP BY pm.most_used_model
    ORDER BY total_spend DESC
  `,
    )
    .all() as Array<{
    model: string;
    users: number;
    avg_spend: number;
    total_spend: number;
    total_reqs: number;
  }>;
}

export function getTeamDailySpend(): Array<{ date: string; spend_cents: number }> {
  const db = getDb();
  const hasUE = (db.prepare("SELECT COUNT(*) as c FROM usage_events").get() as { c: number }).c > 0;
  return hasUE
    ? (db
        .prepare(
          `SELECT date(timestamp/1000, 'unixepoch') as date, ROUND(SUM(total_cents)) as spend_cents
           FROM usage_events GROUP BY date(timestamp/1000, 'unixepoch') ORDER BY date`,
        )
        .all() as Array<{ date: string; spend_cents: number }>)
    : (db
        .prepare(
          `SELECT date, SUM(spend) as spend_cents FROM (
            SELECT date, email, MAX(spend_cents) as spend FROM daily_spend GROUP BY date, email
          ) GROUP BY date ORDER BY date`,
        )
        .all() as Array<{ date: string; spend_cents: number }>);
}

export function getDailySpendBreakdown(): Array<{
  date: string;
  email: string;
  name: string;
  spend_cents: number;
}> {
  const db = getDb();
  const hasUE = (db.prepare("SELECT COUNT(*) as c FROM usage_events").get() as { c: number }).c > 0;
  return hasUE
    ? (db
        .prepare(
          `SELECT date(ue.timestamp/1000, 'unixepoch') as date,
            ue.user_email as email,
            COALESCE(m.name, ue.user_email) as name,
            ROUND(SUM(ue.total_cents)) as spend_cents
          FROM usage_events ue
          LEFT JOIN members m ON ue.user_email = m.email
          GROUP BY date(ue.timestamp/1000, 'unixepoch'), ue.user_email
          HAVING spend_cents > 0
          ORDER BY date, spend_cents DESC`,
        )
        .all() as Array<{ date: string; email: string; name: string; spend_cents: number }>)
    : (db
        .prepare(
          `SELECT ds.date, ds.email,
            COALESCE(m.name, ds.email) as name,
            ds.spend_cents
          FROM (
            SELECT date, email, MAX(spend_cents) as spend_cents
            FROM daily_spend GROUP BY date, email
          ) ds
          LEFT JOIN members m ON ds.email = m.email
          WHERE ds.spend_cents > 0
          ORDER BY ds.date, ds.spend_cents DESC`,
        )
        .all() as Array<{ date: string; email: string; name: string; spend_cents: number }>);
}

export function upsertAnalyticsDAU(entries: AnalyticsDAUEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_dau (date, dau, cli_dau, cloud_agent_dau, bugbot_dau)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      dau = excluded.dau, cli_dau = excluded.cli_dau,
      cloud_agent_dau = excluded.cloud_agent_dau, bugbot_dau = excluded.bugbot_dau,
      collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(e.date, e.dau, e.cli_dau, e.cloud_agent_dau, e.bugbot_dau);
  });
  tx();
}

export function upsertAnalyticsModelUsage(entries: AnalyticsModelUsageEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_model_usage (date, model, messages, users)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date, model) DO UPDATE SET
      messages = excluded.messages, users = excluded.users, collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const entry of entries) {
      for (const [model, stats] of Object.entries(entry.model_breakdown)) {
        stmt.run(entry.date, model, stats.messages, stats.users);
      }
    }
  });
  tx();
}

export function upsertAnalyticsAgentEdits(entries: AnalyticsAgentEditsEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_agent_edits (date, suggested_diffs, accepted_diffs, rejected_diffs,
      lines_suggested, lines_accepted, green_lines_accepted, red_lines_accepted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      suggested_diffs = excluded.suggested_diffs, accepted_diffs = excluded.accepted_diffs,
      rejected_diffs = excluded.rejected_diffs, lines_suggested = excluded.lines_suggested,
      lines_accepted = excluded.lines_accepted, green_lines_accepted = excluded.green_lines_accepted,
      red_lines_accepted = excluded.red_lines_accepted, collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) {
      stmt.run(
        e.event_date,
        e.total_suggested_diffs,
        e.total_accepted_diffs,
        e.total_rejected_diffs,
        e.total_lines_suggested,
        e.total_lines_accepted,
        e.total_green_lines_accepted,
        e.total_red_lines_accepted,
      );
    }
  });
  tx();
}

export function upsertAnalyticsTabs(entries: AnalyticsTabsEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_tabs (date, suggestions, accepts, rejects, lines_suggested, lines_accepted)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      suggestions = excluded.suggestions, accepts = excluded.accepts, rejects = excluded.rejects,
      lines_suggested = excluded.lines_suggested, lines_accepted = excluded.lines_accepted,
      collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) {
      stmt.run(
        e.event_date,
        e.total_suggestions,
        e.total_accepts,
        e.total_rejects,
        e.total_lines_suggested,
        e.total_lines_accepted,
      );
    }
  });
  tx();
}

export function upsertAnalyticsMCP(entries: AnalyticsMCPEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_mcp (date, tool_name, server_name, usage)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date, tool_name, server_name) DO UPDATE SET
      usage = excluded.usage, collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(e.event_date, e.tool_name, e.mcp_server_name, e.usage);
  });
  tx();
}

export function upsertAnalyticsFileExtensions(entries: AnalyticsFileExtensionsEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_file_extensions (date, extension, total_files, lines_accepted)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date, extension) DO UPDATE SET
      total_files = excluded.total_files, lines_accepted = excluded.lines_accepted,
      collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries)
      stmt.run(e.event_date, e.file_extension, e.total_files, e.total_lines_accepted);
  });
  tx();
}

export function upsertAnalyticsClientVersions(entries: AnalyticsClientVersionsEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_client_versions (date, version, user_count, percentage)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date, version) DO UPDATE SET
      user_count = excluded.user_count, percentage = excluded.percentage,
      collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(e.event_date, e.client_version, e.user_count, e.percentage);
  });
  tx();
}

export function getAnalyticsDAU(days: number = 30): Array<{
  date: string;
  dau: number;
  cli_dau: number;
  cloud_agent_dau: number;
  bugbot_dau: number;
}> {
  const db = getDb();
  return db
    .prepare(
      "SELECT date, dau, cli_dau, cloud_agent_dau, bugbot_dau FROM analytics_dau WHERE date >= date('now', ?) ORDER BY date",
    )
    .all(`-${days} days`) as Array<{
    date: string;
    dau: number;
    cli_dau: number;
    cloud_agent_dau: number;
    bugbot_dau: number;
  }>;
}

export function getAnalyticsModelUsageTrend(
  days: number = 30,
): Array<{ date: string; model: string; messages: number; users: number }> {
  const db = getDb();
  return db
    .prepare(
      "SELECT date, model, messages, users FROM analytics_model_usage WHERE date >= date('now', ?) ORDER BY date, messages DESC",
    )
    .all(`-${days} days`) as Array<{
    date: string;
    model: string;
    messages: number;
    users: number;
  }>;
}

export function getAnalyticsModelUsageSummary(days: number = 30): Array<{
  model: string;
  total_messages: number;
  total_users: number;
  avg_daily_messages: number;
}> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT model, SUM(messages) as total_messages, MAX(users) as total_users,
      ROUND(AVG(messages), 0) as avg_daily_messages
    FROM analytics_model_usage WHERE date >= date('now', ?)
    GROUP BY model ORDER BY total_messages DESC
  `,
    )
    .all(`-${days} days`) as Array<{
    model: string;
    total_messages: number;
    total_users: number;
    avg_daily_messages: number;
  }>;
}

export function getAnalyticsAgentEditsTrend(days: number = 30): Array<{
  date: string;
  accepted_diffs: number;
  rejected_diffs: number;
  lines_accepted: number;
  lines_suggested: number;
}> {
  const db = getDb();
  return db
    .prepare(
      "SELECT date, accepted_diffs, rejected_diffs, lines_accepted, lines_suggested FROM analytics_agent_edits WHERE date >= date('now', ?) ORDER BY date",
    )
    .all(`-${days} days`) as Array<{
    date: string;
    accepted_diffs: number;
    rejected_diffs: number;
    lines_accepted: number;
    lines_suggested: number;
  }>;
}

export function getAnalyticsTabsTrend(
  days: number = 30,
): Array<{ date: string; suggestions: number; accepts: number; lines_accepted: number }> {
  const db = getDb();
  return db
    .prepare(
      "SELECT date, suggestions, accepts, lines_accepted FROM analytics_tabs WHERE date >= date('now', ?) ORDER BY date",
    )
    .all(`-${days} days`) as Array<{
    date: string;
    suggestions: number;
    accepts: number;
    lines_accepted: number;
  }>;
}

export function getAnalyticsMCPSummary(
  days: number = 30,
): Array<{ server_name: string; tool_name: string; total_usage: number }> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT server_name, tool_name, SUM(usage) as total_usage
    FROM analytics_mcp WHERE date >= date('now', ?)
    GROUP BY server_name, tool_name ORDER BY total_usage DESC LIMIT 20
  `,
    )
    .all(`-${days} days`) as Array<{ server_name: string; tool_name: string; total_usage: number }>;
}

export function getAnalyticsFileExtensionsSummary(
  days: number = 30,
): Array<{ extension: string; total_files: number; total_lines_accepted: number }> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT extension, SUM(total_files) as total_files, SUM(lines_accepted) as total_lines_accepted
    FROM analytics_file_extensions WHERE date >= date('now', ?)
    GROUP BY extension ORDER BY total_lines_accepted DESC LIMIT 10
  `,
    )
    .all(`-${days} days`) as Array<{
    extension: string;
    total_files: number;
    total_lines_accepted: number;
  }>;
}

export function getAnalyticsClientVersionsSummary(): Array<{
  version: string;
  user_count: number;
  percentage: number;
}> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT version, MAX(user_count) as user_count, MAX(percentage) as percentage
    FROM analytics_client_versions WHERE date = (SELECT MAX(date) FROM analytics_client_versions)
    GROUP BY version ORDER BY user_count DESC
  `,
    )
    .all() as Array<{ version: string; user_count: number; percentage: number }>;
}

export function getUsersByClientVersion(): Record<string, Array<{ email: string; name: string }>> {
  const db = getDb();
  const rows = db
    .prepare(
      `
    WITH latest_version AS (
      SELECT email, client_version, ROW_NUMBER() OVER (PARTITION BY email ORDER BY date DESC) as rn
      FROM daily_usage
      WHERE client_version IS NOT NULL AND client_version != ''
    )
    SELECT lv.client_version as version, lv.email, COALESCE(m.name, lv.email) as name
    FROM latest_version lv
    LEFT JOIN members m ON m.email = lv.email
    WHERE lv.rn = 1
    ORDER BY lv.client_version, m.name
  `,
    )
    .all() as Array<{ version: string; email: string; name: string }>;

  const result: Record<string, Array<{ email: string; name: string }>> = {};
  for (const row of rows) {
    const arr = (result[row.version] ??= []);
    arr.push({ email: row.email, name: row.name });
  }
  return result;
}

export interface ModelEfficiency {
  model: string;
  users: number;
  total_spend_usd: number;
  total_reqs: number;
  total_generated: number;
  total_accepted: number;
  total_wasted: number;
  precision_pct: number;
  useful_lines_per_req: number;
  wasted_lines_per_req: number;
  rejection_rate: number;
  cost_per_req: number;
  cost_per_useful_line: number;
}

export function getModelEfficiency(): ModelEfficiency[] {
  const db = getDb();
  const hasUE = (db.prepare("SELECT COUNT(*) as c FROM usage_events").get() as { c: number }).c > 0;

  return db
    .prepare(
      hasUE
        ? `
    WITH model_spend AS (
      SELECT date(timestamp/1000, 'unixepoch') as date, user_email as email,
        model, ROUND(SUM(total_cents)) as spend_cents
      FROM usage_events GROUP BY date, user_email, model
    )
    SELECT
      du.most_used_model as model,
      COUNT(DISTINCT du.email) as users,
      ROUND(SUM(ms.spend_cents) / 100.0, 2) as total_spend_usd,
      SUM(du.agent_requests) as total_reqs,
      SUM(du.lines_added) as total_generated,
      SUM(du.accepted_lines_added) as total_accepted,
      SUM(du.lines_added) - SUM(du.accepted_lines_added) as total_wasted,
      ROUND(SUM(du.accepted_lines_added) * 100.0 / NULLIF(SUM(du.lines_added), 0), 1) as precision_pct,
      ROUND(SUM(du.accepted_lines_added) * 1.0 / NULLIF(SUM(du.agent_requests), 0), 1) as useful_lines_per_req,
      ROUND((SUM(du.lines_added) - SUM(du.accepted_lines_added)) * 1.0 / NULLIF(SUM(du.agent_requests), 0), 1) as wasted_lines_per_req,
      ROUND(SUM(du.total_rejects) * 100.0 / NULLIF(SUM(du.total_accepts) + SUM(du.total_rejects), 0), 1) as rejection_rate,
      CASE WHEN SUM(du.agent_requests) > 0
        THEN ROUND(SUM(ms.spend_cents) / 100.0 / SUM(du.agent_requests), 2)
        ELSE 0 END as cost_per_req,
      CASE WHEN SUM(du.accepted_lines_added) > 0
        THEN ROUND(SUM(ms.spend_cents) / 100.0 / SUM(du.accepted_lines_added), 4)
        ELSE 0 END as cost_per_useful_line
    FROM daily_usage du
    JOIN model_spend ms ON du.email = ms.email AND du.date = ms.date
    WHERE du.is_active = 1
      AND du.most_used_model != ''
      AND du.agent_requests > 0
      AND ms.spend_cents > 0
    GROUP BY du.most_used_model
    HAVING COUNT(DISTINCT du.email) >= 3 AND SUM(ms.spend_cents) >= 2000
    ORDER BY total_spend_usd DESC`
        : `
    SELECT
      du.most_used_model as model,
      COUNT(DISTINCT du.email) as users,
      ROUND(SUM(ds.spend_cents) / 100.0, 2) as total_spend_usd,
      SUM(du.agent_requests) as total_reqs,
      SUM(du.lines_added) as total_generated,
      SUM(du.accepted_lines_added) as total_accepted,
      SUM(du.lines_added) - SUM(du.accepted_lines_added) as total_wasted,
      ROUND(SUM(du.accepted_lines_added) * 100.0 / NULLIF(SUM(du.lines_added), 0), 1) as precision_pct,
      ROUND(SUM(du.accepted_lines_added) * 1.0 / NULLIF(SUM(du.agent_requests), 0), 1) as useful_lines_per_req,
      ROUND((SUM(du.lines_added) - SUM(du.accepted_lines_added)) * 1.0 / NULLIF(SUM(du.agent_requests), 0), 1) as wasted_lines_per_req,
      ROUND(SUM(du.total_rejects) * 100.0 / NULLIF(SUM(du.total_accepts) + SUM(du.total_rejects), 0), 1) as rejection_rate,
      CASE WHEN SUM(du.agent_requests) > 0
        THEN ROUND(SUM(ds.spend_cents) / 100.0 / SUM(du.agent_requests), 2)
        ELSE 0 END as cost_per_req,
      CASE WHEN SUM(du.accepted_lines_added) > 0
        THEN ROUND(SUM(ds.spend_cents) / 100.0 / SUM(du.accepted_lines_added), 4)
        ELSE 0 END as cost_per_useful_line
    FROM daily_usage du
    JOIN (
      SELECT date, email, MAX(spend_cents) as spend_cents
      FROM daily_spend GROUP BY date, email
    ) ds ON du.email = ds.email AND du.date = ds.date
    WHERE du.is_active = 1
      AND du.most_used_model != ''
      AND du.agent_requests > 0
      AND ds.spend_cents > 0
    GROUP BY du.most_used_model
    HAVING COUNT(DISTINCT du.email) >= 3 AND SUM(ds.spend_cents) >= 2000
    ORDER BY total_spend_usd DESC`,
    )
    .all() as ModelEfficiency[];
}

export function getAllMembers(): Array<TeamMember & { first_seen: string; last_seen: string }> {
  const db = getDb();
  return db.prepare("SELECT * FROM members ORDER BY name").all() as Array<
    TeamMember & { first_seen: string; last_seen: string }
  >;
}

export function upsertUsageEvents(events: FilteredUsageEvent[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO usage_events (user_email, timestamp, model, kind, max_mode, requests_cost_cents,
      total_cents, total_tokens, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
      is_chargeable, is_headless)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const e of events) {
      const tu = e.tokenUsage;
      stmt.run(
        e.userEmail,
        e.timestamp,
        e.model,
        e.kind,
        e.maxMode ? 1 : 0,
        e.requestsCosts,
        tu?.totalCents ?? 0,
        (tu?.inputTokens ?? 0) + (tu?.outputTokens ?? 0),
        tu?.inputTokens ?? 0,
        tu?.outputTokens ?? 0,
        tu?.cacheReadTokens ?? 0,
        tu?.cacheWriteTokens ?? 0,
        e.isChargeable ? 1 : 0,
        e.isHeadless ? 1 : 0,
      );
    }
  });
  tx();
}

export function getUserUsageEventsSummary(
  email: string,
  days: number = 30,
): Array<{
  model: string;
  requests: number;
  total_cost_cents: number;
  avg_cost_cents: number;
  plan_reqs: number;
  plan_cost_cents: number;
  overage_reqs: number;
  overage_cost_cents: number;
  error_reqs: number;
}> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT model,
      COUNT(*) as requests,
      SUM(total_cents) as total_cost_cents,
      ROUND(AVG(total_cents), 2) as avg_cost_cents,
      SUM(CASE WHEN kind LIKE 'Included%' THEN 1 ELSE 0 END) as plan_reqs,
      SUM(CASE WHEN kind LIKE 'Included%' THEN total_cents ELSE 0 END) as plan_cost_cents,
      SUM(CASE WHEN kind = 'Usage-based' THEN 1 ELSE 0 END) as overage_reqs,
      SUM(CASE WHEN kind = 'Usage-based' THEN total_cents ELSE 0 END) as overage_cost_cents,
      SUM(CASE WHEN kind LIKE 'Errored%' THEN 1 ELSE 0 END) as error_reqs
    FROM usage_events
    WHERE user_email = ? AND CAST(timestamp AS INTEGER) >= ?
    GROUP BY model
    HAVING SUM(total_cents) > 0 OR COUNT(*) >= 5
    ORDER BY total_cost_cents DESC
  `,
    )
    .all(email, Date.now() - days * 24 * 60 * 60 * 1000) as Array<{
    model: string;
    requests: number;
    total_cost_cents: number;
    avg_cost_cents: number;
    plan_reqs: number;
    plan_cost_cents: number;
    overage_reqs: number;
    overage_cost_cents: number;
    error_reqs: number;
  }>;
}

export interface UserContextMetrics {
  avgCacheRead: number;
  avgCacheWrite: number;
  totalRequests: number;
  teamAvgCacheRead: number;
  teamMedianCacheRead: number;
  contextRank: number;
  totalRanked: number;
  contextBadge: ContextBadge | null;
}

export function getUserContextMetrics(email: string, days: number = 30): UserContextMetrics | null {
  const db = getDb();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const userRow = db
    .prepare(
      `SELECT ROUND(AVG(cache_read_tokens)) as avg_cr, ROUND(AVG(cache_write_tokens)) as avg_cw,
        COUNT(*) as reqs
       FROM usage_events
       WHERE user_email = ? AND CAST(timestamp AS INTEGER) >= ? AND cache_read_tokens > 0`,
    )
    .get(email, since) as
    | { avg_cr: number | null; avg_cw: number | null; reqs: number }
    | undefined;

  if (!userRow || !userRow.reqs) return null;

  const teamRows = db
    .prepare(
      `SELECT user_email, ROUND(AVG(cache_read_tokens)) as avg_cr
       FROM usage_events
       WHERE CAST(timestamp AS INTEGER) >= ? AND cache_read_tokens > 0
       GROUP BY user_email
       HAVING COUNT(*) >= 10
       ORDER BY avg_cr`,
    )
    .all(since) as Array<{ user_email: string; avg_cr: number }>;

  const teamAvgs = teamRows.map((r) => r.avg_cr).sort((a, b) => a - b);
  const teamAvgCacheRead =
    teamAvgs.length > 0 ? Math.round(teamAvgs.reduce((s, v) => s + v, 0) / teamAvgs.length) : 0;
  const teamMedianCacheRead =
    teamAvgs.length > 0 ? (teamAvgs[Math.floor(teamAvgs.length / 2)] ?? 0) : 0;

  const userAvg = userRow.avg_cr ?? 0;
  const contextRank = teamAvgs.filter((v) => v >= userAvg).length;
  const totalRanked = teamAvgs.length;

  const LONG_SESSION_THRESHOLD = 700_000;
  const SHORT_SESSION_THRESHOLD = 300_000;
  let contextBadge: ContextBadge | null = null;
  if (userRow.reqs >= 30 && userAvg > LONG_SESSION_THRESHOLD) {
    contextBadge = "long-sessions";
  } else if (userRow.reqs >= 30 && userAvg > 0 && userAvg < SHORT_SESSION_THRESHOLD) {
    contextBadge = "short-sessions";
  }

  return {
    avgCacheRead: Math.round(userAvg),
    avgCacheWrite: Math.round(userRow.avg_cw ?? 0),
    totalRequests: userRow.reqs,
    teamAvgCacheRead,
    teamMedianCacheRead,
    contextRank,
    totalRanked,
    contextBadge,
  };
}

export function getUsageEventsLastTimestamp(): string | null {
  const db = getDb();
  const row = db.prepare("SELECT MAX(timestamp) as ts FROM usage_events").get() as {
    ts: string | null;
  };
  return row?.ts ?? null;
}

export function upsertAnalyticsCommands(entries: AnalyticsCommandsEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_commands (date, command_name, usage)
    VALUES (?, ?, ?)
    ON CONFLICT(date, command_name) DO UPDATE SET
      usage = excluded.usage, collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(e.event_date, e.command_name, e.usage);
  });
  tx();
}

export function getAnalyticsCommandsSummary(
  days: number = 30,
): Array<{ command_name: string; total_usage: number }> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT command_name, SUM(usage) as total_usage
    FROM analytics_commands WHERE date >= date('now', ?)
    GROUP BY command_name ORDER BY total_usage DESC
  `,
    )
    .all(`-${days} days`) as Array<{ command_name: string; total_usage: number }>;
}

export function upsertAnalyticsPlans(entries: AnalyticsPlansEntry[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_plans (date, model, usage)
    VALUES (?, ?, ?)
    ON CONFLICT(date, model) DO UPDATE SET
      usage = excluded.usage, collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(e.event_date, e.model, e.usage);
  });
  tx();
}

export function upsertAnalyticsUserMCP(
  entries: Array<{
    date: string;
    email: string;
    tool_name: string;
    server_name: string;
    usage: number;
  }>,
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_user_mcp (date, email, tool_name, server_name, usage)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date, email, tool_name, server_name) DO UPDATE SET
      usage = excluded.usage, collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(e.date, e.email, e.tool_name, e.server_name, e.usage);
  });
  tx();
}

export function upsertAnalyticsUserCommands(
  entries: Array<{ date: string; email: string; command_name: string; usage: number }>,
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO analytics_user_commands (date, email, command_name, usage)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date, email, command_name) DO UPDATE SET
      usage = excluded.usage, collected_at = datetime('now')
  `);
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(e.date, e.email, e.command_name, e.usage);
  });
  tx();
}

export function upsertAICodeCommits(commits: AICodeCommit[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO ai_code_commits (email, date, commits, total_lines_added, total_lines_deleted,
      tab_lines_added, tab_lines_deleted, composer_lines_added, composer_lines_deleted,
      non_ai_lines_added, non_ai_lines_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email, date) DO UPDATE SET
      commits = commits + excluded.commits,
      total_lines_added = total_lines_added + excluded.total_lines_added,
      total_lines_deleted = total_lines_deleted + excluded.total_lines_deleted,
      tab_lines_added = tab_lines_added + excluded.tab_lines_added,
      tab_lines_deleted = tab_lines_deleted + excluded.tab_lines_deleted,
      composer_lines_added = composer_lines_added + excluded.composer_lines_added,
      composer_lines_deleted = composer_lines_deleted + excluded.composer_lines_deleted,
      non_ai_lines_added = non_ai_lines_added + excluded.non_ai_lines_added,
      non_ai_lines_deleted = non_ai_lines_deleted + excluded.non_ai_lines_deleted,
      collected_at = datetime('now')
  `);

  const grouped = new Map<
    string,
    {
      email: string;
      date: string;
      commits: number;
      tla: number;
      tld: number;
      tab_a: number;
      tab_d: number;
      comp_a: number;
      comp_d: number;
      non_a: number;
      non_d: number;
    }
  >();

  for (const c of commits) {
    const date = c.commitTs.slice(0, 10);
    const key = `${c.userEmail}:${date}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.commits++;
      existing.tla += c.totalLinesAdded;
      existing.tld += c.totalLinesDeleted;
      existing.tab_a += c.tabLinesAdded;
      existing.tab_d += c.tabLinesDeleted;
      existing.comp_a += c.composerLinesAdded;
      existing.comp_d += c.composerLinesDeleted;
      existing.non_a += c.nonAiLinesAdded;
      existing.non_d += c.nonAiLinesDeleted;
    } else {
      grouped.set(key, {
        email: c.userEmail,
        date,
        commits: 1,
        tla: c.totalLinesAdded,
        tld: c.totalLinesDeleted,
        tab_a: c.tabLinesAdded,
        tab_d: c.tabLinesDeleted,
        comp_a: c.composerLinesAdded,
        comp_d: c.composerLinesDeleted,
        non_a: c.nonAiLinesAdded,
        non_d: c.nonAiLinesDeleted,
      });
    }
  }

  const clearStmt = db.prepare(`
    DELETE FROM ai_code_commits WHERE email = ? AND date = ?
  `);

  const tx = db.transaction(() => {
    for (const g of grouped.values()) {
      clearStmt.run(g.email, g.date);
      stmt.run(
        g.email,
        g.date,
        g.commits,
        g.tla,
        g.tld,
        g.tab_a,
        g.tab_d,
        g.comp_a,
        g.comp_d,
        g.non_a,
        g.non_d,
      );
    }
  });
  tx();
}

export function getUserAIAdoption(
  email: string,
  days: number = 30,
): {
  score: number;
  adoptionTier: string;
  acceptRate: number;
  intensity: number;
  intensityNorm: number;
  consistency: number;
  agentRequests: number;
  totalAccepts: number;
  totalApplies: number;
  activeDays: number;
  periodDays: number;
  commitData: {
    totalCommits: number;
    totalLinesAdded: number;
    aiLinesAdded: number;
    composerLinesAdded: number;
    tabLinesAdded: number;
    nonAiLinesAdded: number;
    aiPercent: number;
  } | null;
} | null {
  const db = getDb();
  const dateFilter = `-${days} days`;

  const userRow = db
    .prepare(
      `SELECT
        SUM(agent_requests) as agent_reqs,
        SUM(total_applies) as applies,
        SUM(total_accepts) as accepts,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_days
      FROM daily_usage WHERE email = ? AND date >= date('now', ?) AND is_active = 1`,
    )
    .get(email, dateFilter) as {
    agent_reqs: number | null;
    applies: number | null;
    accepts: number | null;
    active_days: number | null;
  };

  if (!userRow?.agent_reqs || userRow.agent_reqs < 10) return null;

  const teamP90 = db
    .prepare(
      `SELECT reqs_per_day FROM (
        SELECT SUM(agent_requests) * 1.0 / COUNT(CASE WHEN is_active = 1 THEN 1 END) as reqs_per_day
        FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1
        GROUP BY email HAVING SUM(agent_requests) >= 10
        ORDER BY reqs_per_day
      ) sub
      LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.9 AS INTEGER) FROM (
        SELECT email FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1
        GROUP BY email HAVING SUM(agent_requests) >= 10
      ))`,
    )
    .get(dateFilter, dateFilter) as { reqs_per_day: number } | undefined;

  const p90Intensity = teamP90?.reqs_per_day ?? 50;
  const activeDays = userRow.active_days ?? 0;
  const applies = userRow.applies ?? 0;
  const accepts = userRow.accepts ?? 0;
  const agentReqs = userRow.agent_reqs ?? 0;

  const elapsedRow = db
    .prepare(
      `SELECT CAST(julianday('now') - julianday(MIN(date)) AS INTEGER) + 1 as elapsed
       FROM daily_usage WHERE date >= date('now', ?) AND is_active = 1`,
    )
    .get(dateFilter) as { elapsed: number | null } | undefined;
  const periodDays = Math.min(days, elapsedRow?.elapsed ?? days);

  const acceptRate = applies > 0 ? accepts / applies : 0;
  const intensity = activeDays > 0 ? agentReqs / activeDays : 0;
  const intensityNorm = Math.min(intensity / p90Intensity, 1);
  const consistency = periodDays > 0 ? activeDays / periodDays : 0;

  const score = Math.round((acceptRate * 40 + intensityNorm * 40 + consistency * 20) * 10) / 10;

  let tier: string;
  if (score >= 80) tier = "AI-Native";
  else if (score >= 55) tier = "High Adoption";
  else if (score >= 30) tier = "Moderate";
  else if (score >= 10) tier = "Low Adoption";
  else tier = "Manual";

  const commitRow = db
    .prepare(
      `SELECT SUM(commits) as c, SUM(total_lines_added) as tla,
        SUM(tab_lines_added) as tab, SUM(composer_lines_added) as comp,
        SUM(non_ai_lines_added) as nonai
      FROM ai_code_commits WHERE email = ? AND date >= date('now', ?)`,
    )
    .get(email, dateFilter) as {
    c: number | null;
    tla: number | null;
    tab: number | null;
    comp: number | null;
    nonai: number | null;
  };

  const commitData =
    commitRow?.c && commitRow.c >= 5
      ? {
          totalCommits: commitRow.c,
          totalLinesAdded: commitRow.tla ?? 0,
          aiLinesAdded: (commitRow.tab ?? 0) + (commitRow.comp ?? 0),
          composerLinesAdded: commitRow.comp ?? 0,
          tabLinesAdded: commitRow.tab ?? 0,
          nonAiLinesAdded: commitRow.nonai ?? 0,
          aiPercent:
            (commitRow.tla ?? 0) > 0
              ? Math.round(
                  (((commitRow.tab ?? 0) + (commitRow.comp ?? 0)) / (commitRow.tla ?? 1)) * 1000,
                ) / 10
              : 0,
        }
      : null;

  return {
    score,
    adoptionTier: tier,
    acceptRate: Math.round(acceptRate * 1000) / 10,
    intensity: Math.round(intensity * 10) / 10,
    intensityNorm: Math.round(intensityNorm * 1000) / 10,
    consistency: Math.round(consistency * 1000) / 10,
    agentRequests: agentReqs,
    totalAccepts: accepts,
    totalApplies: applies,
    activeDays,
    periodDays,
    commitData,
  };
}

export function getUserMCPSummary(
  email: string,
  days: number = 30,
): Array<{ tool_name: string; server_name: string; total_usage: number }> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT tool_name, server_name, SUM(usage) as total_usage
    FROM analytics_user_mcp WHERE email = ? AND date >= date('now', ?)
    GROUP BY tool_name, server_name ORDER BY total_usage DESC
  `,
    )
    .all(email, `-${days} days`) as Array<{
    tool_name: string;
    server_name: string;
    total_usage: number;
  }>;
}

export function getUserCommandsSummary(
  email: string,
  days: number = 30,
): Array<{ command_name: string; total_usage: number }> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT command_name, SUM(usage) as total_usage
    FROM analytics_user_commands WHERE email = ? AND date >= date('now', ?)
    GROUP BY command_name ORDER BY total_usage DESC
  `,
    )
    .all(email, `-${days} days`) as Array<{ command_name: string; total_usage: number }>;
}

export function getAnalyticsPlansSummary(
  days: number = 30,
): Array<{ model: string; total_usage: number }> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT model, SUM(usage) as total_usage
    FROM analytics_plans WHERE date >= date('now', ?)
    GROUP BY model ORDER BY total_usage DESC
  `,
    )
    .all(`-${days} days`) as Array<{ model: string; total_usage: number }>;
}

export function getPlanExhaustionStats(): {
  summary: {
    users_exhausted: number;
    total_active: number;
    avg_days: number;
    median_days: number;
    pct_exhausted: number;
  };
  users: Array<{
    email: string;
    name: string;
    days_to_exhaust: number;
    usage_based_reqs: number;
  }>;
} {
  const db = getDb();
  const cycleRow = db.prepare("SELECT MAX(cycle_start) as cs FROM spending").get() as {
    cs: string | null;
  };
  const cycleStart = cycleRow?.cs;
  if (!cycleStart)
    return {
      summary: {
        users_exhausted: 0,
        total_active: 0,
        avg_days: 0,
        median_days: 0,
        pct_exhausted: 0,
      },
      users: [],
    };

  const users = db
    .prepare(
      `SELECT du.email, m.name,
         CAST(julianday(MIN(du.date)) - julianday(?) + 1 AS INT) as days_to_exhaust,
         SUM(du.usage_based_reqs) as usage_based_reqs
       FROM daily_usage du
       LEFT JOIN members m ON du.email = m.email
       WHERE du.date >= ? AND du.usage_based_reqs > 0
       GROUP BY du.email
       ORDER BY days_to_exhaust ASC`,
    )
    .all(cycleStart, cycleStart) as Array<{
    email: string;
    name: string;
    days_to_exhaust: number;
    usage_based_reqs: number;
  }>;

  const totalActive = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT email) as total FROM daily_usage WHERE date >= ? AND agent_requests > 0",
      )
      .get(cycleStart) as { total: number }
  ).total;

  const days = users.map((u) => u.days_to_exhaust).sort((a, b) => a - b);
  const median = days.length > 0 ? (days[Math.floor(days.length / 2)] ?? 0) : 0;
  const avg =
    days.length > 0 ? Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10 : 0;

  return {
    summary: {
      users_exhausted: users.length,
      total_active: totalActive,
      avg_days: avg,
      median_days: median,
      pct_exhausted: totalActive > 0 ? Math.round((users.length / totalActive) * 100) : 0,
    },
    users,
  };
}
