export interface TeamMember {
  name: string;
  email: string;
  role: string;
}

export interface RawDailyUsageEntry {
  date: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalAccepts: number;
  totalRejects: number;
  totalTabsAccepted: number;
  composerRequests: number;
  chatRequests: number;
  mostUsedModel: string;
  tabMostUsedExtension: string;
}

export interface DailyUsage {
  date: string;
  linesAdded: number;
  linesDeleted: number;
  acceptanceRate: number;
  tabsUsed: number;
  composerRequests: number;
  chatRequests: number;
  mostUsedModel: string;
  mostUsedExtension: string;
}

export interface MemberSpend {
  email: string;
  spendCents: number;
  fastPremiumRequests: number;
}

export interface SpendResponse {
  teamMemberSpend: MemberSpend[];
  subscriptionCycleStart: number;
  totalPages: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}

export interface RawUsageEvent {
  timestamp: string;
  model: string;
  kindLabel: string;
  tokenUsage: TokenUsage | null;
  userEmail: string;
}

export interface UsageEvent {
  timestamp: Date;
  model: string;
  kind: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  userEmail: string;
}

export interface AnalyticsDAUEntry {
  date: string;
  dau: number;
  cli_dau: number;
  cloud_agent_dau: number;
  bugbot_dau: number;
}

export interface AnalyticsDAUResponse {
  data: AnalyticsDAUEntry[];
  params: Record<string, unknown>;
}

export interface AnalyticsModelBreakdown {
  [model: string]: {
    messages: number;
    users: number;
  };
}

export interface AnalyticsModelUsageEntry {
  date: string;
  model_breakdown: AnalyticsModelBreakdown;
}

export interface AnalyticsModelUsageResponse {
  data: AnalyticsModelUsageEntry[];
  params: Record<string, unknown>;
}

export interface AnalyticsAgentEditsEntry {
  event_date: string;
  total_suggested_diffs: number;
  total_accepted_diffs: number;
  total_rejected_diffs: number;
  total_green_lines_accepted: number;
  total_red_lines_accepted: number;
  total_green_lines_rejected: number;
  total_red_lines_rejected: number;
  total_green_lines_suggested: number;
  total_red_lines_suggested: number;
  total_lines_suggested: number;
  total_lines_accepted: number;
}

export interface AnalyticsAgentEditsResponse {
  data: AnalyticsAgentEditsEntry[];
  params: Record<string, unknown>;
}

export interface LeaderboardUser {
  email: string;
  user_id: string;
  total_accepts: number;
  total_lines_accepted: number;
  total_lines_suggested: number;
  line_acceptance_ratio: number;
  accept_ratio?: number;
  favorite_model?: string;
  rank: number;
}

export interface AnalyticsLeaderboardResponse {
  data: {
    tab_leaderboard: {
      data: LeaderboardUser[];
      total_users: number;
    };
    agent_leaderboard: {
      data: LeaderboardUser[];
      total_users: number;
    };
  };
  pagination: {
    page: number;
    pageSize: number;
    totalUsers: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  params: Record<string, unknown>;
}

export interface AnalyticsByUserResponse {
  data: Record<string, unknown[]>;
  pagination: {
    page: number;
    pageSize: number;
    totalUsers: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  params: Record<string, unknown>;
}

export type AnomalySeverity = "warning" | "critical";
export type AnomalyType = "threshold" | "zscore" | "trend";
export type AnomalyMetric = "spend" | "requests" | "tokens" | "model_shift";

export interface Anomaly {
  id?: number;
  userEmail: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  metric: AnomalyMetric;
  value: number;
  threshold: number;
  message: string;
  detectedAt: string;
  resolvedAt: string | null;
  alertedAt: string | null;
  diagnosisModel: string | null;
  diagnosisKind: string | null;
  diagnosisDelta: number | null;
}

export type IncidentStatus = "open" | "alerted" | "acknowledged" | "resolved";

export interface Incident {
  id?: number;
  anomalyId: number;
  userEmail: string;
  status: IncidentStatus;
  detectedAt: string;
  alertedAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  mttdMinutes: number | null;
  mttiMinutes: number | null;
  mttrMinutes: number | null;
}

export interface DetectionConfig {
  thresholds: {
    maxSpendCentsPerCycle: number;
    maxRequestsPerDay: number;
    maxTokensPerDay: number;
  };
  zscore: {
    multiplier: number;
    windowDays: number;
  };
  trends: {
    spikeMultiplier: number;
    spikeLookbackDays: number;
    driftDaysAboveP75: number;
  };
  cronIntervalMinutes: number;
}

export const DEFAULT_CONFIG: DetectionConfig = {
  thresholds: {
    maxSpendCentsPerCycle: 5000,
    maxRequestsPerDay: 500,
    maxTokensPerDay: 5_000_000,
  },
  zscore: {
    multiplier: 2,
    windowDays: 14,
  },
  trends: {
    spikeMultiplier: 3,
    spikeLookbackDays: 7,
    driftDaysAboveP75: 3,
  },
  cronIntervalMinutes: 60,
};
