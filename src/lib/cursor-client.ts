import type {
  TeamMember,
  DailyUsage,
  DailyUsageResponse,
  MemberSpend,
  SpendResponse,
  GroupsResponse,
  FilteredUsageEventsResponse,
  AnalyticsDAUResponse,
  AnalyticsModelUsageResponse,
  AnalyticsAgentEditsResponse,
  AnalyticsTabsResponse,
  AnalyticsMCPResponse,
  AnalyticsFileExtensionsResponse,
  AnalyticsClientVersionsResponse,
  AnalyticsCommandsResponse,
  AnalyticsPlansResponse,
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

  async getDailyUsage(
    options: { pageSize?: number; startDate?: number; endDate?: number } = {},
  ): Promise<DailyUsage[]> {
    const allEntries: DailyUsage[] = [];
    let page = 1;
    const pageSize = options.pageSize ?? 100;

    while (true) {
      const body: Record<string, unknown> = { page, pageSize };
      if (options.startDate) body.startDate = options.startDate;
      if (options.endDate) body.endDate = options.endDate;

      const data = await this.request<DailyUsageResponse>("/teams/daily-usage-data", {
        method: "POST",
        body,
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
    limitedUsersCount: number;
  }> {
    const allMembers: MemberSpend[] = [];
    let cycleStart: string | undefined;
    let limitedUsersCount: number;
    let page = 1;

    while (true) {
      const data = await this.request<SpendResponse>("/teams/spend", {
        method: "POST",
        body: { page, pageSize: 100 },
      });

      cycleStart = new Date(data.subscriptionCycleStart).toISOString().split("T")[0] ?? "";
      limitedUsersCount = data.limitedUsersCount ?? 0;

      allMembers.push(...data.teamMemberSpend);

      if (page >= data.totalPages) break;
      page++;
    }

    return { members: allMembers, cycleStart: cycleStart ?? "", limitedUsersCount };
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

  async getFilteredUsageEvents(options: {
    email?: string;
    startDate?: number;
    endDate?: number;
    page?: number;
    pageSize?: number;
  }): Promise<FilteredUsageEventsResponse> {
    return this.request<FilteredUsageEventsResponse>("/teams/filtered-usage-events", {
      method: "POST",
      body: {
        email: options.email,
        startDate: options.startDate,
        endDate: options.endDate,
        page: options.page ?? 1,
        pageSize: options.pageSize ?? 500,
      },
    });
  }

  async getAnalyticsCommands(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsCommandsResponse> {
    return this.request<AnalyticsCommandsResponse>(
      `/analytics/team/commands?${this.analyticsParams(options)}`,
    );
  }

  async getAnalyticsPlans(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsPlansResponse> {
    return this.request<AnalyticsPlansResponse>(
      `/analytics/team/plans?${this.analyticsParams(options)}`,
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
