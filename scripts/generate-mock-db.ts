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

// ─── Seeded RNG for deterministic output ────────────────────────────────────
let _seed = 42;
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}
function rand(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)] as T;
}
function weightedPick(items: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = seededRandom() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) return items[i] as string;
  }
  return items[items.length - 1] as string;
}

function dateStr(daysAgo: number): string {
  const d = new Date("2026-02-20T12:00:00Z");
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoNow(): string {
  return "2026-02-20 12:00:00";
}

// ─── Story character definitions ────────────────────────────────────────────
// These are the named characters that drive the demo stories.
// The rest of the team is generated generically.

interface StoryMember {
  email: string;
  name: string;
  role: string;
  userId: string;
  storyRole:
    | "expensive_model"
    | "long_conversation"
    | "day1_exhaust"
    | "inactive"
    | "old_version"
    | "top_spender"
    | "normal";
  activityLevel: "high" | "medium" | "low" | "inactive";
  primaryModel: string;
  clientVersion: string;
  group: string;
}

const STORY_MEMBERS: StoryMember[] = [
  // Story A: "The Expensive Model Trap" — Marcus switched to thinking-fast model
  {
    email: "marcus.chen@acme-corp.com",
    name: "Marcus Chen",
    role: "member",
    userId: "usr_marcus001",
    storyRole: "expensive_model",
    activityLevel: "high",
    primaryModel: "claude-4.6-opus-high",
    clientVersion: "2.5.12",
    group: "Backend > API",
  },
  // Story B: "Long Conversation Problem" — these 3 didn't start new chats
  {
    email: "elena.berg@acme-corp.com",
    name: "Elena Berg",
    role: "member",
    userId: "usr_elena001",
    storyRole: "long_conversation",
    activityLevel: "high",
    primaryModel: "claude-4.6-opus-high",
    clientVersion: "2.5.12",
    group: "Platform > Core",
  },
  {
    email: "raj.patel@acme-corp.com",
    name: "Raj Patel",
    role: "member",
    userId: "usr_raj001",
    storyRole: "long_conversation",
    activityLevel: "high",
    primaryModel: "claude-4.6-opus-high-thinking",
    clientVersion: "2.5.8",
    group: "Frontend > Web App",
  },
  {
    email: "liam.santos@acme-corp.com",
    name: "Liam Santos",
    role: "member",
    userId: "usr_liam001",
    storyRole: "long_conversation",
    activityLevel: "medium",
    primaryModel: "claude-4.6-opus-high",
    clientVersion: "2.4.21",
    group: "Backend > API",
  },
  // Story D: "Day-1 Plan Exhaustion"
  {
    email: "nina.ivanov@acme-corp.com",
    name: "Nina Ivanov",
    role: "member",
    userId: "usr_nina001",
    storyRole: "day1_exhaust",
    activityLevel: "high",
    primaryModel: "claude-4.6-opus-max",
    clientVersion: "2.5.12",
    group: "Platform > Core",
  },
  // Story E: Inactive users (some of the 8 inactive seats)
  {
    email: "tom.larsen@acme-corp.com",
    name: "Tom Larsen",
    role: "member",
    userId: "usr_tom001",
    storyRole: "inactive",
    activityLevel: "inactive",
    primaryModel: "claude-4.5-sonnet",
    clientVersion: "2.3.21",
    group: "QA > Automation",
  },
  {
    email: "sara.novak@acme-corp.com",
    name: "Sara Novak",
    role: "member",
    userId: "usr_sara001",
    storyRole: "inactive",
    activityLevel: "inactive",
    primaryModel: "claude-4.5-sonnet",
    clientVersion: "2.2.36",
    group: "Data > Analytics",
  },
  {
    email: "yuki.tanaka@acme-corp.com",
    name: "Yuki Tanaka",
    role: "member",
    userId: "usr_yuki001",
    storyRole: "inactive",
    activityLevel: "inactive",
    primaryModel: "claude-4.5-sonnet",
    clientVersion: "2.2.43",
    group: "Security > AppSec",
  },
  // Story G: Old version user
  {
    email: "derek.holm@acme-corp.com",
    name: "Derek Holm",
    role: "member",
    userId: "usr_derek001",
    storyRole: "old_version",
    activityLevel: "low",
    primaryModel: "claude-4.5-sonnet",
    clientVersion: "2.1.32",
    group: "DevOps > SRE",
  },
  // Story F: Top spender (consistent heavy user, not a spike — just always expensive)
  {
    email: "alex.kim@acme-corp.com",
    name: "Alex Kim",
    role: "owner",
    userId: "usr_alex001",
    storyRole: "top_spender",
    activityLevel: "high",
    primaryModel: "claude-4.6-opus-high-thinking",
    clientVersion: "2.5.12",
    group: "Platform > Core",
  },
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
  "claude-4.6-opus-high-thinking-fast",
  "claude-4.6-opus-max-thinking",
];

const MODEL_WEIGHTS = [20, 15, 4, 12, 10, 10, 5, 5, 5, 5, 3, 2, 0, 4];

const MODEL_COST_PER_REQ: Record<string, number> = {
  "claude-4.5-sonnet": 0.06,
  "claude-4.6-opus-high": 0.38,
  "claude-4.6-opus-max": 4.5,
  "claude-4.5-haiku": 0.015,
  "claude-4.6-opus-high-thinking": 0.8,
  "gpt-5.2": 0.18,
  "claude-4.5-opus-high": 0.35,
  "claude-4.5-opus-high-thinking": 0.3,
  "gpt-5.2-codex": 0.22,
  "gemini-3-pro-preview": 0.12,
  "gemini-3-flash-preview": 0.03,
  "gpt-5.3-codex": 0.32,
  "claude-4.5-sonnet-thinking": 0.18,
  "claude-4.6-opus-high-thinking-fast": 14.55,
  "claude-4.6-opus-max-thinking": 7.8,
};

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

const COMMANDS = [
  "generate",
  "edit",
  "explain",
  "refactor",
  "fix",
  "test",
  "review",
  "document",
  "optimize",
  "debug",
];

const EVENT_KINDS = [
  "Usage-based",
  "Included in Business",
  "Included in Business",
  "Included in Business",
  "Errored, Not Charged",
];

const CLIENT_VERSIONS = [
  "2.1.32",
  "2.2.36",
  "2.2.43",
  "2.3.21",
  "2.3.29",
  "2.4.21",
  "2.4.35",
  "2.5.8",
  "2.5.12",
];

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
];

