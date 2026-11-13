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
  max_mode_pct: number;
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
    emails: string[];
  }>;
  teamDailySpend: Array<{ date: string; spend_cents: number }>;
  dailySpendBreakdown: Array<{ date: string; email: string; name: string; spend_cents: number }>;
  planExhaustion: Array<{ email: string; days_to_exhaust: number }>;
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

export interface CycleSummaryData {
  cycleStart: string;
  cycleEnd: string;
  daysRemaining: number;
  totalSpendDollars: number;
  previousCycleSpendDollars: number | null;
  totalMembers: number;
  activeMembers: number;
  unusedSeats: number;
  planExhausted: { exhausted: number; totalActive: number };
  topSpenders: Array<{ name: string; spendDollars: number }>;
  adoptionTiers: { aiNative: number; high: number; moderate: number; low: number; manual: number };
}
