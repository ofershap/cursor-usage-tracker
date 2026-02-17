import Database from "better-sqlite3";
import { unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "mock.db");

const TEAM_SIZE = 65;
const DAYS = 30;
const CYCLE_START = "2026-02-01";
const CYCLE_END = "2026-03-01";

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Morgan",
  "Taylor",
  "Casey",
  "Riley",
  "Quinn",
  "Avery",
  "Cameron",
  "Drew",
  "Emery",
  "Finley",
  "Harper",
  "Hayden",
  "Jamie",
  "Kendall",
  "Lane",
  "Logan",
  "Micah",
  "Noel",
  "Parker",
  "Peyton",
  "Reese",
  "Robin",
  "Sage",
  "Sam",
  "Shay",
  "Skyler",
  "Tatum",
  "Val",
  "Blake",
  "Charlie",
  "Dakota",
  "Eden",
  "Frankie",
  "Gray",
  "Harley",
  "Indigo",
  "Jesse",
  "Kit",
  "Lee",
  "Marley",
  "Nico",
  "Oakley",
  "Pat",
  "Remy",
  "River",
  "Rowan",
  "Scout",
  "Sloane",
  "Stevie",
  "Toni",
  "Uri",
  "Wren",
  "Yael",
  "Zion",
  "Ari",
  "Bay",
  "Coby",
  "Dana",
  "Ellis",
  "Flynn",
  "Gale",
  "Holly",
  "Ira",
];

const LAST_NAMES = [
  "Chen",
  "Kim",
  "Park",
  "Singh",
  "Patel",
  "Cohen",
  "Muller",
  "Santos",
  "Tanaka",
  "Ivanov",
  "Novak",
  "Berg",
  "Silva",
  "Costa",
  "Russo",
  "Larsen",
  "Holm",
  "Varga",
  "Kato",
  "Lin",
  "Wu",
  "Zhang",
  "Lee",
  "Wang",
  "Liu",
  "Yang",
  "Huang",
  "Zhao",
  "Zhou",
  "Xu",
  "Sun",
  "Ma",
  "Zhu",
  "Hu",
  "Guo",
  "He",
  "Luo",
  "Gao",
  "Liang",
  "Zheng",
  "Xie",
  "Han",
  "Tang",
  "Feng",
  "Yu",
  "Dong",
  "Xiao",
  "Cheng",
  "Cao",
  "Yuan",
  "Deng",
  "Xu",
  "Fu",
  "Shen",
  "Zeng",
  "Peng",
  "Lu",
  "Su",
  "Jiang",
  "Cai",
  "Wei",
  "Ye",
  "Pan",
  "Du",
  "Dai",
  "Ren",
];

const MODELS = [
  "claude-4.5-sonnet",
  "claude-4.6-opus-high",
  "claude-4.6-opus-max",
  "claude-4.5-haiku",
  "claude-4.6-opus-high-thinking",
  "gpt-5.2",
  "claude-4.5-opus-high-thinking",
  "gpt-5.2-codex",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gpt-5.3-codex",
  "claude-4.5-sonnet-thinking",
];

const MODEL_WEIGHTS = [20, 15, 8, 12, 10, 10, 5, 5, 5, 5, 3, 2];

const GROUPS = [
  { name: "Platform > Core", members: 12 },
  { name: "Platform > Infrastructure", members: 8 },
  { name: "Frontend > Web App", members: 10 },
  { name: "Frontend > Mobile", members: 6 },
  { name: "Backend > API", members: 9 },
  { name: "Data > Analytics", members: 5 },
  { name: "Data > ML", members: 4 },
  { name: "DevOps > SRE", members: 5 },
  { name: "QA > Automation", members: 3 },
  { name: "Security > AppSec", members: 3 },
];

const EXTENSIONS = ["ts", "tsx", "js", "jsx", "css", "json", "md", "py", "yaml", "sql"];

