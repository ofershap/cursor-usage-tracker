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

  // Regression: when Node's fetch throws (network/TLS), the wrapped error must
  // surface the underlying cause (code + message) so corporate-proxy self-signed
  // cert failures aren't reported as opaque "fetch failed".
  it("wraps fetch-thrown errors with the underlying cause and request context", async () => {
    const originalFetch = globalThis.fetch;

    const cause = Object.assign(new Error("self-signed certificate in certificate chain"), {
      code: "SELF_SIGNED_CERT_IN_CHAIN",
    });
    const fetchErr = new Error("fetch failed", { cause });

    globalThis.fetch = vi.fn(async () => {
      throw fetchErr;
    });

    let captured: unknown;
    try {
      await client.getTeamMembers();
    } catch (err) {
      captured = err;
    }

    expect(captured).toBeInstanceOf(Error);
    const e = captured as Error;
    // Base fetch message preserved
    expect(e.message).toContain("fetch failed");
    // Request context attached so we know WHICH endpoint failed
    expect(e.message).toContain("GET https://api.cursor.test/teams/members");
    // Underlying TLS reason surfaced (code + message)
    expect(e.message).toContain("SELF_SIGNED_CERT_IN_CHAIN");
    expect(e.message).toContain("self-signed certificate in certificate chain");
    // Original error preserved on .cause for upstream inspection
    expect(e.cause).toBe(fetchErr);

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

  // Regression: GH issue #19 — post-2026 API shape returns `overallSpendCents`
  // as the cycle total and `spendCents` as overage above plan. The collector
  // previously crashed with `NOT NULL constraint failed: spending.included_spend_cents`.
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

    // spendCents (normalized) = cycle total, taken from overallSpendCents
    expect(m0.spendCents).toBe(1000);
    // includedSpendCents (normalized) = total - overage = 1000 - 150
    expect(m0.includedSpendCents).toBe(850);
    // raw new fields are preserved for debugging
    expect(m0.overallSpendCents).toBe(1000);
    expect(m0.profilePictureUrl).toBeNull();
    expect(m0.effectivePerUserLimitDollars).toBe(30);

    // User fully under plan: overage = 0, so includedSpendCents = total
    expect(m1.spendCents).toBe(500);
    expect(m1.includedSpendCents).toBe(500);
    expect(m1.monthlyLimitDollars).toBeNull();

    globalThis.fetch = originalFetch;
  });

  // Backward-compat: pre-2026 API shape (spendCents = cycle total, no overallSpendCents).
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

    // Old shape: spendCents is already the cycle total, passed through unchanged.
    expect(m0.spendCents).toBe(1000);
    // includedSpendCents from the old API is honored when present.
    expect(m0.includedSpendCents).toBe(800);
    expect(m0.overallSpendCents).toBeUndefined();

    globalThis.fetch = originalFetch;
  });
});
