export interface TeamMember {
  name: string;
  email: string;
  id: string;
  role: string;
  isRemoved: boolean;
}

export interface RawDailyUsageEntry {
  date: number;
  day: string;
  userId: string;
  email: string;
  isActive: boolean;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  acceptedLinesAdded: number;
  acceptedLinesDeleted: number;
  totalApplies: number;
  totalAccepts: number;
  totalRejects: number;
  totalTabsShown: number;
  totalTabsAccepted: number;
  composerRequests: number;
  chatRequests: number;
  agentRequests: number;
  cmdkUsages: number;
  subscriptionIncludedReqs: number;
  apiKeyReqs: number;
  usageBasedReqs: number;
  bugbotUsages: number;
  mostUsedModel: string;
  applyMostUsedExtension: string;
  tabMostUsedExtension: string;
  clientVersion?: string;
}

export interface DailyUsageResponse {
  period: { startDate: number; endDate: number };
  data: RawDailyUsageEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalUsers: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface DailyUsage {
  date: string;
  userId: string;
  email: string;
  isActive: boolean;
  linesAdded: number;
  linesDeleted: number;
  acceptedLinesAdded: number;
  acceptedLinesDeleted: number;
  totalApplies: number;
  totalAccepts: number;
  totalRejects: number;
  totalTabsShown: number;
  tabsAccepted: number;
  composerRequests: number;
  chatRequests: number;
  agentRequests: number;
  usageBasedReqs: number;
  mostUsedModel: string;
  tabMostUsedExtension: string;
  clientVersion: string;
}

export interface MemberSpend {
  userId: string;
  email: string;
  name: string;
  role: string;
  spendCents: number;
  includedSpendCents: number;
  fastPremiumRequests: number;
  monthlyLimitDollars: number | null;
  hardLimitOverrideDollars: number;
}

export interface SpendResponse {
  teamMemberSpend: MemberSpend[];
  subscriptionCycleStart: number;
  totalMembers: number;
  totalPages: number;
  limitedUsersCount: number;
  maxUserSpendCents: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  totalCents: number;
}

export interface RawUsageEvent {
  timestamp: string;
  model: string;
  kind: string;
  maxMode: boolean;
  requestsCosts: number;
  isTokenBasedCall: boolean;
  tokenUsage: TokenUsage | null;
  userEmail: string;
  isChargeable: boolean;
  isHeadless: boolean;
}

export interface UsageEvent {
  timestamp: Date;
  model: string;
  kind: string;
  maxMode: boolean;
  requestsCostCents: number;
  totalCents: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  userEmail: string;
  isChargeable: boolean;
  isHeadless: boolean;
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

export interface AnalyticsTabsEntry {
  event_date: string;
  total_suggestions: number;
  total_accepts: number;
  total_rejects: number;
  total_lines_suggested: number;
  total_lines_accepted: number;
  total_green_lines_accepted: number;
  total_red_lines_accepted: number;
  total_green_lines_rejected: number;
  total_red_lines_rejected: number;
  total_green_lines_suggested: number;
  total_red_lines_suggested: number;
}

export interface AnalyticsTabsResponse {
  data: AnalyticsTabsEntry[];
  params: Record<string, unknown>;
}

export interface AnalyticsMCPEntry {
  event_date: string;
  tool_name: string;
  mcp_server_name: string;
  usage: number;
}

export interface AnalyticsMCPResponse {
  data: AnalyticsMCPEntry[];
  params: Record<string, unknown>;
}

export interface AnalyticsCommandsEntry {
  event_date: string;
  command_name: string;
  usage: number;
}

export interface AnalyticsCommandsResponse {
  data: AnalyticsCommandsEntry[];
  params: Record<string, unknown>;
}

export interface AnalyticsFileExtensionsEntry {
  event_date: string;
  file_extension: string;
  total_files: number;
  total_accepts: number;
  total_rejects: number;
  total_lines_suggested: number;
  total_lines_accepted: number;
  total_lines_rejected: number;
}

export interface AnalyticsFileExtensionsResponse {
  data: AnalyticsFileExtensionsEntry[];
  params: Record<string, unknown>;
}

export interface AnalyticsClientVersionsEntry {
  event_date: string;
  client_version: string;
  user_count: number;
  percentage: number;
}

export interface AnalyticsClientVersionsResponse {
  data: AnalyticsClientVersionsEntry[];
  params: Record<string, unknown>;
}

export interface GroupMemberSpend {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  leftAt: string | null;
  spendCents: number;
  dailySpend: Array<{ date: string; spendCents: number }>;
}

export interface BillingGroup {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  spendCents: number;
  currentMembers: GroupMemberSpend[];
  dailySpend: Array<{ date: string; spendCents: number }>;
}

export interface GroupsResponse {
  groups: BillingGroup[];
  unassignedGroup: BillingGroup;
  billingCycle?: {
    cycleStart: string;
    cycleEnd: string;
  };
}

export type AnomalySeverity = "warning" | "critical";
export type AnomalyType = "threshold" | "zscore" | "trend";
export type AnomalyMetric = "spend" | "requests" | "tokens" | "usage_based";

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
    spendSpikeMultiplier: number;
    spendSpikeLookbackDays: number;
    cycleOutlierMultiplier: number;
  };
  cronIntervalMinutes: number;
}

export const DEFAULT_CONFIG: DetectionConfig = {
  thresholds: {
    maxSpendCentsPerCycle: 0,
    maxRequestsPerDay: 0,
    maxTokensPerDay: 0,
  },
  zscore: {
    multiplier: 2.5,
    windowDays: 7,
  },
  trends: {
    spendSpikeMultiplier: 5,
    spendSpikeLookbackDays: 7,
    cycleOutlierMultiplier: 10,
  },
  cronIntervalMinutes: 60,
};
