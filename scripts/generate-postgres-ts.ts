/**
 * Generates postgres.ts from sqlite.ts by swapping the DB backend.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "data");
const src = readFileSync(path.join(dir, "sqlite.ts"), "utf8");

const header = `import { ensurePostgresSchema, PgDatabase } from "./postgres-bridge";
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
} from "../types";
import { DEFAULT_CONFIG } from "../types";
import type {
  UsageBadge,
  SpendBadge,
  ContextBadge,
  AdoptionBadge,
  RankedUser,
  DashboardStats,
  FullDashboard,
  ModelEfficiency,
  UserContextMetrics,
  CycleSummaryData,
} from "./types";

let dbInstance: PgDatabase | null = null;

export function getDb(): PgDatabase {
  if (!dbInstance) {
    ensurePostgresSchema();
    dbInstance = new PgDatabase();
  }
  return dbInstance;
}

`;

let body = src;

// Drop sqlite imports through getDb()
body = body.replace(
  /^import Database[\s\S]*?^export function getDb\(\): Database\.Database \{[\s\S]*?^}\n\n/m,
  "",
);

// Drop initSchema and runMigrations
body = body.replace(/^function initSchema[\s\S]*?^}\n\nfunction runMigrations[\s\S]*?^}\n\n/m, "");

// Replace Database.Database with PgDatabase in cycleBillingAnchor
body = body.replace(
  /function cycleBillingAnchor\(db: Database\.Database\)/g,
  "function cycleBillingAnchor(db: PgDatabase)",
);

writeFileSync(path.join(dir, "postgres.ts"), header + body);
console.log("Generated postgres.ts");
