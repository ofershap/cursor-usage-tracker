import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-dashboard-exhaustion.db");

describe("getFullDashboard planExhaustion", () => {
  let sqlite: typeof import("@/lib/data/sqlite");

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    sqlite = await import("@/lib/data/sqlite");
    const db = sqlite.getDb();
    db.prepare("INSERT INTO spending (email, cycle_start) VALUES ('a@x.com', '2026-06-01')").run();
    db.prepare(
      `INSERT INTO daily_usage (date, email, is_active, agent_requests, usage_based_reqs)
       VALUES ('2026-06-05', 'a@x.com', 1, 10, 4)`,
    ).run();
  });

  afterAll(() => {
    sqlite.getDb().close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  it("lists the day of the cycle each user's plan ran out, whatever the range", () => {
    for (const days of [1, 30]) {
      expect(sqlite.getFullDashboard(days).planExhaustion).toEqual([
        { email: "a@x.com", days_to_exhaust: 5 },
      ]);
    }
  });
});
