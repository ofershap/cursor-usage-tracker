import type {
  TeamMember,
  DailyUsage,
  DailyUsageResponse,
  MemberSpend,
  SpendResponse,
  RawUsageEvent,
  UsageEvent,
  GroupsResponse,
  AnalyticsDAUResponse,
  AnalyticsModelUsageResponse,
  AnalyticsAgentEditsResponse,
  AnalyticsLeaderboardResponse,
  AnalyticsByUserResponse,
  AnalyticsTabsResponse,
  AnalyticsMCPResponse,
  AnalyticsCommandsResponse,
  AnalyticsFileExtensionsResponse,
  AnalyticsClientVersionsResponse,
} from "./types";

interface CursorClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class CursorClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: CursorClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.cursor.com";
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const { method = "GET", body } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const credentials = Buffer.from(`${this.apiKey}:`).toString("base64");
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

  async getDailyUsage(options: { pageSize?: number } = {}): Promise<DailyUsage[]> {
    const allEntries: DailyUsage[] = [];
    let page = 1;
    const pageSize = options.pageSize ?? 100;

    while (true) {
      const data = await this.request<DailyUsageResponse>("/teams/daily-usage-data", {
        method: "POST",
        body: { page, pageSize },
      });

      for (const entry of data.data) {
        allEntries.push({
          date: entry.day,
          userId: entry.userId,
          email: entry.email,
          isActive: entry.isActive,
          linesAdded: entry.totalLinesAdded,
          linesDeleted: entry.totalLinesDeleted,
          acceptedLinesAdded: entry.acceptedLinesAdded,
          acceptedLinesDeleted: entry.acceptedLinesDeleted,
          totalApplies: entry.totalApplies,
          totalAccepts: entry.totalAccepts,
          totalRejects: entry.totalRejects,
          totalTabsShown: entry.totalTabsShown,
          tabsAccepted: entry.totalTabsAccepted,
          composerRequests: entry.composerRequests,
          chatRequests: entry.chatRequests,
          agentRequests: entry.agentRequests,
          usageBasedReqs: entry.usageBasedReqs,
          mostUsedModel: entry.mostUsedModel,
          tabMostUsedExtension: entry.tabMostUsedExtension,
          clientVersion: entry.clientVersion ?? "",
        });
      }

      console.log(
        `[daily-usage] Page ${page}/${data.pagination.totalPages} (${allEntries.length} entries)`,
      );

      if (!data.pagination.hasNextPage) break;
      page++;
    }

    return allEntries;
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
          kind: raw.kind,
          maxMode: raw.maxMode,
          requestsCostCents: raw.requestsCosts,
          totalCents: raw.tokenUsage?.totalCents ?? 0,
          totalTokens: input + output + cacheRead + cacheWrite,
          inputTokens: input,
          outputTokens: output,
          cacheReadTokens: cacheRead,
          cacheWriteTokens: cacheWrite,
          userEmail: raw.userEmail,
          isChargeable: raw.isChargeable,
          isHeadless: raw.isHeadless,
        });
      }

      if (!data.pagination.hasNextPage) break;
      page++;
    }

    return allEvents;
  }

  async getBillingGroups(): Promise<GroupsResponse> {
    return this.request<GroupsResponse>("/teams/groups");
  }

  async getAnalyticsDAU(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsDAUResponse> {
    return this.request<AnalyticsDAUResponse>(
      `/analytics/team/dau?${this.analyticsParams(options)}`,
    );
  }

  async getAnalyticsModelUsage(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsModelUsageResponse> {
    return this.request<AnalyticsModelUsageResponse>(
      `/analytics/team/models?${this.analyticsParams(options)}`,
    );
  }

  async getAnalyticsAgentEdits(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsAgentEditsResponse> {
    return this.request<AnalyticsAgentEditsResponse>(
      `/analytics/team/agent-edits?${this.analyticsParams(options)}`,
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
    return this.request<AnalyticsByUserResponse>(`/analytics/by-user/models?${params.toString()}`);
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
    );
  }

  async getAnalyticsTabs(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsTabsResponse> {
    const params = this.analyticsParams(options);
    return this.request<AnalyticsTabsResponse>(`/analytics/team/tabs?${params}`);
  }

  async getAnalyticsMCP(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsMCPResponse> {
    const params = this.analyticsParams(options);
    return this.request<AnalyticsMCPResponse>(`/analytics/team/mcp?${params}`);
  }

  async getAnalyticsCommands(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsCommandsResponse> {
    const params = this.analyticsParams(options);
    return this.request<AnalyticsCommandsResponse>(`/analytics/team/commands?${params}`);
  }

  async getAnalyticsFileExtensions(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsFileExtensionsResponse> {
    const params = this.analyticsParams(options);
    return this.request<AnalyticsFileExtensionsResponse>(
      `/analytics/team/top-file-extensions?${params}`,
    );
  }

  async getAnalyticsClientVersions(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsClientVersionsResponse> {
    const params = this.analyticsParams(options);
    return this.request<AnalyticsClientVersionsResponse>(
      `/analytics/team/client-versions?${params}`,
    );
  }

  private analyticsParams(options: {
    startDate?: string;
    endDate?: string;
    users?: string[];
  }): string {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.users?.length) params.set("users", options.users.join(","));
    return params.toString();
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
    const apiKey = process.env.CURSOR_ADMIN_API_KEY;
    if (!apiKey) {
      throw new Error("CURSOR_ADMIN_API_KEY environment variable is required");
    }
    clientInstance = new CursorClient({ apiKey });
  }
  return clientInstance;
}
