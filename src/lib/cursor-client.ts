import type {
  TeamMember,
  DailyUsage,
  DailyUsageResponse,
  MemberSpend,
  SpendResponse,
  GroupsResponse,
  FilteredUsageEvent,
  FilteredUsageEventsResponse,
  AICodeCommitsResponse,
  AnalyticsDAUResponse,
  AnalyticsModelUsageResponse,
  AnalyticsAgentEditsResponse,
  AnalyticsTabsResponse,
  AnalyticsMCPResponse,
  AnalyticsFileExtensionsResponse,
  AnalyticsClientVersionsResponse,
  AnalyticsCommandsResponse,
  AnalyticsPlansResponse,
  ByUserMCPResponse,
  ByUserCommandsResponse,
} from "./types";

interface CursorClientOptions {
  apiKey: string;
  baseUrl?: string;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

function str(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v !== "") return v;
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  }
  return "";
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

// Normalizes a /teams/spend member entry across two known API shapes.
//
// Old shape (pre-2026): { spendCents: <cycle total>, includedSpendCents: <plan-covered> }
// New shape (post-2026 — see GH issue #19):
//   { spendCents: <overage above plan>, overallSpendCents: <cycle total>, ... }
//
// Internal contract preserved for downstream code: `spendCents` = total cycle
// spend, `includedSpendCents` = plan-covered portion (derived if not provided).
function normalizeMemberSpend(raw: Record<string, unknown>): MemberSpend {
  const rawSpend = num(raw.spendCents);
  const overall = typeof raw.overallSpendCents === "number" ? raw.overallSpendCents : undefined;
  const rawIncluded =
    typeof raw.includedSpendCents === "number" ? raw.includedSpendCents : undefined;

  // If overall is present we're on the new shape: rawSpend is overage. Otherwise
  // we fall back to the old shape where rawSpend is the total.
  const total = overall ?? rawSpend;
  const overage = overall !== undefined ? rawSpend : 0;
  const included = rawIncluded ?? Math.max(0, total - overage);

  return {
    userId: typeof raw.userId === "string" ? raw.userId : "",
    email: typeof raw.email === "string" ? raw.email : "",
    name: typeof raw.name === "string" ? raw.name : "",
    role: typeof raw.role === "string" ? raw.role : "",
    spendCents: total,
    includedSpendCents: included,
    fastPremiumRequests: num(raw.fastPremiumRequests),
    monthlyLimitDollars:
      typeof raw.monthlyLimitDollars === "number" ? raw.monthlyLimitDollars : null,
    hardLimitOverrideDollars: num(raw.hardLimitOverrideDollars),
    overallSpendCents: overall,
    profilePictureUrl:
      typeof raw.profilePictureUrl === "string" || raw.profilePictureUrl === null
        ? (raw.profilePictureUrl as string | null)
        : null,
    effectivePerUserLimitDollars:
      typeof raw.effectivePerUserLimitDollars === "number"
        ? raw.effectivePerUserLimitDollars
        : undefined,
  };
}

function normalizeFilteredUsageEvent(raw: Record<string, unknown>): FilteredUsageEvent {
  const tuRaw = raw.tokenUsage ?? raw.token_usage;
  let tokenUsage: FilteredUsageEvent["tokenUsage"];
  if (tuRaw && typeof tuRaw === "object") {
    const t = tuRaw as Record<string, unknown>;
    tokenUsage = {
      inputTokens: num(t.inputTokens ?? t.input_tokens),
      outputTokens: num(t.outputTokens ?? t.output_tokens),
      cacheWriteTokens: num(t.cacheWriteTokens ?? t.cache_write_tokens),
      cacheReadTokens: num(t.cacheReadTokens ?? t.cache_read_tokens),
      totalCents: num(t.totalCents ?? t.total_cents),
    };
  }
  return {
    timestamp: str(raw, "timestamp"),
    model: str(raw, "model"),
    kind: str(raw, "kind", "kindLabel", "kind_label"),
    maxMode: bool(raw.maxMode ?? raw.max_mode),
    requestsCosts: num(raw.requestsCosts ?? raw.requests_costs),
    isTokenBasedCall: bool(raw.isTokenBasedCall ?? raw.is_token_based_call),
    tokenUsage,
    userEmail: str(raw, "userEmail", "user_email", "email"),
    isChargeable: Boolean(raw.isChargeable ?? raw.is_chargeable),
    isHeadless: bool(raw.isHeadless ?? raw.is_headless),
  };
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

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      // Node's fetch throws a generic "fetch failed" error and hides the real
      // network/TLS reason in `error.cause`. Surface it so corporate-proxy
      // self-signed-cert errors etc. are diagnosable in the collector logs.
      const cause = err instanceof Error ? (err.cause as Error | undefined) : undefined;
      const causeMsg = cause?.message ?? "";
      const code = (cause as { code?: string } | undefined)?.code;
      const detail = [code, causeMsg].filter(Boolean).join(": ");
      const baseMsg = err instanceof Error ? err.message : String(err);
      throw new Error(
        detail ? `${baseMsg} (${method} ${url}) — ${detail}` : `${baseMsg} (${method} ${url})`,
        { cause: err },
      );
    }

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

      for (const raw of data.teamMemberSpend ?? []) {
        allMembers.push(
          normalizeMemberSpend(
            raw && typeof raw === "object" && !Array.isArray(raw)
              ? (raw as unknown as Record<string, unknown>)
              : {},
          ),
        );
      }

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
    const data = await this.request<FilteredUsageEventsResponse>("/teams/filtered-usage-events", {
      method: "POST",
      body: {
        email: options.email,
        startDate: options.startDate,
        endDate: options.endDate,
        page: options.page ?? 1,
        pageSize: options.pageSize ?? 500,
      },
    });
    const usageEvents = (data.usageEvents ?? []).map((row) =>
      normalizeFilteredUsageEvent(
        row && typeof row === "object" && !Array.isArray(row)
          ? (row as unknown as Record<string, unknown>)
          : {},
      ),
    );
    return { ...data, usageEvents };
  }

  async getAICodeCommits(
    options: { startDate?: string; endDate?: string; page?: number; pageSize?: number } = {},
  ): Promise<AICodeCommitsResponse> {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    params.set("page", String(options.page ?? 1));
    params.set("pageSize", String(options.pageSize ?? 500));
    return this.request<AICodeCommitsResponse>(`/analytics/ai-code/commits?${params.toString()}`);
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

  async getAnalyticsMCPByUser(
    options: { startDate?: string; endDate?: string; page?: number; pageSize?: number } = {},
  ): Promise<ByUserMCPResponse> {
    const params = this.byUserParams(options);
    return this.request<ByUserMCPResponse>(`/analytics/by-user/mcp?${params}`);
  }

  async getAnalyticsCommandsByUser(
    options: { startDate?: string; endDate?: string; page?: number; pageSize?: number } = {},
  ): Promise<ByUserCommandsResponse> {
    const params = this.byUserParams(options);
    return this.request<ByUserCommandsResponse>(`/analytics/by-user/commands?${params}`);
  }

  private byUserParams(options: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): string {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    params.set("page", String(options.page ?? 1));
    params.set("pageSize", String(options.pageSize ?? 500));
    return params.toString();
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
