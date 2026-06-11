import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { MemberSpend } from "@/lib/types";

// Dedicated DB file so we don't collide with tests/anomaly-detection.test.ts
// (which uses data/test.db) or a developer's data/tracker.db.
const TEST_DB_PATH = path.join(process.cwd(), "data", "test-spending.db");

// `src/lib/data/sqlite.ts` reads DATABASE_PATH at module load and memoizes the
// instance, so we set the env var and import dynamically inside beforeAll.
type SqliteModule = typeof import("@/lib/data/sqlite");

describe("upsertSpending — defensive bindings", () => {
  let sqlite: SqliteModule;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    sqlite = await import("@/lib/data/sqlite");
    // Force schema init now (also creates the spending table).
    sqlite.getDb();
  });

  afterAll(() => {
    try {
      sqlite.getDb().close();
    } catch {
      // ignore — close may throw if already closed
    }
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  // Regression for GH issue #19: the collector previously crashed with
  // `NOT NULL constraint failed: spending.included_spend_cents` when the
  // /teams/spend API stopped returning `includedSpendCents`.
  it("does not crash when nullable/required fields are undefined", () => {
    // Simulate a malformed member that would arise from an unexpected API
    // shape change. `as unknown as MemberSpend` lets us bypass the compiler
    // to exercise the runtime defensive bindings in `upsertSpending`.
    const member = {
      email: "ghost@example.com",
      userId: undefined,
      name: undefined,
      role: "member",
      spendCents: undefined,
      includedSpendCents: undefined,
      fastPremiumRequests: undefined,
      monthlyLimitDollars: null,
      hardLimitOverrideDollars: undefined,
    } as unknown as MemberSpend;

    expect(() => sqlite.upsertSpending([member], "2026-06-01")).not.toThrow();

    const row = sqlite
      .getDb()
      .prepare(
        `SELECT email, user_id, name, spend_cents, included_spend_cents,
                fast_premium_requests, monthly_limit_dollars, hard_limit_override_dollars
         FROM spending WHERE email = ?`,
      )
      .get("ghost@example.com") as
      | {
          email: string;
          user_id: string | null;
          name: string | null;
          spend_cents: number;
          included_spend_cents: number;
          fast_premium_requests: number;
          monthly_limit_dollars: number | null;
          hard_limit_override_dollars: number;
        }
      | undefined;

    expect(row).toBeDefined();
    if (!row) throw new Error("row missing");

    expect(row.email).toBe("ghost@example.com");
    expect(row.user_id).toBeNull();
    expect(row.name).toBeNull();
    expect(row.spend_cents).toBe(0);
    expect(row.included_spend_cents).toBe(0);
    expect(row.fast_premium_requests).toBe(0);
    expect(row.monthly_limit_dollars).toBeNull();
    expect(row.hard_limit_override_dollars).toBe(0);
  });

  it("persists a fully-populated member with the post-2026 API shape", () => {
    const member: MemberSpend = {
      userId: "user_123",
      email: "real@example.com",
      name: "Real User",
      role: "member",
      spendCents: 1000,
      includedSpendCents: 800,
      fastPremiumRequests: 5,
      monthlyLimitDollars: 30,
      hardLimitOverrideDollars: 200,
      overallSpendCents: 1000,
      profilePictureUrl: null,
      effectivePerUserLimitDollars: 30,
    };

    expect(() => sqlite.upsertSpending([member], "2026-06-01")).not.toThrow();

    const row = sqlite
      .getDb()
      .prepare(
        "SELECT user_id, spend_cents, included_spend_cents, fast_premium_requests, monthly_limit_dollars, hard_limit_override_dollars FROM spending WHERE email = ?",
      )
      .get("real@example.com") as
      | {
          user_id: string;
          spend_cents: number;
          included_spend_cents: number;
          fast_premium_requests: number;
          monthly_limit_dollars: number | null;
          hard_limit_override_dollars: number;
        }
      | undefined;

    expect(row).toBeDefined();
    if (!row) throw new Error("row missing");

    expect(row.user_id).toBe("user_123");
    expect(row.spend_cents).toBe(1000);
    expect(row.included_spend_cents).toBe(800);
    expect(row.fast_premium_requests).toBe(5);
    expect(row.monthly_limit_dollars).toBe(30);
    expect(row.hard_limit_override_dollars).toBe(200);
  });

  it("upserts (ON CONFLICT) on the same (email, cycle_start) without error", () => {
    const initial: MemberSpend = {
      userId: "user_1",
      email: "upsert@example.com",
      name: "Initial",
      role: "member",
      spendCents: 100,
      includedSpendCents: 100,
      fastPremiumRequests: 0,
      monthlyLimitDollars: null,
      hardLimitOverrideDollars: 0,
    };
    const updated: MemberSpend = { ...initial, name: "Updated", spendCents: 250 };

    sqlite.upsertSpending([initial], "2026-06-01");
    expect(() => sqlite.upsertSpending([updated], "2026-06-01")).not.toThrow();

    const row = sqlite
      .getDb()
      .prepare("SELECT name, spend_cents FROM spending WHERE email = ? AND cycle_start = ?")
      .get("upsert@example.com", "2026-06-01") as { name: string; spend_cents: number } | undefined;

    expect(row).toBeDefined();
    if (!row) throw new Error("row missing");
    expect(row.name).toBe("Updated");
    expect(row.spend_cents).toBe(250);
  });
});