const LAST_NAMES = [
  "Cohen",
  "Muller",
  "Silva",
  "Costa",
  "Russo",
  "Varga",
  "Kato",
  "Lin",
  "Wu",
  "Zhang",
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

// ─── Generate the full team ─────────────────────────────────────────────────

function generateAllMembers(): StoryMember[] {
  const storyEmails = new Set(STORY_MEMBERS.map((m) => m.email));
  const usedNames = new Set(STORY_MEMBERS.map((m) => m.name));
  const genericMembers: StoryMember[] = [];

  const remaining = TEAM_SIZE - STORY_MEMBERS.length;
  const activityDist = { high: 0.15, medium: 0.45, low: 0.32, inactive: 0.08 };

  let groupIdx = 0;
  const groupAssignments: string[] = [];
  for (const g of GROUPS) {
    for (let i = 0; i < g.members; i++) groupAssignments.push(g.name);
  }

  for (let i = 0; i < remaining; i++) {
    let first: string, last: string, fullName: string;
    do {
      first = pick(FIRST_NAMES);
      last = pick(LAST_NAMES);
      fullName = `${first} ${last}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const email = `${first.toLowerCase()}.${last.toLowerCase()}@acme-corp.com`;
    if (storyEmails.has(email)) continue;

    const r = seededRandom();
    const activityLevel: StoryMember["activityLevel"] =
      r < activityDist.high
        ? "high"
        : r < activityDist.high + activityDist.medium
          ? "medium"
          : r < activityDist.high + activityDist.medium + activityDist.low
            ? "low"
            : "inactive";

    const versionIdx =
      activityLevel === "high" ? rand(6, 8) : activityLevel === "medium" ? rand(4, 7) : rand(0, 5);

    genericMembers.push({
      email,
      name: fullName,
      role: i < 2 ? "owner" : "member",
      userId: `usr_${seededRandom().toString(36).slice(2, 14)}`,
      storyRole: "normal",
      activityLevel,
      primaryModel: weightedPick(MODELS, MODEL_WEIGHTS),
      clientVersion: CLIENT_VERSIONS[Math.min(versionIdx, CLIENT_VERSIONS.length - 1)] ?? "2.5.12",
      group: groupAssignments[groupIdx++ % groupAssignments.length] ?? "Platform > Core",
    });
  }

  return [...STORY_MEMBERS, ...genericMembers];
}

// ─── Date helpers ───────────────────────────────────────────────────────────

function isSpikePeriod(date: string): boolean {
  return date === "2026-02-10" || date === "2026-02-11";
}

function isPostIntervention(date: string): boolean {
  return date >= "2026-02-14";
}

function isStoryCharacterCriticalDay(user: StoryMember, date: string): boolean {
  if (user.storyRole === "expensive_model" && date >= "2026-02-10" && date <= "2026-02-12")
    return true;
  if (user.storyRole === "long_conversation" && date >= "2026-02-10" && date <= "2026-02-13")
    return true;
  if (user.storyRole === "day1_exhaust" && date === "2026-02-01") return true;
  if (user.storyRole === "top_spender") return true;
  return false;
}

// ─── Main generation ────────────────────────────────────────────────────────

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

  const members = generateAllMembers();
  const now = isoNow();

  // ─── Members ────────────────────────────────────────────────────────────
  const memberStmt = db.prepare(
    "INSERT INTO members (email, user_id, name, role, is_removed, first_seen, last_seen) VALUES (?, ?, ?, ?, 0, ?, ?)",
  );
  db.transaction(() => {
    for (const m of members) memberStmt.run(m.email, m.userId, m.name, m.role, now, now);
  })();

  // ─── Daily usage + daily spend + usage events ───────────────────────────
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

  const eventStmt = db.prepare(
    `INSERT INTO usage_events (user_email, timestamp, model, kind, max_mode, requests_cost_cents,
      total_cents, total_tokens, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
      is_chargeable, is_headless) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const isWeekend = new Date(date + "T12:00:00Z").getDay() % 6 === 0;

      for (const user of members) {
        if (user.activityLevel === "inactive") continue;

        const hasCriticalStory = isStoryCharacterCriticalDay(user, date);
        const activeChance = hasCriticalStory
          ? 1.0
          : isWeekend
            ? 0.15
            : user.activityLevel === "high"
              ? 0.95
              : user.activityLevel === "medium"
                ? 0.8
                : 0.6;
        if (seededRandom() > activeChance) continue;

        const dayData = generateDayForUser(user, date, isWeekend);

        dailyStmt.run(
          date,
          user.email,
          user.userId,
          1,
          dayData.linesAdded,
          dayData.linesDeleted,
          dayData.acceptedLines,
          dayData.acceptedDeleted,
          dayData.totalApplies,
          dayData.totalAccepts,
          dayData.totalRejects,
          dayData.tabsShown,
          dayData.tabsAccepted,
          dayData.composerReqs,
          dayData.chatReqs,
          dayData.agentReqs,
          dayData.usageBasedReqs,
          dayData.model,
          pick(EXTENSIONS),
          user.clientVersion,
        );

        spendStmt.run(date, user.email, dayData.spendCents, CYCLE_START);

        for (const evt of dayData.events) {
          eventStmt.run(
            user.email,
            evt.timestamp,
            evt.model,
            evt.kind,
            evt.maxMode,
            evt.totalCents,
            evt.totalCents,
            evt.inputTokens + evt.outputTokens,
            evt.inputTokens,
            evt.outputTokens,
            evt.cacheRead,
            evt.cacheWrite,
            1,
            0,
          );
        }
      }
    }
  })();

  // ─── Spending (cycle totals) ────────────────────────────────────────────
  const spendingStmt = db.prepare(
    `INSERT INTO spending (email, user_id, name, cycle_start, spend_cents, included_spend_cents,
      fast_premium_requests, monthly_limit_dollars, hard_limit_override_dollars)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.transaction(() => {
    for (const user of members) {
      const totalSpend = computeCycleSpend(user);
      const included = Math.min(Math.floor(totalSpend * 0.3), 4000);
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
  })();

  // ─── Billing groups ─────────────────────────────────────────────────────
  const groupStmt = db.prepare(
    "INSERT INTO billing_groups (id, name, member_count, spend_cents) VALUES (?, ?, ?, ?)",
  );
  const gmStmt = db.prepare(
    "INSERT INTO group_members (group_id, email, joined_at) VALUES (?, ?, ?)",
  );
  db.transaction(() => {
    for (const g of GROUPS) {
      const id = `grp_${g.name
        .replace(/\s*>\s*/g, "_")
        .replace(/\s+/g, "")
        .toLowerCase()}`;
      const groupMembers = members.filter((m) => m.group === g.name);
      const totalSpend = groupMembers.reduce((sum, m) => sum + computeCycleSpend(m), 0);
      groupStmt.run(id, g.name, groupMembers.length, totalSpend);
      for (const m of groupMembers) {
        gmStmt.run(id, m.email, now);
      }
    }
  })();

  // ─── Anomalies & Incidents (story-driven) ───────────────────────────────
  const anomalyStmt = db.prepare(
    `INSERT INTO anomalies (user_email, type, severity, metric, value, threshold, message, detected_at, resolved_at, alerted_at, diagnosis_model, diagnosis_kind, diagnosis_delta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const incidentStmt = db.prepare(
    `INSERT INTO incidents (anomaly_id, user_email, status, detected_at, alerted_at, acknowledged_at, resolved_at, mttd_minutes, mtti_minutes, mttr_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    // Story A: Marcus expensive model spike detected
    let r = anomalyStmt.run(
      "marcus.chen@acme-corp.com",
      "trend",
      "critical",
      "spend",
      123500,
      3600,
      "Marcus Chen: daily spend spiked to $1,235 (34.5x their 7-day avg $35.80) — model: claude-4.6-opus-high-thinking-fast",
      "2026-02-10 14:30:00",
      "2026-02-11 10:00:00",
      "2026-02-10 14:30:05",
      "claude-4.6-opus-high-thinking-fast",
      "agent",
      34.5,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "marcus.chen@acme-corp.com",
      "resolved",
      "2026-02-10 14:30:00",
      "2026-02-10 14:30:05",
      "2026-02-10 15:00:00",
      "2026-02-11 10:00:00",
      2,
      30,
      1170,
    );

    r = anomalyStmt.run(
      "marcus.chen@acme-corp.com",
      "threshold",
      "warning",
      "plan_exhausted",
      84,
      0,
      "Marcus Chen: exhausted plan allowance on day 10 of cycle (2026-02-10). 84 usage-based requests since.",
      "2026-02-10 16:00:00",
      "2026-02-11 10:00:00",
      "2026-02-10 16:00:05",
      "claude-4.6-opus-high-thinking-fast",
      "agent",
      84,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "marcus.chen@acme-corp.com",
      "resolved",
      "2026-02-10 16:00:00",
      "2026-02-10 16:00:05",
      "2026-02-10 16:30:00",
      "2026-02-11 10:00:00",
      2,
      30,
      1080,
    );

    r = anomalyStmt.run(
      "marcus.chen@acme-corp.com",
      "trend",
      "critical",
      "spend",
      185000,
      4652,
      "Marcus Chen: cycle spend $1,850 is 21.1x the team median ($87.70) — model: claude-4.6-opus-high-thinking-fast, 500 premium reqs",
      "2026-02-12 09:00:00",
      null,
      "2026-02-12 09:00:05",
      "claude-4.6-opus-high-thinking-fast",
      "agent",
      21.1,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "marcus.chen@acme-corp.com",
      "acknowledged",
      "2026-02-12 09:00:00",
      "2026-02-12 09:00:05",
      "2026-02-12 10:00:00",
      null,
      2,
      60,
      null,
    );

    // Story B: Long conversation users — Elena detected
    r = anomalyStmt.run(
      "elena.berg@acme-corp.com",
      "trend",
      "critical",
      "spend",
      351300,
      4600,
      "Elena Berg: cycle spend $3,513 is 40.1x the team median ($87.70) — large context cache detected (avg 1.2M tokens/request)",
      "2026-02-12 09:00:00",
      "2026-02-14 14:00:00",
      "2026-02-12 09:00:05",
      "claude-4.6-opus-high",
      "agent",
      40.1,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "elena.berg@acme-corp.com",
      "resolved",
      "2026-02-12 09:00:00",
      "2026-02-12 09:00:05",
      "2026-02-12 10:00:00",
      "2026-02-14 14:00:00",
      2,
      60,
      1740,
    );

    r = anomalyStmt.run(
      "raj.patel@acme-corp.com",
      "zscore",
      "warning",
      "spend",
      28000,
      8800,
      "Raj Patel: daily spend 3.2 std devs above team mean ($280 vs $88 avg) — long conversation context accumulation",
      "2026-02-11 11:00:00",
      "2026-02-14 14:00:00",
      "2026-02-11 11:00:05",
      "claude-4.6-opus-high-thinking",
      "agent",
      3.2,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "raj.patel@acme-corp.com",
      "resolved",
      "2026-02-11 11:00:00",
      "2026-02-11 11:00:05",
      "2026-02-11 14:00:00",
      "2026-02-14 14:00:00",
      2,
      180,
      4380,
    );

    // Story D: Nina day-1 plan exhaustion
    r = anomalyStmt.run(
      "nina.ivanov@acme-corp.com",
      "threshold",
      "warning",
      "plan_exhausted",
      1654,
      0,
      "Nina Ivanov: exhausted plan allowance on day 1 of cycle (2026-02-01). 1,654 usage-based requests since.",
      "2026-02-01 18:00:00",
      null,
      "2026-02-01 18:00:05",
      "claude-4.6-opus-max",
      "agent",
      1654,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "nina.ivanov@acme-corp.com",
      "open",
      "2026-02-01 18:00:00",
      "2026-02-01 18:00:05",
      null,
      null,
      2,
      null,
      null,
    );

    // Story F: Alex Kim top spender (consistent, not a spike)
    r = anomalyStmt.run(
      "alex.kim@acme-corp.com",
      "trend",
      "warning",
      "spend",
      78000,
      20000,
      "Alex Kim: cycle spend $780 exceeds $200 threshold — consistently high usage with thinking models",
      "2026-02-15 09:00:00",
      null,
      "2026-02-15 09:00:05",
      "claude-4.6-opus-high-thinking",
      "agent",
      15,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "alex.kim@acme-corp.com",
      "acknowledged",
      "2026-02-15 09:00:00",
      "2026-02-15 09:00:05",
      "2026-02-15 11:00:00",
      null,
      2,
      120,
      null,
    );

    // Generic anomalies for other high spenders
    const highUsers = members.filter((m) => m.activityLevel === "high" && m.storyRole === "normal");
    for (let i = 0; i < Math.min(6, highUsers.length); i++) {
      const u = highUsers[i] as StoryMember;
      const daysAgo = rand(2, 18);
      const detectedAt = `${dateStr(daysAgo)} ${rand(8, 18)}:${String(rand(0, 59)).padStart(2, "0")}:00`;
      const alertedAt = `${detectedAt.slice(0, 16)}:05`;
      const isResolved = daysAgo > 8;
      const resolvedAt = isResolved ? `${dateStr(daysAgo - 2)} 14:00:00` : null;

      const types = [
        {
          type: "threshold",
          severity: "warning" as const,
          metric: "spend",
          value: rand(20000, 50000),
          threshold: 20000,
          msg: `${u.name}: spend $${rand(200, 500).toFixed(2)} exceeds limit $200.00`,
        },
        {
          type: "zscore",
          severity: "warning" as const,
          metric: "requests",
          value: rand(150, 300),
          threshold: 100,
          msg: `${u.name}: 2.${rand(1, 9)} std devs above team mean (${rand(150, 300)} requests)`,
        },
        {
          type: "trend",
          severity: "warning" as const,
          metric: "spend",
          value: rand(5000, 15000),
          threshold: rand(2000, 5000),
          msg: `${u.name}: daily spend spiked to $${rand(50, 150)} (${rand(2, 4)}.${rand(1, 9)}x their 7-day avg) — model: ${u.primaryModel}`,
        },
      ];
      const anomaly = types[i % types.length] as (typeof types)[number];

      const ar = anomalyStmt.run(
        u.email,
        anomaly.type,
        anomaly.severity,
        anomaly.metric,
        anomaly.value,
        anomaly.threshold,
        anomaly.msg,
        detectedAt,
        resolvedAt,
        alertedAt,
        u.primaryModel,
        "agent",
        rand(10, 40),
      );

      const status = isResolved ? "resolved" : seededRandom() < 0.3 ? "acknowledged" : "open";
      const acknowledgedAt =
        status !== "open"
          ? `${detectedAt.slice(0, 11)}${rand(9, 19)}:${String(rand(0, 59)).padStart(2, "0")}:00`
          : null;

      incidentStmt.run(
        Number(ar.lastInsertRowid),
        u.email,
        status,
        detectedAt,
        alertedAt,
        acknowledgedAt,
        resolvedAt,
        rand(1, 15),
        acknowledgedAt ? rand(5, 120) : null,
        isResolved ? rand(30, 480) : null,
      );
    }

    // Team-level incidents
    r = anomalyStmt.run(
      "team",
      "threshold",
      "warning",
      "users_limited",
      3,
      0,
      "3 team members are limited and unable to make requests. Review team spend limits on the Cursor dashboard.",
      `${dateStr(1)} 09:00:00`,
      null,
      `${dateStr(1)} 09:00:05`,
      null,
      null,
      null,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "team",
      "open",
      `${dateStr(1)} 09:00:00`,
      `${dateStr(1)} 09:00:05`,
      null,
      null,
      2,
      null,
      null,
    );

    r = anomalyStmt.run(
      "team",
      "threshold",
      "warning",
      "team_budget",
      1310982,
      1500000,
      "Team spend $13,110 has reached the $15,000 budget threshold (87%).",
      `${dateStr(0)} 10:00:00`,
      null,
      `${dateStr(0)} 10:00:05`,
      null,
      null,
      null,
    );
    incidentStmt.run(
      Number(r.lastInsertRowid),
      "team",
      "open",
      `${dateStr(0)} 10:00:00`,
      `${dateStr(0)} 10:00:05`,
      null,
      null,
      1,
      null,
      null,
    );
  })();

  // ─── Analytics: DAU ─────────────────────────────────────────────────────
  const dauStmt = db.prepare(
    "INSERT INTO analytics_dau (date, dau, cli_dau, cloud_agent_dau, bugbot_dau) VALUES (?, ?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const isWeekend = new Date(date + "T12:00:00Z").getDay() % 6 === 0;
      const base = isWeekend ? rand(8, 20) : rand(35, 55);
      dauStmt.run(date, base, Math.floor(base * 0.9), rand(1, 5), rand(0, 2));
    }
  })();

  // ─── Analytics: Model usage ─────────────────────────────────────────────
  const modelUsageStmt = db.prepare(
    "INSERT INTO analytics_model_usage (date, model, messages, users) VALUES (?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const spike = isSpikePeriod(date);
      for (let m = 0; m < MODELS.length; m++) {
        const weight = MODEL_WEIGHTS[m] ?? 1;
        let messages = Math.floor(weight * rand(5, 15));
        let users = Math.min(rand(2, Math.floor(weight * 1.5)), TEAM_SIZE);

        if (MODELS[m] === "claude-4.6-opus-high-thinking-fast" && spike) {
          messages = rand(80, 120);
          users = rand(3, 5);
        }
        modelUsageStmt.run(date, MODELS[m], messages, users);
      }
    }
  })();

  // ─── Analytics: Agent edits ─────────────────────────────────────────────
  const agentEditsStmt = db.prepare(
    "INSERT INTO analytics_agent_edits (date, suggested_diffs, accepted_diffs, rejected_diffs, lines_suggested, lines_accepted, green_lines_accepted, red_lines_accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const suggested = rand(200, 800);
      const accepted = Math.floor(suggested * (0.5 + seededRandom() * 0.3));
      const rejected = suggested - accepted;
      const linesSuggested = suggested * rand(5, 20);
      const linesAccepted = Math.floor(linesSuggested * (0.4 + seededRandom() * 0.3));
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
  })();

  // ─── Analytics: Tabs ────────────────────────────────────────────────────
  const tabsStmt = db.prepare(
    "INSERT INTO analytics_tabs (date, suggestions, accepts, rejects, lines_suggested, lines_accepted) VALUES (?, ?, ?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      const suggestions = rand(500, 2000);
      const accepts = Math.floor(suggestions * (0.3 + seededRandom() * 0.3));
      tabsStmt.run(
        date,
        suggestions,
        accepts,
        suggestions - accepts,
        suggestions * rand(2, 5),
        accepts * rand(2, 4),
      );
    }
  })();

  // ─── Analytics: MCP ─────────────────────────────────────────────────────
  const mcpStmt = db.prepare(
    "INSERT INTO analytics_mcp (date, tool_name, server_name, usage) VALUES (?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (const t of MCP_TOOLS) {
        mcpStmt.run(date, t.tool, t.server, rand(5, 200));
      }
    }
  })();

  // ─── Analytics: File extensions ─────────────────────────────────────────
  const extStmt = db.prepare(
    "INSERT INTO analytics_file_extensions (date, extension, total_files, lines_accepted) VALUES (?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (const ext of EXTENSIONS) {
        extStmt.run(date, ext, rand(10, 500), rand(50, 3000));
      }
    }
  })();

  // ─── Analytics: Client versions ─────────────────────────────────────────
  const cvStmt = db.prepare(
    "INSERT INTO analytics_client_versions (date, version, user_count, percentage) VALUES (?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      let remaining = 100;
      for (let i = 0; i < CLIENT_VERSIONS.length; i++) {
        const isLast = i === CLIENT_VERSIONS.length - 1;
        const pct = isLast ? remaining : Math.min(rand(5, 20), remaining);
        remaining -= pct;
        const users = Math.max(1, Math.floor((TEAM_SIZE * pct) / 100));
        cvStmt.run(date, CLIENT_VERSIONS[i], users, pct);
      }
    }
  })();

  // ─── Analytics: Commands ────────────────────────────────────────────────
  const cmdStmt = db.prepare(
    "INSERT INTO analytics_commands (date, command_name, usage) VALUES (?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (const cmd of COMMANDS) {
        cmdStmt.run(date, cmd, rand(5, 150));
      }
    }
  })();

  // ─── Analytics: Plans ───────────────────────────────────────────────────
  const planStmt = db.prepare("INSERT INTO analytics_plans (date, model, usage) VALUES (?, ?, ?)");
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (let m = 0; m < Math.min(5, MODELS.length); m++) {
        planStmt.run(date, MODELS[m], rand(1, 30));
      }
    }
  })();

  // ─── Analytics: Per-user MCP ────────────────────────────────────────────
  const userMcpStmt = db.prepare(
    "INSERT INTO analytics_user_mcp (date, email, tool_name, server_name, usage) VALUES (?, ?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (const user of members) {
        if (user.activityLevel === "inactive") continue;
        if (seededRandom() < 0.4) continue;
        const toolCount =
          user.activityLevel === "high"
            ? rand(3, 8)
            : user.activityLevel === "medium"
              ? rand(1, 4)
              : rand(0, 2);
        const shuffled = [...MCP_TOOLS].sort(() => seededRandom() - 0.5);
        for (let t = 0; t < Math.min(toolCount, shuffled.length); t++) {
          const tool = shuffled[t] as (typeof MCP_TOOLS)[number];
          userMcpStmt.run(date, user.email, tool.tool, tool.server, rand(1, 30));
        }
      }
    }
  })();

  // ─── Analytics: Per-user commands ───────────────────────────────────────
  const userCmdStmt = db.prepare(
    "INSERT INTO analytics_user_commands (date, email, command_name, usage) VALUES (?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (let d = 0; d < DAYS; d++) {
      const date = dateStr(DAYS - 1 - d);
      for (const user of members) {
        if (user.activityLevel === "inactive") continue;
        if (seededRandom() < 0.3) continue;
        const cmdCount =
          user.activityLevel === "high"
            ? rand(3, 6)
            : user.activityLevel === "medium"
              ? rand(1, 4)
              : rand(0, 2);
        const shuffled = [...COMMANDS].sort(() => seededRandom() - 0.5);
        for (let c = 0; c < Math.min(cmdCount, shuffled.length); c++) {
          userCmdStmt.run(date, user.email, shuffled[c], rand(1, 20));
        }
      }
    }
  })();

  // ─── Metadata ───────────────────────────────────────────────────────────
  const metaStmt = db.prepare("INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?)");
  metaStmt.run("cycle_start", CYCLE_START, now);
  metaStmt.run("cycle_end", CYCLE_END, now);
  metaStmt.run("limited_users_count", "3", now);
  metaStmt.run("team_budget_threshold", "15000", now);

  db.close();
  console.log(`Mock database generated at ${DB_PATH}`);
  console.log(
    `  Team size: ${TEAM_SIZE} members (${members.filter((m) => m.activityLevel === "inactive").length} inactive)`,
  );
  console.log(`  Date range: ${dateStr(DAYS - 1)} to ${dateStr(0)}`);
  console.log(`  Story characters: ${STORY_MEMBERS.length}`);
}

// ─── Per-user daily data generation with story logic ────────────────────────

interface DayEvent {
  timestamp: string;
  model: string;
  kind: string;
  maxMode: number;
  totalCents: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
}

interface DayData {
  agentReqs: number;
  chatReqs: number;
  composerReqs: number;
  linesAdded: number;
  linesDeleted: number;
  acceptedLines: number;
  acceptedDeleted: number;
  totalApplies: number;
  totalAccepts: number;
  totalRejects: number;
  tabsShown: number;
  tabsAccepted: number;
  usageBasedReqs: number;
  model: string;
  spendCents: number;
  events: DayEvent[];
}

function generateDayForUser(user: StoryMember, date: string, isWeekend: boolean): DayData {
  switch (user.storyRole) {
    case "expensive_model":
      return generateExpensiveModelDay(user, date, isWeekend);
    case "long_conversation":
      return generateLongConversationDay(user, date, isWeekend);
    case "day1_exhaust":
      return generateDay1ExhaustDay(user, date, isWeekend);
    case "old_version":
      return generateOldVersionDay(user, date, isWeekend);
    case "top_spender":
      return generateTopSpenderDay(user, date, isWeekend);
    default:
      return generateNormalDay(user, date, isWeekend);
  }
}

// Story A: Marcus — normal before Feb 8, expensive model on Feb 8, back to normal after
function generateExpensiveModelDay(user: StoryMember, date: string, isWeekend: boolean): DayData {
  if (date === "2026-02-10") {
    const agentReqs = 84;
    const model = "claude-4.6-opus-high-thinking-fast";
    const costPerReq = MODEL_COST_PER_REQ[model] ?? 14.55;
    const events = generateEvents(user, date, agentReqs, model, costPerReq, true);
    const spendCents = Math.round(events.reduce((s, e) => s + e.totalCents, 0));

    return {
      agentReqs,
      chatReqs: rand(2, 5),
      composerReqs: 0,
      linesAdded: agentReqs * rand(8, 15),
      linesDeleted: agentReqs * rand(2, 5),
      acceptedLines: agentReqs * rand(4, 8),
      acceptedDeleted: agentReqs * rand(1, 3),
      totalApplies: Math.floor(agentReqs * 0.7),
      totalAccepts: Math.floor(agentReqs * 0.55),
      totalRejects: Math.floor(agentReqs * 0.15),
      tabsShown: rand(30, 80),
      tabsAccepted: rand(15, 40),
      usageBasedReqs: agentReqs,
      model,
      spendCents,
      events,
    };
  }

  if (date === "2026-02-11" || date === "2026-02-12") {
    return generateNormalDay(
      { ...user, primaryModel: "claude-4.6-opus-max", activityLevel: "medium" },
      date,
      isWeekend,
    );
  }

  return generateNormalDay(user, date, isWeekend);
}

// Story B: Long conversation users — high cache during spike, normal after intervention
function generateLongConversationDay(user: StoryMember, date: string, isWeekend: boolean): DayData {
  if (isSpikePeriod(date)) {
    const agentReqs =
      user.email === "elena.berg@acme-corp.com"
        ? rand(60, 90)
        : user.email === "raj.patel@acme-corp.com"
          ? rand(40, 60)
          : rand(20, 35);

    const model = user.primaryModel;
    const baseCost = MODEL_COST_PER_REQ[model] ?? 1.0;
    const inflatedCost = baseCost * (5 + seededRandom() * 4);
    const events = generateEvents(user, date, agentReqs, model, inflatedCost, true);
    const spendCents = Math.round(events.reduce((s, e) => s + e.totalCents, 0));

    return {
      agentReqs,
      chatReqs: rand(1, 5),
      composerReqs: rand(0, 3),
      linesAdded: agentReqs * rand(5, 12),
      linesDeleted: agentReqs * rand(2, 5),
      acceptedLines: agentReqs * rand(3, 7),
      acceptedDeleted: agentReqs * rand(1, 3),
      totalApplies: Math.floor(agentReqs * 0.6),
      totalAccepts: Math.floor(agentReqs * 0.45),
      totalRejects: Math.floor(agentReqs * 0.15),
      tabsShown: rand(10, 40),
      tabsAccepted: rand(5, 20),
      usageBasedReqs: Math.floor(agentReqs * 0.8),
      model,
      spendCents,
      events,
    };
  }

  if (date >= "2026-02-10" && !isPostIntervention(date)) {
    const day = generateNormalDay(user, date, isWeekend);
    const inflationFactor = 2 + seededRandom() * 2;
    day.spendCents = Math.round(day.spendCents * inflationFactor);
    for (const e of day.events) {
      e.totalCents *= inflationFactor;
      e.cacheRead = Math.floor(e.cacheRead * (3 + seededRandom() * 3));
    }
    return day;
  }

  return generateNormalDay(user, date, isWeekend);
}

// Story D: Nina — massive usage on day 1, then sustained high
function generateDay1ExhaustDay(user: StoryMember, date: string, isWeekend: boolean): DayData {
  if (date === "2026-02-01") {
    const agentReqs = rand(180, 220);
    const model = user.primaryModel;
    const costPerReq = MODEL_COST_PER_REQ[model] ?? 1.26;
    const events = generateEvents(user, date, agentReqs, model, costPerReq, false);
    const spendCents = Math.round(events.reduce((s, e) => s + e.totalCents, 0));

    return {
      agentReqs,
      chatReqs: rand(5, 15),
      composerReqs: rand(2, 8),
      linesAdded: agentReqs * rand(10, 20),
      linesDeleted: agentReqs * rand(3, 8),
      acceptedLines: agentReqs * rand(6, 12),
      acceptedDeleted: agentReqs * rand(2, 5),
      totalApplies: Math.floor(agentReqs * 0.7),
      totalAccepts: Math.floor(agentReqs * 0.6),
      totalRejects: Math.floor(agentReqs * 0.1),
      tabsShown: rand(100, 200),
      tabsAccepted: rand(50, 100),
      usageBasedReqs: agentReqs,
      model,
      spendCents,
      events,
    };
  }

  return generateNormalDay({ ...user, activityLevel: "high" }, date, isWeekend);
}

// Story G: Derek — old version, low usage
function generateOldVersionDay(user: StoryMember, date: string, isWeekend: boolean): DayData {
  const day = generateNormalDay({ ...user, activityLevel: "low" }, date, isWeekend);
  day.tabsShown = rand(2, 10);
  day.tabsAccepted = rand(0, 3);
  return day;
}

// Story F: Alex Kim — consistently high spend with thinking models
function generateTopSpenderDay(user: StoryMember, date: string, isWeekend: boolean): DayData {
  if (isWeekend) return generateNormalDay(user, date, isWeekend);

  const agentReqs = rand(100, 180);
  const model = user.primaryModel;
  const costPerReq = MODEL_COST_PER_REQ[model] ?? 2.8;
  const events = generateEvents(user, date, agentReqs, model, costPerReq, false);
  const spendCents = Math.round(events.reduce((s, e) => s + e.totalCents, 0));

  return {
    agentReqs,
    chatReqs: rand(5, 15),
    composerReqs: rand(2, 8),
    linesAdded: agentReqs * rand(8, 18),
    linesDeleted: agentReqs * rand(3, 7),
    acceptedLines: agentReqs * rand(5, 10),
    acceptedDeleted: agentReqs * rand(2, 4),
    totalApplies: Math.floor(agentReqs * 0.7),
    totalAccepts: Math.floor(agentReqs * 0.6),
    totalRejects: Math.floor(agentReqs * 0.1),
    tabsShown: rand(80, 180),
    tabsAccepted: rand(40, 100),
    usageBasedReqs: Math.floor(agentReqs * 0.4),
    model,
    spendCents,
    events,
  };
}

// Normal user day generation
function generateNormalDay(user: StoryMember, date: string, isWeekend: boolean): DayData {
  const baseReqs = isWeekend
    ? user.activityLevel === "high"
      ? rand(20, 60)
      : rand(3, 15)
    : user.activityLevel === "high"
      ? rand(60, 180)
      : user.activityLevel === "medium"
        ? rand(15, 60)
        : rand(3, 20);
  const agentReqs = baseReqs;
  const chatReqs = rand(0, Math.floor(agentReqs * 0.2));
  const composerReqs = rand(0, Math.floor(agentReqs * 0.1));
  let model = user.primaryModel;
  if (seededRandom() > 0.85) {
    const primaryCost = MODEL_COST_PER_REQ[user.primaryModel] ?? 0.5;
    const candidates = MODELS.filter((m) => (MODEL_COST_PER_REQ[m] ?? 0.5) <= primaryCost * 3);
    const candidateWeights = candidates.map((m) => MODEL_WEIGHTS[MODELS.indexOf(m)] ?? 1);
    model = weightedPick(candidates, candidateWeights);
  }
  const costPerReq = MODEL_COST_PER_REQ[model] ?? 0.5;

  const eventCount = Math.min(agentReqs, rand(5, 25));
  const events = generateEvents(user, date, eventCount, model, costPerReq, false);
  const jitter = 0.85 + seededRandom() * 0.3;
  const spendCents = Math.round(costPerReq * 100 * agentReqs * jitter);

  const linesAdded = agentReqs * rand(3, 15);
  const linesDeleted = Math.floor(linesAdded * (0.2 + seededRandom() * 0.3));
  const acceptedLines = Math.floor(linesAdded * (0.4 + seededRandom() * 0.4));
  const acceptedDeleted = Math.floor(linesDeleted * (0.3 + seededRandom() * 0.3));
  const totalApplies = Math.floor(agentReqs * (0.5 + seededRandom() * 0.3));
  const totalAccepts = Math.floor(totalApplies * (0.6 + seededRandom() * 0.3));
  const totalRejects = totalApplies - totalAccepts;

  const hasNoTabs = user.storyRole === "old_version" || seededRandom() < 0.15;
  const tabsShown = hasNoTabs ? 0 : rand(20, 200);
  const tabsAccepted = Math.floor(tabsShown * (0.3 + seededRandom() * 0.4));
  const usageBasedReqs = Math.floor(agentReqs * (0.1 + seededRandom() * 0.3));

  return {
    agentReqs,
    chatReqs,
    composerReqs,
    linesAdded,
    linesDeleted,
    acceptedLines,
    acceptedDeleted,
    totalApplies,
    totalAccepts,
    totalRejects,
    tabsShown,
    tabsAccepted,
    usageBasedReqs,
    model,
    spendCents,
    events,
  };
}

function generateEvents(
  user: StoryMember,
  date: string,
  count: number,
  model: string,
  costPerReq: number,
  isHighCache: boolean,
): DayEvent[] {
  const events: DayEvent[] = [];
  for (let i = 0; i < count; i++) {
    const hour = rand(7, 22);
    const minute = rand(0, 59);
    const second = rand(0, 59);
    const ts = String(
      new Date(
        `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}Z`,
      ).getTime(),
    );

    const inputTokens = rand(500, 50000);
    const outputTokens = model.includes("thinking") ? rand(5000, 80000) : rand(100, 20000);

    const cacheRead = isHighCache ? rand(2000000, 15000000) : rand(0, inputTokens);
    const cacheWrite = rand(0, Math.floor(inputTokens * 0.3));

    const jitter = 0.6 + seededRandom() * 0.8;
    const totalCents = +(costPerReq * 100 * jitter).toFixed(2);

    const isMax = model.includes("-max") ? 1 : 0;
    const kind = pick(EVENT_KINDS);

    events.push({
      timestamp: ts,
      model,
      kind,
      maxMode: isMax,
      totalCents,
      inputTokens,
      outputTokens,
      cacheRead,
      cacheWrite,
    });
  }
  return events;
}

function computeCycleSpend(user: StoryMember): number {
  switch (user.storyRole) {
    case "expensive_model":
      return 185000;
    case "long_conversation":
      return user.email === "elena.berg@acme-corp.com"
        ? 351300
        : user.email === "raj.patel@acme-corp.com"
          ? 120000
          : 65000;
    case "day1_exhaust":
      return 95000;
    case "top_spender":
      return 78000;
    case "inactive":
      return 0;
    case "old_version":
      return rand(500, 2000);
    default:
      return user.activityLevel === "high"
        ? rand(15000, 60000)
        : user.activityLevel === "medium"
          ? rand(3000, 15000)
          : rand(200, 4000);
  }
}

// ─── Schema ─────────────────────────────────────────────────────────────────

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
      PRIMARY KEY (date, email)
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
    CREATE TABLE IF NOT EXISTS analytics_commands (
      date TEXT NOT NULL, command_name TEXT NOT NULL, usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, command_name)
    );
    CREATE TABLE IF NOT EXISTS analytics_plans (
      date TEXT NOT NULL, model TEXT NOT NULL, usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, model)
    );
    CREATE TABLE IF NOT EXISTS analytics_user_mcp (
      date TEXT NOT NULL, email TEXT NOT NULL, tool_name TEXT NOT NULL,
      server_name TEXT NOT NULL, usage INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email, tool_name, server_name)
    );
    CREATE INDEX IF NOT EXISTS idx_user_mcp_email ON analytics_user_mcp(email);
    CREATE TABLE IF NOT EXISTS analytics_user_commands (
      date TEXT NOT NULL, email TEXT NOT NULL, command_name TEXT NOT NULL,
      usage INTEGER NOT NULL DEFAULT 0, collected_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (date, email, command_name)
    );
    CREATE INDEX IF NOT EXISTS idx_user_commands_email ON analytics_user_commands(email);
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
