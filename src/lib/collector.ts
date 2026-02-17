import { getCursorClient } from "./cursor-client";
import {
  upsertMembers,
  upsertDailyUsage,
  upsertSpending,
  upsertDailySpend,
  upsertBillingGroups,
  upsertAnalyticsDAU,
  upsertAnalyticsModelUsage,
  upsertAnalyticsAgentEdits,
  upsertAnalyticsTabs,
  upsertAnalyticsMCP,
  upsertAnalyticsFileExtensions,
  upsertAnalyticsClientVersions,
  logCollection,
  setMetadata,
} from "./db";

export interface CollectionResult {
  members: number;
  dailyUsage: number;
  spending: number;
  dailySpend: number;
  groups: number;
  analytics: number;
  errors: string[];
}

export async function collectAll(): Promise<CollectionResult> {
  const client = getCursorClient();
  const result: CollectionResult = {
    members: 0,
    dailyUsage: 0,
    spending: 0,
    dailySpend: 0,
    groups: 0,
    analytics: 0,
    errors: [],
  };

  console.log("[collect] Fetching team members...");
  await collectMembers(client, result);

  console.log("[collect] Fetching daily usage data...");
  await collectDailyUsage(client, result);

  console.log("[collect] Fetching spending data...");
  await collectSpending(client, result);

  console.log("[collect] Fetching billing groups + daily spend...");
  await collectGroups(client, result);

  console.log("[collect] Fetching analytics data...");
  await collectAnalytics(client, result);

  return result;
}

async function collectMembers(
  client: ReturnType<typeof getCursorClient>,
  result: CollectionResult,
): Promise<void> {
  try {
    const members = await client.getTeamMembers();
    upsertMembers(members);
    result.members = members.length;
    console.log(`[collect] Members: ${members.length}`);
    logCollection("members", members.length);
  } catch (error) {
    const msg = `Failed to collect members: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    console.error(`[collect] ${msg}`);
    logCollection("members", 0, msg);
  }
}

async function collectDailyUsage(
  client: ReturnType<typeof getCursorClient>,
  result: CollectionResult,
): Promise<void> {
  try {
    const usage = await client.getDailyUsage({ pageSize: 100 });
    upsertDailyUsage(usage);
    result.dailyUsage = usage.length;
    console.log(`[collect] Daily usage entries: ${usage.length}`);
    logCollection("daily_usage", usage.length);
  } catch (error) {
    const msg = `Failed to collect daily usage: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    console.error(`[collect] ${msg}`);
    logCollection("daily_usage", 0, msg);
  }
}

async function collectSpending(
  client: ReturnType<typeof getCursorClient>,
  result: CollectionResult,
): Promise<void> {
  try {
    const { members, cycleStart } = await client.getSpending();
    upsertSpending(members, cycleStart);
    result.spending = members.length;
    console.log(`[collect] Spending: ${members.length} members (cycle: ${cycleStart})`);
    logCollection("spending", members.length);
  } catch (error) {
    const msg = `Failed to collect spending: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    console.error(`[collect] ${msg}`);
    logCollection("spending", 0, msg);
  }
}

async function collectGroups(
  client: ReturnType<typeof getCursorClient>,
  result: CollectionResult,
): Promise<void> {
  try {
    const data = await client.getBillingGroups();
    const allGroups = [...data.groups, data.unassignedGroup];

    if (data.billingCycle) {
      const cs = data.billingCycle.cycleStart.split("T")[0] ?? "";
      const ce = data.billingCycle.cycleEnd.split("T")[0] ?? "";
      setMetadata("cycle_start", cs);
      setMetadata("cycle_end", ce);
    }

    const cycleStart =
      data.billingCycle?.cycleStart.split("T")[0] ?? new Date().toISOString().slice(0, 10);
    let totalSpendEntries = 0;

    for (const group of allGroups) {
      upsertDailySpend(group.currentMembers, cycleStart);
      totalSpendEntries += group.currentMembers.reduce((s, m) => s + m.dailySpend.length, 0);
    }

    upsertBillingGroups(
      allGroups.map((g) => ({
        id: g.id,
        name: g.name,
        memberCount: g.memberCount,
        spendCents: g.spendCents,
        members: g.currentMembers.map((m) => ({ email: m.email, joinedAt: m.joinedAt })),
      })),
    );

    result.dailySpend = totalSpendEntries;
    result.groups = allGroups.length;
    console.log(`[collect] Groups: ${allGroups.length}, Daily spend entries: ${totalSpendEntries}`);
    logCollection("groups", allGroups.length);
    logCollection("daily_spend", totalSpendEntries);
  } catch (error) {
    const msg = `Failed to collect groups: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    console.error(`[collect] ${msg}`);
    logCollection("groups", 0, msg);
  }
}

async function collectAnalytics(
  client: ReturnType<typeof getCursorClient>,
  result: CollectionResult,
): Promise<void> {
  let totalRecords = 0;
  const opts = { startDate: "30d", endDate: "today" };

  const tasks: Array<{ name: string; fn: () => Promise<number> }> = [
    {
      name: "dau",
      fn: async () => {
        const data = await client.getAnalyticsDAU(opts);
        upsertAnalyticsDAU(data.data);
        return data.data.length;
      },
    },
    {
      name: "model-usage",
      fn: async () => {
        const data = await client.getAnalyticsModelUsage(opts);
        upsertAnalyticsModelUsage(data.data);
        return data.data.length;
      },
    },
    {
      name: "agent-edits",
      fn: async () => {
        const data = await client.getAnalyticsAgentEdits(opts);
        upsertAnalyticsAgentEdits(data.data);
        return data.data.length;
      },
    },
    {
      name: "tabs",
      fn: async () => {
        const data = await client.getAnalyticsTabs(opts);
        upsertAnalyticsTabs(data.data);
        return data.data.length;
      },
    },
    {
      name: "mcp",
      fn: async () => {
        const data = await client.getAnalyticsMCP(opts);
        upsertAnalyticsMCP(data.data);
        return data.data.length;
      },
    },
    {
      name: "file-extensions",
      fn: async () => {
        const data = await client.getAnalyticsFileExtensions(opts);
        upsertAnalyticsFileExtensions(data.data);
        return data.data.length;
      },
    },
    {
      name: "client-versions",
      fn: async () => {
        const data = await client.getAnalyticsClientVersions(opts);
        upsertAnalyticsClientVersions(data.data);
        return data.data.length;
      },
    },
  ];

  for (const task of tasks) {
    try {
      const count = await task.fn();
      totalRecords += count;
      console.log(`[collect] Analytics ${task.name}: ${count} entries`);
      logCollection(`analytics_${task.name}`, count);
    } catch (error) {
      const msg = `Failed to collect analytics ${task.name}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(msg);
      console.error(`[collect] ${msg}`);
      logCollection(`analytics_${task.name}`, 0, msg);
    }
  }

  result.analytics = totalRecords;
  console.log(`[collect] Analytics total: ${totalRecords} entries`);
}
