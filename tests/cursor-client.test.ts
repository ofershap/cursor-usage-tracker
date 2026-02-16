import { describe, it, expect, vi, beforeEach } from "vitest";
import { CursorClient } from "@/lib/cursor-client";

describe("CursorClient", () => {
  let client: CursorClient;

  beforeEach(() => {
    client = new CursorClient({
      adminApiKey: "test_key",
      analyticsApiKey: "test_analytics_key",
      baseUrl: "https://api.cursor.test",
    });
  });

  it("should construct with required options", () => {
    expect(client).toBeDefined();
  });

  it("should throw on missing analytics key", async () => {
    const clientNoAnalytics = new CursorClient({
      adminApiKey: "test_key",
    });

    await expect(clientNoAnalytics.getAnalyticsDAU({})).rejects.toThrow(
      "Missing analytics API key",
    );
  });

  it("should handle rate limiting with retry", async () => {
    let callCount = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response("Rate limited", {
          status: 429,
          headers: { "Retry-After": "0" },
        });
      }
      return new Response(JSON.stringify({ teamMembers: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const members = await client.getTeamMembers();
    expect(members).toEqual([]);
    expect(callCount).toBe(2);

    globalThis.fetch = originalFetch;
  });

  it("should throw on API errors", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async () => {
      return new Response("Forbidden", { status: 403 });
    });

    await expect(client.getTeamMembers()).rejects.toThrow("Cursor API 403");

    globalThis.fetch = originalFetch;
  });

  it("should paginate spending data", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = vi.fn(async () => {
      callCount++;
      const page = callCount;
      return new Response(
        JSON.stringify({
          teamMemberSpend:
            page === 1
              ? [{ email: "a@test.com", spendCents: 100, fastPremiumRequests: 5 }]
              : [{ email: "b@test.com", spendCents: 200, fastPremiumRequests: 10 }],
          subscriptionCycleStart: 1704067200000,
          totalPages: 2,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const { members } = await client.getSpending();
    expect(members).toHaveLength(2);
    expect(callCount).toBe(2);

    globalThis.fetch = originalFetch;
  });
});