const MCP_TOOLS = [
  { tool: "browser_navigate", server: "cursor-ide-browser" },
  { tool: "browser_snapshot", server: "cursor-ide-browser" },
  { tool: "browser_click", server: "cursor-ide-browser" },
  { tool: "get_design_context", server: "Figma" },
  { tool: "get_metadata", server: "Figma" },
  { tool: "query", server: "postgres-mcp" },
  { tool: "describe", server: "postgres-mcp" },
  { tool: "slack_post_message", server: "slack-mcp" },
  { tool: "slack_get_channel_history", server: "slack-mcp" },
  { tool: "search_docs", server: "sentry-mcp" },
  { tool: "list_issues", server: "sentry-mcp" },
  { tool: "resolve-library-id", server: "context7" },
  { tool: "query-docs", server: "context7" },
];

const CLIENT_VERSIONS = [
  "2.2.36",
  "2.2.43",
  "2.2.44",
  "2.3.21",
  "2.3.29",
  "2.3.34",
  "2.3.35",
  "2.3.41",
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function weightedPick(items: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) return items[i] as string;
  }
  return items[items.length - 1] as string;
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoNow(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function generateMembers(): Array<{ email: string; name: string; role: string; userId: string }> {
  const members: Array<{ email: string; name: string; role: string; userId: string }> = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < TEAM_SIZE; i++) {
    let first: string, last: string, fullName: string;
    do {
      first = pick(FIRST_NAMES);
      last = pick(LAST_NAMES);
      fullName = `${first} ${last}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const email = `${first.toLowerCase()}.${last.toLowerCase()}@acme-corp.com`;
    const role = i < 3 ? "owner" : "member";
    const userId = `usr_${Math.random().toString(36).slice(2, 14)}`;
    members.push({ email, name: fullName, role, userId });
  }
  return members;
}

function run() {
  try {
    unlinkSync(DB_PATH);
  } catch {
    /* file may not exist */
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  createSchema(db);

  const members = generateMembers();
  const now = isoNow();

  const memberStmt = db.prepare(
    "INSERT INTO members (email, user_id, name, role, is_removed, first_seen, last_seen) VALUES (?, ?, ?, ?, 0, ?, ?)",
  );
  const memberTx = db.transaction(() => {
    for (const m of members) memberStmt.run(m.email, m.userId, m.name, m.role, now, now);
  });
  memberTx();

  const userProfiles = members.map((m) => ({
    ...m,
    primaryModel: weightedPick(MODELS, MODEL_WEIGHTS),
    activityLevel: Math.random() < 0.15 ? "high" : Math.random() < 0.4 ? "medium" : "low",
    clientVersion: pick(CLIENT_VERSIONS),
  }));

  const dailyStmt = db.prepare(
    `INSERT INTO daily_usage (date, email, user_id, is_active, lines_added, lines_deleted,
      accepted_lines_added, accepted_lines_deleted, total_applies, total_accepts, total_rejects,
      total_tabs_shown, tabs_accepted, composer_requests, chat_requests, agent_requests,
      usage_based_reqs, most_used_model, tab_most_used_extension, client_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const spendStmt = db.prepare(
    `INSERT INTO daily_spend (date, email, spend_cents, cycle_start) VALUES (?, ?, ?, ?)`,
  );

  const dailyTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const isWeekend = new Date(date).getDay() % 6 === 0;

      for (const user of userProfiles) {
        const activeChance = isWeekend
          ? 0.15
          : user.activityLevel === "high"
            ? 0.95
            : user.activityLevel === "medium"
              ? 0.8
              : 0.6;
        const isActive = Math.random() < activeChance;
        if (!isActive) continue;

        const baseReqs =
          user.activityLevel === "high"
            ? rand(80, 250)
            : user.activityLevel === "medium"
              ? rand(20, 80)
              : rand(3, 30);
        const agentReqs = baseReqs;
        const chatReqs = rand(0, Math.floor(agentReqs * 0.3));
        const composerReqs = rand(0, Math.floor(agentReqs * 0.2));
        const linesAdded = agentReqs * rand(3, 15);
        const linesDeleted = Math.floor(linesAdded * (0.2 + Math.random() * 0.3));
        const acceptedLines = Math.floor(linesAdded * (0.4 + Math.random() * 0.4));
        const acceptedDeleted = Math.floor(linesDeleted * (0.3 + Math.random() * 0.3));
        const totalApplies = Math.floor(agentReqs * (0.5 + Math.random() * 0.3));
        const totalAccepts = Math.floor(totalApplies * (0.6 + Math.random() * 0.3));
        const totalRejects = totalApplies - totalAccepts;
        const tabsShown = rand(20, 200);
        const tabsAccepted = Math.floor(tabsShown * (0.3 + Math.random() * 0.4));
        const usageBasedReqs = Math.floor(agentReqs * (0.1 + Math.random() * 0.3));

        const model = Math.random() < 0.8 ? user.primaryModel : weightedPick(MODELS, MODEL_WEIGHTS);

        dailyStmt.run(
          date,
          user.email,
          user.userId,
          1,
          linesAdded,
          linesDeleted,
          acceptedLines,
          acceptedDeleted,
          totalApplies,
          totalAccepts,
          totalRejects,
          tabsShown,
          tabsAccepted,
          composerReqs,
          chatReqs,
          agentReqs,
          usageBasedReqs,
          model,
          pick(EXTENSIONS),
          user.clientVersion,
        );

        const spendCents = Math.floor(agentReqs * (1.5 + Math.random() * 4));
        spendStmt.run(date, user.email, spendCents, CYCLE_START);
      }
    }
  });
  dailyTx();

  const spendingStmt = db.prepare(
    `INSERT INTO spending (email, user_id, name, cycle_start, spend_cents, included_spend_cents,
      fast_premium_requests, monthly_limit_dollars, hard_limit_override_dollars)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const spendingTx = db.transaction(() => {
    for (const user of userProfiles) {
      const totalSpend =
        user.activityLevel === "high"
          ? rand(15000, 80000)
          : user.activityLevel === "medium"
            ? rand(3000, 20000)
            : rand(200, 5000);
      const included = Math.floor(totalSpend * 0.3);
      const premiumReqs = Math.floor(totalSpend / 15);
      spendingStmt.run(
        user.email,
        user.userId,
        user.name,
        CYCLE_START,
        totalSpend,
        included,
        premiumReqs,
        null,
        0,
      );
    }
  });
  spendingTx();

  let groupMemberIdx = 0;
  const groupStmt = db.prepare(
    "INSERT INTO billing_groups (id, name, member_count, spend_cents) VALUES (?, ?, ?, ?)",
  );
  const gmStmt = db.prepare(
    "INSERT INTO group_members (group_id, email, joined_at) VALUES (?, ?, ?)",
  );
  const groupTx = db.transaction(() => {
    for (const g of GROUPS) {
      const id = `grp_${Math.random().toString(36).slice(2, 10)}`;
      const groupMembers = userProfiles.slice(groupMemberIdx, groupMemberIdx + g.members);
      groupMemberIdx += g.members;
      const totalSpend = rand(10000, 200000);
      groupStmt.run(id, g.name, g.members, totalSpend);
      for (const m of groupMembers) {
        gmStmt.run(id, m.email, now);
      }
    }
  });
  groupTx();

  const anomalyStmt = db.prepare(
    `INSERT INTO anomalies (user_email, type, severity, metric, value, threshold, message, detected_at, resolved_at, alerted_at, diagnosis_model, diagnosis_kind, diagnosis_delta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const incidentStmt = db.prepare(
    `INSERT INTO incidents (anomaly_id, user_email, status, detected_at, alerted_at, acknowledged_at, resolved_at, mttd_minutes, mtti_minutes, mttr_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const anomalyTx = db.transaction(() => {
    const highSpenders = userProfiles.filter((u) => u.activityLevel === "high");
    for (let i = 0; i < 15; i++) {
      const user = pick(highSpenders.length > 0 ? highSpenders : userProfiles);
      const daysAgo = rand(0, 20);
      const detectedAt = `${dateStr(daysAgo)} ${rand(8, 18)}:${String(rand(0, 59)).padStart(2, "0")}:00`;
      const isResolved = daysAgo > 5 && Math.random() < 0.6;
      const resolvedAt = isResolved
        ? `${dateStr(daysAgo - rand(0, 2))} ${rand(10, 20)}:${String(rand(0, 59)).padStart(2, "0")}:00`
        : null;
      const alertedAt = `${detectedAt.slice(0, 11)}${rand(8, 18)}:${String(rand(0, 59)).padStart(2, "0")}:05`;

      const types = [
        {
          type: "threshold",
          severity: rand(0, 1) ? "critical" : "warning",
          metric: "spend",
          value: rand(20000, 80000),
          threshold: 20000,
          msg: `${user.name}: spend $${rand(200, 800).toFixed(2)} exceeds limit $200.00`,
        },
        {
          type: "zscore",
          severity: "warning",
          metric: "requests",
          value: rand(150, 300),
          threshold: 100,
          msg: `${user.name}: 2.${rand(1, 9)} std devs above team mean (${rand(150, 300)} requests)`,
        },
        {
          type: "trend",
          severity: "warning",
          metric: "spend",
          value: rand(5000, 20000),
          threshold: rand(2000, 5000),
          msg: `${user.name}: daily spend spiked to $${rand(50, 200)} (${rand(3, 6)}.${rand(1, 9)}x their 7-day avg) — model: ${user.primaryModel}`,
        },
        {
          type: "trend",
          severity: "warning",
          metric: "spend",
          value: rand(30000, 100000),
          threshold: rand(10000, 30000),
          msg: `${user.name}: cycle spend $${rand(300, 1000)} is ${rand(3, 6)}.${rand(1, 9)}x the team median — model: ${user.primaryModel}`,
        },
      ];
      const anomaly = pick(types);

      const result = anomalyStmt.run(
        user.email,
        anomaly.type,
        anomaly.severity,
        anomaly.metric,
        anomaly.value,
        anomaly.threshold,
        anomaly.msg,
        detectedAt,
        resolvedAt,
        alertedAt,
        user.primaryModel,
        "agent",
        rand(10, 50),
      );
      const anomalyId = Number(result.lastInsertRowid);

      const status = isResolved ? "resolved" : Math.random() < 0.3 ? "acknowledged" : "open";
      const acknowledgedAt =
        status !== "open"
          ? `${detectedAt.slice(0, 11)}${rand(9, 19)}:${String(rand(0, 59)).padStart(2, "0")}:00`
          : null;
      const mttd = rand(1, 15);
      const mtti = acknowledgedAt ? rand(5, 120) : null;
      const mttr = isResolved ? rand(30, 480) : null;

      incidentStmt.run(
        anomalyId,
        user.email,
        status,
        detectedAt,
        alertedAt,
        acknowledgedAt,
        resolvedAt,
        mttd,
        mtti,
        mttr,
      );
    }
  });
  anomalyTx();

  const dauStmt = db.prepare(
    "INSERT INTO analytics_dau (date, dau, cli_dau, cloud_agent_dau, bugbot_dau) VALUES (?, ?, ?, ?, ?)",
  );
  const dauTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const isWeekend = new Date(date).getDay() % 6 === 0;
      const base = isWeekend ? rand(8, 20) : rand(35, 55);
      dauStmt.run(date, base, Math.floor(base * 0.9), rand(1, 5), rand(0, 2));
    }
  });
  dauTx();

  const modelUsageStmt = db.prepare(
    "INSERT INTO analytics_model_usage (date, model, messages, users) VALUES (?, ?, ?, ?)",
  );
  const modelTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (let m = 0; m < MODELS.length; m++) {
        const weight = MODEL_WEIGHTS[m] ?? 1;
        const messages = Math.floor(weight * rand(5, 15));
        const users = Math.min(rand(2, Math.floor(weight * 1.5)), TEAM_SIZE);
        modelUsageStmt.run(date, MODELS[m], messages, users);
      }
    }
  });
  modelTx();

  const agentEditsStmt = db.prepare(
    "INSERT INTO analytics_agent_edits (date, suggested_diffs, accepted_diffs, rejected_diffs, lines_suggested, lines_accepted, green_lines_accepted, red_lines_accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const agentTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const suggested = rand(200, 800);
      const accepted = Math.floor(suggested * (0.5 + Math.random() * 0.3));
      const rejected = suggested - accepted;
      const linesSuggested = suggested * rand(5, 20);
      const linesAccepted = Math.floor(linesSuggested * (0.4 + Math.random() * 0.3));
      agentEditsStmt.run(
        date,
        suggested,
        accepted,
        rejected,
        linesSuggested,
        linesAccepted,
        Math.floor(linesAccepted * 0.7),
        Math.floor(linesAccepted * 0.3),
      );
    }
  });
  agentTx();

  const tabsStmt = db.prepare(
    "INSERT INTO analytics_tabs (date, suggestions, accepts, rejects, lines_suggested, lines_accepted) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const tabsTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const suggestions = rand(500, 2000);
      const accepts = Math.floor(suggestions * (0.3 + Math.random() * 0.3));
      tabsStmt.run(
        date,
        suggestions,
        accepts,
        suggestions - accepts,
        suggestions * rand(2, 5),
        accepts * rand(2, 4),
      );
    }
  });
  tabsTx();

  const mcpStmt = db.prepare(
    "INSERT INTO analytics_mcp (date, tool_name, server_name, usage) VALUES (?, ?, ?, ?)",
  );
  const mcpTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (const t of MCP_TOOLS) {
        mcpStmt.run(date, t.tool, t.server, rand(5, 200));
      }
    }
  });
  mcpTx();

  const extStmt = db.prepare(
    "INSERT INTO analytics_file_extensions (date, extension, total_files, lines_accepted) VALUES (?, ?, ?, ?)",
  );
  const extTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (const ext of EXTENSIONS) {
        extStmt.run(date, ext, rand(10, 500), rand(50, 3000));
      }
    }
  });
  extTx();

  const cvStmt = db.prepare(
    "INSERT INTO analytics_client_versions (date, version, user_count, percentage) VALUES (?, ?, ?, ?)",
  );
  const cvTx = db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      let remaining = 100;
      for (let i = 0; i < CLIENT_VERSIONS.length; i++) {
        const isLast = i === CLIENT_VERSIONS.length - 1;
        const pct = isLast ? remaining : Math.min(rand(5, 25), remaining);
        remaining -= pct;
        const users = Math.max(1, Math.floor((TEAM_SIZE * pct) / 100));
        cvStmt.run(date, CLIENT_VERSIONS[i], users, pct);
      }
    }
  });
  cvTx();

  const metaStmt = db.prepare("INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?)");
  metaStmt.run("cycle_start", CYCLE_START, now);
  metaStmt.run("cycle_end", CYCLE_END, now);

  db.close();
  console.log(`Mock database generated at ${DB_PATH}`);
}

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      email TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, role TEXT NOT NULL,
      is_removed INTEGER NOT NULL DEFAULT 0,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT NOT NULL, email TEXT NOT NULL, user_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      lines_added INTEGER NOT NULL DEFAULT 0, lines_deleted INTEGER NOT NULL DEFAULT 0,
      accepted_lines_added INTEGER NOT NULL DEFAULT 0, accepted_lines_deleted INTEGER NOT NULL DEFAULT 0,
      total_applies INTEGER NOT NULL DEFAULT 0, total_accepts INTEGER NOT NULL DEFAULT 0,
      total_rejects INTEGER NOT NULL DEFAULT 0, total_tabs_shown INTEGER NOT NULL DEFAULT 0,
      tabs_accepted INTEGER NOT NULL DEFAULT 0, composer_requests INTEGER NOT NULL DEFAULT 0,
      chat_requests INTEGER NOT NULL DEFAULT 0, agent_requests INTEGER NOT NULL DEFAULT 0,
      usage_based_reqs INTEGER NOT NULL DEFAULT 0, most_used_model TEXT,
      tab_most_used_extension TEXT, client_version TEXT,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_email ON daily_usage(email);
    CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_usage(date);
    CREATE TABLE IF NOT EXISTS spending (
      email TEXT NOT NULL, user_id TEXT, name TEXT, cycle_start TEXT NOT NULL,
      spend_cents INTEGER NOT NULL DEFAULT 0, included_spend_cents INTEGER NOT NULL DEFAULT 0,
      fast_premium_requests INTEGER NOT NULL DEFAULT 0,
      monthly_limit_dollars REAL, hard_limit_override_dollars REAL NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (email, cycle_start)
    );
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL, timestamp TEXT NOT NULL,
      model TEXT NOT NULL, kind TEXT NOT NULL, max_mode INTEGER NOT NULL DEFAULT 0,
      requests_cost_cents REAL NOT NULL DEFAULT 0, total_cents REAL NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0, cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0, is_chargeable INTEGER NOT NULL DEFAULT 1,
      is_headless INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_user_ts ON usage_events(user_email, timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_ts ON usage_events(timestamp);
    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL, type TEXT NOT NULL,
      severity TEXT NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL, threshold REAL NOT NULL,
      message TEXT NOT NULL, detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT, alerted_at TEXT, diagnosis_model TEXT, diagnosis_kind TEXT, diagnosis_delta REAL
    );
    CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies(user_email);
    CREATE INDEX IF NOT EXISTS idx_anomalies_open ON anomalies(resolved_at) WHERE resolved_at IS NULL;
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, anomaly_id INTEGER NOT NULL REFERENCES anomalies(id),
      user_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
      detected_at TEXT NOT NULL DEFAULT (datetime('now')), alerted_at TEXT,
      acknowledged_at TEXT, resolved_at TEXT,
      mttd_minutes REAL, mtti_minutes REAL, mttr_minutes REAL
    );
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS daily_spend (
      date TEXT NOT NULL, email TEXT NOT NULL, spend_cents INTEGER NOT NULL DEFAULT 0,
      cycle_start TEXT NOT NULL, collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email, cycle_start)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_spend_email ON daily_spend(email);
    CREATE INDEX IF NOT EXISTS idx_daily_spend_date ON daily_spend(date);
    CREATE TABLE IF NOT EXISTS billing_groups (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, member_count INTEGER NOT NULL DEFAULT 0,
      spend_cents INTEGER NOT NULL DEFAULT 0, collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL, email TEXT NOT NULL, joined_at TEXT,
      PRIMARY KEY (group_id, email)
    );
    CREATE TABLE IF NOT EXISTS analytics_dau (
      date TEXT PRIMARY KEY, dau INTEGER NOT NULL DEFAULT 0, cli_dau INTEGER NOT NULL DEFAULT 0,
      cloud_agent_dau INTEGER NOT NULL DEFAULT 0, bugbot_dau INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS analytics_model_usage (
      date TEXT NOT NULL, model TEXT NOT NULL, messages INTEGER NOT NULL DEFAULT 0,
      users INTEGER NOT NULL DEFAULT 0, collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, model)
    );
    CREATE TABLE IF NOT EXISTS analytics_agent_edits (
      date TEXT PRIMARY KEY, suggested_diffs INTEGER NOT NULL DEFAULT 0,
      accepted_diffs INTEGER NOT NULL DEFAULT 0, rejected_diffs INTEGER NOT NULL DEFAULT 0,
      lines_suggested INTEGER NOT NULL DEFAULT 0, lines_accepted INTEGER NOT NULL DEFAULT 0,
      green_lines_accepted INTEGER NOT NULL DEFAULT 0, red_lines_accepted INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS analytics_tabs (
      date TEXT PRIMARY KEY, suggestions INTEGER NOT NULL DEFAULT 0,
      accepts INTEGER NOT NULL DEFAULT 0, rejects INTEGER NOT NULL DEFAULT 0,
      lines_suggested INTEGER NOT NULL DEFAULT 0, lines_accepted INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS analytics_mcp (
      date TEXT NOT NULL, tool_name TEXT NOT NULL, server_name TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0, collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, tool_name, server_name)
    );
    CREATE TABLE IF NOT EXISTS analytics_file_extensions (
      date TEXT NOT NULL, extension TEXT NOT NULL, total_files INTEGER NOT NULL DEFAULT 0,
      lines_accepted INTEGER NOT NULL DEFAULT 0, collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, extension)
    );
    CREATE TABLE IF NOT EXISTS analytics_client_versions (
      date TEXT NOT NULL, version TEXT NOT NULL, user_count INTEGER NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0, collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, version)
    );
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS collection_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT,
      records_count INTEGER DEFAULT 0, error TEXT
    );
  `);
}

run();
