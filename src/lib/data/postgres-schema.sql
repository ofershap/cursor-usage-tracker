CREATE TABLE IF NOT EXISTS members (
  email TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_removed INTEGER NOT NULL DEFAULT 0,
  first_seen TEXT NOT NULL DEFAULT (NOW()::text),
  last_seen TEXT NOT NULL DEFAULT (NOW()::text)
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
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, email)
);

CREATE INDEX IF NOT EXISTS idx_daily_email ON daily_usage(email);
CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_usage(date);

CREATE TABLE IF NOT EXISTS spending (
  email TEXT NOT NULL,
  user_id TEXT,
  name TEXT,
  cycle_start TEXT NOT NULL,
  spend_cents NUMERIC(20, 4) NOT NULL DEFAULT 0,
  included_spend_cents NUMERIC(20, 4) NOT NULL DEFAULT 0,
  overall_spend_cents NUMERIC(20, 4),
  fast_premium_requests INTEGER NOT NULL DEFAULT 0,
  monthly_limit_dollars DOUBLE PRECISION,
  hard_limit_override_dollars DOUBLE PRECISION NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (email, cycle_start)
);

CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  model TEXT NOT NULL,
  kind TEXT NOT NULL,
  max_mode INTEGER NOT NULL DEFAULT 0,
  requests_cost_cents NUMERIC(20, 6) NOT NULL DEFAULT 0,
  total_cents NUMERIC(20, 6) NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  is_chargeable INTEGER NOT NULL DEFAULT 1,
  is_headless INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text)
);

CREATE INDEX IF NOT EXISTS idx_events_user_ts ON usage_events(user_email, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_ts ON usage_events(timestamp);

CREATE TABLE IF NOT EXISTS anomalies (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  message TEXT NOT NULL,
  detected_at TEXT NOT NULL DEFAULT (NOW()::text),
  resolved_at TEXT,
  alerted_at TEXT,
  diagnosis_model TEXT,
  diagnosis_kind TEXT,
  diagnosis_delta DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies(user_email);
CREATE INDEX IF NOT EXISTS idx_anomalies_open ON anomalies(resolved_at) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  anomaly_id BIGINT NOT NULL REFERENCES anomalies(id),
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TEXT NOT NULL DEFAULT (NOW()::text),
  alerted_at TEXT,
  acknowledged_at TEXT,
  resolved_at TEXT,
  mttd_minutes DOUBLE PRECISION,
  mtti_minutes DOUBLE PRECISION,
  mttr_minutes DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_spend (
  date TEXT NOT NULL,
  email TEXT NOT NULL,
  spend_cents NUMERIC(20, 4) NOT NULL DEFAULT 0,
  cycle_start TEXT NOT NULL,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, email)
);

CREATE INDEX IF NOT EXISTS idx_daily_spend_email ON daily_spend(email);
CREATE INDEX IF NOT EXISTS idx_daily_spend_date ON daily_spend(date);

CREATE TABLE IF NOT EXISTS billing_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  spend_cents NUMERIC(20, 4) NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text)
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
  collected_at TEXT NOT NULL DEFAULT (NOW()::text)
);

CREATE TABLE IF NOT EXISTS analytics_model_usage (
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  users INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
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
  collected_at TEXT NOT NULL DEFAULT (NOW()::text)
);

CREATE TABLE IF NOT EXISTS analytics_tabs (
  date TEXT PRIMARY KEY,
  suggestions INTEGER NOT NULL DEFAULT 0,
  accepts INTEGER NOT NULL DEFAULT 0,
  rejects INTEGER NOT NULL DEFAULT 0,
  lines_suggested INTEGER NOT NULL DEFAULT 0,
  lines_accepted INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text)
);

CREATE TABLE IF NOT EXISTS analytics_mcp (
  date TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  server_name TEXT NOT NULL,
  usage INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, tool_name, server_name)
);

CREATE TABLE IF NOT EXISTS analytics_file_extensions (
  date TEXT NOT NULL,
  extension TEXT NOT NULL,
  total_files INTEGER NOT NULL DEFAULT 0,
  lines_accepted INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, extension)
);

CREATE TABLE IF NOT EXISTS analytics_client_versions (
  date TEXT NOT NULL,
  version TEXT NOT NULL,
  user_count INTEGER NOT NULL DEFAULT 0,
  percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, version)
);

CREATE TABLE IF NOT EXISTS analytics_commands (
  date TEXT NOT NULL,
  command_name TEXT NOT NULL,
  usage INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, command_name)
);

CREATE TABLE IF NOT EXISTS analytics_plans (
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  usage INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, model)
);

CREATE TABLE IF NOT EXISTS analytics_user_mcp (
  date TEXT NOT NULL,
  email TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  server_name TEXT NOT NULL,
  usage INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, email, tool_name, server_name)
);

CREATE INDEX IF NOT EXISTS idx_user_mcp_email ON analytics_user_mcp(email);

CREATE TABLE IF NOT EXISTS analytics_user_commands (
  date TEXT NOT NULL,
  email TEXT NOT NULL,
  command_name TEXT NOT NULL,
  usage INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (date, email, command_name)
);

CREATE INDEX IF NOT EXISTS idx_user_commands_email ON analytics_user_commands(email);

CREATE TABLE IF NOT EXISTS ai_code_commits (
  email TEXT NOT NULL,
  date TEXT NOT NULL,
  repo_name TEXT NOT NULL DEFAULT '',
  commits INTEGER NOT NULL DEFAULT 0,
  total_lines_added INTEGER NOT NULL DEFAULT 0,
  total_lines_deleted INTEGER NOT NULL DEFAULT 0,
  tab_lines_added INTEGER NOT NULL DEFAULT 0,
  tab_lines_deleted INTEGER NOT NULL DEFAULT 0,
  composer_lines_added INTEGER NOT NULL DEFAULT 0,
  composer_lines_deleted INTEGER NOT NULL DEFAULT 0,
  non_ai_lines_added INTEGER NOT NULL DEFAULT 0,
  non_ai_lines_deleted INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (NOW()::text),
  PRIMARY KEY (email, date, repo_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_code_email ON ai_code_commits(email);
CREATE INDEX IF NOT EXISTS idx_ai_code_date ON ai_code_commits(date);
CREATE INDEX IF NOT EXISTS idx_ai_code_repo ON ai_code_commits(repo_name);

CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (NOW()::text)
);

CREATE TABLE IF NOT EXISTS collection_log (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (NOW()::text),
  completed_at TEXT,
  records_count INTEGER DEFAULT 0,
  error TEXT
);
