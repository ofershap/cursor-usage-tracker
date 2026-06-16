import * as sqlite from "./sqlite";
import * as postgres from "./postgres";

const source = process.env.DATABASE_SOURCE ?? "sqlite";
if (source !== "sqlite" && source !== "postgres") {
  throw new Error(
    `Unsupported DATABASE_SOURCE: "${source}". Supported values: sqlite, postgres.`,
  );
}

const backend = (source === "postgres" ? postgres : sqlite) as typeof sqlite;

export const getDb = backend.getDb;
export const setMetadata = backend.setMetadata;
export const getMetadata = backend.getMetadata;
export const upsertMembers = backend.upsertMembers;
export const upsertDailyUsage = backend.upsertDailyUsage;
export const upsertSpending = backend.upsertSpending;
export const upsertDailySpend = backend.upsertDailySpend;
export const upsertBillingGroups = backend.upsertBillingGroups;
export const getUserDailySpend = backend.getUserDailySpend;
export const getUserActivityProfile = backend.getUserActivityProfile;
export const getBillingGroups = backend.getBillingGroups;
export const getGroupMembers = backend.getGroupMembers;
export const getGroupsWithMembers = backend.getGroupsWithMembers;
export const insertAnomaly = backend.insertAnomaly;
export const resolveAnomaly = backend.resolveAnomaly;
export const markAnomalyAlerted = backend.markAnomalyAlerted;
export const getOpenAnomalies = backend.getOpenAnomalies;
export const getRecentAnomalies = backend.getRecentAnomalies;
export const insertIncident = backend.insertIncident;
export const updateIncidentStatus = backend.updateIncidentStatus;
export const getOpenIncidents = backend.getOpenIncidents;
export const getConfig = backend.getConfig;
export const saveConfig = backend.saveConfig;
export const logCollection = backend.logCollection;
export const getFullDashboard = backend.getFullDashboard;
export const getUserBadges = backend.getUserBadges;
export const getDashboardStats = backend.getDashboardStats;
export const getUserStats = backend.getUserStats;
export const getAnomalyTimeline = backend.getAnomalyTimeline;
export const getModelCostBreakdown = backend.getModelCostBreakdown;
export const getTeamDailySpend = backend.getTeamDailySpend;
export const getDailySpendBreakdown = backend.getDailySpendBreakdown;
export const upsertAnalyticsDAU = backend.upsertAnalyticsDAU;
export const upsertAnalyticsModelUsage = backend.upsertAnalyticsModelUsage;
export const upsertAnalyticsAgentEdits = backend.upsertAnalyticsAgentEdits;
export const upsertAnalyticsTabs = backend.upsertAnalyticsTabs;
export const upsertAnalyticsMCP = backend.upsertAnalyticsMCP;
export const upsertAnalyticsFileExtensions = backend.upsertAnalyticsFileExtensions;
export const upsertAnalyticsClientVersions = backend.upsertAnalyticsClientVersions;
export const getAnalyticsDAU = backend.getAnalyticsDAU;
export const getAnalyticsModelUsageTrend = backend.getAnalyticsModelUsageTrend;
export const getAnalyticsModelUsageSummary = backend.getAnalyticsModelUsageSummary;
export const getAnalyticsAgentEditsTrend = backend.getAnalyticsAgentEditsTrend;
export const getAnalyticsTabsTrend = backend.getAnalyticsTabsTrend;
export const getAnalyticsMCPSummary = backend.getAnalyticsMCPSummary;
export const getAnalyticsFileExtensionsSummary = backend.getAnalyticsFileExtensionsSummary;
export const getAnalyticsClientVersionsSummary = backend.getAnalyticsClientVersionsSummary;
export const getUsersByClientVersion = backend.getUsersByClientVersion;
export const getModelEfficiency = backend.getModelEfficiency;
export const getAllMembers = backend.getAllMembers;
export const upsertUsageEvents = backend.upsertUsageEvents;
export const getUserUsageEventsSummary = backend.getUserUsageEventsSummary;
export const getUserContextMetrics = backend.getUserContextMetrics;
export const getUsageEventsLastTimestamp = backend.getUsageEventsLastTimestamp;
export const upsertAnalyticsCommands = backend.upsertAnalyticsCommands;
export const getAnalyticsCommandsSummary = backend.getAnalyticsCommandsSummary;
export const upsertAnalyticsPlans = backend.upsertAnalyticsPlans;
export const upsertAnalyticsUserMCP = backend.upsertAnalyticsUserMCP;
export const upsertAnalyticsUserCommands = backend.upsertAnalyticsUserCommands;
export const upsertAICodeCommits = backend.upsertAICodeCommits;
export const getRepoAIAttribution = backend.getRepoAIAttribution;
export const getUserRepoBreakdown = backend.getUserRepoBreakdown;
export const getUserAIAdoption = backend.getUserAIAdoption;
export const getUserMCPSummary = backend.getUserMCPSummary;
export const getUserCommandsSummary = backend.getUserCommandsSummary;
export const getAnalyticsPlansSummary = backend.getAnalyticsPlansSummary;
export const getPlanExhaustionStats = backend.getPlanExhaustionStats;
export const getLatestCycleSpenders = backend.getLatestCycleSpenders;
export const getActiveDailyUsage = backend.getActiveDailyUsage;
export const getLatestCycleStart = backend.getLatestCycleStart;
export const getPlanExhaustedUsers = backend.getPlanExhaustedUsers;
export const getTeamTotalSpendForCycle = backend.getTeamTotalSpendForCycle;
export const getDailySpendWithNames = backend.getDailySpendWithNames;
export const getLatestDailySpendDate = backend.getLatestDailySpendDate;
export const getUserDailySpendHistory = backend.getUserDailySpendHistory;
export const getUserCostPerRequest = backend.getUserCostPerRequest;
export const getCycleSpendWithModels = backend.getCycleSpendWithModels;
export const getUserCostDrivers = backend.getUserCostDrivers;
export const getActiveMembers = backend.getActiveMembers;
export const renameBillingGroup = backend.renameBillingGroup;
export const createBillingGroup = backend.createBillingGroup;
export const assignMemberToGroup = backend.assignMemberToGroup;
export const createBillingGroupWithId = backend.createBillingGroupWithId;
export const reassignMemberToGroup = backend.reassignMemberToGroup;
export const refreshGroupMemberCounts = backend.refreshGroupMemberCounts;
export const getCycleSummaryData = backend.getCycleSummaryData;

export type {
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

export type { CostDriverSummary } from "./postgres";
