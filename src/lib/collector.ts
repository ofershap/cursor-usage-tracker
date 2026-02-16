import { getCursorClient } from "./cursor-client";
import {
  upsertMembers,
  upsertDailyUsage,
  upsertSpending,
  insertUsageEvents,
  logCollection,
} from "./db";

export interface CollectionResult {
  members: number;
  dailyUsage: number;
  spending: number;
  usageEvents: number;
  errors: string[];
}

export async function collectAll(): Promise<CollectionResult> {
  const client = getCursorClient();
  const result: CollectionResult = {
    members: 0,
    dailyUsage: 0,
    spending: 0,
    usageEvents: 0,
    errors: [],
  };

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  await collectMembers(client, result);
  await collectDailyUsage(client, result, thirtyDaysAgo, now);
  await collectSpending(client, result);
  await collectUsageEvents(client, result, thirtyDaysAgo, now);

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
    logCollection("members", members.length);
  } catch (error) {
    const msg = `Failed to collect members: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    logCollection("members", 0, msg);
  }
}

async function collectDailyUsage(
  client: ReturnType<typeof getCursorClient>,
  result: CollectionResult,
  start: Date,
  end: Date,
): Promise<void> {
  try {
    const usage = await client.getDailyUsage(start, end);
    upsertDailyUsage(usage);
    result.dailyUsage = usage.length;
    logCollection("daily_usage", usage.length);
  } catch (error) {
    const msg = `Failed to collect daily usage: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
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
    logCollection("spending", members.length);
  } catch (error) {
    const msg = `Failed to collect spending: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    logCollection("spending", 0, msg);
  }
}

async function collectUsageEvents(
  client: ReturnType<typeof getCursorClient>,
  result: CollectionResult,
  start: Date,
  end: Date,
): Promise<void> {
  try {
    const events = await client.getUsageEvents({
      startDate: start,
      endDate: end,
    });
    const inserted = insertUsageEvents(events);
    result.usageEvents = inserted;
    logCollection("usage_events", inserted);
  } catch (error) {
    const msg = `Failed to collect usage events: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    logCollection("usage_events", 0, msg);
  }
}
