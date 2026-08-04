/** Tables that can be cleared via reset CLI. Order respects FK dependencies (children first). */
export const RESETTABLE_TABLES = [
  "incidents",
  "anomalies",
  "group_members",
  "billing_groups",
  "members",
  "daily_usage",
  "spending",
  "usage_events",
  "daily_spend",
  "ai_code_commits",
  "analytics_dau",
  "analytics_model_usage",
  "analytics_agent_edits",
  "analytics_tabs",
  "analytics_mcp",
  "analytics_file_extensions",
  "analytics_client_versions",
  "analytics_commands",
  "analytics_plans",
  "analytics_user_mcp",
  "analytics_user_commands",
  "config",
  "metadata",
  "collection_log",
] as const;

export type ResettableTable = (typeof RESETTABLE_TABLES)[number];

const RESETTABLE_SET = new Set<string>(RESETTABLE_TABLES);

export function isResettableTable(name: string): name is ResettableTable {
  return RESETTABLE_SET.has(name);
}

/** Reorder user-supplied table names into FK-safe deletion order. */
export function orderResetTables(tables: readonly string[]): ResettableTable[] {
  const set = new Set(tables);
  return RESETTABLE_TABLES.filter((t) => set.has(t));
}
