import { describe, it, expect, vi, beforeEach } from "vitest";
import { CursorClient } from "@/lib/cursor-client";

describe("CursorClient", () => {
  let client: CursorClient;

  beforeEach(() => {
    client = new CursorClient({
      apiKey: "test_key",
      baseUrl: "https://api.cursor.test",
    });
  });

  it("should construct with required options", () => {
    expect(client).toBeDefined();
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

  it("normalizes new /teams/spend shape (overallSpendCents + spendCents=overage)", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          teamMemberSpend: [
            {
              userId: "user_1",
              email: "a@test.com",
              name: "Alice",
              role: "member",
              profilePictureUrl: null,
              spendCents: 150,
              overallSpendCents: 1000,
              fastPremiumRequests: 5,
              monthlyLimitDollars: 30,
              hardLimitOverrideDollars: 200,
              effectivePerUserLimitDollars: 30,
            },
            {
              userId: "user_2",
              email: "b@test.com",
              name: "Bob",
              role: "member",
              spendCents: 0,
              overallSpendCents: 500,
              fastPremiumRequests: 0,
              monthlyLimitDollars: null,
              hardLimitOverrideDollars: 0,
            },
          ],
          subscriptionCycleStart: 1704067200000,
          totalPages: 1,
          limitedUsersCount: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const { members } = await client.getSpending();
    expect(members).toHaveLength(2);

    const [m0, m1] = members;
    if (!m0 || !m1) throw new Error("expected two normalized members");

    expect(m0.spendCents).toBe(1000);
    expect(m0.includedSpendCents).toBe(850);

    expect(m1.spendCents).toBe(500);
    expect(m1.includedSpendCents).toBe(500);
    expect(m1.monthlyLimitDollars).toBeNull();

    globalThis.fetch = originalFetch;
  });

  it("preserves old /teams/spend shape (spendCents=total, no overallSpendCents)", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          teamMemberSpend: [
            {
              userId: "user_1",
              email: "a@test.com",
              name: "Alice",
              role: "member",
              spendCents: 1000,
              includedSpendCents: 800,
              fastPremiumRequests: 5,
              monthlyLimitDollars: 30,
              hardLimitOverrideDollars: 0,
            },
          ],
          subscriptionCycleStart: 1704067200000,
          totalPages: 1,
          limitedUsersCount: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const { members } = await client.getSpending();
    expect(members).toHaveLength(1);

    const [m0] = members;
    if (!m0) throw new Error("expected one normalized member");

    expect(m0.spendCents).toBe(1000);
    expect(m0.includedSpendCents).toBe(800);

    globalThis.fetch = originalFetch;
  });
});
