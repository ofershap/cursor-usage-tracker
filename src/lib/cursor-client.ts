import type {
  TeamMember,
  RawDailyUsageEntry,
  DailyUsage,
  MemberSpend,
  SpendResponse,
  RawUsageEvent,
  UsageEvent,
  AnalyticsDAUResponse,
  AnalyticsModelUsageResponse,
  AnalyticsAgentEditsResponse,
  AnalyticsLeaderboardResponse,
  AnalyticsByUserResponse,
} from "./types";

interface CursorClientOptions {
  adminApiKey: string;
  analyticsApiKey?: string;
  baseUrl?: string;
}

export class CursorClient {
  private adminApiKey: string;
  private analyticsApiKey: string | undefined;
  private baseUrl: string;

  constructor(options: CursorClientOptions) {
    this.adminApiKey = options.adminApiKey;
    this.analyticsApiKey = options.analyticsApiKey;
    this.baseUrl = options.baseUrl ?? "https://api.cursor.com";
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      useAnalyticsKey?: boolean;
    } = {},
  ): Promise<T> {
    const { method = "GET", body, useAnalyticsKey = false } = options;
    const apiKey = useAnalyticsKey ? this.analyticsApiKey : this.adminApiKey;

    if (!apiKey) {
      throw new Error(`Missing ${useAnalyticsKey ? "analytics" : "admin"} API key`);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const credentials = Buffer.from(`${apiKey}:`).toString("base64");
    const headers: Record<string, string> = {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cursor API ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    const data = await this.request<{ teamMembers: TeamMember[] }>("/teams/members");
    return data.teamMembers;
  }

  async getDailyUsage(startDate: Date, endDate: Date): Promise<DailyUsage[]> {
    const data = await this.request<{ data: RawDailyUsageEntry[] }>("/teams/daily-usage-data", {
      method: "POST",
      body: {
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
      },
    });

    const byDate = new Map<
      string,
      {
        linesAdded: number;
        linesDeleted: number;
        accepts: number;
        rejects: number;
        tabs: number;
        composer: number;
        chat: number;
        models: Map<string, number>;
        extensions: Map<string, number>;
      }
    >();

    for (const entry of data.data) {
      const dateStr = new Date(entry.date).toISOString().split("T")[0] ?? "";
      const existing = byDate.get(dateStr) ?? {
        linesAdded: 0,
        linesDeleted: 0,
        accepts: 0,
        rejects: 0,
        tabs: 0,
        composer: 0,
        chat: 0,
        models: new Map<string, number>(),
        extensions: new Map<string, number>(),
      };

      existing.linesAdded += entry.totalLinesAdded;
      existing.linesDeleted += entry.totalLinesDeleted;
      existing.accepts += entry.totalAccepts;
      existing.rejects += entry.totalRejects;
      existing.tabs += entry.totalTabsAccepted;
      existing.composer += entry.composerRequests;
      existing.chat += entry.chatRequests;

      if (entry.mostUsedModel) {
        existing.models.set(
          entry.mostUsedModel,
          (existing.models.get(entry.mostUsedModel) ?? 0) + 1,
        );
      }
      if (entry.tabMostUsedExtension) {
        existing.extensions.set(
          entry.tabMostUsedExtension,
          (existing.extensions.get(entry.tabMostUsedExtension) ?? 0) + 1,
        );
      }

      byDate.set(dateStr, existing);
    }

    const topEntry = (map: Map<string, number>): string => {
      let best = "";
      let max = 0;
      for (const [key, count] of map) {
        if (count > max) {
          max = count;
          best = key;
        }
      }
      return best;
    };

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        const total = d.accepts + d.rejects;
        return {
          date,
          linesAdded: d.linesAdded,
          linesDeleted: d.linesDeleted,
          acceptanceRate: total > 0 ? d.accepts / total : 0,
          tabsUsed: d.tabs,
          composerRequests: d.composer,
          chatRequests: d.chat,
          mostUsedModel: topEntry(d.models),
          mostUsedExtension: topEntry(d.extensions),
        };
      });
  }

  async getSpending(): Promise<{
    members: MemberSpend[];
    cycleStart: string;
  }> {
    const allMembers: MemberSpend[] = [];
    let cycleStart = "";
    let page = 1;

    while (true) {
      const data = await this.request<SpendResponse>("/teams/spend", {
        method: "POST",
        body: { page, pageSize: 100 },
      });

      cycleStart = new Date(data.subscriptionCycleStart).toISOString().split("T")[0] ?? "";

      allMembers.push(...data.teamMemberSpend);

      if (page >= data.totalPages) break;
      page++;
    }

    return { members: allMembers, cycleStart };
  }

  async getUsageEvents(
    options: {
      email?: string;
      startDate?: Date;
      endDate?: Date;
      pageSize?: number;
    } = {},
  ): Promise<UsageEvent[]> {
    const allEvents: UsageEvent[] = [];
    let page = 1;
    const pageSize = options.pageSize ?? 100;

    while (true) {
      const body: Record<string, unknown> = { page, pageSize };
      if (options.email) body.email = options.email;
      if (options.startDate) body.startDate = options.startDate.getTime();
      if (options.endDate) body.endDate = options.endDate.getTime();

      const data = await this.request<{
        usageEvents: RawUsageEvent[];
        pagination: { hasNextPage: boolean };
      }>("/teams/filtered-usage-events", {
        method: "POST",
        body,
      });

      for (const raw of data.usageEvents) {
        const ts = new Date(parseInt(raw.timestamp, 10));
        const input = raw.tokenUsage?.inputTokens ?? 0;
        const output = raw.tokenUsage?.outputTokens ?? 0;
        const cacheRead = raw.tokenUsage?.cacheReadTokens ?? 0;
        const cacheWrite = raw.tokenUsage?.cacheWriteTokens ?? 0;

        allEvents.push({
          timestamp: ts,
          model: raw.model,
          kind: raw.kindLabel,
          totalTokens: input + output + cacheRead + cacheWrite,
          inputTokens: input,
          outputTokens: output,
          cacheReadTokens: cacheRead,
          cacheWriteTokens: cacheWrite,
          userEmail: raw.userEmail,
        });
      }

      if (!data.pagination.hasNextPage) break;
      page++;
    }

    return allEvents;
  }

  async getAnalyticsDAU(
    options: {
      startDate?: string;
      endDate?: string;
      users?: string[];
    } = {},
  ): Promise<AnalyticsDAUResponse> {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.users?.length) params.set("users", options.users.join(","));
    return this.request<AnalyticsDAUResponse>(`/analytics/team/dau?${params.toString()}`, {
      useAnalyticsKey: true,
    });
  }

  async getAnalyticsModelUsage(
    options: {
      startDate?: string;
      endDate?: string;
      users?: string[];
    } = {},
  ): Promise<AnalyticsModelUsageResponse> {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.users?.length) params.set("users", options.users.join(","));
    return this.request<AnalyticsModelUsageResponse>(
      `/analytics/team/models?${params.toString()}`,
      { useAnalyticsKey: true },
    );
  }

  async getAnalyticsAgentEdits(
    options: {
      startDate?: string;
      endDate?: string;
      users?: string[];
    } = {},
  ): Promise<AnalyticsAgentEditsResponse> {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.users?.length) params.set("users", options.users.join(","));
    return this.request<AnalyticsAgentEditsResponse>(
      `/analytics/team/agent-edits?${params.toString()}`,
      { useAnalyticsKey: true },
    );
  }

  async getAnalyticsLeaderboard(
    options: {
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
      users?: string[];
    } = {},
  ): Promise<AnalyticsLeaderboardResponse> {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("pageSize", String(options.pageSize));
    if (options.users?.length) params.set("users", options.users.join(","));
    return this.request<AnalyticsLeaderboardResponse>(
      `/analytics/team/leaderboard?${params.toString()}`,
      { useAnalyticsKey: true },
    );
  }

  async getAnalyticsByUserModels(
    options: {
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
      users?: string[];
    } = {},
  ): Promise<AnalyticsByUserResponse> {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("pageSize", String(options.pageSize));
    if (options.users?.length) params.set("users", options.users.join(","));
    return this.request<AnalyticsByUserResponse>(`/analytics/by-user/models?${params.toString()}`, {
      useAnalyticsKey: true,
    });
  }

  async getAnalyticsByUserAgentEdits(
    options: {
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
      users?: string[];
    } = {},
  ): Promise<AnalyticsByUserResponse> {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("pageSize", String(options.pageSize));
    if (options.users?.length) params.set("users", options.users.join(","));
    return this.request<AnalyticsByUserResponse>(
      `/analytics/by-user/agent-edits?${params.toString()}`,
      { useAnalyticsKey: true },
    );
  }

  async setUserSpendLimit(email: string, limitDollars: number): Promise<void> {
    await this.request("/teams/user-spend-limit", {
      method: "POST",
      body: { email, hardLimitDollars: limitDollars },
    });
  }
}

let clientInstance: CursorClient | null = null;

export function getCursorClient(): CursorClient {
  if (!clientInstance) {
    const adminKey = process.env.CURSOR_ADMIN_API_KEY;
    if (!adminKey) {
      throw new Error("CURSOR_ADMIN_API_KEY environment variable is required");
    }
    clientInstance = new CursorClient({
      adminApiKey: adminKey,
      analyticsApiKey: process.env.CURSOR_ANALYTICS_API_KEY,
    });
  }
  return clientInstance;
}
